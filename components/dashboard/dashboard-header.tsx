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
    <header className="fixed inset-x-0 top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-3 border-b bg-background/80 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:static md:z-10 md:h-14 md:px-6 md:pt-0">
      <SidebarTrigger />
      <img src="/lops.svg" alt="LycaOps" className="h-7 w-auto md:hidden" />
      <Separator orientation="vertical" className="h-6" />

      <div className="flex min-w-0 flex-1 items-center gap-2">
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
