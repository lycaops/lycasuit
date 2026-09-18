import type { ReactNode } from "react"
import { requireTool } from "@/lib/auth"
import { HomeHeader } from "@/components/home/home-header"

export const metadata = { title: "Retailer Incentive Statement — Lyca Suite" }

export default async function IncentiveLayout({ children }: { children: ReactNode }) {
  const user = await requireTool("incentive")
  return (
    <div className="min-h-dvh">
      <HomeHeader
        backToHome
        user={{ full_name: user.full_name, email: user.email, role: user.role }}
      />
      {children}
    </div>
  )
}
