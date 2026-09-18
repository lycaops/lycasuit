import crypto from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { RetailerSignPageContent } from "./retailer-sign-page-content"
import type { Contract } from "@/lib/types"

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

export default async function RetailerSignPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  try {
    const supabase = createAdminClient()
    const tokenHash = sha256Hex(token)
    const { data, error } = await supabase
      .from("contracts")
      .select(
        "id, company_name, shop_name, vat_number, contact_first_name, contact_last_name, street, house_number, city, post_code, email, mobile_number, landline_number, status, retailer_signature_path, retailer_ack, retailer_gdpr, otp_verified_at, sign_link_expires_at, sign_link_used_at",
      )
      .eq("sign_link_hash", tokenHash)
      .maybeSingle()

    if (error || !data) {
      return <RetailerSignPageContent token={token} contract={null} />
    }

    const contract = data as Pick<
      Contract,
      | "id"
      | "company_name"
      | "shop_name"
      | "vat_number"
      | "contact_first_name"
      | "contact_last_name"
      | "street"
      | "house_number"
      | "city"
      | "post_code"
      | "email"
      | "mobile_number"
      | "landline_number"
      | "status"
      | "retailer_signature_path"
      | "retailer_ack"
      | "retailer_gdpr"
      | "otp_verified_at"
      | "sign_link_expires_at"
      | "sign_link_used_at"
    >

    return <RetailerSignPageContent token={token} contract={contract} />
  } catch (e) {
    return (
      <RetailerSignPageContent
        token={token}
        contract={null}
        error={e instanceof Error ? e.message : "Unexpected error"}
      />
    )
  }
}
