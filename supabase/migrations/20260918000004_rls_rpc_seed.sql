-- ============================================================================
-- LYCA SUITE — UNIFIED PLATFORM SCHEMA
-- Part 4 of 4: RLS, preserved RPCs, storage buckets, seed data
-- ============================================================================

-- ============================================================================
-- 1. SCOPE HELPER
-- ============================================================================
-- Mirrors FIELD IQ's original rule: a branch is visible if the user is an admin
-- or the branch is listed in their `branches` array.

create or replace function public.can_see_branch(p_branch text, p_uid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.app_users u
     where u.id = p_uid
       and u.is_active
       and (public.is_admin(p_uid) or p_branch = any(coalesce(u.branches, '{}'::text[])))
  );
$$;
grant execute on function public.can_see_branch(text, uuid) to authenticated;

-- ============================================================================
-- 2. RLS — FIELD IQ tables
-- ============================================================================

alter table public.retailer_summary      enable row level security;
alter table public.retailer_monthly      enable row level security;
alter table public.monthly_zone_sum      enable row level security;
alter table public.retailer_stock        enable row level security;
alter table public.kpi_data              enable row level security;
alter table public.import_log            enable row level security;
alter table public.retailer_coverage     enable row level security;
alter table public.coverage_import_logs  enable row level security;
alter table public.zone_coverage_summary enable row level security;
alter table public.isdm_data             enable row level security;
alter table public.isdm_settings         enable row level security;

-- Branch-scoped read + admin write, applied uniformly.
do $$
declare t text;
begin
  foreach t in array array[
    'retailer_summary','retailer_monthly','monthly_zone_sum',
    'kpi_data','retailer_coverage','zone_coverage_summary'
  ] loop
    execute format('drop policy if exists "%s_scoped_read" on public.%I', t, t);
    execute format(
      'create policy "%s_scoped_read" on public.%I for select to authenticated
         using (public.has_tool_access(''field_iq'') and public.can_see_branch(branch))', t, t);

    execute format('drop policy if exists "%s_admin_write" on public.%I', t, t);
    execute format(
      'create policy "%s_admin_write" on public.%I for all to authenticated
         using (public.is_admin_fieldiq()) with check (public.is_admin_fieldiq())', t, t);
  end loop;
end $$;

-- retailer_stock has no mandatory branch column, so it is scoped by the
-- retailer's branch in retailer_summary.
drop policy if exists "retailer_stock_scoped_read" on public.retailer_stock;
create policy "retailer_stock_scoped_read" on public.retailer_stock
  for select to authenticated using (
    public.has_tool_access('field_iq')
    and (
      public.is_admin_fieldiq()
      or exists (select 1 from public.retailer_summary rs
                  where rs.retailer_id = retailer_stock.retailer_id
                    and public.can_see_branch(rs.branch))
    )
  );
drop policy if exists "retailer_stock_admin_write" on public.retailer_stock;
create policy "retailer_stock_admin_write" on public.retailer_stock
  for all to authenticated
  using (public.is_admin_fieldiq()) with check (public.is_admin_fieldiq());

-- Import logs: every Field IQ user may read, admins may write.
do $$
declare t text;
begin
  foreach t in array array['import_log','coverage_import_logs'] loop
    execute format('drop policy if exists "%s_read" on public.%I', t, t);
    execute format(
      'create policy "%s_read" on public.%I for select to authenticated
         using (public.has_tool_access(''field_iq''))', t, t);
    execute format('drop policy if exists "%s_write" on public.%I', t, t);
    execute format(
      'create policy "%s_write" on public.%I for all to authenticated
         using (public.is_admin_fieldiq()) with check (public.is_admin_fieldiq())', t, t);
  end loop;
end $$;

-- ISDM
drop policy if exists "isdm_data_read" on public.isdm_data;
create policy "isdm_data_read" on public.isdm_data for select to authenticated
  using (public.has_tool_access('field_iq'));
drop policy if exists "isdm_data_write" on public.isdm_data;
create policy "isdm_data_write" on public.isdm_data for all to authenticated
  using (public.current_canonical_role() in ('SUPER-ADMIN','HS-ADMIN','COUNTRY-MANAGER'))
  with check (public.current_canonical_role() in ('SUPER-ADMIN','HS-ADMIN','COUNTRY-MANAGER'));

drop policy if exists "isdm_settings_read" on public.isdm_settings;
create policy "isdm_settings_read" on public.isdm_settings for select to authenticated using (true);
drop policy if exists "isdm_settings_write" on public.isdm_settings;
create policy "isdm_settings_write" on public.isdm_settings for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ============================================================================
-- 3. RLS — Retailer Contract Management
-- ============================================================================

alter table public.contracts enable row level security;

drop policy if exists "contracts_scoped_select" on public.contracts;
create policy "contracts_scoped_select" on public.contracts for select using (
  public.is_admin_contract()
  or (public.current_user_role() = 'RSM' and contracts.branch = any(public.current_user_branches()))
  or (public.current_user_role() = 'ASM' and public.current_user_branch() = contracts.branch)
  or (public.current_user_role() = 'FSE' and public.current_user_zone()   = contracts.zone)
);

drop policy if exists "contracts_insert" on public.contracts;
create policy "contracts_insert" on public.contracts for insert with check (
  auth.uid() is not null
  and created_by = auth.uid()
  and public.has_tool_access('contracts')
  and (
    public.is_admin_contract()
    or (public.current_user_role() = 'RSM' and contracts.branch = any(public.current_user_branches()))
    or (public.current_user_role() = 'ASM' and public.current_user_branch() = contracts.branch)
    or (public.current_user_role() = 'FSE' and public.current_user_zone()   = contracts.zone)
  )
);

drop policy if exists "contracts_update" on public.contracts;
create policy "contracts_update" on public.contracts for update using (
  public.is_admin_contract()
  or (public.current_user_role() = 'RSM' and contracts.branch = any(public.current_user_branches()))
  or (public.current_user_role() = 'ASM' and public.current_user_branch() = contracts.branch)
  or (public.current_user_role() = 'FSE' and public.current_user_zone()   = contracts.zone)
);

drop policy if exists "contracts_delete_admin" on public.contracts;
create policy "contracts_delete_admin" on public.contracts for delete using (
  public.is_admin_contract()
  or (public.current_user_role() = 'RSM' and contracts.branch = any(public.current_user_branches()))
);

-- ============================================================================
-- 4. RLS — Retailer Incentive Statement
-- ============================================================================
-- Scope keys stayed as accmgrid (branch) / hotspotid (zone). Because branches
-- and zones are now merged, each is matched against code, name AND short_code.

alter table public.retailer_incentives enable row level security;

drop policy if exists "ri: admin full access" on public.retailer_incentives;
create policy "ri: admin full access" on public.retailer_incentives for all to authenticated
  using (public.is_admin_incentive()) with check (public.is_admin_incentive());

drop policy if exists "ri: branch scoped read" on public.retailer_incentives;
create policy "ri: branch scoped read" on public.retailer_incentives for select to authenticated
  using (
    public.has_tool_access('incentive')
    and public.role_to_incentive(public.current_canonical_role()) = 'branch_user'
    and exists (
      select 1 from public.branches b
        join public.app_users p on p.branch_id = b.id
       where p.id = auth.uid()
         and retailer_incentives.accmgrid in (b.code, b.name, b.short_code)
    )
  );

drop policy if exists "ri: zone scoped read" on public.retailer_incentives;
create policy "ri: zone scoped read" on public.retailer_incentives for select to authenticated
  using (
    public.has_tool_access('incentive')
    and public.role_to_incentive(public.current_canonical_role()) = 'zone_user'
    and exists (
      select 1 from public.zones z
        join public.app_users p on p.zone_id = z.id
       where p.id = auth.uid()
         and retailer_incentives.hotspotid in (z.code, z.name, z.short_code)
    )
  );

drop policy if exists "ri: viewer read all" on public.retailer_incentives;
create policy "ri: viewer read all" on public.retailer_incentives for select to authenticated
  using (
    public.has_tool_access('incentive')
    and public.role_to_incentive(public.current_canonical_role()) = 'viewer'
  );

-- ============================================================================
-- 5. RLS — Lyca Market Assistance
-- ============================================================================

alter table public.tickets        enable row level security;
alter table public.ticket_updates enable row level security;

drop policy if exists "tickets_select_own_or_admin" on public.tickets;
create policy "tickets_select_own_or_admin" on public.tickets for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin_assistance());

drop policy if exists "tickets_insert_own" on public.tickets;
create policy "tickets_insert_own" on public.tickets for insert to authenticated
  with check (reporter_id = auth.uid() and public.has_tool_access('assistance'));

drop policy if exists "tickets_update_admin" on public.tickets;
create policy "tickets_update_admin" on public.tickets for update to authenticated
  using (public.is_admin_assistance());

drop policy if exists "updates_select_visible" on public.ticket_updates;
create policy "updates_select_visible" on public.ticket_updates for select to authenticated
  using (
    exists (select 1 from public.tickets t
             where t.id = ticket_id
               and (t.reporter_id = auth.uid() or public.is_admin_assistance()))
  );

drop policy if exists "updates_insert_visible" on public.ticket_updates;
create policy "updates_insert_visible" on public.ticket_updates for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      public.is_admin_assistance()
      or exists (select 1 from public.tickets t
                  where t.id = ticket_id and t.reporter_id = auth.uid())
    )
  );

-- ============================================================================
-- 6. PRESERVED RPCs  (every function the four apps call, rewritten on app_users)
-- ============================================================================

-- ---- 6a. Market Assistance: login step 1 (pre-auth email check) -------------
create or replace function public.staff_validate_email(p_email text)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions
as $$
declare v_full_name text;
begin
    select u.full_name into v_full_name
      from public.app_users u
     where u.email = lower(trim(p_email)) and u.is_active
     limit 1;

    if v_full_name is null then
        return jsonb_build_object('found', false, 'user', null);
    end if;

    return jsonb_build_object('found', true,
                              'user', jsonb_build_object('full_name', v_full_name));
end;
$$;

-- ---- 6b. Market Assistance: create staff (+ auth user) ----------------------
drop function if exists public.admin_create_staff(text, text, text, text, text, text, text);
create or replace function public.admin_create_staff(
    p_full_name       text,
    p_role            text,
    p_corporate_email text,
    p_mobile_number   text,
    p_password        text,
    p_designation     text default null,
    p_territory       text default null
)
returns public.staff
language plpgsql security definer set search_path = public, extensions
as $$
declare
    v_user_id uuid;
    v_email   text := lower(trim(p_corporate_email));
    v_staff   public.staff;
begin
    if not public.is_admin() then
        raise exception 'Only administrators can manage staff.';
    end if;

    if coalesce(trim(p_full_name),'') = '' or coalesce(v_email,'') = ''
       or coalesce(trim(p_mobile_number),'') = '' or coalesce(p_password,'') = '' then
        raise exception 'Full name, corporate email, mobile number and password are required.';
    end if;

    if length(p_password) < 6 then
        raise exception 'Password must be at least 6 characters.';
    end if;

    if p_role is null or p_role not in ('ASM','FSE','RSM','HS-ADMIN','PM-ADMIN','CS-ADMIN') then
        raise exception 'A valid staff role is required.';
    end if;

    if exists (select 1 from public.app_users where email = v_email) then
        raise exception 'A user with this email already exists.';
    end if;

    select id into v_user_id from auth.users where lower(email) = v_email limit 1;

    if v_user_id is null then
        insert into auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            confirmation_token, recovery_token, email_change_token_new, email_change,
            email_change_token_current, email_change_confirm_status, reauthentication_token,
            raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
            created_at, updated_at
        ) values (
            coalesce((select id from auth.instances limit 1), '00000000-0000-0000-0000-000000000000'::uuid),
            gen_random_uuid(), 'authenticated', 'authenticated', v_email,
            crypt(p_password, gen_salt('bf')), now(),
            '', '', '', '', '', 0, '',
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', p_full_name),
            false, false, now(), now()
        ) returning id into v_user_id;
    else
        update auth.users
           set instance_id = coalesce(instance_id, '00000000-0000-0000-0000-000000000000'::uuid),
               encrypted_password = crypt(p_password, gen_salt('bf')),
               email_confirmed_at = coalesce(email_confirmed_at, now()),
               banned_until = null,
               raw_user_meta_data = jsonb_build_object('full_name', p_full_name),
               updated_at = now()
         where id = v_user_id;
    end if;

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
    select gen_random_uuid(), v_user_id, v_email,
           jsonb_build_object('sub', v_user_id::text, 'email', v_email),
           'email', now(), now()
     where not exists (select 1 from auth.identities
                        where provider = 'email' and provider_id = v_email);

    insert into public.app_users
      (id, email, full_name, role, designation, mobile_number, territory, is_active)
    values
      (v_user_id, v_email, p_full_name,
       public.role_from_app('assistance', p_role), p_designation,
       p_mobile_number, p_territory, true)
    on conflict (id) do update
      set full_name = excluded.full_name, designation = excluded.designation,
          mobile_number = excluded.mobile_number, territory = excluded.territory,
          is_active = true;

    select * into v_staff from public.staff where id = v_user_id;
    return v_staff;
end;
$$;
alter function public.admin_create_staff(text, text, text, text, text, text, text) owner to postgres;

-- ---- 6c. Market Assistance: update staff ------------------------------------
create or replace function public.admin_update_staff(
    p_staff_id        uuid,
    p_full_name       text,
    p_role            text,
    p_corporate_email text,
    p_mobile_number   text,
    p_is_active       boolean default true,
    p_designation     text default null,
    p_territory       text default null
)
returns public.staff
language plpgsql security definer set search_path = public, extensions
as $$
declare
    v_existing public.app_users;
    v_email    text := lower(trim(p_corporate_email));
    v_staff    public.staff;
begin
    if not public.is_admin() then
        raise exception 'Only administrators can manage staff.';
    end if;

    select * into v_existing from public.app_users where id = p_staff_id;
    if v_existing.id is null then
        raise exception 'Staff member not found.';
    end if;

    if p_role is null or p_role not in ('ASM','FSE','RSM','HS-ADMIN','PM-ADMIN','CS-ADMIN') then
        raise exception 'A valid staff role is required.';
    end if;

    if v_email <> v_existing.email then
        if exists (select 1 from auth.users where lower(email) = v_email and id <> p_staff_id)
           or exists (select 1 from public.app_users where email = v_email and id <> p_staff_id) then
            raise exception 'A user with this email already exists.';
        end if;
        update auth.users
           set email = v_email,
               email_confirmed_at = coalesce(email_confirmed_at, now()),
               updated_at = now()
         where id = p_staff_id;
    end if;

    -- Changing the mobile number resets the password to the new mobile number.
    if p_mobile_number is distinct from v_existing.mobile_number then
        update auth.users
           set encrypted_password = crypt(p_mobile_number, gen_salt('bf')), updated_at = now()
         where id = p_staff_id;
    end if;

    update auth.users
       set banned_until = case when p_is_active then null else 'infinity'::timestamptz end,
           updated_at = now()
     where id = p_staff_id;

    update public.app_users
       set full_name     = p_full_name,
           role          = public.role_from_app('assistance', p_role, v_existing.role),
           designation   = p_designation,
           email         = v_email,
           mobile_number = p_mobile_number,
           territory     = p_territory,
           is_active     = p_is_active
     where id = p_staff_id;

    select * into v_staff from public.staff where id = p_staff_id;
    return v_staff;
end;
$$;
alter function public.admin_update_staff(uuid, text, text, text, text, boolean, text, text) owner to postgres;

-- ---- 6d. Market Assistance: deactivate / reactivate -------------------------
create or replace function public.admin_set_staff_active(p_staff_id uuid, p_is_active boolean)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
begin
    if not public.is_admin() then
        raise exception 'Only administrators can manage staff.';
    end if;

    update public.app_users set is_active = p_is_active where id = p_staff_id;

    update auth.users
       set banned_until = case when p_is_active then null else 'infinity'::timestamptz end,
           updated_at = now()
     where id = p_staff_id;
end;
$$;
alter function public.admin_set_staff_active(uuid, boolean) owner to postgres;

-- ---- 6e. Incentive Statement: create/overwrite a profile --------------------
create or replace function public.create_app_profile(
  p_auth_uid  uuid,
  p_role      text default 'viewer',
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
  if p_role not in ('admin','branch_user','zone_user','viewer') then
    raise exception 'invalid_role';
  end if;

  insert into public.app_users (id, email, full_name, role, branch_id, zone_id)
  select p_auth_uid, lower(au.email),
         coalesce(p_full_name, au.raw_user_meta_data->>'full_name', au.email),
         public.role_from_app('incentive', p_role), p_branch_id, p_zone_id
    from auth.users au where au.id = p_auth_uid
  on conflict (id) do update
    set role      = public.role_from_app('incentive', p_role, public.app_users.role),
        branch_id = excluded.branch_id,
        zone_id   = excluded.zone_id,
        full_name = coalesce(excluded.full_name, public.app_users.full_name),
        updated_at = now();

  select * into rec from public.profiles where id = p_auth_uid;
  return rec;
end;
$$;

-- ---- 6f. Incentive Statement: dashboard search RPCs -------------------------
create or replace function public.get_incentive_months()
returns table(month text)
language sql stable security invoker set search_path = public as $$
  select distinct ri.month from public.retailer_incentives ri
   where ri.month is not null order by ri.month desc;
$$;

create or replace function public.get_incentive_filter_options(p_month text)
returns table(accmgrid text, hotspotid text)
language sql stable security invoker set search_path = public as $$
  select distinct ri.accmgrid, ri.hotspotid from public.retailer_incentives ri
   where ri.month = p_month order by ri.accmgrid, ri.hotspotid;
$$;

create or replace function public.search_incentive_records(
  p_month       text,
  p_retailer_id text default null,
  p_accmgrid    text default null,
  p_hotspotid   text default null,
  p_limit       integer default 1000
)
returns setof public.retailer_incentives
language sql stable security invoker set search_path = public as $$
  select ri.* from public.retailer_incentives ri
   where ri.month = p_month
     and (nullif(trim(p_retailer_id), '') is null
          or ri.retailer_id ilike '%' || trim(p_retailer_id) || '%')
     and (nullif(trim(p_accmgrid), '')  is null or ri.accmgrid  = trim(p_accmgrid))
     and (nullif(trim(p_hotspotid), '') is null or ri.hotspotid = trim(p_hotspotid))
   order by ri.retailer_id, ri.id
   limit least(greatest(coalesce(p_limit, 1000), 1), 1000);
$$;

-- ---- 6g. Grants --------------------------------------------------------------
revoke execute on function public.staff_validate_email(text) from public;
grant  execute on function public.staff_validate_email(text) to anon, authenticated;

revoke execute on function public.admin_create_staff(text, text, text, text, text, text, text) from public, anon;
grant  execute on function public.admin_create_staff(text, text, text, text, text, text, text) to authenticated;

revoke execute on function public.admin_update_staff(uuid, text, text, text, text, boolean, text, text) from public, anon;
grant  execute on function public.admin_update_staff(uuid, text, text, text, text, boolean, text, text) to authenticated;

revoke execute on function public.admin_set_staff_active(uuid, boolean) from public, anon;
grant  execute on function public.admin_set_staff_active(uuid, boolean) to authenticated;

grant execute on function public.create_app_profile(uuid, text, uuid, uuid, text) to authenticated;
grant execute on function public.get_incentive_months()                  to authenticated;
grant execute on function public.get_incentive_filter_options(text)      to authenticated;
grant execute on function public.search_incentive_records(text, text, text, text, integer) to authenticated;

-- ============================================================================
-- 7. STORAGE BUCKETS  (Contract Management)
-- ============================================================================

insert into storage.buckets (id, name, public) values ('signatures','signatures', false)
on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('contracts','contracts', false)
on conflict (id) do nothing;

drop policy if exists "signatures_auth_rw" on storage.objects;
create policy "signatures_auth_rw" on storage.objects
  for all using  (bucket_id = 'signatures' and auth.role() = 'authenticated')
          with check (bucket_id = 'signatures' and auth.role() = 'authenticated');

drop policy if exists "contracts_auth_rw" on storage.objects;
create policy "contracts_auth_rw" on storage.objects
  for all using  (bucket_id = 'contracts' and auth.role() = 'authenticated')
          with check (bucket_id = 'contracts' and auth.role() = 'authenticated');

-- ============================================================================
-- 8. SEED — branches (8) and zones (30), merged from both source apps
-- ============================================================================

insert into public.branches (code, name, short_code, region) values
  ('LMIT-HS-BARI',    'HS BARI',    'BARI', 'SOUTH'),
  ('LMIT-HS-BOLOGNA', 'HS BOLOGNA', 'BOL',  'NORTH'),
  ('LMIT-HS-MILAN',   'HS MILAN',   'MIL',  'NORTH'),
  ('LMIT-HS-NAPLES',  'HS NAPLES',  'NAP',  'SOUTH'),
  ('LMIT-HS-PADOVA',  'HS PADOVA',  'PAD',  'NORTH'),
  ('LMIT-HS-PALERMO', 'HS PALERMO', 'PAL',  'SOUTH'),
  ('LMIT-HS-ROME',    'HS ROME',    'ROM',  'SOUTH'),
  ('LMIT-HS-TORINO',  'HS TORINO',  'TOR',  'NORTH')
on conflict (code) do update
  set name = excluded.name, short_code = excluded.short_code, region = excluded.region;

-- Zone names preserved exactly as supplied in the source schemas, including
-- the Italian spellings (MILANO, NAPOLI, ROMA) and "TORINOO".
insert into public.zones (code, name, short_code, branch_id)
select v.code, v.name, v.short_code, b.id
from (values
  ('HS-BARI-Z1',    'HS BARI ZONE 1',    'BARI-Z1', 'LMIT-HS-BARI'),
  ('HS-BARI-Z2',    'HS BARI ZONE 2',    'BARI-Z2', 'LMIT-HS-BARI'),
  ('HS-BARI-Z3',    'HS BARI ZONE 3',    'BARI-Z3', 'LMIT-HS-BARI'),
  ('HS-BOLOGNA-Z1', 'HS BOLOGNA ZONE 1', 'BOL-Z1',  'LMIT-HS-BOLOGNA'),
  ('HS-BOLOGNA-Z2', 'HS BOLOGNA ZONE 2', 'BOL-Z2',  'LMIT-HS-BOLOGNA'),
  ('HS-BOLOGNA-Z3', 'HS BOLOGNA ZONE 3', 'BOL-Z3',  'LMIT-HS-BOLOGNA'),
  ('HS-MILANO-Z1',  'HS MILANO ZONE 1',  'MIL-Z1',  'LMIT-HS-MILAN'),
  ('HS-MILANO-Z2',  'HS MILANO ZONE 2',  'MIL-Z2',  'LMIT-HS-MILAN'),
  ('HS-MILANO-Z3',  'HS MILANO ZONE 3',  'MIL-Z3',  'LMIT-HS-MILAN'),
  ('HS-MILANO-Z4',  'HS MILANO ZONE 4',  'MIL-Z4',  'LMIT-HS-MILAN'),
  ('HS-NAPOLI-Z1',  'HS NAPOLI ZONE 1',  'NAP-Z1',  'LMIT-HS-NAPLES'),
  ('HS-NAPOLI-Z2',  'HS NAPOLI ZONE 2',  'NAP-Z2',  'LMIT-HS-NAPLES'),
  ('HS-NAPOLI-Z3',  'HS NAPOLI ZONE 3',  'NAP-Z3',  'LMIT-HS-NAPLES'),
  ('HS-NAPOLI-Z4',  'HS NAPOLI ZONE 4',  'NAP-Z4',  'LMIT-HS-NAPLES'),
  ('HS-NAPOLI-Z5',  'HS NAPOLI ZONE 5',  'NAP-Z5',  'LMIT-HS-NAPLES'),
  ('HS-NAPOLI-Z6',  'HS NAPOLI ZONE 6',  'NAP-Z6',  'LMIT-HS-NAPLES'),
  ('HS-NAPOLI-Z7',  'HS NAPOLI ZONE 7',  'NAP-Z7',  'LMIT-HS-NAPLES'),
  ('HS-PADOVA-Z1',  'HS PADOVA ZONE 1',  'PAD-Z1',  'LMIT-HS-PADOVA'),
  ('HS-PADOVA-Z2',  'HS PADOVA ZONE 2',  'PAD-Z2',  'LMIT-HS-PADOVA'),
  ('HS-PALERMO-Z1', 'HS PALERMO ZONE 1', 'PAL-Z1',  'LMIT-HS-PALERMO'),
  ('HS-PALERMO-Z2', 'HS PALERMO ZONE 2', 'PAL-Z2',  'LMIT-HS-PALERMO'),
  ('HS-PALERMO-Z3', 'HS PALERMO ZONE 3', 'PAL-Z3',  'LMIT-HS-PALERMO'),
  ('HS-ROMA-Z1',    'HS ROMA ZONE 1',    'ROM-Z1',  'LMIT-HS-ROME'),
  ('HS-ROMA-Z2',    'HS ROMA ZONE 2',    'ROM-Z2',  'LMIT-HS-ROME'),
  ('HS-ROMA-Z3',    'HS ROMA ZONE 3',    'ROM-Z3',  'LMIT-HS-ROME'),
  ('HS-ROMA-Z4',    'HS ROMA ZONE 4',    'ROM-Z4',  'LMIT-HS-ROME'),
  ('HS-ROMA-Z5',    'HS ROMA ZONE 5',    'ROM-Z5',  'LMIT-HS-ROME'),
  ('HS-TORINO-Z1',  'HS TORINOO ZONE 1', 'TOR-Z1',  'LMIT-HS-TORINO'),
  ('HS-TORINO-Z2',  'HS TORINOO ZONE 2', 'TOR-Z2',  'LMIT-HS-TORINO'),
  ('HS-TORINO-Z3',  'HS TORINOO ZONE 3', 'TOR-Z3',  'LMIT-HS-TORINO')
) as v(code, name, short_code, branch_code)
join public.branches b on b.code = v.branch_code
on conflict (code) do update
  set name = excluded.name, short_code = excluded.short_code, branch_id = excluded.branch_id;

-- ============================================================================
-- 9. SEED — default ISDM settings row
-- ============================================================================

insert into public.isdm_settings (
  id, ga_weightage, uao_weightage, na_weightage,
  zone_manager_slab, asm_slab, rsm_slab,
  bracket_90_95_percent, bracket_95_100_percent, bracket_100_105_percent,
  bracket_106_119_percent, bracket_120_above_percent)
select '00000000-0000-0000-0000-000000000001'::uuid,
       75, 25, 0, 700, 1000, 1500, 50, 80, 100, 110, 120
where not exists (select 1 from public.isdm_settings);

-- ============================================================================
-- 10. SEED — platform administrator
-- ============================================================================
-- Creates BOTH the auth user and the app_users profile. Safe to re-run.

create or replace function public.seed_platform_user(
    p_full_name   text,
    p_role        text,          -- canonical role, e.g. 'SUPER-ADMIN'
    p_email       text,
    p_password    text,
    p_designation text default null,
    p_territory   text default null,
    p_mobile      text default null,
    p_branches    text[] default null
)
returns uuid
language plpgsql security definer set search_path = public, extensions
as $$
declare
    v_id    uuid;
    v_email text := lower(trim(p_email));
begin
    select id into v_id from auth.users where lower(email) = v_email;

    if v_id is null then
        insert into auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            confirmation_token, recovery_token, email_change_token_new, email_change,
            email_change_token_current, email_change_confirm_status, reauthentication_token,
            raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
            created_at, updated_at
        ) values (
            coalesce((select id from auth.instances limit 1), '00000000-0000-0000-0000-000000000000'::uuid),
            gen_random_uuid(), 'authenticated', 'authenticated', v_email,
            crypt(p_password, gen_salt('bf')), now(),
            '', '', '', '', '', 0, '',
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', p_full_name),
            false, false, now(), now()
        ) returning id into v_id;
    end if;

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
    select gen_random_uuid(), v_id, v_email,
           jsonb_build_object('sub', v_id::text, 'email', v_email),
           'email', now(), now()
     where not exists (select 1 from auth.identities
                        where provider = 'email' and provider_id = v_email);

    insert into public.app_users
      (id, email, username, full_name, role, designation, mobile_number, territory, branches,
       is_active, pdf_export_enabled)
    values
      (v_id, v_email, split_part(v_email,'@',1), p_full_name, p_role, p_designation,
       p_mobile, p_territory,
       coalesce(p_branches, array(select code from public.branches)),
       true, true)
    on conflict (id) do update
      set role        = excluded.role,
          full_name   = excluded.full_name,
          designation = excluded.designation,
          territory   = excluded.territory,
          branches    = excluded.branches,
          is_active   = true;

    return v_id;
end;
$$;

-- Initial platform administrator — CHANGE THIS PASSWORD AFTER FIRST LOGIN.
select public.seed_platform_user(
    'DILAN FERNANDO',
    'SUPER-ADMIN',
    'dilan.fernando@universalservice.it',
    'Lyca@2026',
    'Admin',
    'ITALY (All)',
    '3510016000'
);

notify pgrst, 'reload schema';
