import { NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env"
import {
  computeDesignation,
  computeTerritory,
  isCanonicalAdminRole,
  normalizeAssignment,
} from "@/lib/user-roles"

export const dynamic = "force-dynamic"

/**
 * Tools a user created from a tool's own "User Management" screen can open.
 * Everything else is granted from /admin/users.
 */
const DEFAULT_TOOL_KEYS = ["incentive"]

interface Payload {
  action?: "create" | "update" | "delete" | "disable"
  user_id?: string
  email?: string | null
  password?: string | null
  full_name?: string | null
  role?: string | null
  branches?: string[] | null
  branch?: string | null
  branch_id?: string | null
  zone?: string | null
  zone_id?: string | null
  is_disabled?: boolean
}

interface BranchRow {
  id: string
  code: string
  name: string | null
  short_code: string | null
}

interface ZoneRow {
  id: string
  code: string
  name: string
  short_code: string | null
  branch_id: string | null
}

const key = (value: string | null | undefined) => (value ?? "").trim().toLowerCase()

function matchBranch(branches: BranchRow[], value: string | null | undefined): BranchRow | null {
  const wanted = key(value)
  if (!wanted) return null
  return (
    branches.find((branch) =>
      [branch.id, branch.code, branch.name, branch.short_code].some((candidate) => key(candidate) === wanted),
    ) ?? null
  )
}

function matchZone(zones: ZoneRow[], value: string | null | undefined): ZoneRow | null {
  const wanted = key(value)
  if (!wanted) return null
  return (
    zones.find((zone) =>
      [zone.id, zone.code, zone.name, zone.short_code].some((candidate) => key(candidate) === wanted),
    ) ?? null
  )
}

/**
 * The four tools each send a territory in their own dialect — FIELD IQ sends
 * branch codes, the Incentive Statement sends branch / zone UUIDs, the platform
 * screen sends branch codes + a zone code. Everything is resolved here to what
 * the database stores: canonical branch codes and the zone NAME
 * ("HS MILANO ZONE 1", never "HS-MILANO-Z1").
 */
async function resolveTerritory(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    branches?: string[] | null
    branch?: string | null
    branch_id?: string | null
    zone?: string | null
    zone_id?: string | null
  },
) {
  const [{ data: branchRows }, { data: zoneRows }] = await Promise.all([
    admin.from("branches").select("id, code, name, short_code").order("code"),
    admin.from("zones").select("id, code, name, short_code, branch_id").order("name"),
  ])

  const branches = (branchRows ?? []) as BranchRow[]
  const zones = (zoneRows ?? []) as ZoneRow[]

  // Accept a uuid, a code, a short code or a name for every identifier.
  const selectedZone = matchZone(zones, input.zone_id) ?? matchZone(zones, input.zone)
  const zoneBranch = selectedZone ? branches.find((branch) => branch.id === selectedZone.branch_id) ?? null : null

  const selectedBranches = Array.from(
    new Set(
      (input.branches ?? [])
        .map((value) => matchBranch(branches, value)?.code)
        .filter((code): code is string => Boolean(code)),
    ),
  )

  const singleBranch =
    matchBranch(branches, input.branch)?.code ??
    matchBranch(branches, input.branch_id)?.code ??
    selectedBranches[0] ??
    zoneBranch?.code ??
    null

  return {
    branches: selectedBranches,
    branch: singleBranch,
    branchId: singleBranch ? branches.find((branch) => branch.code === singleBranch)?.id ?? null : null,
    // zone name in, zone name out — the database normalises it again on write.
    zone: selectedZone?.name ?? (input.zone?.trim() || null),
    zoneId: selectedZone?.id ?? null,
  }
}


/**
 * Resolve the caller from either the bearer token the tool sends or the
 * platform session cookie, and make sure they are an active administrator.
 */
async function resolveCaller(request: Request) {
  const header = request.headers.get("authorization") ?? ""
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : ""

  const client = token
    ? createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : await createClient()

  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("app_users")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile || !profile.is_active || !isCanonicalAdminRole(profile.role)) return null
  return { id: user.id as string, role: profile.role as string }
}

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status })
}

export async function POST(request: Request) {
  const caller = await resolveCaller(request)
  if (!caller) return fail("Administrator access required.", 403)

  let body: Payload
  try {
    body = (await request.json()) as Payload
  } catch {
    return fail("Invalid request body.")
  }

  const action = body.action ?? "create"
  const admin = createAdminClient()

  // ---------------------------------------------------------------- delete --
  if (action === "delete") {
    if (!body.user_id) return fail("user_id is required.")
    if (body.user_id === caller.id) return fail("You cannot delete your own account.")
    const { error } = await admin.auth.admin.deleteUser(body.user_id)
    if (error) return fail(error.message)
    return NextResponse.json({ ok: true })
  }

  // --------------------------------------------------------------- disable --
  if (action === "disable") {
    if (!body.user_id) return fail("user_id is required.")
    const isDisabled = body.is_disabled === true
    const { error } = await admin.from("app_users").update({ is_active: !isDisabled }).eq("id", body.user_id)
    if (error) return fail(error.message)
    const { error: authError } = await admin.auth.admin.updateUserById(body.user_id, {
      ban_duration: isDisabled ? "876000h" : "none",
    })
    if (authError) return fail(authError.message)
    return NextResponse.json({ ok: true })
  }

  // --------------------------------------------------- create / update -----
  // Role + territory rules are shared with FIELD IQ (lib/user-roles.ts).
  // The incoming identifiers may be branch / zone UUIDs (Incentive Statement),
  // branch codes (FIELD IQ) or zone codes (platform screen) — resolve first.
  const territoryInput = await resolveTerritory(admin, {
    branches: body.branches ?? null,
    branch: body.branch ?? null,
    branch_id: body.branch_id ?? null,
    zone: body.zone ?? null,
    zone_id: body.zone_id ?? null,
  })

  const assignment = normalizeAssignment({
    role: body.role,
    branches: territoryInput.branches.length > 0 ? territoryInput.branches : null,
    branch: territoryInput.branch,
    // A zone-scoped role always carries its zone as a display NAME.
    zone: territoryInput.zone,
  })
  if (!assignment.ok) return fail(assignment.error)

  const territory = await computeTerritory(admin, assignment.canonicalRole, {
    branches: assignment.branches,
    branch: assignment.branch,
    zone: assignment.zone,
  })

  const scope = {
    role: assignment.canonicalRole,
    branches: assignment.branches,
    branch: assignment.branch,
    // Zone NAME ("HS MILANO ZONE 1"), never the code — rpa_users (FIELD IQ) and
    // users (Contract Management) read this same column.
    zone: assignment.zone ? territoryInput.zone : null,
    branch_id: assignment.branch ? territoryInput.branchId : null,
    zone_id: assignment.zone ? territoryInput.zoneId : null,
    designation: assignment.designation,
    territory,
  }

  // ------------------------------------------------------------- update -----
  if (action === "update") {
    if (!body.user_id) return fail("user_id is required.")

    const patch: Record<string, unknown> = { ...scope }
    if (body.full_name !== undefined) patch.full_name = (body.full_name ?? "").trim() || null

    const email = (body.email ?? "").trim().toLowerCase()
    if (email) patch.email = email

    const { error } = await admin.from("app_users").update(patch).eq("id", body.user_id)
    if (error) return fail(error.message)

    if (email) {
      const { error: emailError } = await admin.auth.admin.updateUserById(body.user_id, {
        email,
        email_confirm: true,
      })
      if (emailError) return fail(emailError.message)
    }

    if (body.password) {
      if (body.password.length < 8) return fail("Password must be at least 8 characters.")
      const { error: passwordError } = await admin.auth.admin.updateUserById(body.user_id, {
        password: body.password,
      })
      if (passwordError) return fail(passwordError.message)
    }

    return NextResponse.json({ ok: true })
  }

  // ------------------------------------------------------------- create -----
  const email = (body.email ?? "").trim().toLowerCase()
  if (!email) return fail("Email is required.")
  if (!body.password || body.password.length < 8) {
    return fail("Password must be at least 8 characters.")
  }

  const fullName = (body.full_name ?? "").trim() || email.split("@")[0]

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (authError || !created?.user) {
    return fail(authError?.message ?? "Could not create the login.")
  }

  const userId = created.user.id

  // The on_auth_user_created trigger already inserted a VIEWER row; fill it in.
  const { error: profileError } = await admin
    .from("app_users")
    .update({
      ...scope,
      email,
      full_name: fullName,
      username: email.split("@")[0],
      is_active: true,
    })
    .eq("id", userId)

  if (profileError) {
    await admin.auth.admin.deleteUser(userId)
    return fail(profileError.message)
  }

  const { data: tools } = await admin.from("app_tools").select("key")
  const toolRows = (tools ?? []).map((tool: { key: string }) => ({
    user_id: userId,
    tool_key: tool.key,
    can_access: DEFAULT_TOOL_KEYS.includes(tool.key),
  }))
  if (toolRows.length > 0) {
    await admin.from("user_tool_access").upsert(toolRows, { onConflict: "user_id,tool_key" })
  }

  return NextResponse.json({ ok: true, user_id: userId })
}
