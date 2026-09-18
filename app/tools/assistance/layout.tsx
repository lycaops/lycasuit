import type { ReactNode } from "react"
import { requireTool } from "@/lib/auth"
import { HomeHeader } from "@/components/home/home-header"

export const metadata = { title: "Lyca Market Assistance — Lyca Suite" }

export default async function AssistanceLayout({ children }: { children: ReactNode }) {
  const user = await requireTool("assistance")
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
