"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"

interface DashboardUser {
  full_name: string
  email: string
  role: string
  branch: string | null
  zone: string | null
}

export function DashboardHeader({ user }: { user: DashboardUser }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b border-white/10 bg-[#21264e] px-4 pt-[env(safe-area-inset-top)] text-white md:static md:z-10 md:h-14 md:justify-start md:border-border md:bg-background/80 md:px-6 md:pt-0 md:text-foreground">
      <div className="flex items-center gap-2 md:hidden">
        <img src="/rcm.png" alt="Retailer Contract Management" className="h-8 w-8 object-contain" />
        <span className="text-sm font-bold">Retailer Contract Management</span>
      </div>
      <SidebarTrigger />
    </header>
  )
}
