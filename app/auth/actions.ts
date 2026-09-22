"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function signInAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase() ?? ""
  const password = (formData.get("password") as string) ?? ""

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}

export async function updatePasswordAction(password: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}
