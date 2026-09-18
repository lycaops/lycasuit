"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { LogOut } from "lucide-react"
import { getBrowserClient } from "@/lib/supabase/client"

interface Props {
  user: { full_name: string; email: string; role: string }
  /** Shown on tool pages so the user can get back to the hub. */
  backToHome?: boolean
}

export function HomeHeader({ user, backToHome = false }: Props) {
  const router = useRouter()

  async function signOut() {
    await getBrowserClient().auth.signOut()
    router.replace("/auth/login")
    router.refresh()
  }

  const initials = user.full_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()

  return (
    <div className="border-b border-[#21264E]/10 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/home" className="flex items-center gap-3">
          <img
            src="https://cms-assets.ldsvcplatform.com/IT/s3fs-public/inline-images/logo_new1.png"
            alt="Lycamobile"
            className="h-7 w-auto"
          />
          <span className="text-sm font-semibold tracking-tight text-[#21264E]">
            {backToHome ? "Back to Home" : "Lyca Suite"}
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight text-[#21264E]">{user.full_name}</p>
            <p className="text-xs leading-tight text-[#21264E]/55">{user.role}</p>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#245BC1]/10 text-xs font-semibold text-[#245BC1]">
            {initials}
          </span>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-[#21264E]/70 transition hover:bg-[#21264E]/5 hover:text-[#21264E]"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </div>
  )
}
