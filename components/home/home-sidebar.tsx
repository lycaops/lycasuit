import Link from "next/link"
import { BarChart3, FileSignature, Receipt, LifeBuoy, LayoutGrid, Users, Home } from "lucide-react"
import { HomeHeader } from "@/components/home/home-header"
import type { PlatformTool, PlatformUser } from "@/lib/auth"

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3,
  FileSignature,
  Receipt,
  LifeBuoy,
}

export function HomeSidebar({ user, tools, activeAdmin = false }: { user: PlatformUser; tools: PlatformTool[]; activeAdmin?: boolean }) {
  const admin = ["SUPER-ADMIN", "HS-ADMIN", "PM-ADMIN", "CS-ADMIN", "COUNTRY-MANAGER", "UK-ADMIN"].includes(user.role)

  return (
    <aside className="flex w-full shrink-0 flex-col bg-[#21264e] px-5 py-6 text-white lg:min-h-dvh lg:w-72 lg:px-6">
      <div className="flex items-center justify-between lg:block">
        <img src="/logo.png" alt="Lyca Suite" className="h-9 w-auto" />
        <p className="mt-2 hidden text-xs uppercase tracking-[0.2em] text-white/45 lg:block">Lyca Ops</p>
      </div>
      <nav className="mt-8 flex gap-2 overflow-x-auto lg:flex-col">
        <Link href="/home" className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white ${activeAdmin ? "" : "bg-white/10"}`}>
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
          <Link href="/admin/users" className={`mb-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-white/15 ${activeAdmin ? "bg-white/10 text-white" : "text-white/70"}`}>
            <Users className="h-4 w-4" />
            Users &amp; tool access
          </Link>
        )}
        <p className="truncate text-sm font-medium">{user.full_name}</p>
        <p className="mt-1 truncate text-xs text-white/45">{user.role}</p>
        <HomeHeader user={{ full_name: user.full_name, email: user.email, role: user.role }} sidebarMode />
      </div>
    </aside>
  )
}
