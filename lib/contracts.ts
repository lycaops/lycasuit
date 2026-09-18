import type { SupabaseClient } from "@supabase/supabase-js"
import type { AppUser } from "@/lib/types"

/**
 * Apply role-based scoping to a contracts query.
 * ADMIN: no filter, RSM: multi-branch filter, ASM: branch filter, FSE: zone filter.
 */
// biome-ignore lint/suspicious/noExplicitAny: supabase builder is generic
export function scopeContractsQuery(query: any, user: AppUser): any {
  if (user.role === "ADMIN") return query
  if (user.role === "RSM" && user.branches && user.branches.length > 0) {
    return query.in("branch", user.branches)
  }
  if (user.role === "ASM" && user.branch) return query.eq("branch", user.branch)
  if (user.role === "FSE" && user.zone) return query.eq("zone", user.zone)
  // No scope configured - show only own
  return query.eq("created_by", user.id)
}

export async function getContractCounts(
  supabase: SupabaseClient,
  user: AppUser,
) {
  const base = () =>
    scopeContractsQuery(
      supabase.from("contracts").select("id", { count: "exact", head: true }),
      user,
    )

  const [total, signed, pending, generated] = await Promise.all([
    base(),
    base().eq("status", "SIGNED"),
    base().eq("status", "PENDING"),
    base().eq("status", "GENERATED"),
  ])

  return {
    total: (total.count as number | null) ?? 0,
    signed: (signed.count as number | null) ?? 0,
    pending: (pending.count as number | null) ?? 0,
    generated: (generated.count as number | null) ?? 0,
  }
}
