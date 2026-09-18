"use client"

import Link from "next/link"
import { ArrowLeft, Pencil, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { NewContractForm } from "@/components/contracts/new-contract-form"
import { ContractSignPanel } from "@/components/contracts/contract-sign-panel"
import { ContractActions } from "@/components/contracts/contract-actions"
import { useI18n } from "@/lib/i18n/i18n-context"
import type { AppUser, Contract } from "@/lib/types"

interface ContractDetailContentProps {
  contract: Contract
  user: AppUser
  isEdit: boolean
}

export function ContractDetailContent({ contract, user, isEdit }: ContractDetailContentProps) {
  const { t, language } = useI18n()

  const statusTone =
    contract.status === "SIGNED"
      ? "bg-[#08dc7d] text-[#21264e] hover:bg-[#08dc7d]"
      : contract.status === "PENDING"
        ? "bg-[#ffc8b2] text-[#21264e] hover:bg-[#ffc8b2]"
        : "bg-muted"

  const statusLabel = 
    contract.status === "SIGNED" ? t("signedContracts") :
    contract.status === "PENDING" ? t("pendingContracts") :
    t("generated")

  const dateFormat = language === "en" ? "en-GB" : "it-IT"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/tools/contracts/contracts">
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t("back")}
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {contract.company_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {contract.shop_name} · {t("created")}{" "}
              {new Date(contract.created_at).toLocaleDateString(dateFormat)}
            </p>
          </div>
        </div>
        <Badge className={statusTone}>{statusLabel}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {isEdit && contract.status !== "SIGNED" ? (
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{t("editContractTitle")}</CardTitle>
                <CardDescription>
                  {t("editContractDesc")}
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="icon" aria-label="Cancel edit">
                <Link href={`/tools/contracts/contracts/${contract.id}`}>
                  <X className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <NewContractForm
                currentUser={user}
                mode="edit"
                contractId={contract.id}
                initialValues={contract}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{t("retailerDetails")}</CardTitle>
                <CardDescription>{t("contractMetadataDesc")}</CardDescription>
              </div>
              {contract.status !== "SIGNED" ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/tools/contracts/contracts/${contract.id}?edit=1`}>
                    <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t("edit")}
                  </Link>
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-3 text-sm">
                <Row label={t("company")} value={contract.company_name} />
                <Row label={t("vatNumberLabel")} value={contract.vat_number} />
                <Row
                  label={t("contactFirstName")}
                  value={`${contract.contact_first_name} ${contract.contact_last_name}`}
                />
                <Row
                  label={t("street")}
                  value={`${contract.street} ${contract.house_number}, ${contract.post_code} ${contract.city}`}
                />
                <Row label={t("mobile")} value={contract.mobile_number} />
                <Row label={t("landline")} value={contract.landline_number ?? "—"} />
                <Row label={t("emailLabel")} value={contract.email} />
                <Row label={t("branch")} value={contract.branch ?? "—"} />
                <Row label={t("zone")} value={contract.zone ?? "—"} />
                {contract.signed_at ? (
                  <Row
                    label={t("signedContracts")}
                    value={new Date(contract.signed_at).toLocaleString(dateFormat)}
                  />
                ) : null}
                {contract.emailed_at ? (
                  <Row
                    label={t("emailed")}
                    value={new Date(contract.emailed_at).toLocaleString(dateFormat)}
                  />
                ) : null}
              </dl>
            </CardContent>
          </Card>
        )}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {contract.status !== "SIGNED" && (
            <Card>
              <CardHeader>
                <CardTitle>{t("draftActions")}</CardTitle>
                <CardDescription>
                  {t("draftActionsDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContractActions contractId={contract.id} status={contract.status} />
              </CardContent>
            </Card>
          )}

          {contract.status !== "SIGNED" ? (
            <ContractSignPanel contractId={contract.id} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t("signedContractTitle")}</CardTitle>
                <CardDescription>
                  {t("signedContractDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContractActions contractId={contract.id} status={contract.status} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="break-words font-medium">{value}</dd>
    </div>
  )
}
