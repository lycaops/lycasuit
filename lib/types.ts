import type { Role } from "./branches"

export interface AppUser {
  id: string
  email: string
  full_name: string
  role: Role
  branch: string | null
  branches?: string[] | null
  zone: string | null
  is_active: boolean
  created_at: string
}

export type ContractStatus = "GENERATED" | "PENDING" | "SIGNED"

export interface Contract {
  id: string
  company_name: string
  vat_number: string
  contact_first_name: string
  contact_last_name: string
  shop_name: string
  street: string
  house_number: string
  city: string
  post_code: string
  landline_number: string | null
  mobile_number: string
  email: string
  branch: string | null
  zone: string | null
  created_by: string | null
  retailer_signature_path: string | null
  retailer_ack?: boolean | null
  retailer_gdpr?: boolean | null
  retailer_signed_at?: string | null
  retailer_sign_ip?: string | null
  retailer_sign_user_agent?: string | null
  staff_signature_path: string | null
  pdf_path: string | null
  status: ContractStatus
  signed_at: string | null
  emailed_at: string | null
  otp_hash?: string | null
  otp_salt?: string | null
  otp_sent_at?: string | null
  otp_expires_at?: string | null
  otp_verified_at?: string | null
  otp_attempts?: number | null
  otp_verify_ip?: string | null
  otp_verify_user_agent?: string | null
  sign_link_hash?: string | null
  sign_link_sent_at?: string | null
  sign_link_expires_at?: string | null
  sign_link_used_at?: string | null
  created_at: string
  updated_at: string
}
