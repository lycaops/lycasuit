"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BRANCHES, ROLES, ZONES_BY_BRANCH, type Branch, type Role } from "@/lib/branches"

interface Values {
  full_name: string
  email: string
  password?: string
  role: Role
  branch: string | null
  branches?: string[] | null
  zone: string | null
}

interface Props {
  values: Values
  onChange: (patch: Partial<Values>) => void
  includePassword?: boolean
  emailDisabled?: boolean
}

export function UserFormFields({
  values,
  onChange,
  includePassword,
  emailDisabled,
}: Props) {
  const zones = values.branch
    ? (ZONES_BY_BRANCH[values.branch as Branch] ?? [])
    : []

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="full_name" className="text-xs font-semibold text-brand-navy uppercase tracking-wider">Full name</Label>
          <Input
            id="full_name"
            value={values.full_name}
            onChange={(e) => onChange({ full_name: e.target.value })}
            required
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-xs font-semibold text-brand-navy uppercase tracking-wider">Email address</Label>
          <Input
            id="email"
            type="email"
            value={values.email}
            disabled={emailDisabled}
            onChange={(e) => onChange({ email: e.target.value })}
            required
            className="h-9"
          />
        </div>
      </div>

      {includePassword ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password" title="Temporary password" className="text-xs font-semibold text-brand-navy uppercase tracking-wider">Temporary password</Label>
          <Input
            id="password"
            type="password"
            minLength={6}
            value={values.password ?? ""}
            onChange={(e) => onChange({ password: e.target.value })}
            required
            className="h-9"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-brand-navy uppercase tracking-wider">Assigned Role</Label>
          <Select
            value={values.role}
            onValueChange={(v) =>
              onChange({
                role: v as Role,
                branch: v === "ASM" || v === "FSE" ? values.branch : null,
                branches: v === "RSM" ? (values.branches ?? []) : null,
                zone: v === "FSE" ? values.zone : null,
              })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {values.role !== "RSM" && values.role !== "ADMIN" ? (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-brand-navy uppercase tracking-wider">Primary Branch</Label>
            <Select
              value={values.branch ?? ""}
              onValueChange={(v) =>
                onChange({ branch: v, zone: null })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {BRANCHES.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {values.role === "RSM" ? (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-brand-navy uppercase tracking-wider">Regional Assignments</Label>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-white p-3 shadow-sm">
            {BRANCHES.map((b) => {
              const checked = (values.branches ?? []).includes(b)
              return (
                <label key={b} className="flex items-center gap-2 text-xs font-medium text-brand-navy cursor-pointer hover:text-brand-navy/70 transition-colors">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) => {
                      const nextChecked = next === true
                      const set = new Set(values.branches ?? [])
                      if (nextChecked) set.add(b)
                      else set.delete(b)
                      onChange({ branches: Array.from(set) })
                    }}
                  />
                  <span className="truncate">{b.replace("LMIT-HS-", "")}</span>
                </label>
              )
            })}
          </div>
        </div>
      ) : null}

      {values.role === "FSE" ? (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-brand-navy uppercase tracking-wider">Assigned Zone</Label>
          <Select
            value={values.zone ?? ""}
            onValueChange={(v) => onChange({ zone: v })}
            disabled={!values.branch}
          >
            <SelectTrigger className="h-9">
              <SelectValue
                placeholder={values.branch ? "Select zone" : "Select a branch first"}
              />
            </SelectTrigger>
            <SelectContent>
              {zones.map((z) => (
                <SelectItem key={z} value={z}>
                  {z}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  )
}
