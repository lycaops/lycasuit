import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { AppUser } from "@/lib/types"

/** Canonical roles that count as administrators anywhere in the suite. */
const ADMIN_ROLES = [
  "SUPER-ADMIN",
  "HS-ADMIN",
  "PM-ADMIN",
  "CS-ADMIN",
  "COUNTRY-MANAGER",
  "UK-ADMIN",
] as const

export type ToolKey = "field_iq" | "contracts" | "incentive" | "assistance"

export interface PlatformUser {
  id: string
  email: string
  full_name: string
  username: string | null
  role: string
  is_active: boolean
  branch: string | null
  branches: string[] | null
  zone: string | null
  branch_id: string | null
  zone_id: string | null
  designation: string | null
  territory: string | null
  mobile_number: string | null
  pdf_export_enabled: boolean
}

export interface PlatformTool {
  key: ToolKey
  name: string
  description: string | null
  route: string
  icon: string | null
  accent_color: string | null
  sort_order: number
}

/**
 * The signed-in person, read from the unified `app_users` table.
 * Redirects to /auth/login when there is no session at all.
 */
export async function getPlatformUser(): Promise<PlatformUser | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  if (error || !data) return null
  return data as PlatformUser
}

export async function requirePlatformUser(): Promise<PlatformUser> {
  const profile = await getPlatformUser()
  if (!profile || !profile.is_active) redirect("/auth/no-access")
  return profile
}

/** Tools this person is allowed to open — drives the Home screen. */
export async function getMyTools(): Promise<PlatformTool[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("my_tools").select("*").order("sort_order")
  if (error || !data) return []
  return data as PlatformTool[]
}

/**
 * Gate a tool route. Call this at the top of each tool's layout so a user
 * without access is sent to /auth/no-access instead of a broken screen.
 */
export async function requireTool(tool: ToolKey): Promise<PlatformUser> {
  const user = await requirePlatformUser()
  const supabase = await createClient()
  const { data } = await supabase
    .from("user_tool_access")
    .select("can_access")
    .eq("user_id", user.id)
    .eq("tool_key", tool)
    .maybeSingle()

  if (!data?.can_access) redirect("/auth/no-access")
  return user
}

export function isPlatformAdmin(user: Pick<PlatformUser, "role">): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(user.role)
}

export async function requirePlatformAdmin(): Promise<PlatformUser> {
  const user = await requirePlatformUser()
  if (!isPlatformAdmin(user)) redirect("/home")
  return user
}

// ---------------------------------------------------------------------------
// Backwards-compatible helpers. Existing Contract Management code calls these
// and expects the Contract role vocabulary (ADMIN / RSM / ASM / FSE), which the
// `users` view still returns.
// ---------------------------------------------------------------------------

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data, error } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle()
  if (error || !data) return null
  return data as AppUser
}

export async function requireUser(): Promise<AppUser> {
  const profile = await getCurrentUser()
  if (!profile) redirect("/auth/no-access")
  return profile
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser()
  if (user.role !== "ADMIN") redirect("/tools/contracts")
  return user
}
