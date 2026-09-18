import { createClient } from "@/lib/supabase/server"
import { requirePlatformAdmin } from "@/lib/auth"
import { HomeHeader } from "@/components/home/home-header"
import { PlatformUsersTable } from "@/components/admin/platform-users-table"

export const metadata = { title: "User Management — Lyca Suite" }

export default async function AdminUsersPage() {
  const me = await requirePlatformAdmin()
  const supabase = await createClient()

  const [{ data: users }, { data: roles }, { data: tools }, { data: access }, { data: branches }] =
    await Promise.all([
      supabase.from("app_users").select("*").order("full_name"),
      supabase.from("app_roles").select("*").order("rank"),
      supabase.from("app_tools").select("*").order("sort_order"),
      supabase.from("user_tool_access").select("user_id, tool_key, can_access"),
      supabase.from("branches").select("code, name").order("code"),
    ])

  return (
    <main className="min-h-dvh bg-[#f4f7fb]">
      <HomeHeader backToHome user={{ full_name: me.full_name, email: me.email, role: me.role }} />

      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#21264E]">
            User Management
          </h1>
          <p className="mt-1 text-sm text-[#21264E]/70">
            Manage users, app access, roles, branch assignments, and security settings for every tool.
          </p>
        </header>

        <PlatformUsersTable
          users={users ?? []}
          roles={roles ?? []}
          tools={tools ?? []}
          access={access ?? []}
          branches={branches ?? []}
        />
      </div>
    </main>
  )
}
