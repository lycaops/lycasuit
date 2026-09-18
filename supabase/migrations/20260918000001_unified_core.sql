-- ============================================================================
-- LYCA SUITE — UNIFIED PLATFORM SCHEMA
-- Part 1 of 4: Core (extensions, reference data, identity, tool registry)
-- ============================================================================
-- Merges four previously separate Supabase projects into ONE database:
--   1. FIELD IQ                      (rpa_users, kpi_data, coverage, isdm, ...)
--   2. RETAILER CONTRACT MANAGEMENT  (users, contracts, branches, zones)
--   3. RETAILER INCENTIVE STATEMENT  (profiles, retailer_incentives, branches, zones)
--   4. LYCA MARKET ASSISTANCE        (staff, tickets, ticket_updates)
--
-- ONE auth.users identity now works across all four tools.
--
-- Strategy: a single physical table `app_users` holds every person. The four
-- legacy table names (rpa_users, users, profiles, staff) are recreated as
-- UPDATABLE VIEWS over `app_users`, so every existing query in all four apps
-- keeps working unchanged — including inserts and updates.
--
-- RUN ORDER: 000001 → 000002 → 000003 → 000004
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. REFERENCE DATA — branches & zones (MERGED)
-- ============================================================================
-- Contract Management used  branches(code pk, name)      / zones(code pk, branch_code, name)
-- Incentive Statement used  branches(id pk, name, code)  / zones(id pk, name, code, branch_id)
-- The merged table carries BOTH key styles so both apps resolve correctly:
--   code       = canonical branch code  ('LMIT-HS-BARI')   <- Contract's `code`, Incentive's `name`
--   name       = display name           ('HS BARI')        <- Contract's `name`
--   short_code = short code             ('BARI')           <- Incentive's `code`
-- ----------------------------------------------------------------------------

create table if not exists public.branches (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,            -- 'LMIT-HS-BARI'
  name        text not null,                   -- 'HS BARI'
  short_code  text,                            -- 'BARI'
  region      text check (region is null or region in ('NORTH','SOUTH','UNKNOWN')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create unique index if not exists branches_name_key       on public.branches(name);
create index        if not exists branches_short_code_idx on public.branches(short_code);

create table if not exists public.zones (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,            -- 'HS-BARI-Z1'
  name        text not null,                   -- 'HS BARI ZONE 1'
  short_code  text,                            -- 'BARI-Z1'
  branch_id   uuid not null references public.branches(id) on delete cascade,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (name, branch_id)
);

create index if not exists zones_branch_idx     on public.zones(branch_id);
create index if not exists zones_short_code_idx on public.zones(short_code);

-- Legacy compatibility: Contract Management seeded zones with a `branch_code`
-- text column. Exposed as a generated view column below.
create or replace view public.zones_legacy
with (security_invoker = true) as
  select z.id, z.code, z.name, z.short_code, b.code as branch_code, z.branch_id, z.created_at
  from public.zones z
  join public.branches b on b.id = z.branch_id;

-- ============================================================================
-- 2. CANONICAL ROLES
-- ============================================================================
-- Union of every role that existed in the four apps, ranked most → least
-- privileged. Per-app role strings are derived from this via the mapping
-- functions in section 4, so each app still sees the vocabulary it expects.
-- ----------------------------------------------------------------------------

create table if not exists public.app_roles (
  code        text primary key,
  label       text not null,
  rank        integer not null,
  is_admin    boolean not null default false
);

insert into public.app_roles (code, label, rank, is_admin) values
  ('SUPER-ADMIN',     'Super Administrator',  10, true),
  ('HS-ADMIN',        'HS Administrator',      20, true),
  ('PM-ADMIN',        'PM Administrator',      30, true),
  ('CS-ADMIN',        'CS Administrator',      30, true),
  ('COUNTRY-MANAGER', 'Country Manager',       40, true),
  ('UK-ADMIN',        'UK Administrator',      40, true),
  ('RSM',             'Regional Sales Manager',50, false),
  ('ASM',             'Area Sales Manager',    60, false),
  ('ZONE-MANAGER',    'Zone Manager',          70, false),
  ('FSE',             'Field Sales Executive', 80, false),
  ('VIEWER',          'Viewer',                90, false)
on conflict (code) do update
  set label = excluded.label, rank = excluded.rank, is_admin = excluded.is_admin;

-- ============================================================================
-- 3. app_users — THE SINGLE IDENTITY TABLE
-- ============================================================================
-- id is ALWAYS the auth.users id. One login, one password, all four tools.
-- Every column that any of the four apps needed is preserved here.
-- ----------------------------------------------------------------------------

create table if not exists public.app_users (
  id                  uuid primary key references auth.users(id) on delete cascade,

  -- identity ---------------------------------------------------------------
  email               text not null unique,
  username            text,                       -- FIELD IQ
  full_name           text not null,
  mobile_number       text,                       -- Market Assistance
  designation         text check (designation is null or designation in (
                        'Zone Manager','Office Manager','Region Manager','Admin','CS',
                        'Retailer Support','Admin-UK','Admin-IN')),

  -- authorisation ----------------------------------------------------------
  role                text not null default 'VIEWER' references public.app_roles(code),
  is_active           boolean not null default true,
  pdf_export_enabled  boolean not null default false,   -- FIELD IQ

  -- territory scope (all four styles kept so every app resolves scope) ------
  branch              text,        -- single branch code   (Contract)
  branches            text[],      -- multi branch codes   (FIELD IQ, Contract RSM)
  zone                text,        -- single zone code     (Contract, FIELD IQ)
  branch_id           uuid references public.branches(id) on delete set null,  -- Incentive
  zone_id             uuid references public.zones(id)    on delete set null,  -- Incentive
  territory           text check (territory is null or territory in (
                        'North Region','Milan','Bologna','Torino','Padova',
                        'South Region','Rome','Napoli','Bari','Palermo','ITALY (All)')),

  -- audit ------------------------------------------------------------------
  created_by          uuid references public.app_users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists app_users_role_idx      on public.app_users(role);
create index if not exists app_users_active_idx    on public.app_users(is_active);
create index if not exists app_users_branch_idx    on public.app_users(branch);
create index if not exists app_users_branch_id_idx on public.app_users(branch_id);
create index if not exists app_users_zone_id_idx   on public.app_users(zone_id);
create unique index if not exists app_users_email_lower_idx on public.app_users(lower(email));

-- Keep the two territory representations in sync automatically, so an app that
-- writes `branch` (text code) also satisfies an app that reads `branch_id`.
create or replace function public.sync_app_user_scope()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(trim(new.email));

  -- branch text -> branch_id
  if new.branch is not null and new.branch_id is null then
    select b.id into new.branch_id from public.branches b
     where b.code = new.branch or b.name = new.branch or b.short_code = new.branch
     limit 1;
  end if;
  -- branch_id -> branch text
  if new.branch_id is not null and new.branch is null then
    select b.code into new.branch from public.branches b where b.id = new.branch_id;
  end if;

  -- zone text -> zone_id
  if new.zone is not null and new.zone_id is null then
    select z.id into new.zone_id from public.zones z
     where z.code = new.zone or z.name = new.zone or z.short_code = new.zone
     limit 1;
  end if;
  -- zone_id -> zone text
  if new.zone_id is not null and new.zone is null then
    select z.code into new.zone from public.zones z where z.id = new.zone_id;
  end if;

  -- single branch -> branches[]
  if (new.branches is null or cardinality(new.branches) = 0) and new.branch is not null then
    new.branches := array[new.branch];
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_app_users_sync on public.app_users;
create trigger trg_app_users_sync
  before insert or update on public.app_users
  for each row execute function public.sync_app_user_scope();

-- ============================================================================
-- 4. TOOL REGISTRY & PER-USER TOOL ACCESS  (drives the Home screen)
-- ============================================================================

create table if not exists public.app_tools (
  key           text primary key,
  name          text not null,
  description   text,
  route         text not null,
  icon          text,
  accent_color  text,
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

insert into public.app_tools (key, name, description, route, icon, accent_color, sort_order) values
  ('field_iq',   'Field IQ',
   'Market intelligence — KPI reports, incentive reports, coverage, retailer & plan activations.',
   '/tools/field-iq',    'BarChart3',   '#245BC1', 1),
  ('contracts',  'Retailer Contract Management',
   'Generate pre-filled retailer agreements, capture signatures and track signed / pending contracts.',
   '/tools/contracts',   'FileSignature','#08DC7D', 2),
  ('incentive',  'Retailer Incentive Statement',
   'Search, preview and download retailer incentive statements.',
   '/tools/incentive',   'Receipt',     '#FFDD64', 3),
  ('assistance', 'Lyca Market Assistance',
   'Report market issues and follow them through to resolution.',
   '/tools/assistance',  'LifeBuoy',    '#46286E', 4)
on conflict (key) do update
  set name = excluded.name, description = excluded.description,
      route = excluded.route, icon = excluded.icon,
      accent_color = excluded.accent_color, sort_order = excluded.sort_order;

create table if not exists public.user_tool_access (
  user_id     uuid not null references public.app_users(id) on delete cascade,
  tool_key    text not null references public.app_tools(key) on delete cascade,
  can_access  boolean not null default true,
  granted_by  uuid references public.app_users(id) on delete set null,
  granted_at  timestamptz not null default now(),
  primary key (user_id, tool_key)
);

create index if not exists user_tool_access_user_idx on public.user_tool_access(user_id);

-- Every new user gets access to every active tool by default; an admin can
-- revoke individual tools from the unified Users screen.
create or replace function public.grant_default_tool_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_tool_access (user_id, tool_key, can_access)
  select new.id, t.key, true
    from public.app_tools t
   where t.is_active
  on conflict (user_id, tool_key) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_app_users_default_tools on public.app_users;
create trigger trg_app_users_default_tools
  after insert on public.app_users
  for each row execute function public.grant_default_tool_access();

create or replace function public.has_tool_access(p_tool_key text, p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.user_tool_access uta
      join public.app_users u on u.id = uta.user_id
     where uta.user_id = p_uid
       and uta.tool_key = p_tool_key
       and uta.can_access
       and u.is_active
  );
$$;

grant execute on function public.has_tool_access(text, uuid) to authenticated;

-- Home screen feed: the tools THIS user may open.
create or replace view public.my_tools
with (security_invoker = true) as
  select t.key, t.name, t.description, t.route, t.icon, t.accent_color, t.sort_order
    from public.app_tools t
    join public.user_tool_access uta on uta.tool_key = t.key
   where uta.user_id = auth.uid()
     and uta.can_access
     and t.is_active
   order by t.sort_order;
