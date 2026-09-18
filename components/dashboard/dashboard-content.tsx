"use client"

import Link from "next/link"
import {
  CheckCircle2,
  Clock,
  FilePlus2,
  FileText,
  Store,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/i18n-context"
import type { Contract, AppUser } from "@/lib/types"

interface DashboardContentProps {
  user: AppUser
  counts: {
    total: number
    signed: number
    pending: number
    generated: number
  }
  recentRows: Pick<
    Contract,
    "id" | "company_name" | "shop_name" | "city" | "status" | "created_at" | "branch" | "zone"
  >[]
}

export function DashboardContent({ user, counts, recentRows }: DashboardContentProps) {
  const { t } = useI18n()

  const summary = [
    {
      key: "totalRetailers",
      value: counts.total,
      icon: Store,
      tone: "bg-[#245bc1] text-white",
    },
    {
      key: "signedContracts",
      value: counts.signed,
      icon: CheckCircle2,
      tone: "bg-[#08dc7d] text-[#21264e]",
    },
    {
      key: "pendingContracts",
      value: counts.pending,
      icon: Clock,
      tone: "bg-[#ffc8b2] text-[#21264e]",
    },
    {
      key: "generated",
      value: counts.generated,
      icon: FilePlus2,
      tone: "bg-[#21264e] text-[#fff7f2]",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("welcomeBack")}, {user.full_name.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("dashboardOverview")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => (
          <Card key={s.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(s.key as any)}
              </CardTitle>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.tone}`}
              >
                <s.icon className="h-4 w-4" aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("recentContracts")}</CardTitle>
            <CardDescription>
              {t("dashboardOverview")}
            </CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href="/tools/contracts/contracts/new">
              <FilePlus2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t("newContract")}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="text-sm text-muted-foreground">
                No contracts yet. Create your first retailer contract.
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href="/tools/contracts/contracts/new">Create contract</Link>
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col divide-y">
              {recentRows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex min-w-0 flex-col">
                    <Link
                      href={`/tools/contracts/contracts/${r.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {r.company_name}
                    </Link>
                    <span className="truncate text-xs text-muted-foreground">
                      {r.shop_name} · {r.city}
                      {r.zone ? ` · ${r.zone}` : ""}
                    </span>
                  </div>
                  <StatusBadge status={r.status} t={t} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status, t }: { status: Contract["status"]; t: any }) {
  if (status === "SIGNED")
    return (
      <Badge className="bg-[#08dc7d] text-[#21264e] hover:bg-[#08dc7d]">{t("signedContracts")}</Badge>
    )
  if (status === "PENDING")
    return (
      <Badge className="bg-[#ffc8b2] text-[#21264e] hover:bg-[#ffc8b2]">{t("pendingContracts")}</Badge>
    )
  return <Badge variant="secondary">{t("generated")}</Badge>
}
