"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, KeyRound, Home, LayoutGrid, LifeBuoy, BarChart3, FileSignature, Receipt, Users, Menu, X } from "lucide-react"
import { HomeSidebarApp } from "@/components/home/home-sidebar-app"
import { PasswordChangeForm } from "@/components/dashboard/password-change-form"
import { MobileToolNav } from "@/components/dashboard/mobile-tool-nav"
import { HomeHeader } from "@/components/home/home-header"
import { useI18n } from "@/lib/i18n/i18n-context"
import type { PlatformTool } from "@/lib/auth"

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3,
  FileSignature,
  Receipt,
  LifeBuoy,
}

const TOOL_LABELS: Record<string, "toolFieldIq" | "toolContracts" | "toolIncentive" | "toolAssistance"> = {
  field_iq: "toolFieldIq",
  contracts: "toolContracts",
  incentive: "toolIncentive",
  assistance: "toolAssistance",
}

function MobileToolLink({ tool, className, onClick, children }: { tool: PlatformTool; className: string; onClick?: () => void; children: React.ReactNode }) {
  if (tool.key === "assistance") {
    return <a href={tool.route} onClick={onClick} className={className}>{children}</a>
  }
  return <Link href={tool.route} onClick={onClick} className={className}>{children}</Link>
}

export function ChangePasswordContent({
  user,
  tools,
  admin,
}: {
  user: { full_name: string; email: string; role: string }
  tools: PlatformTool[]
  admin: boolean
}) {
  const { t } = useI18n()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <main className="min-h-dvh bg-[#f4f7fb] pb-16 lg:flex lg:h-dvh lg:overflow-hidden lg:pb-0">
      <div className="h-14 shrink-0 lg:hidden" />
      <header className="fixed inset-x-0 top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between bg-[#21264e] px-4 pt-[env(safe-area-inset-top)] lg:hidden">
        <img src="/lops.svg" alt="LycaOps" className="h-8 w-auto object-contain" />
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open navigation"
          className="rounded-lg p-1.5 text-white hover:bg-white/10"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-[80] flex lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative flex w-72 max-w-[82%] flex-col overflow-hidden bg-[#21264e] px-6 py-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] text-white shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex w-full justify-start shrink-0">
              <img src="/lops.svg" alt="LycaOps" className="relative h-auto w-44 object-contain" />
            </div>
            <div className="mt-8 flex min-h-0 flex-1 flex-col overflow-hidden">
              <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
                <Link href="/home" onClick={() => setMobileSidebarOpen(false)} className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-medium text-white">
                  <Home className="h-4 w-4" /> {t("home")}
                </Link>
                <p className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">{t("yourWorkspace")}</p>
                {tools.map((tool) => {
                  const Icon = ICONS[tool.icon ?? ""] ?? LayoutGrid
                  return <MobileToolLink key={tool.key} tool={tool} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/65 transition hover:bg-white/10 hover:text-white" onClick={() => setMobileSidebarOpen(false)}><Icon className="h-4 w-4" />{TOOL_LABELS[tool.key] ? t(TOOL_LABELS[tool.key]) : tool.name}</MobileToolLink>
                })}
                <p className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">{t("account")}</p>
                {admin && (
                  <Link href="/admin/users" onClick={() => setMobileSidebarOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/65 transition hover:bg-white/10 hover:text-white">
                    <Users className="h-4 w-4" /> {t("userManagement")}
                  </Link>
                )}
                <Link
                  href="/home/change-password"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="flex w-full items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-medium text-white text-left"
                >
                  <KeyRound className="h-4 w-4" /> {t("changePassword")}
                </Link>
              </nav>
            </div>
            <div className="shrink-0 border-t border-white/10 pt-5 mt-5">
              <p className="truncate text-sm font-medium">{user.full_name}</p>
              <p className="mt-1 truncate text-xs text-white/45">{user.role}</p>
              <HomeHeader user={user} sidebarMode />
            </div>
          </aside>
        </div>
      )}
      <HomeSidebarApp user={user} tools={tools} admin={admin} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 lg:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/home"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#006AE0] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("backToHome")}
            </Link>
          </div>

          <div className="mx-auto w-full max-w-xl">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 md:px-7 md:py-5 border-b border-slate-100 flex items-center gap-3" style={{ backgroundColor: "#21264e" }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-white shrink-0">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-semibold text-white">{t("changePassword")}</h1>
                  <p className="text-xs md:text-sm text-white/60">Update the password for your account</p>
                </div>
              </div>
              <div className="px-5 py-6 md:px-7 md:py-7">
                <PasswordChangeForm
                  onSuccess={() => {
                    if (typeof window !== "undefined") {
                      window.location.href = "/home"
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <MobileToolNav />
    </main>
  )
}

export default ChangePasswordContent
