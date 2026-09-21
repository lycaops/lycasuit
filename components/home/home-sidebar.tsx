"use client"

import Link from "next/link"
import { useState } from "react"
import { BarChart3, FileSignature, Receipt, LifeBuoy, LayoutGrid, Users, Home, KeyRound, X } from "lucide-react"
import { HomeHeader } from "@/components/home/home-header"
import type { PlatformTool } from "@/lib/auth"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PasswordChangeForm } from "@/components/dashboard/password-change-form"

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
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false)

  return (
    <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto bg-[#21264e] px-6 py-6 text-white lg:flex lg:h-dvh lg:max-h-dvh lg:sticky lg:top-0">
      <div className="flex w-full flex-col items-start text-left shrink-0">
        <img src="/fieldiq.png" alt="LycaOps" className="block h-auto w-full max-w-[220px] object-contain object-left" />
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
      </nav>

      <div className="mt-auto border-t border-white/10 pt-5">
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-1">Account</p>
        {admin && (
          <Link href="/admin/users" className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white">
            <Users className="h-4 w-4" /> User Management
          </Link>
        )}
        <Dialog open={pwdDialogOpen} onOpenChange={setPwdDialogOpen}>
          <DialogTrigger asChild>
            <button className="mb-4 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white text-left">
              <KeyRound className="h-4 w-4" /> Change Password
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>Update the password for your account.</DialogDescription>
            </DialogHeader>
            <PasswordChangeForm onSuccess={() => setPwdDialogOpen(false)} />
          </DialogContent>
        </Dialog>
        <p className="truncate text-sm font-medium">{user.full_name}</p>
        <p className="mt-1 truncate text-xs text-white/45">{user.role}</p>
        <HomeHeader user={user} sidebarMode />
      </div>
    </aside>
  )
}