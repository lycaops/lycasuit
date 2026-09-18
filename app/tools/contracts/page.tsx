import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { getContractCounts, scopeContractsQuery } from "@/lib/contracts"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import type { Contract } from "@/lib/types"

export default async function DashboardPage() {
  const user = await requireUser()
  const supabase = await createClient()

  const counts = await getContractCounts(supabase, user)

  const recent = await scopeContractsQuery(
    supabase
      .from("contracts")
      .select(
        "id, company_name, shop_name, city, status, created_at, branch, zone",
      )
      .order("created_at", { ascending: false })
      .limit(6),
    user,
  )

  const recentRows = ((recent as { data: Contract[] | null }).data ?? []) as Pick<
    Contract,
    "id" | "company_name" | "shop_name" | "city" | "status" | "created_at" | "branch" | "zone"
  >[]

  return <DashboardContent user={user} counts={counts} recentRows={recentRows} />
}
