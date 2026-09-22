"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePlatformAdmin } from "@/lib/auth"
import {
  computeDesignation,
  computeTerritory,
  sanitizeDesignation,
  sanitizeTerritory,
} from "@/lib/user-roles"

export interface ActionResult {
  ok: boolean
  error?: string
}

async function resolveZoneId(supabase: Awaited<ReturnType<typeof createClient>>, zone: string | null | undefined) {
  const wanted = zone?.trim().toLowerCase()
  if (!wanted) return null

  const { data } = await supabase
    .from("zones")
    .select("id, code, name, short_code")
    .eq("is_active", true)

  const match = (data ?? []).find((row: { id: string; code: string; name: string; short_code: string | null }) =>
    [row.code, row.name, row.short_code].some((value) => value?.trim().toLowerCase() === wanted),
  )

  return match?.id ?? null
}

// Role, designation and territory vocabularies live in lib/user-roles.ts so the
// platform screens, the FIELD IQ screens and the Incentive Statement screens all
// resolve a user's scope from one place.

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
  const zoneId = await resolveZoneId(admin, input.zone)
  const territory = sanitizeTerritory(input.territory) ?? (await computeTerritory(admin, input.role, {
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
      zone_id: zoneId,
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
  let territory = patch.territory !== undefined ? sanitizeTerritory(patch.territory) : undefined
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

  const zoneId = patch.zone !== undefined ? await resolveZoneId(supabase, patch.zone) : undefined

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
      ...(patch.zone !== undefined ? { zone_id: zoneId } : {}),
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
