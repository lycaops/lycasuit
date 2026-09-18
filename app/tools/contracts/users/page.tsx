import { requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { UsersTable } from "@/components/users/users-table"
import { NewUserDialog } from "@/components/users/new-user-dialog"
import { Users, UserPlus, ShieldCheck, UserCheck } from "lucide-react"
import type { AppUser } from "@/lib/types"

export default async function UsersPage() {
  await requireAdmin()
  const supabase = await createClient()

  const { data } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false })

  const users = (data ?? []) as AppUser[]
  const activeUsers = users.filter(u => u.is_active).length
  const admins = users.filter(u => u.role === "ADMIN").length

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-brand-navy/5 rounded-lg">
              <Users className="h-6 w-6 text-brand-navy" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-brand-navy">User Management</h1>
          </div>
          <p className="text-muted-foreground ml-10">
            Monitor and manage access controls, roles, and staff assignments.
          </p>
        </div>
        <NewUserDialog />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-brand-navy/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-brand-navy" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total Staff</p>
            <p className="text-2xl font-bold text-brand-navy">{users.length}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <UserCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Active Now</p>
            <p className="text-2xl font-bold text-emerald-600">{activeUsers}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Administrators</p>
            <p className="text-2xl font-bold text-blue-600">{admins}</p>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
          <h2 className="font-semibold text-brand-navy">Staff Directory</h2>
          <div className="text-xs font-medium text-muted-foreground bg-white border px-2 py-1 rounded-full">
            {users.length} Records Found
          </div>
        </div>
        <div className="overflow-x-auto">
          <UsersTable users={users} />
        </div>
      </div>
    </div>
  )
}
