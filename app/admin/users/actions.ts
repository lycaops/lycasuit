"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePlatformAdmin } from "@/lib/auth"

export interface ActionResult {
  ok: boolean
  error?: string
}

const NORTH_BRANCHES = ["LMIT-HS-BOLOGNA", "LMIT-HS-MILAN", "LMIT-HS-PADOVA", "LMIT-HS-TORINO"]
const SOUTH_BRANCHES = ["LMIT-HS-BARI", "LMIT-HS-NAPLES", "LMIT-HS-PALERMO", "LMIT-HS-ROME"]

// Designation values allowed by the `app_users_designation_check` constraint
// (see supabase/migrations/20260918000001_unified_core.sql). Anything else
// written to app_users.designation violates the check and fails the insert.
// NOTE: must NOT be exported — "use server" modules may only export async
// functions, and exporting anything else crashes the server at runtime.
const DESIGNATION_VALUES = [
  "Zone Manager",
  "Office Manager",
  "Region Manager",
  "Admin",
  "CS",
  "Retailer Support",
  "Admin-UK",
  "Admin-IN",
] as const

type Designation = (typeof DESIGNATION_VALUES)[number]

/**
 * Map a canonical app_roles code to a designation that satisfies the
 * `app_users_designation_check` constraint. Unlike app_roles.label, these
 * values come from the Market Assistance vocabulary the constraint enforces.
 * Roles without a natural designation resolve to null (allowed by the check).
 */
const DESIGNATION_BY_ROLE: Record<string, Designation | null> = {
  "SUPER-ADMIN": "Admin",
  "HS-ADMIN": "Admin",
  "PM-ADMIN": "Admin",
  "COUNTRY-MANAGER": "Admin",
  "UK-ADMIN": "Admin-UK",
  "CS-ADMIN": "CS",
  RSM: "Region Manager",
  "ZONE-MANAGER": "Zone Manager",
  ASM: "Office Manager",
  FSE: null,
  VIEWER: null,
}

/** Keep only designation values the database check constraint allows. */
function sanitizeDesignation(value: string | null | undefined): string | null {
  if (value == null) return null
  return (DESIGNATION_VALUES as readonly string[]).includes(value) ? value : null
}

function computeDesignation(roleCode: string): Designation | null {
  return sanitizeDesignation(DESIGNATION_BY_ROLE[roleCode] ?? null)
}

async function computeTerritory(
  supabase: ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>,
  roleCode: string,
  opts: { branches?: string[] | null; branch?: string | null; zone?: string | null },
): Promise<string | null> {
  const { branches, zone } = opts
  const chosenBranch = opts.branch ?? branches?.[0] ?? null
  const assignedBranches = branches && branches.length > 0 ? branches : (chosenBranch ? [chosenBranch] : [])

  switch (roleCode) {
    case "ZONE-MANAGER":
    case "FSE": {
      if (!zone) return null
      const { data: zoneRow } = await supabase
        .from("zones")
        .select("name,branch:branch_id(code,name)")
        .eq("code", zone)
        .maybeSingle()
      if (!zoneRow) return null
      const zoneName = (zoneRow as any)?.name ?? null
      const branchName = (zoneRow as any)?.branch?.name ?? null
      return branchName && zoneName ? `${zoneName} (${branchName})` : zoneName ?? branchName ?? null
    }
    case "ASM": {
      if (!chosenBranch) return null
      const { data } = await supabase
        .from("branches")
        .select("name")
        .eq("code", chosenBranch)
        .maybeSingle()
      return data?.name ?? null
    }
    case "RSM": {
      if (assignedBranches.length === 0) return null
      const all = [...NORTH_BRANCHES, ...SOUTH_BRANCHES]
      if (all.every((b) => assignedBranches.includes(b))) {
        return "All Italy"
      }
      if (NORTH_BRANCHES.every((b) => assignedBranches.includes(b))) {
        return "North Region"
      }
      if (SOUTH_BRANCHES.every((b) => assignedBranches.includes(b))) {
        return "South Region"
      }
      const { data } = await supabase
        .from("branches")
        .select("code,name")
        .in("code", assignedBranches)
      const nameFor = new Map((data ?? []).map((b: any) => [b.code, b.name || b.code]))
      return assignedBranches
        .map((c) => nameFor.get(c) || c.replace("LMIT-HS-", ""))
        .join(", ")
    }
    default: {
      return "All Italy"
    }
  }
}

/**
 * Create ONE account that works across every tool in the suite.
 * Replaces the four separate sign-up flows the old apps each had.
 */
export async function createPlatformUser(input: {
  email: string
  password: string
  fullName: string
  role: string
  branches: string[]
  branch?: string | null
  zone?: string | null
  designation?: string | null
  territory?: string | null
  mobileNumber?: string | null
  tools: string[]
}): Promise<ActionResult> {
  await requirePlatformAdmin()

  const email = input.email.trim().toLowerCase()
  if (!email || !input.fullName.trim()) {
    return { ok: false, error: "Full name and email are required." }
  }
  if (!input.password || input.password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." }
  }

  const admin = createAdminClient()

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName.trim() },
  })
  if (authError || !created?.user) {
    return { ok: false, error: authError?.message ?? "Could not create the login." }
  }

  const designation = sanitizeDesignation(input.designation) ?? computeDesignation(input.role)
  const territory = input.territory ?? (await computeTerritory(admin, input.role, {
    branches: input.branches,
    branch: input.branch,
    zone: input.zone,
  }))

  // The on_auth_user_created trigger already inserted a VIEWER row; fill it in.
  const { error: profileError } = await admin
    .from("app_users")
    .update({
      email,
      full_name: input.fullName.trim(),
      username: email.split("@")[0],
      role: input.role,
      branches: input.branches,
      branch: input.branch ?? input.branches[0] ?? null,
      zone: input.zone ?? null,
      designation,
      territory,
      mobile_number: input.mobileNumber ?? null,
      is_active: true,
    })
    .eq("id", created.user.id)

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id)
    return { ok: false, error: profileError.message }
  }

  await setToolAccessFor(created.user.id, input.tools)

  revalidatePath("/admin/users")
  return { ok: true }
}

export async function updatePlatformUser(
  userId: string,
  patch: {
    email?: string
    username?: string | null
    fullName?: string
    role?: string
    branches?: string[]
    branch?: string | null
    zone?: string | null
    designation?: string | null
    territory?: string | null
    mobileNumber?: string | null
    isActive?: boolean
    pdfExportEnabled?: boolean
  },
): Promise<ActionResult> {
  await requirePlatformAdmin()
  const supabase = await createClient()

  let designation = patch.designation !== undefined ? sanitizeDesignation(patch.designation) : undefined
  let territory = patch.territory
  const needsRoleRecompute = (patch.role !== undefined || patch.branches !== undefined || patch.branch !== undefined || patch.zone !== undefined)
  if (needsRoleRecompute) {
    let role = patch.role
    let branches = patch.branches
    let branch = patch.branch
    let zone = patch.zone
    if (role === undefined || branches === undefined || branch === undefined || zone === undefined) {
      const { data: existing } = await supabase
        .from("app_users")
        .select("role,branches,branch,zone")
        .eq("id", userId)
        .maybeSingle()
      role = role ?? (existing as any)?.role
      branches = branches ?? (existing as any)?.branches
      branch = branch ?? (existing as any)?.branch
      zone = zone ?? (existing as any)?.zone
    }
    if (role && designation === undefined) {
      designation = computeDesignation(role)
    }
    if (role && territory === undefined) {
      territory = await computeTerritory(supabase, role, { branches, branch, zone })
    }
  }

  const { error } = await supabase
    .from("app_users")
    .update({
      ...(patch.email !== undefined ? { email: patch.email.trim().toLowerCase() } : {}),
      ...(patch.username !== undefined ? { username: patch.username?.trim() || null } : {}),
      ...(patch.fullName !== undefined ? { full_name: patch.fullName } : {}),
      ...(patch.role !== undefined ? { role: patch.role } : {}),
      ...(patch.branches !== undefined ? { branches: patch.branches } : {}),
      ...(patch.branch !== undefined ? { branch: patch.branch } : {}),
      ...(patch.zone !== undefined ? { zone: patch.zone } : {}),
      ...(designation !== undefined ? { designation } : {}),
      ...(territory !== undefined ? { territory } : {}),
      ...(patch.mobileNumber !== undefined ? { mobile_number: patch.mobileNumber } : {}),
      ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
      ...(patch.pdfExportEnabled !== undefined
        ? { pdf_export_enabled: patch.pdfExportEnabled }
        : {}),
    })
    .eq("id", userId)

  if (error) return { ok: false, error: error.message }

  // Deactivating here also bans the auth user, so every tool locks them out.
  if (patch.isActive !== undefined) {
    const admin = createAdminClient()
    await admin.auth.admin.updateUserById(userId, {
      ban_duration: patch.isActive ? "none" : "876000h",
    })
  }

  if (patch.email !== undefined) {
    const admin = createAdminClient()
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      email: patch.email.trim().toLowerCase(),
      email_confirm: true,
    })
    if (authError) return { ok: false, error: authError.message }
  }

  revalidatePath("/admin/users")
  return { ok: true }
}

export async function deletePlatformUser(userId: string): Promise<ActionResult> {
  const current = await requirePlatformAdmin()
  if (current.id === userId) return { ok: false, error: "You cannot delete your own account." }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { ok: false, error: error.message }

  revalidatePath("/admin/users")
  return { ok: true }
}

export async function setToolAccess(userId: string, tools: string[]): Promise<ActionResult> {
  await requirePlatformAdmin()
  const result = await setToolAccessFor(userId, tools)
  revalidatePath("/admin/users")
  return result
}

async function setToolAccessFor(userId: string, tools: string[]): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: allTools } = await supabase.from("app_tools").select("key")

  const rows = (allTools ?? []).map((t: { key: string }) => ({
    user_id: userId,
    tool_key: t.key,
    can_access: tools.includes(t.key),
  }))

  if (rows.length === 0) return { ok: true }

  const { error } = await supabase
    .from("user_tool_access")
    .upsert(rows, { onConflict: "user_id,tool_key" })

  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function resetPassword(userId: string, password: string): Promise<ActionResult> {
  await requirePlatformAdmin()
  if (!password || password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." }
  }
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  return error ? { ok: false, error: error.message } : { ok: true }
}
