"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Languages, LogOut } from "lucide-react"
import { getBrowserClient } from "@/lib/supabase/client"
import { useI18n } from "@/lib/i18n/i18n-context"

interface Props {
  user: { full_name: string; email: string; role: string }
  /** Shown on tool pages so the user can get back to the hub. */
  backToHome?: boolean
  sidebarMode?: boolean
}

export function HomeHeader({ user, backToHome = false, sidebarMode = false }: Props) {
  const router = useRouter()
  const { language, setLanguage, t } = useI18n()

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
    <div className={sidebarMode ? "mt-4" : "border-b border-[#21264E]/10 bg-white"}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/home" className="flex items-center gap-3">
          <img
            src={sidebarMode ? "/logo.png" : "/logo_b.webp"}
            alt="Lycamobile"
            className={sidebarMode ? "hidden" : "h-7 w-auto"}
          />
          <span className={sidebarMode ? "hidden" : "text-sm font-semibold tracking-tight text-[#21264E]"}>
            {backToHome ? "Back to Home" : "LycaOps"}
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <div className={sidebarMode ? "hidden" : "hidden text-right sm:block"}>
            <p className="text-sm font-medium leading-tight text-[#21264E]">{user.full_name}</p>
            <p className="text-xs leading-tight text-[#21264E]/55">{user.role}</p>
          </div>
          <span className={sidebarMode ? "hidden" : "flex h-8 w-8 items-center justify-center rounded-full bg-[#245BC1]/10 text-xs font-semibold text-[#245BC1]"}>
            {initials}
          </span>
          <button
            onClick={signOut}
            className={sidebarMode ? "inline-flex items-center gap-1.5 rounded-md px-0 py-1.5 text-sm text-white/60 transition hover:text-white" : "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-[#21264E]/70 transition hover:bg-[#21264E]/5 hover:text-[#21264E]"}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
      {sidebarMode && (
        <div className="border-t border-white/10 px-6 pt-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
            <Languages className="h-3.5 w-3.5" />
            {t("language")}
          </div>
          <div className="flex gap-2">
            {(["en", "it"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLanguage(option)}
                aria-pressed={language === option}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${language === option ? "bg-white text-[#21264e]" : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"}`}
              >
                {option === "en" ? "EN" : "IT"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
