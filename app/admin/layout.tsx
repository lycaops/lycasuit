import type { ReactNode } from "react"
import { getMyTools, requirePlatformAdmin } from "@/lib/auth"
import { HomeSidebar } from "@/components/home/home-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requirePlatformAdmin()
  const tools = await getMyTools()
  const sidebarUser = { email: user.email, full_name: user.full_name, role: user.role }

  return (
    <main className="min-h-dvh bg-[#f4f7fb] lg:flex">
      <HomeSidebar user={sidebarUser} tools={tools} admin />
      <div className="min-w-0 flex-1">
        <DashboardHeader user={{ ...sidebarUser, branch: user.branch, zone: user.zone }} />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">{children}</div>
      </div>
    </main>
  )
}