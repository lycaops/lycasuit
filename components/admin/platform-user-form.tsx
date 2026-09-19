"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createPlatformUser, updatePlatformUser } from "@/app/admin/users/actions"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import { Pencil, Plus, Shield } from "lucide-react"

export interface PlatformUserRow {
  id: string
  email: string
  full_name: string
  username: string | null
  role: string
  is_active: boolean
  branches: string[] | null
  branch: string | null
  zone: string | null
  mobile_number: string | null
  pdf_export_enabled: boolean
}

export interface PlatformRole {
  code: string
  label: string
  rank: number
}

export interface PlatformTool {
  key: string
  name: string
  accent_color: string | null
}

export interface PlatformBranch {
  code: string
  name: string
}

export interface PlatformZone {
  code: string
  name: string
  branch_id: string
  branches?: { code: string } | null
}

const NORTH_BRANCHES = ["LMIT-HS-BOLOGNA", "LMIT-HS-MILAN", "LMIT-HS-PADOVA", "LMIT-HS-TORINO"]
const SOUTH_BRANCHES = ["LMIT-HS-BARI", "LMIT-HS-NAPLES", "LMIT-HS-PALERMO", "LMIT-HS-ROME"]

type FormValues = {
  fullName: string
  email: string
  username: string
  password: string
  role: string
  branches: string[]
  zone: string
  mobileNumber: string
  isActive: boolean
  pdfExportEnabled: boolean
  tools: string[]
}

const emptyForm: FormValues = {
  fullName: "",
  email: "",
  username: "",
  password: "",
  role: "ASM",
  branches: [],
  zone: "",
  mobileNumber: "",
  isActive: true,
  pdfExportEnabled: true,
  tools: [],
}

export function PlatformUserForm({
  user,
  roles,
  tools,
  branches,
  zones,
  open,
  onOpenChange,
  page = false,
}: {
  user: PlatformUserRow | null
  roles: PlatformRole[]
  tools: PlatformTool[]
  branches: PlatformBranch[]
  zones: PlatformZone[]
  open: boolean
  onOpenChange?: (open: boolean) => void
  page?: boolean
}) {
  const router = useRouter()
  const [values, setValues] = useState<FormValues>(emptyForm)
  const [pending, startTransition] = useTransition()
  const editing = Boolean(user)

  useEffect(() => {
    if (!open) return
    setValues(
      user
        ? {
            fullName: user.full_name,
            email: user.email,
            username: user.username ?? "",
            password: "",
            role: user.role,
            branches: user.role === "ASM"
              ? user.branches?.slice(0, 1) ?? (user.branch ? [user.branch] : [])
              : user.role === "ZONE-MANAGER" || user.role === "FSE" || user.role === "RSM"
                ? user.branch ? [user.branch] : []
                : branches.map((branch) => branch.code),
            zone: user.zone ?? "",
            mobileNumber: user.mobile_number ?? "",
            isActive: user.is_active,
            pdfExportEnabled: user.pdf_export_enabled,
            tools: [],
          }
        : emptyForm,
    )
  }, [open, user])

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function setRole(role: string) {
    setValues((current) => ({
      ...current,
      role,
      branches: role === "ZONE-MANAGER" || role === "FSE" || role === "RSM"
        ? current.branches.slice(0, 1)
        : role === "ASM"
          ? current.branches.slice(0, 1)
          : branches.map((branch) => branch.code),
      zone: role === "ZONE-MANAGER" || role === "FSE" ? current.zone : "",
    }))
  }

  function selectBranches(codes: string[]) {
    setField("branches", codes.filter((code) => branches.some((branch) => branch.code === code)))
  }

  function toggleRegionalBranch(code: string) {
    const north = NORTH_BRANCHES.includes(code)
    setValues((current) => {
      const currentIsNorth = current.branches.some((branch) => NORTH_BRANCHES.includes(branch))
      const currentIsSouth = current.branches.some((branch) => SOUTH_BRANCHES.includes(branch))
      if ((north && currentIsSouth) || (!north && currentIsNorth)) return { ...current, branches: [code] }
      return {
        ...current,
        branches: current.branches.includes(code)
          ? current.branches.filter((branch) => branch !== code)
          : [...current.branches, code],
      }
    })
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!values.fullName.trim() || !values.email.trim()) {
      toast.error("Full name and email are required.")
      return
    }
    if (!editing && values.password.length < 8) {
      toast.error("Password must be at least 8 characters.")
      return
    }
    if (values.role === "ASM" && values.branches.length !== 1) {
      toast.error("Area Managers can only have one branch.")
      return
    }
    if (values.role === "RSM" && values.branches.length === 0) {
      toast.error("Regional Sales Managers must be assigned to North or South branches.")
      return
    }
    if ((values.role === "ZONE-MANAGER" || values.role === "FSE") && !values.zone.trim()) {
      toast.error("Select a branch and zone for this role.")
      return
    }

    startTransition(async () => {
      const result = editing && user
        ? await updatePlatformUser(user.id, {
            email: values.email,
            username: values.username || null,
            fullName: values.fullName,
            role: values.role,
            branches: values.branches,
            branch: values.branches[0] ?? null,
            zone: values.zone || null,
            mobileNumber: values.mobileNumber || null,
            isActive: values.isActive,
            pdfExportEnabled: values.pdfExportEnabled,
          })
        : await createPlatformUser({
            email: values.email,
            password: values.password,
            fullName: values.fullName,
            role: values.role,
            branches: values.branches,
            branch: values.branches[0] ?? null,
            zone: values.zone || null,
            mobileNumber: values.mobileNumber || null,
            tools: values.tools,
          })

      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(editing ? "User updated" : "User created")
      if (page) router.push("/admin/users")
      else onOpenChange(false)
      router.refresh()
    })
  }

  const content = (
      <div className={page ? "rounded-2xl border border-[#21264E]/10 bg-white p-6 shadow-sm" : ""}>
        {page ? (
          <div className="flex flex-col gap-2 text-left">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-brand-navy">
              {editing ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editing ? "Edit user" : "Add user"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {editing ? "Update identity, assignments, permissions, and security settings." : "Create one account for the selected LycaOps tools."}
            </p>
          </div>
        ) : (
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-navy">
              {editing ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editing ? "Edit user" : "Add user"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Update identity, assignments, permissions, and security settings." : "Create one account for the selected LycaOps tools."}
            </DialogDescription>
          </DialogHeader>
        )}

        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name"><Input value={values.fullName} onChange={(e) => setField("fullName", e.target.value)} required /></Field>
            <Field label="Email address"><Input type="email" value={values.email} onChange={(e) => setField("email", e.target.value)} required /></Field>
            <Field label="Username"><Input value={values.username} onChange={(e) => setField("username", e.target.value)} /></Field>
            {!editing && <Field label="Temporary password"><Input type="password" minLength={8} value={values.password} onChange={(e) => setField("password", e.target.value)} required /></Field>}
            <Field label="Mobile number"><Input value={values.mobileNumber} onChange={(e) => setField("mobileNumber", e.target.value)} /></Field>
          </div>

          <div>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#21264E]/70">Role</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {roles.map((role) => (
                <button
                  key={role.code}
                  type="button"
                  onClick={() => setRole(role.code)}
                  className={`rounded-xl border-2 px-3 py-2.5 text-[11px] font-medium transition ${values.role === role.code ? "border-[#245bc1] bg-[#245bc1]/5 text-[#21264E]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                >
                  <Shield className={`mx-auto mb-1 h-3.5 w-3.5 ${values.role === role.code ? "text-[#245bc1]" : "text-gray-400"}`} />
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          {values.role === "ZONE-MANAGER" || values.role === "FSE" ? (
          <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-brand-navy">Branch and zone assignment</Label>
              <span className="text-xs text-gray-400">{values.zone ? "1 zone selected" : "Select branch first"}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
              {branches.map((branch) => (
                <label key={branch.code} className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs transition ${values.branches[0] === branch.code ? "border border-gray-100 bg-white font-semibold text-brand-navy shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}>
                  <input type="radio" name="zone-branch" checked={values.branches[0] === branch.code} onChange={() => setValues((current) => ({ ...current, branches: [branch.code], zone: "" }))} className="h-3.5 w-3.5 border-gray-300 text-[#245bc1] focus:ring-[#245bc1]" />
                  {branch.name || branch.code.replace("LMIT-HS-", "")}
                </label>
              ))}
            </div>
            {values.branches[0] && <div className="border-t border-gray-200 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#21264E]/70">Select zone</p>
              <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {zones.filter((zone) => zone.branches?.code === values.branches[0]).map((zone) => (
                  <label key={zone.code} className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs transition ${values.zone === zone.code ? "border border-gray-100 bg-white font-semibold text-brand-navy shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}>
                    <input type="radio" name="assigned-zone" checked={values.zone === zone.code} onChange={() => setField("zone", zone.code)} className="h-3.5 w-3.5 border-gray-300 text-[#245bc1] focus:ring-[#245bc1]" />
                    {zone.name}
                  </label>
                ))}
              </div>
            </div>}
            {!values.branches[0] && <p className="text-xs text-gray-500">Choose a branch to load its available zones.</p>}
            </div>
          ) : values.role === "ASM" ? <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="font-semibold text-brand-navy">Assigned branches</Label>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg bg-[#245bc1]/10 px-2.5 py-1.5 text-[10px] font-medium text-[#245bc1]">Select one branch</span>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
              {branches.map((branch) => (
                <label key={branch.code} className="flex items-center gap-2 text-sm text-brand-navy">
                  <input type="radio" name="assigned-branch" checked={values.branches.includes(branch.code)} onChange={() => setField("branches", [branch.code])} className="h-3.5 w-3.5 border-gray-300 text-[#245bc1] focus:ring-[#245bc1]" />
                  <span className="truncate">{branch.name || branch.code.replace("LMIT-HS-", "")}</span>
                </label>
              ))}
            </div>
          </div> : values.role === "RSM" ? <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="font-semibold text-brand-navy">Regional branch access</Label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => selectBranches(NORTH_BRANCHES)} className="rounded-lg bg-[#006AE0]/10 px-2.5 py-1.5 text-[10px] font-medium text-[#006AE0] transition hover:bg-[#006AE0]/20">North Region</button>
                <button type="button" onClick={() => selectBranches(SOUTH_BRANCHES)} className="rounded-lg bg-[#08DC7D]/10 px-2.5 py-1.5 text-[10px] font-medium text-[#08dc7d] transition hover:bg-[#08DC7D]/20">South Region</button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {branches.filter((branch) => NORTH_BRANCHES.includes(branch.code) || SOUTH_BRANCHES.includes(branch.code)).map((branch) => (
                <label key={branch.code} className="flex items-center gap-2 text-sm text-brand-navy">
                  <input type="checkbox" checked={values.branches.includes(branch.code)} onChange={() => toggleRegionalBranch(branch.code)} className="h-3.5 w-3.5 rounded border-gray-300 text-[#245bc1] focus:ring-[#245bc1]" />
                  <span className="truncate">{branch.name || branch.code.replace("LMIT-HS-", "")}</span>
                </label>
              ))}
            </div>
          </div> : <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-[#21264E]">All zones</p>
            <p className="mt-1 text-xs text-gray-500">This role automatically receives access to all branches and zones.</p>
          </div>}

          {!editing && <div className="space-y-3 rounded-lg border border-brand-navy/10 p-4">
            <Label className="font-semibold text-brand-navy">Tool access</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {tools.map((tool) => (
                <label key={tool.key} className="flex items-center gap-2 text-sm text-brand-navy">
                  <Checkbox checked={values.tools.includes(tool.key)} onCheckedChange={(checked) => setField("tools", checked ? [...values.tools, tool.key] : values.tools.filter((key) => key !== tool.key))} />
                  {tool.name}
                </label>
              ))}
            </div>
          </div>}

          <div className="space-y-3">
            <Toggle label="Account status" description="Inactive users cannot sign in" checked={values.isActive} onChange={(checked) => setField("isActive", checked)} />
            <Toggle label="PDF export permission" description="Allow this user to export retailer data as PDF" checked={values.pdfExportEnabled} onChange={(checked) => setField("pdfExportEnabled", checked)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending && <Spinner className="mr-2 h-4 w-4" />}{editing ? "Save changes" : "Create user"}</Button>
          </DialogFooter>
        </form>
      </div>
  )

  if (page) return <div className="mx-auto w-full max-w-4xl">{content}</div>

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">{content}</DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><Label className="text-xs font-semibold uppercase tracking-wider text-brand-navy">{label}</Label>{children}</div>
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"><div><p className="text-sm font-semibold text-[#21264E]">{label}</p><p className="text-[11px] text-gray-400">{description}</p></div><button type="button" onClick={() => onChange(!checked)} aria-pressed={checked} className={`relative h-6 w-12 rounded-full transition-colors duration-200 focus:outline-none ${checked ? "bg-[#08DC7D]" : "bg-gray-300"}`}><span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-6" : "translate-x-0"}`} /></button></div>
}
