"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, FileSignature, Home, LifeBuoy, Receipt } from "lucide-react"

const items = [
  { href: "/tools/field-iq", label: "Field IQ", shortLabel: "Field", icon: BarChart3 },
  { href: "/tools/contracts", label: "RCM", shortLabel: "RCM", icon: FileSignature },
  { href: "/home", label: "Home", shortLabel: "Home", icon: Home, home: true },
  { href: "/tools/incentive", label: "Statement", shortLabel: "Stmt", icon: Receipt },
  { href: "/tools/assistance", label: "Assistance", shortLabel: "Assist", icon: LifeBuoy },
]

export function MobileToolNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 box-border flex h-[calc(4rem+env(safe-area-inset-bottom))] items-center justify-around border-t border-[#21264e]/10 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] shadow-[0_-4px_18px_rgba(33,38,78,0.12)] backdrop-blur md:hidden">
      {items.map((item) => {
        const Icon = item.icon
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        if (item.home) {
          return (
            <Link key={item.href} href={item.href} aria-label={item.label} className="-mt-4 flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border-4 border-[#f4f7fb] bg-[#21264e] text-white shadow-lg">
              <Icon className="h-6 w-6" />
              <span className="text-[9px] font-semibold">{item.shortLabel}</span>
            </Link>
          )
        }
        if (item.href === "/tools/assistance" || item.href === "/tools/incentive") {
          return (
            <a key={item.href} href={item.href} aria-label={item.label} className={`flex h-12 min-w-0 flex-1 shrink-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium ${active ? "text-[#245bc1]" : "text-[#21264e]/55"}`}>
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate">{item.shortLabel}</span>
            </a>
          )
        }
        return (
          <Link key={item.href} href={item.href} aria-label={item.label} className={`flex h-12 min-w-0 flex-1 shrink-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium ${active ? "text-[#245bc1]" : "text-[#21264e]/55"}`}>
            <Icon className="h-5 w-5" />
            <span className="max-w-full truncate">{item.shortLabel}</span>
          </Link>
        )
      })}
    </nav>
  )
}
