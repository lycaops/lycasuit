import type { ReactNode } from "react"
import { requireTool } from "@/lib/auth"

export const metadata = { title: "Lyca Market Assistance — Lyca Suite" }

export default async function AssistanceLayout({ children }: { children: ReactNode }) {
  const user = await requireTool("assistance")
  return (
    <div className="min-h-dvh">{children}</div>
  )
}
