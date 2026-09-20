import Link from "next/link"
import { BarChart3, FileSignature, Receipt, LifeBuoy, LayoutGrid, Users, Home } from "lucide-react"
import { HomeHeader } from "@/components/home/home-header"
import type { PlatformTool } from "@/lib/auth"

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3,
  FileSignature,
  Receipt,
  LifeBuoy,
}

export function HomeSidebar({
  user,
  tools,
  admin = false,
}: {
  user: { full_name: string; email: string; role: string }
  tools: PlatformTool[]
  admin?: boolean
}) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto bg-[#21264e] px-6 py-6 text-white lg:flex lg:h-dvh lg:max-h-dvh lg:sticky lg:top-0">
      <div className="flex w-full flex-col items-start text-left">
        <img src="/logo.png" alt="LycaOps" className="h-9 w-auto" />
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/45">LycaOps</p>
      </div>

      <nav className="mt-8 flex flex-col gap-1">
        <Link href="/home" className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/15">
          <Home className="h-4 w-4" /> Home
        </Link>
        <p className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Your workspace</p>
        {tools.map((tool) => {
          const Icon = ICONS[tool.icon ?? ""] ?? LayoutGrid
          return (
            <Link key={tool.key} href={tool.route} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/65 transition hover:bg-white/10 hover:text-white">
              <Icon className="h-4 w-4" />
              {tool.name}
            </Link>
          )
        })}
        {admin && (
          <Link href="/admin/users" className="mt-3 flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/15">
            <Users className="h-4 w-4" /> User Management
          </Link>
        )}
      </nav>

      <div className="mt-auto border-t border-white/10 pt-5">
        <p className="truncate text-sm font-medium">{user.full_name}</p>
        <p className="mt-1 truncate text-xs text-white/45">{user.role}</p>
        <HomeHeader user={user} sidebarMode />
      </div>
    </aside>
  )
}