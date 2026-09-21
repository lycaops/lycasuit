import { getMyTools, isPlatformAdmin, requirePlatformUser } from "@/lib/auth"
import { ChangePasswordContent } from "@/components/home/change-password-content"

export default async function ChangePasswordPage() {
  const user = await requirePlatformUser()
  const tools = await getMyTools()
  const admin = isPlatformAdmin(user)

  return (
    <ChangePasswordContent
      user={{ full_name: user.full_name, email: user.email, role: user.role }}
      tools={tools}
      admin={admin}
    />
  )
}
