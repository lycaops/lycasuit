-- ============================================================================
-- LYCA SUITE — ZONE NAME PARITY  (rpa_users / users / profiles zone column)
-- ============================================================================
-- Every tool must store the zone as the name FIELD IQ shows and filters on,
-- never the internal code:
--
--   stored (and displayed) : HS MILANO ZONE 1      <- zones.name
--   not stored             : HS-MILANO-Z1          <- zones.code
--                            MIL-Z1                <- zones.short_code
--
-- Before this migration app_users.zone was derived from zones.code, so a Zone
-- Manager created in the Retailer Incentive Statement tool or from the platform
-- admin screen ended up with `HS-MILANO-Z1` in rpa_users (FIELD IQ) and users
-- (Contract Management) while FIELD IQ's retailer data (zone_coverage_summary,
-- retailer_coverage) is keyed by `HS MILANO ZONE 1` — the user therefore saw no
-- retailers at all.
--
-- From now on:
--   * zone_id (uuid) is authoritative when present,
--   * zone text is accepted as a code, a short code or a name and is ALWAYS
--     normalised to the zone name before it is stored,
--   * branches[] accepts a uuid, a code, a name or a short code and is always
--     stored as canonical branch codes (RSM -> 4 branches, ASM -> 1 branch).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Identifier helpers — accept code / short_code / name (case-insensitive)
-- ----------------------------------------------------------------------------

comment on column public.app_users.zone is
  'Zone DISPLAY NAME (zones.name), e.g. "HS MILANO ZONE 1". Never the code.';

-- Canonical zone name for any zone identifier. Unknown values are returned
-- trimmed so that data-only zones (e.g. "HS MILANO SHOP CLOSED", which exists in
-- FIELD IQ's imported data but not in the zones table) still round-trip.
create or replace function public.zone_display_name(p_zone text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_value text := nullif(trim(p_zone), '');
  v_name  text;
begin
  if v_value is null then return null; end if;

  select z.name into v_name from public.zones z
   where z.code = v_value or z.name = v_value or z.short_code = v_value
   limit 1;
  if v_name is not null then return v_name; end if;

  select z.name into v_name from public.zones z
   where lower(z.code) = lower(v_value)
      or lower(z.name) = lower(v_value)
      or lower(z.short_code) = lower(v_value)
   limit 1;

  return coalesce(v_name, v_value);
end;
$$;

-- uuid of the zone identified by any of its identifiers (null when unknown).
create or replace function public.zone_id_of(p_zone text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select z.id from public.zones z
   where trim(p_zone) is not null
     and (z.code = trim(p_zone) or z.name = trim(p_zone) or z.short_code = trim(p_zone)
          or lower(z.code) = lower(trim(p_zone))
          or lower(z.name) = lower(trim(p_zone))
          or lower(z.short_code) = lower(trim(p_zone)))
   limit 1;
$$;

-- Canonical branch code for any branch identifier (uuid text, code, name or
-- short code). Unknown values are returned trimmed.
create or replace function public.branch_code_of(p_branch text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_value text := nullif(trim(p_branch), '');
  v_code  text;
begin
  if v_value is null then return null; end if;

  select b.code into v_code from public.branches b
   where b.id::text = v_value or b.code = v_value or b.name = v_value or b.short_code = v_value
   limit 1;
  if v_code is not null then return v_code; end if;

  select b.code into v_code from public.branches b
   where lower(b.code) = lower(v_value)
      or lower(b.name) = lower(v_value)
      or lower(b.short_code) = lower(v_value)
   limit 1;

  return coalesce(v_code, v_value);
end;
$$;

-- Zone text for a (zone_id, zone text) pair — the uuid wins when it is known.
create or replace function public.zone_text_of(p_zone_id uuid, p_zone text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
           (select z.name from public.zones z where z.id = p_zone_id),
           public.zone_display_name(p_zone)
         );
$$;

-- One-call lookup for the API layer / server actions: any identifier in, the
-- canonical zone (id, code, name, short_code) and its branch out.
create or replace function public.resolve_zone(p_zone text)
returns table (
  id          uuid,
  code        text,
  name        text,
  short_code  text,
  branch_id   uuid,
  branch_code text,
  branch_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select z.id, z.code, z.name, z.short_code, z.branch_id, b.code, b.name
    from public.zones z
    left join public.branches b on b.id = z.branch_id
   where trim(p_zone) is not null
     and (z.code = trim(p_zone) or z.name = trim(p_zone) or z.short_code = trim(p_zone)
          or lower(z.code) = lower(trim(p_zone))
          or lower(z.name) = lower(trim(p_zone))
          or lower(z.short_code) = lower(trim(p_zone)))
   limit 1;
$$;

grant execute on function public.zone_display_name(text)      to authenticated;
grant execute on function public.zone_id_of(text)             to authenticated;
grant execute on function public.branch_code_of(text)         to authenticated;
grant execute on function public.zone_text_of(uuid, text)     to authenticated;
grant execute on function public.resolve_zone(text)           to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Territory normalisation on every write to app_users
-- ----------------------------------------------------------------------------
-- Any of the four tools can write a territory through its own view, and each of
-- them speaks a different dialect: FIELD IQ writes branch codes + a zone name,
-- Contract Management writes one branch code + a zone name, the Incentive
-- Statement writes branch / zone UUIDs. Everything is normalised here so the
-- stored row is identical whichever tool created or edited the user.

create or replace function public.sync_app_user_scope()
returns trigger
language plpgsql
as $$
declare
  v_branches text[];
begin
  new.email := lower(trim(new.email));

  -- branches[] (uuid | code | name | short_code) -> canonical branch codes ----
  if new.branches is not null and cardinality(new.branches) > 0 then
    select array_agg(distinct b.code order by b.code) into v_branches
      from unnest(new.branches) as x(value)
      join public.branches b
        on b.id::text     = trim(x.value)
        or b.code         = trim(x.value)
        or b.name         = trim(x.value)
        or b.short_code   = trim(x.value)
        or lower(b.code)  = lower(trim(x.value))
        or lower(b.name)  = lower(trim(x.value));
    new.branches := coalesce(v_branches, '{}'::text[]);
  end if;

  -- single branch -> canonical branch code, and branch -> branches[] ---------
  if new.branch is not null and trim(new.branch) <> '' then
    new.branch := public.branch_code_of(new.branch);
    if new.branches is null or cardinality(new.branches) = 0 then
      new.branches := array[new.branch];
    end if;
  end if;

  -- exactly one assigned branch -> keep the single-branch column in step -----
  if (new.branch is null or trim(new.branch) = '')
     and new.branches is not null
     and cardinality(new.branches) = 1 then
    new.branch := new.branches[1];
  end if;

  -- branch text  <->  branch_id ---------------------------------------------
  if new.branch_id is not null and (new.branch is null or trim(new.branch) = '') then
    select b.code into new.branch from public.branches b where b.id = new.branch_id;
  end if;
  if new.branch is not null and new.branch_id is null then
    select b.id into new.branch_id from public.branches b where b.code = new.branch limit 1;
  end if;

  -- zone: the uuid is authoritative, text accepts code / short_code / name ----
  if new.zone_id is not null then
    new.zone := coalesce(
      (select z.name from public.zones z where z.id = new.zone_id),
      new.zone
    );
  elsif new.zone is not null and trim(new.zone) <> '' then
    new.zone    := public.zone_display_name(new.zone);
    new.zone_id := public.zone_id_of(new.zone);
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_app_users_sync on public.app_users;
create trigger trg_app_users_sync
  before insert or update on public.app_users
  for each row execute function public.sync_app_user_scope();

-- ----------------------------------------------------------------------------
-- 3. BACKFILL — existing rows stored as codes / uuid arrays
-- ----------------------------------------------------------------------------

-- 3a. zone_id present -> store the zone NAME (this is the fix for
--     "HS-MILANO-Z1" showing up where "HS MILANO ZONE 1" belongs).
update public.app_users u
   set zone = z.name
  from public.zones z
 where u.zone_id = z.id
   and u.zone is distinct from z.name;

-- 3b. zone text that is a code / short code / name -> NAME + uuid
update public.app_users u
   set zone    = z.name,
       zone_id = z.id
  from public.zones z
 where u.zone_id is null
   and nullif(trim(u.zone), '') is not null
   and (z.code = trim(u.zone) or z.name = trim(u.zone) or z.short_code = trim(u.zone));

-- 3c. branches[] holding uuids / names -> canonical branch codes
update public.app_users u
   set branches = coalesce((
         select array_agg(distinct b.code order by b.code)
           from unnest(u.branches) as x(value)
           join public.branches b
             on b.id::text = trim(x.value)
             or b.code = trim(x.value)
             or b.name = trim(x.value)
             or b.short_code = trim(x.value)
       ), '{}'::text[])
 where u.branches is not null
   and cardinality(u.branches) > 0
   and exists (
         select 1 from unnest(u.branches) as x(value)
          where not exists (select 1 from public.branches b where b.code = trim(x.value))
       );

-- 3d. single branch column holding a name / uuid -> branch code
update public.app_users u
   set branch = coalesce(
         (select b.code from public.branches b
           where b.code = trim(u.branch) or b.name = trim(u.branch) or b.short_code = trim(u.branch)
              or b.id::text = trim(u.branch)
           limit 1),
         u.branch)
 where nullif(trim(u.branch), '') is not null
   and not exists (select 1 from public.branches b where b.code = trim(u.branch));

-- ----------------------------------------------------------------------------
-- 4. The compatibility views' write triggers now speak zone NAMES
-- ----------------------------------------------------------------------------
-- rpa_users (FIELD IQ) and users (Contract Management) read app_users.zone, so
-- after the backfill they already display "HS MILANO ZONE 1". The write triggers
-- below keep it that way for created / edited users and make sure that clearing
-- a zone really clears both zone columns.

create or replace function public.rpa_users_dml()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if tg_op = 'INSERT' then
    v_id := coalesce(new.auth_user_id, new.id, gen_random_uuid());
    insert into public.app_users
      (id, email, username, full_name, role, branches, zone, is_active, pdf_export_enabled)
    values
      (v_id, lower(trim(new.email)), new.username, new.full_name,
       public.role_from_app('field_iq', new.role), new.branches,
       public.zone_display_name(new.zone),
       coalesce(new.is_active, true), coalesce(new.pdf_export_enabled, false))
    on conflict (id) do update
      set username = excluded.username, full_name = excluded.full_name;
    new.id := v_id; new.auth_user_id := v_id;
    return new;

  elsif tg_op = 'UPDATE' then
    update public.app_users u
       set email              = coalesce(lower(trim(new.email)), u.email),
           username           = coalesce(new.username, u.username),
           full_name          = coalesce(new.full_name, u.full_name),
           role               = public.role_from_app('field_iq', new.role, u.role),
           branches           = coalesce(new.branches, u.branches),
           -- FIELD IQ assigns the zone as text: store the display name, always.
           zone               = public.zone_display_name(new.zone),
           zone_id            = public.zone_id_of(new.zone),
           is_active          = coalesce(new.is_active, u.is_active),
           pdf_export_enabled = coalesce(new.pdf_export_enabled, u.pdf_export_enabled)
     where u.id = old.id;
    return new;

  else
    delete from public.app_users where id = old.id;
    return old;
  end if;
end;
$$;

create or replace function public.users_dml()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.app_users
      (id, email, full_name, role, branch, branches, zone, is_active)
    values
      (coalesce(new.id, gen_random_uuid()), lower(trim(new.email)), new.full_name,
       public.role_from_app('contracts', new.role), new.branch, new.branches,
       public.zone_display_name(new.zone), coalesce(new.is_active, true))
    on conflict (id) do update
      set full_name = excluded.full_name,
          branch    = coalesce(excluded.branch, public.app_users.branch),
          zone      = coalesce(excluded.zone,   public.app_users.zone);
    return new;

  elsif tg_op = 'UPDATE' then
    update public.app_users u
       set email     = coalesce(lower(trim(new.email)), u.email),
           full_name = coalesce(new.full_name, u.full_name),
           role      = public.role_from_app('contracts', new.role, u.role),
           branch    = new.branch,
           branches  = coalesce(new.branches, u.branches),
           -- Contract Management's FSE zone is a zone name; keep it a name.
           zone      = public.zone_display_name(new.zone),
           zone_id   = public.zone_id_of(new.zone),
           is_active = coalesce(new.is_active, u.is_active)
     where u.id = old.id;
    return new;

  else
    delete from public.app_users where id = old.id;
    return old;
  end if;
end;
$$;

create or replace function public.profiles_dml()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.app_users
      (id, email, full_name, role, branches, branch, branch_id, zone, zone_id, is_active)
    values
      (coalesce(new.id, gen_random_uuid()), lower(trim(new.email)), coalesce(new.full_name,'Unnamed'),
       public.role_from_app('incentive', new.role),
       nullif(new.branches, '{}'::text[]), new.branch, new.branch_id,
       public.zone_text_of(new.zone_id, new.zone), new.zone_id,
       not coalesce(new.is_disabled, false))
    on conflict (id) do update
      set full_name = coalesce(excluded.full_name, public.app_users.full_name),
          role      = coalesce(excluded.role,      public.app_users.role),
          branches  = coalesce(excluded.branches,  public.app_users.branches),
          branch    = coalesce(excluded.branch,    public.app_users.branch),
          branch_id = coalesce(excluded.branch_id, public.app_users.branch_id),
          zone      = coalesce(excluded.zone,      public.app_users.zone),
          zone_id   = coalesce(excluded.zone_id,   public.app_users.zone_id);
    return new;

  elsif tg_op = 'UPDATE' then
    update public.app_users u
       set email     = coalesce(lower(trim(new.email)), u.email),
           full_name = coalesce(new.full_name, u.full_name),
           role      = public.role_from_app('incentive', new.role, u.role),
           branches  = coalesce(new.branches, u.branches),
           branch    = coalesce(new.branch, u.branch),
           branch_id = coalesce(new.branch_id, u.branch_id),
           -- The Incentive Statement screen assigns the zone by uuid; the zone
           -- NAME is stored next to it (and cleared together with the uuid).
           zone      = public.zone_text_of(new.zone_id, new.zone),
           zone_id   = new.zone_id,
           is_active = not coalesce(new.is_disabled, not u.is_active)
     where u.id = old.id;
    return new;

  else
    delete from public.app_users where id = old.id;
    return old;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. The Incentive Statement scope RPCs now resolve zone NAMES too
-- ----------------------------------------------------------------------------
-- A Zone Manager created in any tool is filtered against the zone names that
-- retailer_incentives.hotspotid holds, so the scope has to come back as a name.

create or replace function public.incentive_scope_zone(p_uid uuid default auth.uid())
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
           public.zone_text_of(u.zone_id, u.zone),
           (select z.name from public.zones z where z.id = u.zone_id)
         )
    from public.app_users u
   where u.id = p_uid and u.is_active
   limit 1;
$$;

comment on function public.incentive_scope_zone(uuid) is
  'Zone the user may see, as a zone NAME (e.g. "HS MILANO ZONE 1").';

create or replace function public.incentive_my_scope()
returns table (
  role         text,
  branches     text[],
  branch_names text[],
  zone         text,
  zone_name    text,
  sees_all     boolean
)
language sql stable security definer set search_path = public as $$
  select
    t.tool_role,
    t.branch_codes,
    coalesce(
      (select array_agg(b.name order by b.name)
         from public.branches b
        where b.code = any(t.branch_codes)),
      array[]::text[]
    ),
    t.zone_name,
    t.zone_name,
    (t.is_admin and cardinality(t.branch_codes) = 0)
  from (
    select
      public.role_to_incentive(u.role) as tool_role,
      coalesce(
        nullif(u.branches, '{}'::text[]),
        case when u.branch is not null then array[u.branch] else array[]::text[] end
      ) as branch_codes,
      coalesce(
        public.zone_text_of(u.zone_id, u.zone),
        (select z.name from public.zones z where z.id = u.zone_id)
      ) as zone_name,
      public.role_to_incentive(u.role) in ('HS-ADMIN','ADMIN','COUNTRY-MANAGER','UK-ADMIN') as is_admin
    from public.app_users u
    where u.id = auth.uid() and u.is_active
    limit 1
  ) t;
$$;

grant execute on function public.incentive_scope_zone(uuid) to authenticated;
grant execute on function public.incentive_my_scope()       to authenticated;

-- ----------------------------------------------------------------------------
-- 6. Verification — every zone value must be a name, not a code
-- ----------------------------------------------------------------------------
do $$
declare
  v_codes integer;
begin
  select count(*) into v_codes
    from public.app_users u
    join public.zones z on trim(u.zone) = z.code
   where u.zone is not null;

  if v_codes > 0 then
    raise warning '% app_users rows still hold a zone code (expected 0 after backfill).', v_codes;
  end if;
end;
$$;


