import type { ReactNode } from "react"
import { requireTool, requireUser } from "@/lib/auth"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { MobileToolNav } from "@/components/dashboard/mobile-tool-nav"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireTool("contracts")
  const user = await requireUser()

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset className="min-w-0 overflow-x-hidden pt-14 md:pt-0">
        <DashboardHeader user={user} />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
      <MobileToolNav />
    </SidebarProvider>
  )
}
