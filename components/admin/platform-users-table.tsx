"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Check, Pencil, Plus, Search, ShieldCheck, ShieldOff, Trash2 } from "lucide-react"
import Loader from "@/components/Loader"
import { toast } from "sonner"
import { deletePlatformUser, setToolAccess, updatePlatformUser } from "@/app/admin/users/actions"
import { Button } from "@/components/ui/button"
import { PlatformUserForm, type PlatformBranch, type PlatformRole, type PlatformTool, type PlatformUserRow } from "@/components/admin/platform-user-form"

interface AccessRow { user_id: string; tool_key: string; can_access: boolean }

export function PlatformUsersTable({
  users,
  roles,
  tools,
  access,
  branches,
  zones,
}: {
  users: PlatformUserRow[]
  roles: PlatformRole[]
  tools: PlatformTool[]
  access: AccessRow[]
  branches: PlatformBranch[]
  zones: { code: string; name: string; branch_id: string; branches?: { code: string } | null }[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<PlatformUserRow | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const accessMap = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const a of access) {
      if (!a.can_access) continue
      if (!m.has(a.user_id)) m.set(a.user_id, new Set())
      m.get(a.user_id)!.add(a.tool_key)
    }
    return m
  }, [access])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.branches ?? []).some((b) => b.toLowerCase().includes(q)),
    )
  }, [users, query])

  function toggleTool(user: PlatformUserRow, toolKey: string) {
    const current = new Set(accessMap.get(user.id) ?? [])
    if (current.has(toolKey)) current.delete(toolKey)
    else current.add(toolKey)
    setBusyId(user.id)
    startTransition(async () => {
      const result = await setToolAccess(user.id, Array.from(current) as string[])
      if (!result.ok) toast.error(result.error)
      else router.refresh()
      setBusyId(null)
    })
  }

  function changeRole(user: PlatformUserRow, role: string) {
    setBusyId(user.id)
    startTransition(async () => {
      const result = await updatePlatformUser(user.id, { role })
      if (!result.ok) toast.error(result.error)
      else router.refresh()
      setBusyId(null)
    })
  }

  function toggleActive(user: PlatformUserRow) {
    setBusyId(user.id)
    startTransition(async () => {
      const result = await updatePlatformUser(user.id, { isActive: !user.is_active })
      if (!result.ok) toast.error(result.error)
      else router.refresh()
      setBusyId(null)
    })
  }

  function removeUser(user: PlatformUserRow) {
    if (!window.confirm(`Delete ${user.full_name}? This removes the login from every tool.`)) return
    setBusyId(user.id)
    startTransition(async () => {
      const result = await deletePlatformUser(user.id)
      if (!result.ok) toast.error(result.error)
      else {
        toast.success("User deleted")
        router.refresh()
      }
      setBusyId(null)
    })
  }

  return (
    <>
      <div className="rounded-xl border border-[#21264E]/10 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#21264E]/10 px-5 py-3">
        <Search className="h-4 w-4 text-[#21264E]/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, role or branch…"
          className="w-full bg-transparent text-sm text-[#21264E] outline-none placeholder:text-[#21264E]/40"
        />
        <span className="shrink-0 text-xs text-[#21264E]/50">{filtered.length} users</span>
        {pending && <Loader size={18} weight={26} inherit label="Processing user action" />}
        <Button size="sm" className="ml-auto" asChild>
          <Link href="/admin/users/new">
          <Plus className="mr-1.5 h-4 w-4" /> Add user
          </Link>
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-[#21264E]/10 text-left text-xs uppercase tracking-wide text-[#21264E]/55">
              <th className="px-5 py-3 font-medium">User</th>
              <th className="px-3 py-3 font-medium">Role</th>
              <th className="px-3 py-3 font-medium">Branches</th>
              {tools.map((t) => (
                <th key={t.key} className="px-3 py-3 text-center font-medium">
                  {t.name.split(" ")[0]}
                </th>
              ))}
              <th className="px-3 py-3 text-center font-medium">Status</th>
              <th className="px-3 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const granted = accessMap.get(u.id) ?? new Set<string>()
              const busy = busyId === u.id
              return (
                <tr key={u.id} className="border-b border-[#21264E]/5 last:border-0">
                  <td className="px-5 py-3">
                    <div className="font-medium text-[#21264E]">{u.full_name}</div>
                    <div className="text-xs text-[#21264E]/55">{u.email}</div>
                  </td>

                  <td className="px-3 py-3">
                    <select
                      value={u.role}
                      disabled={busy}
                      onChange={(e) => changeRole(u, e.target.value)}
                      className="rounded-md border border-[#21264E]/15 bg-white px-2 py-1 text-xs text-[#21264E] outline-none focus:border-[#245BC1] disabled:opacity-50"
                    >
                      {roles.map((r) => (
                        <option key={r.code} value={r.code}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-3 py-3">
                    <span className="text-xs text-[#21264E]/70">
                      {(u.branches ?? []).length === branches.length
                        ? "All branches"
                        : (u.branches ?? []).length === 0
                          ? "—"
                          : `${(u.branches ?? []).length} assigned`}
                    </span>
                  </td>

                  {tools.map((t) => {
                    const on = granted.has(t.key)
                    return (
                      <td key={t.key} className="px-3 py-3 text-center">
                        <button
                          disabled={busy}
                          onClick={() => toggleTool(u, t.key)}
                          aria-label={`${on ? "Revoke" : "Grant"} ${t.name} for ${u.full_name}`}
                          className="inline-flex h-6 w-6 items-center justify-center rounded border transition disabled:opacity-50"
                          style={{
                            backgroundColor: on ? (t.accent_color ?? "#245BC1") : "transparent",
                            borderColor: on ? (t.accent_color ?? "#245BC1") : "#21264E26",
                          }}
                        >
                          {on && <Check className="h-3.5 w-3.5 text-white" />}
                        </button>
                      </td>
                    )
                  })}

                  <td className="px-3 py-3 text-center">
                    <button
                      disabled={busy}
                      onClick={() => toggleActive(u)}
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition disabled:opacity-50"
                      style={{
                        backgroundColor: u.is_active ? "#08DC7D1A" : "#D645451A",
                        color: u.is_active ? "#06894f" : "#d64545",
                      }}
                    >
                      {u.is_active ? (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      ) : (
                        <ShieldOff className="h-3.5 w-3.5" />
                      )}
                      {u.is_active ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Edit user" onClick={() => { setEditing(u); setFormOpen(true) }} disabled={busy}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Delete user" onClick={() => removeUser(u)} disabled={busy}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      </div>
      <PlatformUserForm
        user={editing}
        roles={roles}
        tools={tools}
        branches={branches}
        zones={zones}
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null) }}
      />
    </>
  )
}
