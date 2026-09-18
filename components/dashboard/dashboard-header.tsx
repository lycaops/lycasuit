"use client"

import { LogOut } from "lucide-react"
import { signOut } from "@/app/auth/actions"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/lib/i18n/i18n-context"
import type { AppUser } from "@/lib/types"

export function DashboardHeader({ user }: { user: AppUser }) {
  const { t } = useI18n()
  
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <SidebarTrigger />
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

      <form action={signOut}>
        <Button variant="ghost" size="sm" type="submit">
          <LogOut className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {t("signOut")}
        </Button>
      </form>
    </header>
  )
}
