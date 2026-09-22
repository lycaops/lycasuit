-- ============================================================================
-- LYCA SUITE — RETAILER INCENTIVE STATEMENT
-- Field IQ role & territory parity
-- ============================================================================
-- Before this migration the Incentive tool used its own role vocabulary
-- (admin / branch_user / zone_user / viewer) and its own single-branch
-- allocation (profiles.branch_id / zone_id), so the same person could be
-- "RSM with 4 branches" in FIELD IQ and "Branch User with 1 branch" here.
--
-- From now on the Incentive tool speaks FIELD IQ's vocabulary and resolves
-- visibility from the same territory columns:
--
--   HS-ADMIN / ADMIN / COUNTRY-MANAGER / UK-ADMIN -> all branches, or only the
--                                                   branches assigned to them
--   RSM           -> every assigned branch (e.g. 4 branches = one region)
--   ASM (and FSE) -> exactly one branch
--   ZONE-MANAGER  -> exactly one zone
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Canonical "ADMIN" role
-- ----------------------------------------------------------------------------
-- The platform user screen and the tool user screens offer the role "ADMIN";
-- role_to_fieldiq / role_to_incentive already emit it, but app_users.role has a
-- foreign key to app_roles so the code itself has to exist.
insert into public.app_roles (code, label, rank, is_admin) values
  ('ADMIN', 'Administrator', 25, true)
on conflict (code) do update
  set label = excluded.label, rank = excluded.rank, is_admin = excluded.is_admin;

-- ----------------------------------------------------------------------------
-- 1. One role vocabulary: Incentive Statement == FIELD IQ
-- ----------------------------------------------------------------------------

create or replace function public.role_to_incentive(p_role text)
returns text language sql immutable as $$
  select public.role_to_fieldiq(p_role);
$$;

comment on function public.role_to_incentive(text) is
  'Retailer Incentive Statement role vocabulary — identical to FIELD IQ '
  '(HS-ADMIN / ADMIN / COUNTRY-MANAGER / UK-ADMIN / RSM / ASM / ZONE-MANAGER).';

-- role_from_app must understand the new vocabulary AND the legacy one, so old
-- clients / rows written as admin / branch_user / zone_user keep working.
create or replace function public.role_from_app(p_app text, p_app_role text, p_current text default null)
returns text
language plpgsql
immutable
as $$
declare
  v text;
begin
  if p_app_role is null then return coalesce(p_current, 'VIEWER'); end if;

  -- already consistent? keep the richer canonical role
  if p_current is not null then
    if (p_app = 'field_iq'   and public.role_to_fieldiq(p_current)    = p_app_role)
    or (p_app = 'contracts'  and public.role_to_contract(p_current)   = p_app_role)
    or (p_app = 'incentive'  and public.role_to_incentive(p_current)  = p_app_role)
    or (p_app = 'assistance' and public.role_to_assistance(p_current) = p_app_role)
    then
      return p_current;
    end if;
  end if;

  v := case p_app
    when 'field_iq' then case p_app_role
        when 'HS-ADMIN'        then 'HS-ADMIN'
        when 'COUNTRY-MANAGER' then 'COUNTRY-MANAGER'
        when 'UK-ADMIN'        then 'UK-ADMIN'
        when 'ADMIN'           then 'PM-ADMIN'
        when 'RSM'             then 'RSM'
        when 'ASM'             then 'ASM'
        when 'ZONE-MANAGER'    then 'ZONE-MANAGER'
        else 'VIEWER' end
    when 'contracts' then case p_app_role
        when 'ADMIN' then 'HS-ADMIN'
        when 'RSM'   then 'RSM'
        when 'ASM'   then 'ASM'
        when 'FSE'   then 'FSE'
        else 'VIEWER' end
    when 'incentive' then case p_app_role
        -- FIELD IQ vocabulary (what role_to_incentive returns now)
        when 'HS-ADMIN'        then 'HS-ADMIN'
        when 'COUNTRY-MANAGER' then 'COUNTRY-MANAGER'
        when 'UK-ADMIN'        then 'UK-ADMIN'
        when 'ADMIN'           then 'PM-ADMIN'
        when 'RSM'             then 'RSM'
        when 'ASM'             then 'ASM'
        when 'ZONE-MANAGER'    then 'ZONE-MANAGER'
        when 'FSE'             then 'FSE'
        -- legacy Incentive vocabulary
        when 'admin'           then 'HS-ADMIN'
        when 'branch_user'     then 'ASM'
        when 'zone_user'       then 'ZONE-MANAGER'
        else 'VIEWER' end
    when 'assistance' then case p_app_role
        when 'HS-ADMIN' then 'HS-ADMIN'
        when 'PM-ADMIN' then 'PM-ADMIN'
        when 'CS-ADMIN' then 'CS-ADMIN'
        when 'RSM'      then 'RSM'
        when 'ASM'      then 'ASM'
        when 'FSE'      then 'FSE'
        else 'VIEWER' end
    else 'VIEWER'
  end;

  return v;
end;
$$;

-- The Incentive admins are exactly the FIELD IQ admins.
create or replace function public.is_admin_incentive(p_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.role_to_incentive(public.current_canonical_role(p_uid))
         in ('HS-ADMIN','ADMIN','COUNTRY-MANAGER','UK-ADMIN');
$$;

-- ----------------------------------------------------------------------------
-- 2. Territory helpers (mirror FIELD IQ's `can_see_branch`)
-- ----------------------------------------------------------------------------
-- retailer_incentives stores the branch in `accmgrid` and the zone in
-- `hotspotid`. Because branches / zones are merged reference tables, every
-- identifier is matched against code, name AND short_code.

-- Branch codes the user may see — multi-branch for RSM/admin, one for ASM.
create or replace function public.incentive_scope_branches(p_uid uuid default auth.uid())
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(
           nullif(u.branches, '{}'::text[]),
           case when u.branch is not null then array[u.branch] else array[]::text[] end
         )
    from public.app_users u
   where u.id = p_uid and u.is_active
   limit 1;
$$;

-- Zone code the user may see (zone column, or the zone the uuid points at).
create or replace function public.incentive_scope_zone(p_uid uuid default auth.uid())
returns text language sql stable security definer set search_path = public as $$
  select coalesce(u.zone, z.code, z.short_code, z.name)
    from public.app_users u
    left join public.zones z on z.id = u.zone_id
   where u.id = p_uid and u.is_active
   limit 1;
$$;

-- An admin with no branch restriction sees the whole country.
create or replace function public.incentive_sees_all(p_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin_incentive(p_uid)
     and coalesce(cardinality(public.incentive_scope_branches(p_uid)), 0) = 0;
$$;

-- Does this retailer's ACCMGRID belong to one of the given branches?
create or replace function public.incentive_branch_matches(p_accmgrid text, p_branches text[])
returns boolean language sql stable security definer set search_path = public as $$
  select p_accmgrid is not null
     and coalesce(cardinality(p_branches), 0) > 0
     and exists (
       select 1 from public.branches b
        where (b.code = any(p_branches) or b.name = any(p_branches) or b.short_code = any(p_branches))
          and p_accmgrid in (b.code, b.name, b.short_code)
     );
$$;

-- Does this retailer's HOTSPOTID belong to the given zone?
create or replace function public.incentive_zone_matches(p_hotspotid text, p_zone text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_hotspotid is not null
     and p_zone is not null
     and exists (
       select 1 from public.zones z
        where (z.code = p_zone or z.name = p_zone or z.short_code = p_zone)
          and p_hotspotid in (z.code, z.name, z.short_code)
     );
$$;

-- The one rule every policy and RPC uses.
create or replace function public.can_see_incentive_retailer(
  p_accmgrid  text,
  p_hotspotid text,
  p_uid       uuid default auth.uid()
)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.incentive_sees_all(p_uid)
    or case public.role_to_incentive(public.current_canonical_role(p_uid))
         -- Zone Manager: only the retailers of their single zone.
         when 'ZONE-MANAGER' then public.incentive_zone_matches(p_hotspotid, public.incentive_scope_zone(p_uid))
         -- RSM sees every assigned branch, ASM one branch, admins the subset
         -- that was assigned to them.
         when 'HS-ADMIN'        then public.incentive_branch_matches(p_accmgrid, public.incentive_scope_branches(p_uid))
         when 'ADMIN'           then public.incentive_branch_matches(p_accmgrid, public.incentive_scope_branches(p_uid))
         when 'COUNTRY-MANAGER' then public.incentive_branch_matches(p_accmgrid, public.incentive_scope_branches(p_uid))
         when 'UK-ADMIN'        then public.incentive_branch_matches(p_accmgrid, public.incentive_scope_branches(p_uid))
         when 'RSM'             then public.incentive_branch_matches(p_accmgrid, public.incentive_scope_branches(p_uid))
         when 'ASM'             then public.incentive_branch_matches(p_accmgrid, public.incentive_scope_branches(p_uid))
         else false
       end;
$$;

-- ----------------------------------------------------------------------------
-- 3. The signed-in user's scope, for the "Role / Scope" badge in the tool
-- ----------------------------------------------------------------------------
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
    t.zone_code,
    coalesce(
      (select z.name from public.zones z where z.id = t.zone_id or z.code = t.zone_code limit 1),
      t.zone_code
    ),
    (t.is_admin and cardinality(t.branch_codes) = 0)
  from (
    select
      public.role_to_incentive(u.role) as tool_role,
      coalesce(
        nullif(u.branches, '{}'::text[]),
        case when u.branch is not null then array[u.branch] else array[]::text[] end
      ) as branch_codes,
      coalesce(u.zone, (select z.code from public.zones z where z.id = u.zone_id)) as zone_code,
      u.zone_id,
      public.role_to_incentive(u.role) in ('HS-ADMIN','ADMIN','COUNTRY-MANAGER','UK-ADMIN') as is_admin
    from public.app_users u
    where u.id = auth.uid() and u.is_active
    limit 1
  ) t;
$$;

grant execute on function public.incentive_scope_branches(uuid)               to authenticated;
grant execute on function public.incentive_scope_zone(uuid)                   to authenticated;
grant execute on function public.incentive_sees_all(uuid)                     to authenticated;
grant execute on function public.incentive_branch_matches(text, text[])       to authenticated;
grant execute on function public.incentive_zone_matches(text, text)           to authenticated;
grant execute on function public.can_see_incentive_retailer(text, text, uuid) to authenticated;
grant execute on function public.incentive_my_scope()                         to authenticated;

-- ----------------------------------------------------------------------------
-- 4. RLS — retailer_incentives scoped by the user's territory
-- ----------------------------------------------------------------------------
alter table public.retailer_incentives enable row level security;

drop policy if exists "ri: admin full access"     on public.retailer_incentives;
drop policy if exists "ri: branch scoped read"    on public.retailer_incentives;
drop policy if exists "ri: zone scoped read"      on public.retailer_incentives;
drop policy if exists "ri: viewer read all"       on public.retailer_incentives;
drop policy if exists "ri: territory scoped read" on public.retailer_incentives;
drop policy if exists "ri: scoped read"           on public.retailer_incentives;
drop policy if exists "ri: admin insert"          on public.retailer_incentives;
drop policy if exists "ri: admin update"          on public.retailer_incentives;
drop policy if exists "ri: admin delete"          on public.retailer_incentives;

-- Read: exactly the retailers inside the assigned territory.
create policy "ri: scoped read" on public.retailer_incentives
  for select to authenticated
  using (
    public.has_tool_access('incentive')
    and public.can_see_incentive_retailer(accmgrid, hotspotid)
  );

-- Writes stay with the administrators.
create policy "ri: admin insert" on public.retailer_incentives
  for insert to authenticated with check (public.is_admin_incentive());

create policy "ri: admin update" on public.retailer_incentives
  for update to authenticated
  using (public.is_admin_incentive()) with check (public.is_admin_incentive());

create policy "ri: admin delete" on public.retailer_incentives
  for delete to authenticated using (public.is_admin_incentive());

-- ----------------------------------------------------------------------------
-- 5. Compatibility view `profiles` now exposes the FIELD IQ territory columns
-- ----------------------------------------------------------------------------
drop view if exists public.profiles cascade;
create view public.profiles
with (security_invoker = true) as
  select
    u.id,
    u.email,
    u.full_name,
    public.role_to_incentive(u.role) as role,
    coalesce(
      nullif(u.branches, '{}'::text[]),
      case when u.branch is not null then array[u.branch] else array[]::text[] end
    )                                as branches,
    u.branch,
    u.zone,
    u.branch_id,
    u.zone_id,
    (not u.is_active)                as is_disabled,
    u.is_active,
    u.designation,
    u.territory,
    u.created_at,
    u.updated_at
  from public.app_users u;

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
       new.zone, new.zone_id,
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
           branches  = coalesce(new.branches,  u.branches),
           branch    = coalesce(new.branch,    u.branch),
           branch_id = coalesce(new.branch_id, u.branch_id),
           zone      = coalesce(new.zone,      u.zone),
           zone_id   = coalesce(new.zone_id,   u.zone_id),
           is_active = not coalesce(new.is_disabled, not u.is_active)
     where u.id = old.id;
    return new;

  else
    delete from public.app_users where id = old.id;
    return old;
  end if;
end;
$$;

drop trigger if exists trg_profiles_dml on public.profiles;
create trigger trg_profiles_dml
  instead of insert or update or delete on public.profiles
  for each row execute function public.profiles_dml();

grant select, insert, update, delete on public.profiles to authenticated;

-- ----------------------------------------------------------------------------
-- 6. create_app_profile() accepts the FIELD IQ roles (and the legacy ones)
-- ----------------------------------------------------------------------------
create or replace function public.create_app_profile(
  p_auth_uid  uuid,
  p_role      text default 'VIEWER',
  p_branch_id uuid default null,
  p_zone_id   uuid default null,
  p_full_name text default null
)
returns public.profiles
language plpgsql security definer set search_path = public
as $$
declare rec public.profiles;
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  if p_role not in ('HS-ADMIN','ADMIN','COUNTRY-MANAGER','UK-ADMIN','RSM','ASM','ZONE-MANAGER',
                    'admin','branch_user','zone_user','viewer','VIEWER') then
    raise exception 'invalid_role';
  end if;

  insert into public.app_users (id, email, full_name, role, branch_id, zone_id)
  select p_auth_uid, lower(au.email),
         coalesce(p_full_name, au.raw_user_meta_data->>'full_name', au.email),
         public.role_from_app('incentive', p_role), p_branch_id, p_zone_id
    from auth.users au where au.id = p_auth_uid
  on conflict (id) do update
    set role      = public.role_from_app('incentive', p_role, public.app_users.role),
        branch_id = coalesce(excluded.branch_id, public.app_users.branch_id),
        zone_id   = coalesce(excluded.zone_id,   public.app_users.zone_id),
        full_name = coalesce(excluded.full_name, public.app_users.full_name),
        updated_at = now();

  select * into rec from public.profiles where id = p_auth_uid;
  return rec;
end;
$$;

grant execute on function public.create_app_profile(uuid, text, uuid, uuid, text) to authenticated;
