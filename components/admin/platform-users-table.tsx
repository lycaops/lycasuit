"use client"

import { useMemo, useState, useTransition } from "react"
import { Check, Loader2, Search, ShieldCheck, ShieldOff } from "lucide-react"
import { setToolAccess, updatePlatformUser } from "@/app/admin/users/actions"

interface Row {
  id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  branches: string[] | null
  branch: string | null
  zone: string | null
  designation: string | null
  territory: string | null
}
interface RoleRow { code: string; label: string; rank: number }
interface ToolRow { key: string; name: string; accent_color: string | null }
interface AccessRow { user_id: string; tool_key: string; can_access: boolean }
interface BranchRow { code: string; name: string }

export function PlatformUsersTable({
  users,
  roles,
  tools,
  access,
  branches,
}: {
  users: Row[]
  roles: RoleRow[]
  tools: ToolRow[]
  access: AccessRow[]
  branches: BranchRow[]
}) {
  const [query, setQuery] = useState("")
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

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

  function toggleTool(user: Row, toolKey: string) {
    const current = new Set(accessMap.get(user.id) ?? [])
    if (current.has(toolKey)) current.delete(toolKey)
    else current.add(toolKey)
    setBusyId(user.id)
    startTransition(async () => {
      await setToolAccess(user.id, Array.from(current))
      setBusyId(null)
    })
  }

  function changeRole(user: Row, role: string) {
    setBusyId(user.id)
    startTransition(async () => {
      await updatePlatformUser(user.id, { role })
      setBusyId(null)
    })
  }

  function toggleActive(user: Row) {
    setBusyId(user.id)
    startTransition(async () => {
      await updatePlatformUser(user.id, { isActive: !user.is_active })
      setBusyId(null)
    })
  }

  return (
    <div className="rounded-xl border border-[#21264E]/10 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-[#21264E]/10 px-5 py-3">
        <Search className="h-4 w-4 text-[#21264E]/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, role or branch…"
          className="w-full bg-transparent text-sm text-[#21264E] outline-none placeholder:text-[#21264E]/40"
        />
        <span className="shrink-0 text-xs text-[#21264E]/50">{filtered.length} users</span>
        {pending && <Loader2 className="h-4 w-4 animate-spin text-[#245BC1]" />}
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
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
