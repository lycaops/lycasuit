"use client"

import Link from "next/link"
import {
  CheckCircle2,
  Clock,
  FilePlus2,
  FileText,
  Store,
  ArrowUpRight,
} from "lucide-react"
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
    <div className="flex flex-col gap-5">
      <section className="relative overflow-hidden rounded-2xl bg-[#21264e] px-5 py-6 text-white shadow-[0_16px_40px_rgba(33,38,78,0.16)] sm:px-7 sm:py-7">
        <img src="/h1.svg" alt="" aria-hidden="true" className="pointer-events-none absolute -right-12 -top-6 h-32 w-32 opacity-20" />
        <img src="/h2.svg" alt="" aria-hidden="true" className="pointer-events-none absolute right-4 top-8 h-32 w-32 opacity-[.15]" />
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#08dc7d]">Retailer contracts</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("welcomeBack")}, {user.full_name.split(" ")[0]}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/65">Create, review, and manage retailer contracts from one focused workspace.</p>
          <Button asChild className="mt-5 bg-[#08dc7d] text-[#21264e] hover:bg-[#35e991]">
            <Link href="/tools/contracts/contracts/new">
              <FilePlus2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Create a new contract
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((s) => (
          <div key={s.key} className="rounded-xl border border-[#21264e]/10 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">{t(s.key as any)}</span>
              <s.icon className="h-4 w-4 text-[#245bc1]" aria-hidden="true" />
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums text-[#21264e]">{s.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-[#21264e]/10 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-[#21264e]/10 px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-semibold text-[#21264e]">{t("recentContracts")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Your latest retailer activity</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-[#245bc1]">
            <Link href="/tools/contracts/contracts">View all<ArrowUpRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="px-5 sm:px-6">
          {recentRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">No contracts yet. Start with your first retailer contract.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#21264e]/10">
              {recentRows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <Link href={`/tools/contracts/contracts/${r.id}`} className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[#21264e]">{r.company_name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.shop_name} · {r.city}{r.zone ? ` · ${r.zone}` : ""}</span>
                  </Link>
                  <StatusBadge status={r.status} t={t} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
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
