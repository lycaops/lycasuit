import type { ReactNode } from "react"
import { requireTool } from "@/lib/auth"
import { MobileToolNav } from "@/components/dashboard/mobile-tool-nav"

export const metadata = { title: "Field IQ — LycaOps" }

export default async function FieldIqLayout({ children }: { children: ReactNode }) {
  const user = await requireTool("field_iq")
  return (
    <div className="min-h-dvh bg-[#f4f7fb] pb-16 md:pb-0">{children}<MobileToolNav /></div>
  )
}
