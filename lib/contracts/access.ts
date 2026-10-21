import { createClient } from "@/lib/supabase/server"

export interface ContractFeaturePermissions {
  can_download_draft: boolean
  can_remote_sign: boolean
  can_device_sign: boolean
}

export const DEFAULT_CONTRACT_FEATURE_PERMISSIONS: ContractFeaturePermissions = {
  can_download_draft: true,
  can_remote_sign: true,
  can_device_sign: true,
}

export async function getContractFeaturePermissions(
  userId: string,
): Promise<ContractFeaturePermissions> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("user_contract_permissions")
    .select("can_download_draft, can_remote_sign, can_device_sign")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    return {
      can_download_draft: false,
      can_remote_sign: false,
      can_device_sign: false,
    }
  }

  return data ?? DEFAULT_CONTRACT_FEATURE_PERMISSIONS
}

export async function requireContractFeaturePermission(
  userId: string,
  permission: keyof ContractFeaturePermissions,
) {
  const permissions = await getContractFeaturePermissions(userId)
  if (!permissions[permission]) {
    throw new Error("You do not have permission to use this contract feature.")
  }
}