"use client"

import { useState, useTransition, type FormEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BRANCHES, ZONES_BY_BRANCH, type Branch } from "@/lib/branches"
import { createContractAction, updateContractAction } from "@/app/tools/contracts/contracts/actions"
import { useI18n } from "@/lib/i18n/i18n-context"
import type { AppUser, Contract } from "@/lib/types"

const initial = {
  company_name: "",
  vat_number: "",
  contact_first_name: "",
  contact_last_name: "",
  shop_name: "",
  street: "",
  house_number: "",
  city: "",
  post_code: "",
  landline_number: "",
  mobile_number: "",
  email: "",
  branch: "" as string,
  zone: "" as string,
}

type FormValues = typeof initial

function toLocalPhone(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "")
  if (digits.startsWith("39") && digits.length >= 12) return digits.slice(2, 12)
  return digits.slice(0, 10)
}

export function NewContractForm({
  currentUser,
  mode = "create",
  contractId,
  initialValues,
}: {
  currentUser: AppUser
  mode?: "create" | "edit"
  contractId?: string
  initialValues?: Partial<Pick<
    Contract,
    | "company_name"
    | "vat_number"
    | "contact_first_name"
    | "contact_last_name"
    | "shop_name"
    | "street"
    | "house_number"
    | "city"
    | "post_code"
    | "landline_number"
    | "mobile_number"
    | "email"
    | "branch"
    | "zone"
  >>
}) {
  const router = useRouter()
  const { t } = useI18n()
  const rsmBranches = BRANCHES.filter((b) => (currentUser.branches ?? []).includes(b))
  const allowedBranches = currentUser.role === "RSM" ? rsmBranches : BRANCHES
  const defaultBranch =
    initialValues?.branch ??
    currentUser.branch ??
    (currentUser.role === "RSM" ? (allowedBranches[0] ?? "") : "")
  const [values, setValues] = useState<FormValues>(() => ({
    ...initial,
    company_name: initialValues?.company_name ?? "",
    vat_number: initialValues?.vat_number ?? "",
    contact_first_name: initialValues?.contact_first_name ?? "",
    contact_last_name: initialValues?.contact_last_name ?? "",
    shop_name: initialValues?.shop_name ?? "",
    street: initialValues?.street ?? "",
    house_number: initialValues?.house_number ?? "",
    city: initialValues?.city ?? "",
    post_code: initialValues?.post_code ?? "",
    landline_number: toLocalPhone(initialValues?.landline_number),
    mobile_number: toLocalPhone(initialValues?.mobile_number),
    email: initialValues?.email ?? "",
    branch: defaultBranch,
    zone: initialValues?.zone ?? currentUser.zone ?? "",
  }))
  const [pending, startTransition] = useTransition()

  const canEditBranch = currentUser.role === "ADMIN" || currentUser.role === "RSM"
  const canEditZone =
    currentUser.role === "ADMIN" || currentUser.role === "ASM" || currentUser.role === "RSM"
  const zones = values.branch
    ? (ZONES_BY_BRANCH[values.branch as Branch] ?? [])
    : []

  function update<K extends keyof typeof values>(key: K, v: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [key]: v }))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (currentUser.role === "RSM" && allowedBranches.length === 0) {
      toast.error(t("noBranchesAssigned"))
      return
    }

    const mobileClean = values.mobile_number.replace(/\D/g, "")
    const landlineClean = values.landline_number.replace(/\D/g, "")
    const postCodeClean = values.post_code.replace(/\D/g, "")

    if (mobileClean.length !== 10) {
      toast.error(t("mobileDigitsError"))
      return
    }
    if (landlineClean && landlineClean.length !== 10) {
      toast.error(t("landlineDigitsError"))
      return
    }
    if (postCodeClean.length !== 5) {
      toast.error(t("postCodeDigitsError"))
      return
    }

    const email = values.email.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error(t("validEmailError"))
      return
    }

    startTransition(async () => {
      const payload = {
        company_name: values.company_name.trim(),
        vat_number: values.vat_number.trim(),
        contact_first_name: values.contact_first_name.trim(),
        contact_last_name: values.contact_last_name.trim(),
        shop_name: values.shop_name.trim(),
        street: values.street.trim(),
        house_number: values.house_number.trim(),
        city: values.city.trim(),
        post_code: postCodeClean,
        landline_number: landlineClean ? `+39${landlineClean}` : null,
        mobile_number: `+39${mobileClean}`,
        email: email,
        branch: values.branch || null,
        zone: values.zone || null,
      }

      if (mode === "edit") {
        if (!contractId) {
          toast.error(t("missingContractId"))
          return
        }
        const res = await updateContractAction({ id: contractId, ...payload })
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        toast.success(t("contractUpdated"))
        router.push(`/tools/contracts/contracts/${contractId}`)
        router.refresh()
        return
      }

      const res = await createContractAction(payload)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(t("contractCreated"))
      router.push(`/tools/contracts/contracts/${res.data!.id}`)
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={t("companyName")} required>
          <Input
            value={values.company_name}
            onChange={(e) => {
              const val = e.target.value
              setValues((prev) => ({
                ...prev,
                company_name: val,
                shop_name: val,
              }))
            }}
            required
          />
        </Field>
        <Field label={t("vatNumberLabel")} required>
          <Input
            type="tel"
            inputMode="numeric"
            value={values.vat_number}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 11)
              update("vat_number", v)
            }}
            placeholder={t("vatNumberPlaceholder")}
            required
          />
        </Field>
        <Field label={t("contactFirstName")} required>
          <Input
            value={values.contact_first_name}
            onChange={(e) => update("contact_first_name", e.target.value)}
            required
          />
        </Field>
        <Field label={t("contactLastName")} required>
          <Input
            value={values.contact_last_name}
            onChange={(e) => update("contact_last_name", e.target.value)}
            required
          />
        </Field>
        <Field label={t("shopName")} required className="md:col-span-2">
          <Input
            value={values.shop_name}
            onChange={(e) => update("shop_name", e.target.value)}
            required
          />
        </Field>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Field label={t("street")} required className="md:col-span-3">
          <Input
            value={values.street}
            onChange={(e) => update("street", e.target.value)}
            required
          />
        </Field>
        <Field label={t("houseNumber")} required>
          <Input
            value={values.house_number}
            onChange={(e) => update("house_number", e.target.value)}
            required
          />
        </Field>
        <Field label={t("city")} required className="md:col-span-3">
          <Input
            value={values.city}
            onChange={(e) => update("city", e.target.value)}
            required
          />
        </Field>
        <Field label={t("postCode")} required>
          <Input
            type="tel"
            inputMode="numeric"
            value={values.post_code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 5)
              update("post_code", v)
            }}
            placeholder="00000"
            required
          />
        </Field>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={t("landline")}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              +39
            </span>
            <Input
              type="tel"
              inputMode="numeric"
              value={values.landline_number}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 10)
                update("landline_number", v)
              }}
              className="pl-12"
            />
          </div>
        </Field>
        <Field label={t("mobile")} required>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              +39
            </span>
            <Input
              type="tel"
              inputMode="numeric"
              value={values.mobile_number}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 10)
                update("mobile_number", v)
              }}
              className="pl-12"
              required
            />
          </div>
        </Field>
        <Field label={t("emailLabel")} required className="md:col-span-2">
          <Input
            type="email"
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
            required
          />
        </Field>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={t("branch")} required>
          <Select
            disabled={!canEditBranch}
            value={values.branch}
            onValueChange={(v) => {
              update("branch", v)
              update("zone", "")
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("selectBranch")} />
            </SelectTrigger>
            <SelectContent>
              {allowedBranches.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("zone")} required>
          <Select
            disabled={!canEditZone || !values.branch}
            value={values.zone}
            onValueChange={(v) => update("zone", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("selectZone")} />
            </SelectTrigger>
            <SelectContent>
              {zones.map((z) => (
                <SelectItem key={z} value={z}>
                  {z}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </section>

      <Button type="submit" size="lg" disabled={pending} className="mt-4">
        {pending ? (
          <Spinner className="mr-2 h-4 w-4" />
        ) : mode === "edit" ? (
          t("saveChanges")
        ) : (
          t("createContract")
        )}
      </Button>
    </form>
  )
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string
  required?: boolean
  className?: string
  children: ReactNode
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-")
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <div id={id}>{children}</div>
    </div>
  )
}
