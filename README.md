# LycaOps

Four previously separate applications merged into **one Next.js app on one Supabase
project**, so a person has **one account and one password** for everything.

| Tool | Route | Source app |
|---|---|---|
| Field IQ | `/tools/field-iq` | FIELD IQ (Vite + React 19 + TS) |
| Retailer Contract Management | `/tools/contracts` | RETAILER CONTRACT MANAGEMENT (Next.js 16) |
| Retailer Incentive Statement | `/tools/incentive` | RETAILER INCNETIVE STATEMENT (Vite + React 18) |
| Lyca Market Assistance | `/tools/assistance` | LYCA MARKET ASSITANCE (Vite + React 18) |

`/home` is the hub: it lists only the tools the signed-in user has been granted.

---

## How the merge works

**Every feature in all four tools is preserved.** No screens, reports, calculators or
workflows were removed or rewritten. The merge happens at two layers only.

### 1. Database — one identity, four legacy shapes

All four apps had their own user table: `rpa_users` (Field IQ), `users` (Contracts),
`profiles` (Incentive), `staff` (Assistance). These are now **updatable views** over a
single physical table, `public.app_users`:

```
app_users  ──┬── view rpa_users   (Field IQ vocabulary:  HS-ADMIN / RSM / ASM / …)
             ├── view users       (Contract vocabulary:  ADMIN / RSM / ASM / FSE)
             ├── view profiles    (Incentive vocabulary: admin / branch_user / zone_user / viewer)
             └── view staff       (Assistance vocabulary: HS-ADMIN / PM-ADMIN / CS-ADMIN / …)
```

Each view has an `INSTEAD OF INSERT/UPDATE/DELETE` trigger, so every existing query in
every app — reads *and* writes — keeps working without a single code change. A canonical
role is stored once and translated per tool by `role_to_fieldiq()`, `role_to_contract()`,
`role_to_incentive()` and `role_to_assistance()`.

Editing a user in one tool will not silently change their role in another: the reverse
mapping keeps the existing canonical role whenever it already maps to the incoming value.

### 2. Branches and zones — merged, not duplicated

Contract Management and Incentive Statement each had their own `branches` / `zones`
tables with incompatible shapes. They are now one pair of tables carrying **all three
key styles**, so both apps resolve correctly:

| Column | Example | Came from |
|---|---|---|
| `code` | `LMIT-HS-BARI` | Contract's `code`, Incentive's `name` |
| `name` | `HS BARI` | Contract's `name` |
| `short_code` | `BARI` | Incentive's `code` |

Zone names are preserved exactly as supplied, including `HS MILANO`, `HS NAPOLI`,
`HS ROMA` and `HS TORINOO`.

### 3. Territory — the same allocation in every tool

FIELD IQ's allocation is the reference for the whole suite; the platform user screen,
the Incentive Statement user screen and the Contract user screen all resolve scope
from the same columns (`app_users.role` / `branches` / `branch` / `zone` / `zone_id`):

| Role | Scope written to `app_users` | Retailers visible |
|---|---|---|
| `HS-ADMIN`, `ADMIN`, `COUNTRY-MANAGER`, `UK-ADMIN` | no branches = all branches, or the branches assigned | the assigned branches, or the whole country |
| `RSM` (Regional Manager) | every assigned branch — e.g. 4 branches = one region | all retailers in those branches |
| `ASM` (Area Manager) | exactly one branch | all retailers in that branch |
| `ZONE-MANAGER` | exactly one branch + one zone | only retailers in that zone |
| `FSE` (Contract vocabulary) | one branch + one zone | only contracts in that zone |

`zone` always holds the zone **name** (`HS MILANO ZONE 1`) and `branches[]` always
holds branch **codes** (`LMIT-HS-MILAN`), whichever tool created or edited the user —
`20260922000002_zone_name_parity.sql` normalises and back-fills them.

### 4. Tool access

`app_tools` (4 rows) + `user_tool_access` (per user, per tool) drive the Home screen and
gate every tool route. New users get access to all active tools by default; an admin
revokes individual tools from `/admin/users`.

---

## Full table inventory

**Platform**
`app_users` · `app_roles` · `app_tools` · `user_tool_access` · `branches` · `zones`
Views: `rpa_users` · `users` · `profiles` · `staff` · `my_tools` · `zones_legacy`

**Field IQ**
`retailer_summary` · `retailer_monthly` · `monthly_zone_sum` · `retailer_stock` ·
`kpi_data` · `import_log` · `retailer_coverage` · `coverage_import_logs` ·
`zone_coverage_summary` · `isdm_data` · `isdm_settings`

**Contracts**
`contracts` (including all OTP / remote-signing columns) + storage buckets
`signatures`, `contracts`

**Incentive Statement**
`retailer_incentives`

**Market Assistance**
`tickets` · `ticket_updates`

Every RPC the apps call is preserved: `staff_validate_email`, `admin_create_staff`,
`admin_update_staff`, `admin_set_staff_active`, `create_app_profile`,
`get_incentive_months`, `get_incentive_filter_options`, `search_incentive_records`,
plus `is_admin`, `current_user_role/branch/branches/zone`.

---

## Setup

### 1. Database

In the Supabase SQL editor, run the four migrations **in order**:

```
supabase/migrations/20260918000001_unified_core.sql
supabase/migrations/20260918000002_compat_views.sql
supabase/migrations/20260918000003_app_tables.sql
supabase/migrations/20260918000004_rls_rpc_seed.sql
supabase/migrations/20260922000001_incentive_fieldiq_roles.sql
supabase/migrations/20260922000002_zone_name_parity.sql
```

`20260922000001_incentive_fieldiq_roles.sql` gives the Retailer Incentive Statement
the same role vocabulary and the same territory rules as FIELD IQ, and
`20260922000002_zone_name_parity.sql` guarantees that `app_users.zone` (and therefore
the `rpa_users` and `users` views) always holds the zone **name** — `HS MILANO ZONE 1`,
never `HS-MILANO-Z1` — and that `branches[]` always holds branch **codes**.

The last one seeds the 8 branches, 30 zones, the 4 tools, default ISDM settings and the
initial administrator (`dilan.fernando@universalservice.it` / `Lyca@2026`).
**Change that password after the first login.**

### 2. Environment

Copy `.env.example` to `.env.local` and fill in your Supabase URL, anon key and service
role key.

### 3. Run

```bash
npm install --legacy-peer-deps
npm run dev
```

---

## Migrating your existing data

The four old projects still hold live data. Per table, export to CSV from the old project
and import into the new one. Two ordering rules:

1. **Users first.** Create every account in the new project (via `/admin/users`, or
   `select public.seed_platform_user(...)`), then match old rows by email to get the new
   `id` before importing anything that references a user.
2. **`tickets.reporter_id`, `contracts.created_by`, `import_log.imported_by`** must be
   remapped to the new `app_users.id` during import.

Ticket numbers survive: the `trg_tickets_number` trigger only generates a number when the
incoming one is blank or already taken.

---

## Notes on the port

- The three Vite apps live under `src/apps/*` with their own import aliases
  (`@fieldiq/*`, `@incentive/*`, `@assistance/*`) and are mounted as client-only
  components. Incentive and Assistance keep their React Router, mounted with a
  `basename` so their internal routes work unchanged under `/tools/...`.
- All four now share one Supabase browser client (`lib/supabase/client.ts`), which is why
  one session carries across every tool.
- One behavioural change was required: the Incentive app's profile query used a PostgREST
  embed (`branches:branch_id(...)`), which a view cannot express. It now does two explicit
  lookups and returns the identical shape.
- Contract Management's routes moved from `/dashboard/*` to `/tools/contracts/*`.
- Each app's own login screen is now unreachable in normal use; `/auth/login` is the
  single entry point and `middleware.ts` enforces it.
