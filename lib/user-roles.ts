/**
 * Shared role & territory vocabulary for the whole LycaOps suite.
 *
 * FIELD IQ is the reference implementation: every tool now resolves a user's
 * role and territory the same way.
 *
 *   HS-ADMIN / COUNTRY-MANAGER / UK-ADMIN / ADMIN
 *                      -> all retailers, or only the branches assigned below
 *   RSM                -> every assigned branch (e.g. 4 branches = one region)
 *   ASM                -> exactly one branch
 *   ZONE-MANAGER       -> exactly one zone (inside its branch)
 *
 * Both the platform admin screens and the per-tool user management screens use
 * these helpers, so a user created in one place behaves identically everywhere.
 */

export const NORTH_BRANCHES = ["LMIT-HS-BOLOGNA", "LMIT-HS-MILAN", "LMIT-HS-PADOVA", "LMIT-HS-TORINO"]
export const SOUTH_BRANCHES = ["LMIT-HS-BARI", "LMIT-HS-NAPLES", "LMIT-HS-PALERMO", "LMIT-HS-ROME"]
export const ALL_BRANCHES = [...NORTH_BRANCHES, ...SOUTH_BRANCHES]

// ---------------------------------------------------------------------------
// Roles (FIELD IQ vocabulary — used by every tool's user management screen)
// ---------------------------------------------------------------------------

export type ToolRole =
  | "HS-ADMIN"
  | "COUNTRY-MANAGER"
  | "UK-ADMIN"
  | "ADMIN"
  | "RSM"
  | "ASM"
  | "ZONE-MANAGER"

/** What a role is allowed to see. */
export type ScopeKind = "all" | "branches" | "branch" | "zone"

export interface ToolRoleOption {
  value: ToolRole
  label: string
  short: string
  scope: ScopeKind
  description: string
}

export const TOOL_ROLES: ToolRoleOption[] = [
  {
    value: "HS-ADMIN",
    label: "HS Admin",
    short: "HS Admin",
    scope: "all",
    description: "All branches, or only the branches assigned below.",
  },
  {
    value: "COUNTRY-MANAGER",
    label: "Country Manager",
    short: "Country Manager",
    scope: "all",
    description: "All branches, or only the branches assigned below.",
  },
  {
    value: "UK-ADMIN",
    label: "UK Admin",
    short: "UK Admin",
    scope: "all",
    description: "All branches, or only the branches assigned below.",
  },
  {
    value: "ADMIN",
    label: "Admin",
    short: "Admin",
    scope: "all",
    description: "All branches, or only the branches assigned below.",
  },
  {
    value: "RSM",
    label: "Regional Manager (RSM)",
    short: "RSM",
    scope: "branches",
    description: "Every assigned branch — e.g. 4 branches make up one region.",
  },
  {
    value: "ASM",
    label: "Area Manager (ASM)",
    short: "ASM",
    scope: "branch",
    description: "Exactly one branch.",
  },
  {
    value: "ZONE-MANAGER",
    label: "Zone Manager",
    short: "Zone Manager",
    scope: "zone",
    description: "Exactly one zone inside its branch.",
  },
]

/** Roles that see everything (or everything inside their assigned branches). */
export const ADMIN_ROLE_CODES: ToolRole[] = ["HS-ADMIN", "COUNTRY-MANAGER", "UK-ADMIN", "ADMIN"]

/** Canonical `app_users.role` values that count as administrators. */
export const CANONICAL_ADMIN_ROLES = [
  "SUPER-ADMIN",
  "HS-ADMIN",
  "PM-ADMIN",
  "CS-ADMIN",
  "COUNTRY-MANAGER",
  "UK-ADMIN",
] as const

export function isToolRole(value: string | null | undefined): value is ToolRole {
  return !!value && TOOL_ROLES.some((r) => r.value === value)
}

export function isAdminRoleCode(value: string | null | undefined): boolean {
  return !!value && (ADMIN_ROLE_CODES as string[]).includes(value)
}

export function isCanonicalAdminRole(value: string | null | undefined): boolean {
  return !!value && (CANONICAL_ADMIN_ROLES as readonly string[]).includes(value)
}

export function roleOption(value: string | null | undefined): ToolRoleOption | null {
  return TOOL_ROLES.find((r) => r.value === value) ?? null
}

export function roleScope(value: string | null | undefined): ScopeKind {
  return roleOption(value)?.scope ?? "branch"
}

export function roleLabel(value: string | null | undefined): string {
  return roleOption(value)?.label ?? "Viewer"
}

/**
 * Tool role -> canonical `app_users.role`.
 * Mirrors `public.role_from_app('field_iq', ...)` in the database.
 */
export function canonicalRoleFromToolRole(role: string | null | undefined): string {
  switch (role) {
    case "HS-ADMIN":
      return "HS-ADMIN"
    case "COUNTRY-MANAGER":
      return "COUNTRY-MANAGER"
    case "UK-ADMIN":
      return "UK-ADMIN"
    case "ADMIN":
      return "PM-ADMIN"
    case "RSM":
      return "RSM"
    case "ASM":
      return "ASM"
    case "ZONE-MANAGER":
      return "ZONE-MANAGER"
    default:
      return "VIEWER"
  }
}

// ---------------------------------------------------------------------------
// Designation (app_users_designation_check constraint values)
// ---------------------------------------------------------------------------

export const DESIGNATION_VALUES = [
  "Zone Manager",
  "Office Manager",
  "Region Manager",
  "Admin",
  "CS",
  "Retailer Support",
  "Admin-UK",
  "Admin-IN",
] as const

export type Designation = (typeof DESIGNATION_VALUES)[number]

/**
 * Map a canonical `app_roles.code` to a designation that satisfies the
 * `app_users_designation_check` constraint. Values come from the Market
 * Assistance vocabulary the constraint enforces; roles without a natural
 * designation resolve to null (also allowed by the check).
 */
const DESIGNATION_BY_ROLE: Record<string, Designation | null> = {
  "SUPER-ADMIN": "Admin",
  "HS-ADMIN": "Admin",
  "PM-ADMIN": "Admin",
  ADMIN: "Admin",
  "COUNTRY-MANAGER": "Admin",
  "UK-ADMIN": "Admin-UK",
  "CS-ADMIN": "CS",
  RSM: "Region Manager",
  "ZONE-MANAGER": "Zone Manager",
  ASM: "Office Manager",
  FSE: null,
  VIEWER: null,
}

/** Keep only designation values the database check constraint allows. */
export function sanitizeDesignation(value: string | null | undefined): string | null {
  if (value == null) return null
  return (DESIGNATION_VALUES as readonly string[]).includes(value) ? value : null
}

export function computeDesignation(roleCode: string): Designation | null {
  return sanitizeDesignation(DESIGNATION_BY_ROLE[roleCode] ?? null)
}

// ---------------------------------------------------------------------------
// Territory (app_users_territory_check constraint values)
// ---------------------------------------------------------------------------

/**
 * Territory display names allowed by `app_users_territory_check`:
 * North Region, Milan, Bologna, Torino, Padova, South Region, Rome, Napoli,
 * Bari, Palermo, ITALY (All). Branch display names like "HS BARI" are not.
 */
export const TERRITORY_BY_BRANCH: Record<string, string> = {
  "LMIT-HS-MILAN": "Milan",
  "LMIT-HS-BOLOGNA": "Bologna",
  "LMIT-HS-TORINO": "Torino",
  "LMIT-HS-PADOVA": "Padova",
  "LMIT-HS-BARI": "Bari",
  "LMIT-HS-NAPLES": "Napoli",
  "LMIT-HS-ROME": "Rome",
  "LMIT-HS-PALERMO": "Palermo",
}

export const ALLOWED_TERRITORIES = [
  "North Region",
  "Milan",
  "Bologna",
  "Torino",
  "Padova",
  "South Region",
  "Rome",
  "Napoli",
  "Bari",
  "Palermo",
  "ITALY (All)",
] as const

/** Keep only territory values the database check constraint allows. */
export function sanitizeTerritory(value: string | null | undefined): string | null {
  if (value == null) return null
  return (ALLOWED_TERRITORIES as readonly string[]).includes(value) ? value : null
}

// Loosely typed so both the request-scoped client and the service-role client
// can be passed in.
type SupabaseLike = {
  from: (table: string) => any
  rpc: (fn: string, args?: Record<string, unknown>) => any
}

interface ZoneLookup {
  name: string | null
  short_code: string | null
  branch_code: string | null
}

/**
 * Resolve a zone from a name, a code or a short code.
 *
 * `resolve_zone` is the same lookup the database uses when it writes
 * `app_users.zone`, so the zone NAME picked in FIELD IQ
 * ("HS MILANO ZONE 1") and the zone CODE picked elsewhere ("HS-MILANO-Z1")
 * always resolve to the same row.
 */
async function lookupZone(supabase: SupabaseLike, zone: string): Promise<ZoneLookup | null> {
  const { data, error } = await supabase.rpc("resolve_zone", { p_zone: zone })
  if (!error) {
    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null
    if (!row) return null
    return {
      name: (row.name as string) ?? null,
      short_code: (row.short_code as string) ?? null,
      branch_code: (row.branch_code as string) ?? null,
    }
  }

  // Fallback for a database that does not have the parity migration yet.
  const { data: fallback } = await supabase
    .from("zones")
    .select("name, short_code, branch:branch_id(code)")
    .eq("code", zone)
    .maybeSingle()
  if (!fallback) return null
  const row = fallback as any
  return {
    name: row.name ?? null,
    short_code: row.short_code ?? null,
    branch_code: row.branch?.code ?? null,
  }
}

export async function computeTerritory(
  supabase: SupabaseLike,
  roleCode: string,
  opts: { branches?: string[] | null; branch?: string | null; zone?: string | null },
): Promise<string | null> {
  const { branches, zone } = opts
  const chosenBranch = opts.branch ?? branches?.[0] ?? null
  const assignedBranches = branches && branches.length > 0 ? branches : chosenBranch ? [chosenBranch] : []

  switch (roleCode) {
    case "ZONE-MANAGER": {
      // Territory must be one of the zones' branch territories allowed by the
      // app_users_territory_check constraint; zone names themselves are not.
      const resolved = zone ? await lookupZone(supabase, zone) : null
      const code = resolved?.branch_code ?? null
      return code ? TERRITORY_BY_BRANCH[code] ?? null : null
    }
    case "FSE": {
      if (!zone) return null
      const resolved = await lookupZone(supabase, zone)
      if (!resolved) return null
      return sanitizeTerritory(resolved.short_code) ?? TERRITORY_BY_BRANCH[resolved.branch_code ?? ""] ?? null
    }
    case "ASM": {
      if (!chosenBranch) return null
      return TERRITORY_BY_BRANCH[chosenBranch] ?? null
    }
    case "RSM": {
      if (assignedBranches.length === 0) return null
      if (ALL_BRANCHES.every((b) => assignedBranches.includes(b))) return "ITALY (All)"
      if (NORTH_BRANCHES.every((b) => assignedBranches.includes(b))) return "North Region"
      if (SOUTH_BRANCHES.every((b) => assignedBranches.includes(b))) return "South Region"
      return null
    }
    default: {
      return "ITALY (All)"
    }
  }
}

// ---------------------------------------------------------------------------
// Assignment validation & normalisation
// ---------------------------------------------------------------------------

export interface RoleAssignment {
  role: ToolRole
  /** Every branch the user may see (multi for admins + RSM, one for ASM/zone). */
  branches: string[] | null
  /** Single branch code — only for single-branch roles. */
  branch: string | null
  /** Single zone NAME ("HS MILANO ZONE 1") — only for zone-scoped roles. */
  zone: string | null
}

export type AssignmentResult = { ok: true; canonicalRole: string; designation: string | null } & RoleAssignment | { ok: false; error: string }

/**
 * Validate a role + territory selection and turn it into the exact
 * `app_users` columns the database expects.
 *
 * Rules (identical to FIELD IQ's user screen):
 *   RSM           -> at least one branch
 *   ASM           -> exactly one branch
 *   ZONE-MANAGER  -> exactly one branch + one zone (zone kept as its NAME)
 *   admin roles   -> optional branches (none = all branches)
 */
export function normalizeAssignment(input: {
  role: string | null | undefined
  branches?: string[] | null
  branch?: string | null
  zone?: string | null
}): AssignmentResult {
  const role = (input.role ?? "").trim()
  if (!isToolRole(role)) {
    return { ok: false, error: "Select a valid role." }
  }

  const selected = Array.from(new Set((input.branches ?? []).filter(Boolean)))
  const singleBranch = (input.branch ?? selected[0] ?? "").trim() || null
  const zone = (input.zone ?? "").trim() || null
  const scope = roleScope(role)
  const canonicalRole = canonicalRoleFromToolRole(role)
  const designation = computeDesignation(canonicalRole)

  switch (scope) {
    case "all": {
      // No branches assigned means "all branches" for an admin.
      return {
        ok: true,
        role,
        canonicalRole,
        designation,
        branches: selected.length > 0 ? selected : null,
        branch: null,
        zone: null,
      }
    }
    case "branches": {
      if (selected.length === 0) return { ok: false, error: "RSM must have at least one branch assigned." }
      return {
        ok: true,
        role,
        canonicalRole,
        designation,
        branches: selected,
        branch: null,
        zone: null,
      }
    }
    case "branch": {
      if (!singleBranch) return { ok: false, error: "Select the branch this user is responsible for." }
      return {
        ok: true,
        role,
        canonicalRole,
        designation,
        branches: [singleBranch],
        branch: singleBranch,
        zone: null,
      }
    }
    case "zone": {
      if (!singleBranch) return { ok: false, error: "Zone Manager must have exactly one branch assigned." }
      if (!zone) return { ok: false, error: "Select the zone this user is responsible for." }
      return {
        ok: true,
        role,
        canonicalRole,
        designation,
        branches: [singleBranch],
        branch: singleBranch,
        zone,
      }
    }
    default:
      return { ok: false, error: "Select a valid role." }
  }
}
