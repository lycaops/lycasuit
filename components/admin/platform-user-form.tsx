"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createPlatformUser, updatePlatformUser } from "@/app/admin/users/actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import { Pencil, Plus } from "lucide-react"

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
  designation: string | null
  territory: string | null
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

const ADMIN_ROLES = ["SUPER-ADMIN", "HS-ADMIN", "PM-ADMIN", "CS-ADMIN", "COUNTRY-MANAGER", "UK-ADMIN"]
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
  designation: string
  territory: string
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
  designation: "",
  territory: "",
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
  open,
  onOpenChange,
}: {
  user: PlatformUserRow | null
  roles: PlatformRole[]
  tools: PlatformTool[]
  branches: PlatformBranch[]
  open: boolean
  onOpenChange: (open: boolean) => void
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
            branches: user.branches ?? (user.branch ? [user.branch] : []),
            zone: user.zone ?? "",
            designation: user.designation ?? "",
            territory: user.territory ?? "",
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
      branches: ADMIN_ROLES.includes(role) ? branches.map((branch) => branch.code) : current.branches,
      zone: role === "ZONE-MANAGER" ? current.zone : "",
    }))
  }

  function toggleBranch(code: string) {
    setValues((current) => ({
      ...current,
      branches: current.branches.includes(code)
        ? current.branches.filter((branch) => branch !== code)
        : [...current.branches, code],
    }))
  }

  function selectRegion(codes: string[]) {
    setField("branches", codes.filter((code) => branches.some((branch) => branch.code === code)))
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
    if (!ADMIN_ROLES.includes(values.role) && values.branches.length === 0) {
      toast.error("Select at least one branch.")
      return
    }
    if (values.role === "ASM" && values.branches.length > 1) {
      toast.error("Area Managers can only have one branch.")
      return
    }
    if (values.role === "ZONE-MANAGER" && (!values.zone.trim() || values.branches.length !== 1)) {
      toast.error("Zone Managers require one branch and a zone.")
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
            designation: values.designation || null,
            territory: values.territory || null,
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
            designation: values.designation || null,
            territory: values.territory || null,
            mobileNumber: values.mobileNumber || null,
            tools: values.tools,
          })

      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(editing ? "User updated" : "User created")
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-navy">
            {editing ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {editing ? "Edit user" : "Add user"}
          </DialogTitle>
          <DialogDescription>
            {editing ? "Update identity, territory, permissions, and security settings." : "Create one account for the selected Lyca Suite tools."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name"><Input value={values.fullName} onChange={(e) => setField("fullName", e.target.value)} required /></Field>
            <Field label="Email address"><Input type="email" value={values.email} onChange={(e) => setField("email", e.target.value)} required /></Field>
            <Field label="Username"><Input value={values.username} onChange={(e) => setField("username", e.target.value)} /></Field>
            {!editing && <Field label="Temporary password"><Input type="password" minLength={8} value={values.password} onChange={(e) => setField("password", e.target.value)} required /></Field>}
            <Field label="Role">
              <select value={values.role} onChange={(e) => setRole(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                {roles.map((role) => <option key={role.code} value={role.code}>{role.label}</option>)}
              </select>
            </Field>
            <Field label="Mobile number"><Input value={values.mobileNumber} onChange={(e) => setField("mobileNumber", e.target.value)} /></Field>
            <Field label="Designation"><Input value={values.designation} onChange={(e) => setField("designation", e.target.value)} placeholder="e.g. Zone Manager" /></Field>
            <Field label="Territory"><Input value={values.territory} onChange={(e) => setField("territory", e.target.value)} placeholder="e.g. North Region" /></Field>
            <Field label="Zone"><Input value={values.zone} onChange={(e) => setField("zone", e.target.value)} /></Field>
          </div>

          <div className="space-y-3 rounded-lg border border-brand-navy/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="font-semibold text-brand-navy">Assigned branches</Label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => selectRegion(NORTH_BRANCHES)}>North</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => selectRegion(SOUTH_BRANCHES)}>South</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => selectRegion(branches.map((branch) => branch.code))}>All</Button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
              {branches.map((branch) => (
                <label key={branch.code} className="flex items-center gap-2 text-sm text-brand-navy">
                  <Checkbox checked={values.branches.includes(branch.code)} onCheckedChange={() => toggleBranch(branch.code)} />
                  <span className="truncate">{branch.name || branch.code.replace("LMIT-HS-", "")}</span>
                </label>
              ))}
            </div>
          </div>

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

          <div className="flex flex-wrap gap-5 rounded-lg border border-brand-navy/10 p-4">
            <label className="flex items-center gap-2 text-sm text-brand-navy"><Checkbox checked={values.isActive} onCheckedChange={(checked) => setField("isActive", checked === true)} /> Active account</label>
            <label className="flex items-center gap-2 text-sm text-brand-navy"><Checkbox checked={values.pdfExportEnabled} onCheckedChange={(checked) => setField("pdfExportEnabled", checked === true)} /> PDF export enabled</label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending && <Spinner className="mr-2 h-4 w-4" />}{editing ? "Save changes" : "Create user"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><Label className="text-xs font-semibold uppercase tracking-wider text-brand-navy">{label}</Label>{children}</div>
}
