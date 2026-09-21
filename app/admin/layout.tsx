import type { ReactNode } from "react"
import { getMyTools, requirePlatformAdmin } from "@/lib/auth"
import { HomeSidebarApp } from "@/components/home/home-sidebar-app"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requirePlatformAdmin()
  const tools = await getMyTools()
  const sidebarUser = { email: user.email, full_name: user.full_name, role: user.role }

  return (
    <main className="min-h-dvh bg-[#f4f7fb] lg:flex">
      <HomeSidebarApp user={sidebarUser} tools={tools} admin />
      <div className="min-w-0 flex-1">
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">{children}</div>
      </div>
    </main>
  )
}