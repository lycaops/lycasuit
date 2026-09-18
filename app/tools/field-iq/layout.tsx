import type { ReactNode } from "react"
import { requireTool } from "@/lib/auth"

export const metadata = { title: "Field IQ — Lyca Suite" }

export default async function FieldIqLayout({ children }: { children: ReactNode }) {
  const user = await requireTool("field_iq")
  return (
    <div className="min-h-dvh bg-[#fff7f2]">{children}</div>
  )
}
