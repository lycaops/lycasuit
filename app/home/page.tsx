import { getMyTools, isPlatformAdmin, requirePlatformUser } from "@/lib/auth"
import { HomeContent } from "@/components/home/home-content"

export default async function HomePage() {
  const user = await requirePlatformUser()
  const tools = await getMyTools()
  const admin = isPlatformAdmin(user)

  return <HomeContent user={{ full_name: user.full_name, email: user.email, role: user.role }} tools={tools} admin={admin} />
}
