import { requireUser } from "@/lib/auth"
import { NewContractPageContent } from "@/components/contracts/new-contract-page-content"

export default async function NewContractPage() {
  const user = await requireUser()

  return <NewContractPageContent user={user} />
}
