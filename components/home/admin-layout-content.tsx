"use client"

import type { ReactNode } from "react"
import { HomeSidebarApp } from "@/components/home/home-sidebar-app"
import type { PlatformTool } from "@/lib/auth"

export function AdminLayoutContent({
  children,
  user,
  tools,
}: {
  children: ReactNode
  user: { full_name: string; email: string; role: string }
  tools: PlatformTool[]
}) {
  return (
    <main className="min-h-dvh bg-[#f4f7fb] lg:flex">
      <HomeSidebarApp user={user} tools={tools} admin />
      <div className="min-w-0 flex-1">
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">{children}</div>
      </div>
    </main>
  )
}

export default AdminLayoutContent
