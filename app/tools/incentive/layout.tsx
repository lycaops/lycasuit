import type { ReactNode } from "react"
import { requireTool } from "@/lib/auth"

export const metadata = { title: "Retailer Incentive Statement — Lyca Suite" }

export default async function IncentiveLayout({ children }: { children: ReactNode }) {
  const user = await requireTool("incentive")
  return (
    <div className="min-h-dvh">{children}</div>
  )
}
