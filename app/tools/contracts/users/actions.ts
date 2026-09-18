"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { createClient as createPlainClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env"
import type { Role } from "@/lib/branches"
import { requireAdmin } from "@/lib/auth"

export type ActionResult = { ok: true; data?: any } | { ok: false; error: string }

export async function resetUserPasswordToTemporaryAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    
    // Generate a simple temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + "!" + Math.floor(Math.random() * 100)
    
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.updateUserById(id, {
      password: tempPassword
    })

    if (error) return { ok: false, error: error.message }
    
    return { ok: true, data: tempPassword }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function createUserAction(input: {
  email: string
  password: string
  full_name: string
  role: Role
  branch: string | null
  branches?: string[] | null
  zone: string | null
}): Promise<ActionResult> {
  try {
    await requireAdmin()
    const normalizedBranches = (input.branches ?? []).filter(Boolean)
    if (input.role === "RSM" && normalizedBranches.length === 0) {
      return { ok: false, error: "RSM must have at least one branch." }
    }

    // Use a standalone client so we do not overwrite the admin's session cookies
    // when calling signUp.
    const standalone = createPlainClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: signUpData, error: signUpError } = await standalone.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { full_name: input.full_name },
      },
    })

    if (signUpError) return { ok: false, error: signUpError.message }
    const newUserId = signUpData.user?.id
    if (!newUserId) {
      return {
        ok: false,
        error: "Account created but confirmation is pending. Ask the user to confirm their email, then sync.",
      }
    }

    const supabase = await createClient()
    const { error: insertError } = await supabase.from("users").upsert({
      id: newUserId,
      email: input.email,
      full_name: input.full_name,
      role: input.role,
      branch: input.role === "ASM" || input.role === "FSE" ? input.branch : null,
      branches: input.role === "RSM" ? normalizedBranches : null,
      zone: input.role === "FSE" ? input.zone : null,
      is_active: true,
    })

    if (insertError) return { ok: false, error: insertError.message }

    revalidatePath("/tools/contracts/users")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function updateUserAction(
  id: string,
  patch: Partial<{
    full_name: string
    role: Role
    branch: string | null
    branches: string[] | null
    zone: string | null
    is_active: boolean
  }>,
): Promise<ActionResult> {
  try {
    await requireAdmin()
    const normalizedBranches = (patch.branches ?? []).filter(Boolean)
    if (patch.role === "RSM" && normalizedBranches.length === 0) {
      return { ok: false, error: "RSM must have at least one branch." }
    }
    const normalizedPatch: typeof patch = {
      ...patch,
      branch: patch.role === "ASM" || patch.role === "FSE" ? (patch.branch ?? null) : null,
      branches: patch.role === "RSM" ? normalizedBranches : null,
      zone: patch.role === "FSE" ? (patch.zone ?? null) : null,
    }
    const supabase = await createClient()
    const { error } = await supabase.from("users").update(normalizedPatch).eq("id", id)
    if (error) return { ok: false, error: error.message }
    revalidatePath("/tools/contracts/users")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function deleteUserAction(id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()
    if (admin.id === id) {
      return { ok: false, error: "You cannot delete your own account." }
    }
    const supabase = await createClient()
    const { error } = await supabase.from("users").delete().eq("id", id)
    if (error) return { ok: false, error: error.message }
    revalidatePath("/tools/contracts/users")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

async function getOriginFromHeaders(): Promise<string | null> {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  if (!host) return null
  
  // Default to https for production-like environments unless it's localhost
  let proto = h.get("x-forwarded-proto")
  if (!proto) {
    proto = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https"
  }
  
  return `${proto}://${host}`
}

export async function sendUserPasswordResetEmailAction(input: {
  email: string
}): Promise<ActionResult> {
  try {
    await requireAdmin()
    const origin = await getOriginFromHeaders()
    const redirectTo = origin ? `${origin}/auth/reset-password` : undefined

    const standalone = createPlainClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { error } = await standalone.auth.resetPasswordForEmail(
      input.email,
      redirectTo ? { redirectTo } : undefined,
    )

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}
