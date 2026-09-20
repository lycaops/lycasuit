"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/lib/i18n/i18n-context"

interface DashboardUser {
  full_name: string
  email: string
  role: string
  branch: string | null
  zone: string | null
}

export function DashboardHeader({ user }: { user: DashboardUser }) {
  const { t } = useI18n()
  
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b border-white/10 bg-[#21264e] px-4 pt-[env(safe-area-inset-top)] text-white md:static md:z-10 md:h-14 md:justify-start md:border-border md:bg-background/80 md:px-6 md:pt-0 md:text-foreground">
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white p-0.5">
          <img src="/rcm.png" alt="Retailer Contract Management" className="h-full w-full object-contain" />
        </div>
        <span className="text-sm font-bold">Retailer Contract Management</span>
      </div>
      <SidebarTrigger />
      <Separator orientation="vertical" className="hidden h-6 md:block" />

      <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
        <span className="text-sm font-medium">{user.full_name}</span>
        <Badge variant="secondary" className="bg-[#ffc8b2] text-[#21264e] hover:bg-[#ffc8b2]">
          {user.role === "ADMIN" ? t("admin") : user.role === "MANAGER" ? t("manager") : t("agent")}
        </Badge>
        {user.branch ? (
          <span className="hidden text-xs text-muted-foreground sm:inline">
            · {user.branch}
          </span>
        ) : null}
        {user.zone ? (
          <span className="hidden text-xs text-muted-foreground md:inline">
            · {user.zone}
          </span>
        ) : null}
      </div>

    </header>
  )
}
