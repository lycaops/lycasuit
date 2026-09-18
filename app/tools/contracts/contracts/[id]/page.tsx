import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { ContractDetailContent } from "@/components/contracts/contract-detail-content"
import type { Contract } from "@/lib/types"

export default async function ContractDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ edit?: string }>
}) {
  const { id } = await params
  const user = await requireUser()
  const supabase = await createClient()
  const sp = searchParams ? await searchParams : undefined
  const isEdit = sp?.edit === "1"

  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error || !data) notFound()
  const contract = data as Contract

  return <ContractDetailContent contract={contract} user={user} isEdit={isEdit} />
}
