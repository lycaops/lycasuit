import type { ReactNode } from "react"
import { requireTool } from "@/lib/auth"
import { MobileToolNav } from "@/components/dashboard/mobile-tool-nav"

export const metadata = { title: "Retailer Incentive Statement — LycaOps" }

export default async function IncentiveLayout({ children }: { children: ReactNode }) {
  const user = await requireTool("incentive")
  return (
    <div className="min-h-dvh pb-16 md:pb-0">{children}<MobileToolNav /></div>
  )
}
