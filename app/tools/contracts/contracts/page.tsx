import Link from "next/link"
import { FilePlus2 } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { scopeContractsQuery } from "@/lib/contracts"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ContractsTable } from "@/components/contracts/contracts-table"
import type { Contract } from "@/lib/types"

export default async function ContractsPage() {
  const user = await requireUser()
  const supabase = await createClient()

  const { data } = await scopeContractsQuery(
    supabase
      .from("contracts")
      .select(
        "id, company_name, shop_name, city, status, created_at, branch, zone, email",
      )
      .order("created_at", { ascending: false }),
    user,
  )

  const contracts = ((data as Contract[] | null) ?? []) as Pick<
    Contract,
    | "id"
    | "company_name"
    | "shop_name"
    | "city"
    | "status"
    | "created_at"
    | "branch"
    | "zone"
    | "email"
  >[]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contracts</h1>
          <p className="text-sm text-muted-foreground">
            All contracts within your scope ({user.role}
            {user.branch ? ` · ${user.branch}` : ""}
            {user.zone ? ` · ${user.zone}` : ""}).
          </p>
        </div>
        <Button asChild>
          <Link href="/tools/contracts/contracts/new">
            <FilePlus2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
            New contract
          </Link>
        </Button>
      </div>

      <Card className="border-[#21264e]/10">
        <CardHeader>
          <CardTitle>All contracts</CardTitle>
          <CardDescription>
            {contracts.length} {contracts.length === 1 ? "contract" : "contracts"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContractsTable contracts={contracts} />
        </CardContent>
      </Card>
    </div>
  )
}
