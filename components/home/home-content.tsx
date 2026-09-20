"use client"

import Link from "next/link"
import { ArrowRight, BarChart3, FileSignature, Home, LayoutGrid, LifeBuoy, Receipt, Users } from "lucide-react"
import { useI18n } from "@/lib/i18n/i18n-context"
import { HomeHeader } from "@/components/home/home-header"
import { MobileToolNav } from "@/components/dashboard/mobile-tool-nav"
import type { PlatformTool } from "@/lib/auth"

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3,
  FileSignature,
  Receipt,
  LifeBuoy,
}

const LOGOS: Record<string, string> = {
  field_iq: "/fiq.png",
  contracts: "/rcm.png",
  incentive: "/statement.png",
  assistance: "/lmac.png",
}

const TOOL_LABELS: Record<string, "toolFieldIq" | "toolContracts" | "toolIncentive" | "toolAssistance"> = {
  field_iq: "toolFieldIq",
  contracts: "toolContracts",
  incentive: "toolIncentive",
  assistance: "toolAssistance",
}

export function HomeContent({
  user,
  tools,
  admin,
}: {
  user: { full_name: string; email: string; role: string }
  tools: PlatformTool[]
  admin: boolean
}) {
  const { t } = useI18n()
  const firstName = user.full_name?.split(" ")[0] ?? "there"

  return (
    <main className="min-h-dvh bg-[#f4f7fb] pb-16 lg:flex lg:pb-0">
      <aside className="relative hidden w-72 shrink-0 flex-col overflow-hidden bg-[#21264e] px-6 py-6 text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:max-h-dvh">
        <img src="/h2.svg" alt="" aria-hidden="true" className="pointer-events-none absolute -bottom-8 -right-28 h-72 w-72 opacity-20" />
        <img src="/h1.svg" alt="" aria-hidden="true" className="pointer-events-none absolute bottom-28 -right-24 h-64 w-64 opacity-[.15]" />
        <div>
          <img src="/lops.svg" alt="LycaOps" className="relative h-auto w-44 rounded-md bg-white px-3 py-2" />
        </div>
        <nav className="mt-8 flex flex-col gap-1">
          <Link href="/home" className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-medium text-white">
            <Home className="h-4 w-4" /> {t("home")}
          </Link>
          <p className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">{t("yourWorkspace")}</p>
          {tools.map((tool) => {
            const Icon = ICONS[tool.icon ?? ""] ?? LayoutGrid
            return <Link key={tool.key} href={tool.route} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/65 transition hover:bg-white/10 hover:text-white"><Icon className="h-4 w-4" />{TOOL_LABELS[tool.key] ? t(TOOL_LABELS[tool.key]) : tool.name}</Link>
          })}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-5">
          {admin && (
            <Link href="/admin/users" className="mb-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white">
              <Users className="h-4 w-4" /> {t("userManagement")}
            </Link>
          )}
          <p className="truncate text-sm font-medium">{user.full_name}</p>
          <p className="mt-1 truncate text-xs text-white/45">{user.role}</p>
          <HomeHeader user={user} sidebarMode />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="border-b border-[#21264e]/10 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-[#245BC1]">{t("workspaceTitle")}</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#21264E]">{t("welcomeBack")}, {firstName}</h1>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 py-10">
          <header className="mb-8">
            <p className="max-w-2xl text-sm leading-relaxed text-[#21264E]/70">{t("chooseTool")}</p>
          </header>

          {tools.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#21264E]/20 bg-white p-10 text-center">
              <LayoutGrid className="mx-auto h-8 w-8 text-[#21264E]/40" />
              <h2 className="mt-3 text-lg font-medium text-[#21264E]">{t("noToolsAssigned")}</h2>
              <p className="mt-1 text-sm text-[#21264E]/60">{t("noToolsAssignedDesc")}</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6">
                {tools.map((tool) => {
                  const Icon = ICONS[tool.icon ?? ""] ?? LayoutGrid
                  const accent = tool.accent_color ?? "#245BC1"
                  return (
                    <Link key={tool.key} href={tool.route} className="group relative flex min-h-[245px] flex-col overflow-hidden rounded-[1.75rem] bg-white p-5 shadow-[0_10px_30px_rgba(33,38,78,0.07)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(33,38,78,0.13)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#245BC1] sm:min-h-[270px] sm:p-6">
                      <span aria-hidden className="absolute right-0 top-0 h-1.5 w-24 rounded-bl-full" style={{ backgroundColor: accent }} />
                      <div className="flex items-start justify-between gap-4">
                        <div className="pt-1"><h2 className="text-xl font-semibold leading-tight tracking-tight text-[#21264E] sm:text-2xl">{TOOL_LABELS[tool.key] ? t(TOOL_LABELS[tool.key]) : tool.name}</h2></div>
                        <div className="flex h-[78px] w-[92px] shrink-0 items-center justify-center p-1 sm:h-[94px] sm:w-[112px]">{LOGOS[tool.key] ? <img src={LOGOS[tool.key] as string} alt="" className="h-full w-full object-contain" /> : <Icon className="h-9 w-9" style={{ color: accent }} />}</div>
                      </div>
                      <p className="mt-7 max-w-sm text-sm leading-relaxed text-[#21264E]/65 sm:mt-8">{tool.description}</p>
                      <div className="mt-auto flex items-center justify-between border-t border-[#21264E]/10 pt-4"><span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>{t("openTool")}</span><span className="flex h-9 w-9 items-center justify-center rounded-full transition group-hover:translate-x-0.5" style={{ backgroundColor: `${accent}18`, color: accent }}><ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span></div>
                    </Link>
                  )
                })}
              </div>
              <p className="mt-8 text-center text-xs font-semibold tracking-wide"><span className="text-[#21264E]">{t("poweredBy")} </span><span className="text-[#08DC7D]">LycaOps</span></p>
            </>
          )}
        </div>
      </div>
      <MobileToolNav />
    </main>
  )
}
