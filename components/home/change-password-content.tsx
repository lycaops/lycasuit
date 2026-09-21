"use client"

import Link from "next/link"
import { ArrowLeft, KeyRound } from "lucide-react"
import { HomeSidebarApp } from "@/components/home/home-sidebar-app"
import { PasswordChangeForm } from "@/components/dashboard/password-change-form"
import { MobileToolNav } from "@/components/dashboard/mobile-tool-nav"
import type { PlatformTool } from "@/lib/auth"

export function ChangePasswordContent({
  user,
  tools,
  admin,
}: {
  user: { full_name: string; email: string; role: string }
  tools: PlatformTool[]
  admin: boolean
}) {
  return (
    <main className="min-h-dvh bg-[#f4f7fb] pb-16 lg:flex lg:h-dvh lg:overflow-hidden lg:pb-0">
      <HomeSidebarApp user={user} tools={tools} admin={admin} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6 lg:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/home"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#006AE0] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>

          <div className="mx-auto w-full max-w-xl">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 md:px-7 md:py-5 border-b border-slate-100 flex items-center gap-3" style={{ backgroundColor: "#21264e" }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-white shrink-0">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-semibold text-white">Change Password</h1>
                  <p className="text-xs md:text-sm text-white/60">Update the password for your account</p>
                </div>
              </div>
              <div className="px-5 py-6 md:px-7 md:py-7">
                <PasswordChangeForm
                  onSuccess={() => {
                    if (typeof window !== "undefined") {
                      window.location.href = "/home"
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <MobileToolNav />
    </main>
  )
}

export default ChangePasswordContent
