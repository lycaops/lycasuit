import type { ReactNode } from "react"
import { requireTool } from "@/lib/auth"
import { HomeHeader } from "@/components/home/home-header"

export const metadata = { title: "Field IQ — Lyca Suite" }

export default async function FieldIqLayout({ children }: { children: ReactNode }) {
  const user = await requireTool("field_iq")
  return (
    <div className="min-h-dvh bg-[#fff7f2]">
      <HomeHeader
        backToHome
        user={{ full_name: user.full_name, email: user.email, role: user.role }}
      />
      {children}
    </div>
  )
}
