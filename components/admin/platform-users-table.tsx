"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Pencil, Plus, Search, ShieldCheck, ShieldOff, Trash2, X } from "lucide-react"
import { createPlatformUser, deletePlatformUser, setToolAccess, updatePlatformUser } from "@/app/admin/users/actions"

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
  mobile_number?: string | null
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
  currentUserId,
}: {
  users: Row[]
  roles: RoleRow[]
  tools: ToolRow[]
  access: AccessRow[]
  branches: BranchRow[]
  currentUserId: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Row | null>(null)
  const [formError, setFormError] = useState("")
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: roles[0]?.code ?? "VIEWER",
    branch: "",
    zone: "",
    territory: "",
    tools: [] as string[],
  })

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
      router.refresh()
    })
  }

  function changeRole(user: Row, role: string) {
    setBusyId(user.id)
    startTransition(async () => {
      await updatePlatformUser(user.id, { role })
      setBusyId(null)
      router.refresh()
    })
  }

  function toggleActive(user: Row) {
    setBusyId(user.id)
    startTransition(async () => {
      await updatePlatformUser(user.id, { isActive: !user.is_active })
      setBusyId(null)
      router.refresh()
    })
  }

  function openCreate() {
    setEditingUser(null)
    setFormError("")
    setForm({ fullName: "", email: "", password: "", role: roles[0]?.code ?? "VIEWER", branch: "", zone: "", territory: "", tools: tools.map((tool) => tool.key) })
    setFormOpen(true)
  }

  function openEdit(user: Row) {
    setEditingUser(user)
    setFormError("")
    setForm({
      fullName: user.full_name,
      email: user.email,
      password: "",
      role: user.role,
      branch: user.branch ?? user.branches?.[0] ?? "",
      zone: user.zone ?? "",
      territory: user.territory ?? "",
      tools: Array.from(accessMap.get(user.id) ?? []),
    })
    setFormOpen(true)
  }

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError("")
    if (!form.fullName.trim() || !form.email.trim()) {
      setFormError("Full name and email are required.")
      return
    }
    if (!editingUser && form.password.length < 8) {
      setFormError("Password must be at least 8 characters.")
      return
    }

    startTransition(async () => {
      const result = editingUser
        ? await updatePlatformUser(editingUser.id, {
            fullName: form.fullName.trim(),
            role: form.role,
            branches: form.branch ? [form.branch] : [],
            branch: form.branch || null,
            zone: form.zone || null,
            territory: form.territory || null,
          })
        : await createPlatformUser({
            email: form.email,
            password: form.password,
            fullName: form.fullName,
            role: form.role,
            branches: form.branch ? [form.branch] : [],
            branch: form.branch || null,
            zone: form.zone || null,
            territory: form.territory || null,
            tools: form.tools,
          })

      if (!result.ok) {
        setFormError(result.error ?? "Could not save the user.")
        return
      }

      if (editingUser) {
        const accessResult = await setToolAccess(editingUser.id, form.tools)
        if (!accessResult.ok) {
          setFormError(accessResult.error ?? "Could not save tool access.")
          return
        }
      }

      setFormOpen(false)
      router.refresh()
    })
  }

  function removeUser(user: Row) {
    if (user.id === currentUserId || !window.confirm(`Remove ${user.full_name}? This permanently deletes the account.`)) return
    setBusyId(user.id)
    startTransition(async () => {
      const result = await deletePlatformUser(user.id)
      setBusyId(null)
      if (!result.ok) setFormError(result.error ?? "Could not remove the user.")
      else router.refresh()
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
        <button onClick={openCreate} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#245BC1] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#1d4da4]">
          <Plus className="h-3.5 w-3.5" /> Add user
        </button>
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
                      <button disabled={busy} onClick={() => openEdit(u)} aria-label={`Edit ${u.full_name}`} className="rounded-md p-1.5 text-[#21264E]/60 transition hover:bg-[#245BC1]/10 hover:text-[#245BC1] disabled:opacity-50">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button disabled={busy || u.id === currentUserId} onClick={() => removeUser(u)} aria-label={`Remove ${u.full_name}`} className="rounded-md p-1.5 text-[#d64545]/70 transition hover:bg-[#d64545]/10 hover:text-[#d64545] disabled:opacity-40">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#21264e]/40 p-4" role="dialog" aria-modal="true">
          <form onSubmit={submitForm} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#21264E]">{editingUser ? "Edit user" : "Add user"}</h2>
                <p className="mt-1 text-sm text-[#21264E]/60">Manage identity, scope, role and access for every app.</p>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} aria-label="Close" className="rounded-md p-1.5 text-[#21264E]/50 hover:bg-[#21264E]/5 hover:text-[#21264E]"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-[#21264E]">Full name<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="mt-1 w-full rounded-md border border-[#21264E]/15 px-3 py-2 font-normal outline-none focus:border-[#245BC1]" /></label>
              <label className="text-sm font-medium text-[#21264E]">Email<input type="email" disabled={!!editingUser} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-md border border-[#21264E]/15 px-3 py-2 font-normal outline-none focus:border-[#245BC1] disabled:bg-[#f4f7fb]" /></label>
              {!editingUser && <label className="text-sm font-medium text-[#21264E]">Temporary password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1 w-full rounded-md border border-[#21264E]/15 px-3 py-2 font-normal outline-none focus:border-[#245BC1]" /></label>}
              <label className="text-sm font-medium text-[#21264E]">Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="mt-1 w-full rounded-md border border-[#21264E]/15 bg-white px-3 py-2 font-normal outline-none focus:border-[#245BC1]">{roles.map((role) => <option key={role.code} value={role.code}>{role.label}</option>)}</select></label>
              <label className="text-sm font-medium text-[#21264E]">Branch<select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className="mt-1 w-full rounded-md border border-[#21264E]/15 bg-white px-3 py-2 font-normal outline-none focus:border-[#245BC1]"><option value="">All / unassigned</option>{branches.map((branch) => <option key={branch.code} value={branch.code}>{branch.name}</option>)}</select></label>
              <label className="text-sm font-medium text-[#21264E]">Zone<input value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} className="mt-1 w-full rounded-md border border-[#21264E]/15 px-3 py-2 font-normal outline-none focus:border-[#245BC1]" /></label>
              <label className="text-sm font-medium text-[#21264E]">Territory<input value={form.territory} onChange={(e) => setForm({ ...form, territory: e.target.value })} className="mt-1 w-full rounded-md border border-[#21264E]/15 px-3 py-2 font-normal outline-none focus:border-[#245BC1]" /></label>
            </div>
            <fieldset className="mt-5">
              <legend className="text-sm font-medium text-[#21264E]">App access</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {tools.map((tool) => <label key={tool.key} className="flex items-center gap-2 rounded-md border border-[#21264E]/10 px-3 py-2 text-sm text-[#21264E]"><input type="checkbox" checked={form.tools.includes(tool.key)} onChange={(e) => setForm({ ...form, tools: e.target.checked ? [...form.tools, tool.key] : form.tools.filter((key) => key !== tool.key) })} />{tool.name}</label>)}
              </div>
            </fieldset>
            {formError && <p className="mt-4 text-sm text-[#d64545]">{formError}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg px-4 py-2 text-sm text-[#21264E]/70 hover:bg-[#21264E]/5">Cancel</button>
              <button disabled={pending} className="rounded-lg bg-[#245BC1] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d4da4] disabled:opacity-50">{pending ? "Saving..." : "Save user"}</button>
            </div>
          </form>
        </div>
      )}
      {formError && !formOpen && <p className="border-t border-[#21264E]/10 px-5 py-3 text-sm text-[#d64545]">{formError}</p>}
    </div>
  )
}
