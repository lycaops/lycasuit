import { createClient } from "@/lib/supabase/server"
import { requirePlatformAdmin } from "@/lib/auth"
import { PlatformUserForm } from "@/components/admin/platform-user-form"

export default async function NewPlatformUserPage() {
  await requirePlatformAdmin()
  const supabase = await createClient()
  const [{ data: roles }, { data: tools }, { data: branches }, { data: zones }] = await Promise.all([
    supabase.from("app_roles").select("code, label, rank").order("rank"),
    supabase.from("app_tools").select("key, name, accent_color").order("sort_order"),
    supabase.from("branches").select("code, name").eq("is_active", true).order("code"),
    supabase.from("zones").select("code, name, branch_id, branches(code)").eq("is_active", true).order("name"),
  ])

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#21264E]">Add User</h1>
        <p className="mt-1 text-sm text-[#21264E]/70">Create a user account and assign access across Lyca Suite.</p>
      </div>
      <PlatformUserForm
        user={null}
        roles={roles ?? []}
        tools={tools ?? []}
        branches={branches ?? []}
        zones={zones ?? []}
        open
        page
        onOpenChange={() => {}}
      />
    </div>
  )
}