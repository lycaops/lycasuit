import Link from "next/link"
import { BarChart3, FileSignature, Receipt, LifeBuoy, LayoutGrid, Users, ArrowRight, Home } from "lucide-react"
import { getMyTools, isPlatformAdmin, requirePlatformUser } from "@/lib/auth"
import { HomeHeader } from "@/components/home/home-header"
import { MobileToolNav } from "@/components/dashboard/mobile-tool-nav"

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

export default async function HomePage() {
  const user = await requirePlatformUser()
  const tools = await getMyTools()
  const admin = isPlatformAdmin(user)

  const firstName = user.full_name?.split(" ")[0] ?? "there"

  return (
    <main className="min-h-dvh bg-[#f4f7fb] pb-16 lg:flex lg:pb-0">
      <aside className="hidden w-72 shrink-0 flex-col bg-[#21264e] px-6 py-6 text-white lg:flex lg:min-h-dvh">
        <div className="flex items-center justify-between lg:block">
          <img src="/logo.png" alt="Lyca Suite" className="h-9 w-auto" />
          <p className="mt-2 hidden text-xs uppercase tracking-[0.2em] text-white/45 lg:block">Lyca Ops</p>
        </div>
        <nav className="mt-8 flex gap-2 overflow-x-auto lg:flex-col">
          <Link href="/home" className="flex shrink-0 items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-medium text-white">
            <Home className="h-4 w-4" /> Home
          </Link>
          <p className="hidden px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 lg:block">Your workspace</p>
          {tools.map((tool) => {
            const Icon = ICONS[tool.icon ?? ""] ?? LayoutGrid
            return <Link key={tool.key} href={tool.route} className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/65 transition hover:bg-white/10 hover:text-white"><Icon className="h-4 w-4" />{tool.name}</Link>
          })}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-5">
          {admin && (
            <Link href="/admin/users" className="mb-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white">
              <Users className="h-4 w-4" />
              User Management
            </Link>
          )}
          <p className="truncate text-sm font-medium">{user.full_name}</p>
          <p className="mt-1 truncate text-xs text-white/45">{user.role}</p>
          <HomeHeader user={{ full_name: user.full_name, email: user.email, role: user.role }} sidebarMode />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="border-b border-[#21264e]/10 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-[#245BC1]">Lyca Suite workspace</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#21264E]">Welcome back, {firstName}</h1>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 py-10">
          <header className="mb-8">
            <p className="max-w-2xl text-sm leading-relaxed text-[#21264E]/70">Choose a tool to open. Your single sign-on covers every tool you have been granted.</p>
          </header>

        {tools.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#21264E]/20 bg-white p-10 text-center">
            <LayoutGrid className="mx-auto h-8 w-8 text-[#21264E]/40" />
            <h2 className="mt-3 text-lg font-medium text-[#21264E]">No tools assigned yet</h2>
            <p className="mt-1 text-sm text-[#21264E]/60">
              An administrator needs to grant you access. Contact your HS admin.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6">
            {tools.map((tool) => {
              const Icon = ICONS[tool.icon ?? ""] ?? LayoutGrid
              const accent = tool.accent_color ?? "#245BC1"
              return (
                <Link
                  key={tool.key}
                  href={tool.route}
                  className="group relative flex min-h-[245px] flex-col overflow-hidden rounded-[1.75rem] bg-white p-5 shadow-[0_10px_30px_rgba(33,38,78,0.07)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(33,38,78,0.13)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#245BC1] sm:min-h-[270px] sm:p-6"
                >
                  <span
                    aria-hidden
                    className="absolute right-0 top-0 h-1.5 w-24 rounded-bl-full"
                    style={{ backgroundColor: accent }}
                  />
                  <div className="flex items-start justify-between gap-4">
                    <div className="pt-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#21264E]/40">Lyca workspace</span>
                      <h2 className="mt-2 text-xl font-semibold leading-tight tracking-tight text-[#21264E] sm:text-2xl">{tool.name}</h2>
                    </div>
                    <div className="flex h-[78px] w-[92px] shrink-0 items-center justify-center p-1 sm:h-[94px] sm:w-[112px]">
                      {LOGOS[tool.key] ? (
                        <img src={LOGOS[tool.key]} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <Icon className="h-9 w-9" style={{ color: accent }} />
                      )}
                    </div>
                  </div>
                  <p className="mt-7 max-w-sm text-sm leading-relaxed text-[#21264E]/65 sm:mt-8">{tool.description}</p>
                  <div className="mt-auto flex items-center justify-between border-t border-[#21264E]/10 pt-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>Open tool</span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full transition group-hover:translate-x-0.5" style={{ backgroundColor: `${accent}18`, color: accent }}>
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        </div>
      </div>
      <MobileToolNav />
    </main>
  )
}
