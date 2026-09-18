-- ============================================================================
-- LYCA SUITE — UNIFIED PLATFORM SCHEMA
-- Part 2 of 4: Role mapping + updatable compatibility views
-- ============================================================================
-- This is what lets all four apps keep their existing queries unchanged.
-- Each legacy table name becomes an updatable view over public.app_users,
-- translating the canonical role into that app's own role vocabulary.
-- ============================================================================

-- ============================================================================
-- 5. ROLE MAPPING — canonical  <->  per-app vocabulary
-- ============================================================================

-- canonical -> FIELD IQ role
create or replace function public.role_to_fieldiq(p_role text)
returns text language sql immutable as $$
  select case p_role
    when 'SUPER-ADMIN'     then 'HS-ADMIN'
    when 'HS-ADMIN'        then 'HS-ADMIN'
    when 'PM-ADMIN'        then 'ADMIN'
    when 'CS-ADMIN'        then 'ADMIN'
    when 'COUNTRY-MANAGER' then 'COUNTRY-MANAGER'
    when 'UK-ADMIN'        then 'UK-ADMIN'
    when 'RSM'             then 'RSM'
    when 'ASM'             then 'ASM'
    when 'ZONE-MANAGER'    then 'ZONE-MANAGER'
    when 'FSE'             then 'ASM'
    else 'ASM'
  end;
$$;

-- canonical -> Contract Management role
create or replace function public.role_to_contract(p_role text)
returns text language sql immutable as $$
  select case p_role
    when 'SUPER-ADMIN'     then 'ADMIN'
    when 'HS-ADMIN'        then 'ADMIN'
    when 'PM-ADMIN'        then 'ADMIN'
    when 'CS-ADMIN'        then 'ADMIN'
    when 'COUNTRY-MANAGER' then 'ADMIN'
    when 'UK-ADMIN'        then 'ADMIN'
    when 'RSM'             then 'RSM'
    when 'ASM'             then 'ASM'
    else 'FSE'
  end;
$$;

-- canonical -> Incentive Statement role
create or replace function public.role_to_incentive(p_role text)
returns text language sql immutable as $$
  select case p_role
    when 'SUPER-ADMIN'     then 'admin'
    when 'HS-ADMIN'        then 'admin'
    when 'PM-ADMIN'        then 'admin'
    when 'COUNTRY-MANAGER' then 'admin'
    when 'UK-ADMIN'        then 'admin'
    when 'CS-ADMIN'        then 'viewer'
    when 'RSM'             then 'branch_user'
    when 'ASM'             then 'branch_user'
    when 'ZONE-MANAGER'    then 'zone_user'
    when 'FSE'             then 'zone_user'
    else 'viewer'
  end;
$$;

-- canonical -> Market Assistance role
create or replace function public.role_to_assistance(p_role text)
returns text language sql immutable as $$
  select case p_role
    when 'SUPER-ADMIN'     then 'HS-ADMIN'
    when 'HS-ADMIN'        then 'HS-ADMIN'
    when 'UK-ADMIN'        then 'HS-ADMIN'
    when 'PM-ADMIN'        then 'PM-ADMIN'
    when 'CS-ADMIN'        then 'CS-ADMIN'
    when 'COUNTRY-MANAGER' then 'RSM'
    when 'RSM'             then 'RSM'
    when 'ASM'             then 'ASM'
    else 'FSE'
  end;
$$;

-- Reverse direction, used by the INSTEAD OF triggers when an app writes a role
-- through its own view. `p_current` is preserved when it already maps to the
-- incoming app role, so editing a user in one tool never silently demotes or
-- promotes them in another.
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
        when 'admin'       then 'HS-ADMIN'
        when 'branch_user' then 'ASM'
        when 'zone_user'   then 'ZONE-MANAGER'
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

-- ============================================================================
-- 6. ADMIN HELPERS  (SECURITY DEFINER — no RLS recursion)
-- ============================================================================
-- All four apps had their own is_admin(). Both original signatures are kept
-- so every existing policy and RPC call still resolves.

create or replace function public.current_canonical_role(p_uid uuid default auth.uid())
returns text language sql stable security definer set search_path = public as $$
  select role from public.app_users where id = p_uid and is_active limit 1;
$$;

create or replace function public.is_admin(p_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.app_users u
      join public.app_roles r on r.code = u.role
     where u.id = p_uid and u.is_active and r.is_admin
  );
$$;

create or replace function public.is_super_admin(p_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.app_users
     where id = p_uid and is_active and role in ('SUPER-ADMIN','HS-ADMIN')
  );
$$;

create or replace function public.is_admin_fieldiq(p_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.role_to_fieldiq(public.current_canonical_role(p_uid))
         in ('HS-ADMIN','ADMIN','COUNTRY-MANAGER','UK-ADMIN');
$$;

create or replace function public.is_admin_contract(p_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.role_to_contract(public.current_canonical_role(p_uid)) = 'ADMIN';
$$;

create or replace function public.is_admin_incentive(p_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.role_to_incentive(public.current_canonical_role(p_uid)) = 'admin';
$$;

create or replace function public.is_admin_assistance(p_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.role_to_assistance(public.current_canonical_role(p_uid))
         in ('HS-ADMIN','PM-ADMIN','CS-ADMIN');
$$;

-- Territory helpers (Contract Management policies call these by name)
create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select public.role_to_contract(public.current_canonical_role());
$$;

create or replace function public.current_user_branch()
returns text language sql stable security definer set search_path = public as $$
  select branch from public.app_users where id = auth.uid() limit 1;
$$;

create or replace function public.current_user_branches()
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(branches,
                  case when branch is not null then array[branch] else array[]::text[] end)
    from public.app_users where id = auth.uid() limit 1;
$$;

create or replace function public.current_user_zone()
returns text language sql stable security definer set search_path = public as $$
  select zone from public.app_users where id = auth.uid() limit 1;
$$;

grant execute on function public.is_admin(uuid)              to authenticated;
grant execute on function public.is_super_admin(uuid)        to authenticated;
grant execute on function public.is_admin_fieldiq(uuid)      to authenticated;
grant execute on function public.is_admin_contract(uuid)     to authenticated;
grant execute on function public.is_admin_incentive(uuid)    to authenticated;
grant execute on function public.is_admin_assistance(uuid)   to authenticated;
grant execute on function public.current_canonical_role(uuid)to authenticated;
grant execute on function public.current_user_role()         to authenticated;
grant execute on function public.current_user_branch()       to authenticated;
grant execute on function public.current_user_branches()     to authenticated;
grant execute on function public.current_user_zone()         to authenticated;

-- ============================================================================
-- 7. RLS on the identity table
-- ============================================================================

alter table public.app_users        enable row level security;
alter table public.app_tools        enable row level security;
alter table public.user_tool_access enable row level security;
alter table public.app_roles        enable row level security;
alter table public.branches         enable row level security;
alter table public.zones            enable row level security;

drop policy if exists "app_users_self_select"  on public.app_users;
create policy "app_users_self_select" on public.app_users
  for select to authenticated using (auth.uid() = id);

-- Any signed-in user can read the directory (tickets, contracts and reports all
-- display reporter / owner names). Matches the old `staff_read_authenticated`.
drop policy if exists "app_users_directory_select" on public.app_users;
create policy "app_users_directory_select" on public.app_users
  for select to authenticated using (true);

drop policy if exists "app_users_admin_write" on public.app_users;
create policy "app_users_admin_write" on public.app_users
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "app_users_self_update" on public.app_users;
create policy "app_users_self_update" on public.app_users
  for update to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role      = (select role      from public.app_users where id = auth.uid())
    and is_active = (select is_active from public.app_users where id = auth.uid())
    and branch_id is not distinct from (select branch_id from public.app_users where id = auth.uid())
    and zone_id   is not distinct from (select zone_id   from public.app_users where id = auth.uid())
  );

drop policy if exists "app_roles_read"  on public.app_roles;
create policy "app_roles_read"  on public.app_roles  for select to authenticated using (true);

drop policy if exists "app_tools_read"  on public.app_tools;
create policy "app_tools_read"  on public.app_tools  for select to authenticated using (true);
drop policy if exists "app_tools_admin" on public.app_tools;
create policy "app_tools_admin" on public.app_tools  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "uta_self_read"  on public.user_tool_access;
create policy "uta_self_read"  on public.user_tool_access for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "uta_admin_write" on public.user_tool_access;
create policy "uta_admin_write" on public.user_tool_access for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "branches_read"  on public.branches;
create policy "branches_read"  on public.branches for select to authenticated using (true);
drop policy if exists "branches_admin" on public.branches;
create policy "branches_admin" on public.branches for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "zones_read"  on public.zones;
create policy "zones_read"  on public.zones for select to authenticated using (true);
drop policy if exists "zones_admin" on public.zones;
create policy "zones_admin" on public.zones for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- 8. COMPATIBILITY VIEW A — rpa_users   (FIELD IQ)
-- ============================================================================

drop view if exists public.rpa_users cascade;
create view public.rpa_users
with (security_invoker = true) as
  select
    u.id,
    u.id                                as auth_user_id,
    coalesce(u.username, split_part(u.email,'@',1)) as username,
    u.full_name,
    u.email,
    public.role_to_fieldiq(u.role)      as role,
    coalesce(u.branches, '{}'::text[])  as branches,
    u.zone,
    u.is_active,
    u.pdf_export_enabled,
    u.created_by::text                  as created_by,
    u.created_at,
    u.updated_at
  from public.app_users u;

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
       public.role_from_app('field_iq', new.role), new.branches, new.zone,
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
           zone               = coalesce(new.zone, u.zone),
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

create trigger trg_rpa_users_dml
  instead of insert or update or delete on public.rpa_users
  for each row execute function public.rpa_users_dml();

-- ============================================================================
-- 9. COMPATIBILITY VIEW B — users   (Retailer Contract Management)
-- ============================================================================

drop view if exists public.users cascade;
create view public.users
with (security_invoker = true) as
  select
    u.id,
    u.email,
    u.full_name,
    public.role_to_contract(u.role)     as role,
    u.branch,
    coalesce(u.branches, '{}'::text[])  as branches,
    u.zone,
    u.is_active,
    u.created_at
  from public.app_users u;

create or replace function public.users_dml()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.app_users
      (id, email, full_name, role, branch, branches, zone, is_active)
    values
      (coalesce(new.id, gen_random_uuid()), lower(trim(new.email)), new.full_name,
       public.role_from_app('contracts', new.role), new.branch, new.branches,
       new.zone, coalesce(new.is_active, true))
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
           zone      = new.zone,
           is_active = coalesce(new.is_active, u.is_active)
     where u.id = old.id;
    return new;

  else
    delete from public.app_users where id = old.id;
    return old;
  end if;
end;
$$;

create trigger trg_users_dml
  instead of insert or update or delete on public.users
  for each row execute function public.users_dml();

-- ============================================================================
-- 10. COMPATIBILITY VIEW C — profiles   (Retailer Incentive Statement)
-- ============================================================================

drop view if exists public.profiles cascade;
create view public.profiles
with (security_invoker = true) as
  select
    u.id,
    u.email,
    u.full_name,
    public.role_to_incentive(u.role) as role,
    u.branch_id,
    u.zone_id,
    (not u.is_active)                as is_disabled,
    u.created_at,
    u.updated_at
  from public.app_users u;

create or replace function public.profiles_dml()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.app_users
      (id, email, full_name, role, branch_id, zone_id, is_active)
    values
      (coalesce(new.id, gen_random_uuid()), lower(trim(new.email)), coalesce(new.full_name,'Unnamed'),
       public.role_from_app('incentive', new.role), new.branch_id, new.zone_id,
       not coalesce(new.is_disabled, false))
    on conflict (id) do update
      set full_name = coalesce(excluded.full_name, public.app_users.full_name),
          branch_id = excluded.branch_id,
          zone_id   = excluded.zone_id;
    return new;

  elsif tg_op = 'UPDATE' then
    update public.app_users u
       set email     = coalesce(lower(trim(new.email)), u.email),
           full_name = coalesce(new.full_name, u.full_name),
           role      = public.role_from_app('incentive', new.role, u.role),
           branch_id = new.branch_id,
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

create trigger trg_profiles_dml
  instead of insert or update or delete on public.profiles
  for each row execute function public.profiles_dml();

-- ============================================================================
-- 11. COMPATIBILITY VIEW D — staff   (Lyca Market Assistance)
-- ============================================================================

drop view if exists public.staff cascade;
create view public.staff
with (security_invoker = true) as
  select
    u.id,
    u.full_name,
    public.role_to_assistance(u.role) as role,
    u.designation,
    u.email                           as corporate_email,
    u.mobile_number,
    u.territory,
    u.is_active,
    u.created_at                      as created_date,
    u.updated_at                      as updated_date
  from public.app_users u;

create or replace function public.staff_dml()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.app_users
      (id, email, full_name, role, designation, mobile_number, territory, is_active)
    values
      (coalesce(new.id, gen_random_uuid()), lower(trim(new.corporate_email)), new.full_name,
       public.role_from_app('assistance', new.role), new.designation,
       new.mobile_number, new.territory, coalesce(new.is_active, true))
    on conflict (id) do update
      set full_name     = excluded.full_name,
          designation   = excluded.designation,
          mobile_number = excluded.mobile_number,
          territory     = excluded.territory;
    return new;

  elsif tg_op = 'UPDATE' then
    update public.app_users u
       set email         = coalesce(lower(trim(new.corporate_email)), u.email),
           full_name     = coalesce(new.full_name, u.full_name),
           role          = public.role_from_app('assistance', new.role, u.role),
           designation   = new.designation,
           mobile_number = coalesce(new.mobile_number, u.mobile_number),
           territory     = new.territory,
           is_active     = coalesce(new.is_active, u.is_active)
     where u.id = old.id;
    return new;

  else
    delete from public.app_users where id = old.id;
    return old;
  end if;
end;
$$;

create trigger trg_staff_dml
  instead of insert or update or delete on public.staff
  for each row execute function public.staff_dml();

grant select, insert, update, delete
  on public.rpa_users, public.users, public.profiles, public.staff
  to authenticated;
grant select on public.my_tools, public.zones_legacy to authenticated;

-- ============================================================================
-- 12. ONE auth trigger for the whole platform
-- ============================================================================
-- Replaces Contract Management's handle_new_auth_user() and Incentive
-- Statement's handle_new_user(), which both used the name on_auth_user_created.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_role text;
begin
  if not exists (select 1 from public.app_users) then
    v_role := 'SUPER-ADMIN';          -- very first account bootstraps the platform
  else
    v_role := 'VIEWER';               -- everyone else starts with no privileges
  end if;

  insert into public.app_users (id, email, full_name, role)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    v_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Backfill any auth user that predates this migration.
insert into public.app_users (id, email, full_name, role)
select au.id, lower(au.email),
       coalesce(au.raw_user_meta_data ->> 'full_name', au.email), 'VIEWER'
  from auth.users au
 where au.email is not null
   and not exists (select 1 from public.app_users u where u.id = au.id)
on conflict (id) do nothing;
