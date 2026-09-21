import type { ReactNode } from "react"
import { getMyTools, requirePlatformAdmin } from "@/lib/auth"
import { AdminLayoutContent } from "@/components/home/admin-layout-content"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requirePlatformAdmin()
  const tools = await getMyTools()

  return (
    <AdminLayoutContent
      user={{ full_name: user.full_name, email: user.email, role: user.role }}
      tools={tools}
    >
      {children}
    </AdminLayoutContent>
  )
}
