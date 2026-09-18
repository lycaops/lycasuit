"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePlatformAdmin } from "@/lib/auth"

export interface ActionResult {
  ok: boolean
  error?: string
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
      designation: input.designation ?? null,
      territory: input.territory ?? null,
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

  const { error } = await supabase
    .from("app_users")
    .update({
      ...(patch.fullName !== undefined ? { full_name: patch.fullName } : {}),
      ...(patch.role !== undefined ? { role: patch.role } : {}),
      ...(patch.branches !== undefined ? { branches: patch.branches } : {}),
      ...(patch.branch !== undefined ? { branch: patch.branch } : {}),
      ...(patch.zone !== undefined ? { zone: patch.zone } : {}),
      ...(patch.designation !== undefined ? { designation: patch.designation } : {}),
      ...(patch.territory !== undefined ? { territory: patch.territory } : {}),
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
