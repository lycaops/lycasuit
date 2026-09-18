import type { ReactNode } from "react"
import { requireTool, requireUser } from "@/lib/auth"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireTool("contracts")
  const user = await requireUser()

  return (
<<<<<<< HEAD
    <SidebarProvider className="bg-[#fff7f2]">
      <AppSidebar user={user} />
      <SidebarInset className="bg-[#fff7f2]">
=======
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
>>>>>>> f317c96915d48c67afd478597b5842f471e6372c
        <DashboardHeader user={user} />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
