-- ============================================================================
-- LYCA SUITE — UNIFIED PLATFORM SCHEMA
-- Part 3 of 4: Every application data table, from all four apps
-- ============================================================================

-- ############################################################################
-- A. FIELD IQ
-- ############################################################################

-- A1. Retailer rolling summary (one row per retailer) -------------------------
create table if not exists public.retailer_summary (
  retailer_id       text primary key,
  branch            text not null,
  zone              text not null default '',
  ga_cnt            numeric not null default 0,
  pi_l6             numeric not null default 0,
  pi_g6             numeric not null default 0,
  np_l6             numeric not null default 0,
  np_g6             numeric not null default 0,
  port_in           numeric not null default 0,
  port_out          numeric not null default 0,
  total_deductions  numeric not null default 0,
  pi_raw            numeric not null default 0,
  add_gara          numeric not null default 0,
  pi_total          numeric not null default 0,
  incentive         numeric not null default 0,
  renewal_rate      numeric not null default 0,
  po_deduction      numeric not null default 0,
  clawback          numeric not null default 0,
  renewal_impact    numeric not null default 0,
  updated_at        timestamptz not null default now()
);
create index if not exists rs_branch_idx on public.retailer_summary(branch);
create index if not exists rs_zone_idx   on public.retailer_summary(zone);

-- A2. Retailer month-by-month ------------------------------------------------
create table if not exists public.retailer_monthly (
  id              bigserial primary key,
  retailer_id     text not null,
  branch          text not null,
  zone            text default '',
  month           text not null,                 -- 'YYYY-MM'
  ga_cnt          numeric not null default 0,
  pi_l6           numeric not null default 0,
  pi_g6           numeric not null default 0,
  np_l6           numeric not null default 0,
  np_g6           numeric not null default 0,
  port_in         numeric not null default 0,
  port_out        numeric not null default 0,
  po_deduction    numeric not null default 0,
  clawback        numeric not null default 0,
  renewal_impact  numeric not null default 0,
  total_ded       numeric not null default 0,
  pi_raw          numeric not null default 0,
  add_gara        numeric not null default 0,
  pi_total        numeric not null default 0,
  incentive       numeric not null default 0,
  renewal_rate    numeric not null default 0,
  created_at      timestamptz not null default now(),
  unique (retailer_id, month)
);
create index if not exists rm_retailer_idx      on public.retailer_monthly(retailer_id);
create index if not exists rm_branch_month_idx  on public.retailer_monthly(branch, month);
create index if not exists rm_zone_idx          on public.retailer_monthly(zone);

-- A3. Pre-aggregated branch/zone monthly totals ------------------------------
create table if not exists public.monthly_zone_sum (
  id                bigserial primary key,
  branch            text not null,
  zone              text not null default '',
  month             text not null,
  retailer_count    integer not null default 0,
  ga_cnt            numeric not null default 0,
  pi_l6             numeric not null default 0,
  pi_g6             numeric not null default 0,
  np_l6             numeric not null default 0,
  np_g6             numeric not null default 0,
  port_in           numeric not null default 0,
  port_out          numeric not null default 0,
  po_deduction      numeric not null default 0,
  clawback          numeric not null default 0,
  renewal_impact    numeric not null default 0,
  total_ded         numeric not null default 0,
  total_deductions  numeric not null default 0,
  pi_raw            numeric not null default 0,
  add_gara          numeric not null default 0,
  pi_total          numeric not null default 0,
  incentive         numeric not null default 0,
  renewal_rate      numeric not null default 0,
  updated_at        timestamptz not null default now(),
  unique (branch, zone, month)
);
create index if not exists mzs_branch_idx on public.monthly_zone_sum(branch);
create index if not exists mzs_month_idx  on public.monthly_zone_sum(month);

-- Rebuild monthly_zone_sum from retailer_monthly.
create or replace function public.rebuild_monthly_zone_sum()
returns void language sql security definer set search_path = public as $$
  insert into public.monthly_zone_sum (
    branch, zone, month, retailer_count, ga_cnt, pi_l6, pi_g6, np_l6, np_g6,
    port_in, port_out, po_deduction, clawback, renewal_impact, total_ded,
    total_deductions, pi_raw, add_gara, pi_total, incentive, renewal_rate, updated_at)
  select rm.branch, coalesce(rm.zone,''), rm.month, count(distinct rm.retailer_id),
         sum(rm.ga_cnt), sum(rm.pi_l6), sum(rm.pi_g6), sum(rm.np_l6), sum(rm.np_g6),
         sum(rm.port_in), sum(rm.port_out), sum(rm.po_deduction), sum(rm.clawback),
         sum(rm.renewal_impact), sum(rm.total_ded), sum(rm.total_ded),
         sum(rm.pi_raw), sum(rm.add_gara), sum(rm.pi_total), sum(rm.incentive),
         avg(nullif(rm.renewal_rate, 0)), now()
    from public.retailer_monthly rm
   group by rm.branch, coalesce(rm.zone,''), rm.month
  on conflict (branch, zone, month) do update set
    retailer_count = excluded.retailer_count, ga_cnt = excluded.ga_cnt,
    pi_l6 = excluded.pi_l6, pi_g6 = excluded.pi_g6, np_l6 = excluded.np_l6,
    np_g6 = excluded.np_g6, port_in = excluded.port_in, port_out = excluded.port_out,
    po_deduction = excluded.po_deduction, clawback = excluded.clawback,
    renewal_impact = excluded.renewal_impact, total_ded = excluded.total_ded,
    total_deductions = excluded.total_deductions, pi_raw = excluded.pi_raw,
    add_gara = excluded.add_gara, pi_total = excluded.pi_total,
    incentive = excluded.incentive, renewal_rate = excluded.renewal_rate,
    updated_at = now();
$$;
grant execute on function public.rebuild_monthly_zone_sum() to authenticated;

-- A4. SIM stock per retailer -------------------------------------------------
create table if not exists public.retailer_stock (
  id             bigserial primary key,
  retailer_id    text not null,
  branch         text,
  zone           text,
  month          text,                 -- 'YYYY-MM'
  sim_facevalue  text,
  totalcards     numeric not null default 0,
  used           numeric not null default 0,
  unused         numeric not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists rstock_retailer_idx on public.retailer_stock(retailer_id);
create index if not exists rstock_month_idx    on public.retailer_stock(month);
create index if not exists rstock_face_idx     on public.retailer_stock(sim_facevalue);

-- A5. KPI data ---------------------------------------------------------------
create table if not exists public.kpi_data (
  id          uuid primary key default gen_random_uuid(),
  branch      text not null,
  zone        text not null default '',
  month       text not null,
  year        integer not null,
  ga          numeric not null default 0,
  ga_target   numeric not null default 0,
  uao         numeric not null default 0,
  uao_target  numeric not null default 0,
  na          numeric not null default 0,
  na_target   numeric not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (branch, zone, month, year)
);
create index if not exists kpi_branch_idx on public.kpi_data(branch);
create index if not exists kpi_year_idx   on public.kpi_data(year);

-- A6. Import log -------------------------------------------------------------
create table if not exists public.import_log (
  id              bigserial primary key,
  filename        text not null,
  imported_by     uuid references public.app_users(id) on delete set null,
  rows_processed  integer not null default 0,
  rows_skipped    integer not null default 0,
  new_retailers   integer not null default 0,
  upd_retailers   integer not null default 0,
  new_months      text[] not null default '{}',
  upd_months      text[] not null default '{}',
  status          text not null default 'success' check (status in ('success','partial','failed')),
  error_msg       text,
  imported_at     timestamptz not null default now()
);
create index if not exists import_log_at_idx on public.import_log(imported_at desc);

-- A7. Coverage ---------------------------------------------------------------
create table if not exists public.retailer_coverage (
  id                   bigserial primary key,
  retailer_id          text not null,
  branch               text not null,
  zone                 text not null default '',
  coverage_status      text not null default 'no' check (coverage_status in ('yes','no')),
  planned_visits_count integer not null default 0,
  hs_visits            integer not null default 0,
  asm_visits           integer not null default 0,
  others_visits        integer not null default 0,
  remarks              text,
  red_flag             boolean not null default false,
  red_flag_type        text,
  status               text not null default 'active' check (status in ('active','inactive')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (retailer_id, branch)
);
create index if not exists rc_branch_idx   on public.retailer_coverage(branch);
create index if not exists rc_status_idx   on public.retailer_coverage(status);
create index if not exists rc_red_flag_idx on public.retailer_coverage(red_flag);

create table if not exists public.coverage_import_logs (
  id              bigserial primary key,
  filename        text not null,
  imported_by     uuid references public.app_users(id) on delete set null,
  rows_processed  integer not null default 0,
  rows_skipped    integer not null default 0,
  status          text not null default 'success' check (status in ('success','partial','failed')),
  error_msg       text,
  imported_at     timestamptz not null default now()
);
create index if not exists cil_at_idx on public.coverage_import_logs(imported_at desc);

create table if not exists public.zone_coverage_summary (
  id                     bigserial primary key,
  branch                 text not null,
  zone                   text not null,
  region                 text not null,
  total_retailers        integer not null default 0,
  uao                    integer not null default 0,
  covered_retailers      integer not null default 0,
  not_covered_retailers  integer not null default 0,
  red_flagged_retailers  integer not null default 0,
  coverage_percentage    numeric(5,2) not null default 0.00,
  last_updated           timestamptz not null default now(),
  unique (branch, zone)
);
create index if not exists zcs_branch_idx on public.zone_coverage_summary(branch);
create index if not exists zcs_region_idx on public.zone_coverage_summary(region);
create index if not exists zcs_zone_idx   on public.zone_coverage_summary(zone);

-- Region is now read from the branches table instead of a hardcoded CASE.
create or replace function public.update_zone_coverage_summary()
returns trigger language plpgsql security definer set search_path = public as $$
declare
    v_branch text := coalesce(new.branch, old.branch);
    v_zone   text := coalesce(new.zone,  old.zone, '');
    v_region text;
begin
    select coalesce(b.region, 'UNKNOWN') into v_region
      from public.branches b where b.code = v_branch;
    v_region := coalesce(v_region, 'UNKNOWN');

    insert into public.zone_coverage_summary (
        branch, zone, region, total_retailers, uao, covered_retailers,
        not_covered_retailers, red_flagged_retailers, coverage_percentage, last_updated)
    select rc.branch, coalesce(rc.zone,''), v_region,
           count(*),
           count(*) filter (where rc.status = 'active'),
           count(*) filter (where rc.coverage_status = 'yes'),
           count(*) filter (where rc.coverage_status = 'no'),
           count(*) filter (where rc.red_flag),
           round((count(*) filter (where rc.coverage_status = 'yes')::numeric
                  / nullif(count(*),0) * 100), 2),
           now()
      from public.retailer_coverage rc
     where rc.branch = v_branch
       and coalesce(rc.zone,'') = v_zone
     group by rc.branch, coalesce(rc.zone,'')
    on conflict (branch, zone) do update set
        total_retailers       = excluded.total_retailers,
        uao                   = excluded.uao,
        covered_retailers     = excluded.covered_retailers,
        not_covered_retailers = excluded.not_covered_retailers,
        red_flagged_retailers = excluded.red_flagged_retailers,
        coverage_percentage   = excluded.coverage_percentage,
        last_updated          = now();

    return coalesce(new, old);
end;
$$;

drop trigger if exists trigger_update_zone_coverage_summary on public.retailer_coverage;
create trigger trigger_update_zone_coverage_summary
  after insert or update or delete on public.retailer_coverage
  for each row execute function public.update_zone_coverage_summary();

-- A8. ISDM -------------------------------------------------------------------
create table if not exists public.isdm_data (
  id               uuid primary key default gen_random_uuid(),
  date             date,
  branch           text,
  zone             text,
  zone_manager     text,
  past_year        numeric,
  last_month       numeric,
  ga_tgt           numeric,
  ga_mtd           numeric,
  ga_ach           numeric,
  ga_w             numeric,
  uao_tgt          numeric,
  uao_mtd          numeric,
  uao_ach          numeric,
  uao_w            numeric,
  na_tgt           numeric,
  na_mtd           numeric,
  na_ach           numeric,
  na_w             numeric,
  ftd              numeric,
  shortfall        numeric,
  crr              numeric,
  rrr              numeric,
  tot_w            numeric,
  staff_incentive  numeric,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists idx_isdm_date             on public.isdm_data(date desc);
create index if not exists idx_isdm_branch           on public.isdm_data(branch);
create index if not exists idx_isdm_zone             on public.isdm_data(zone);
create index if not exists idx_isdm_branch_zone      on public.isdm_data(branch, zone);
create index if not exists idx_isdm_date_branch_zone on public.isdm_data(date desc, branch, zone);

create table if not exists public.isdm_settings (
  id                        uuid primary key default gen_random_uuid(),
  ga_weightage              numeric default 75,
  uao_weightage             numeric default 25,
  na_weightage              numeric default 0,
  zone_manager_slab         numeric default 700,
  asm_slab                  numeric default 1000,
  rsm_slab                  numeric default 1500,
  bracket_90_95_percent     numeric default 50,
  bracket_95_100_percent    numeric default 80,
  bracket_100_105_percent   numeric default 100,
  bracket_106_119_percent   numeric default 110,
  bracket_120_above_percent numeric default 120,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

-- ############################################################################
-- B. RETAILER CONTRACT MANAGEMENT
-- ############################################################################

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),

  -- retailer information
  company_name            text not null,
  vat_number              text not null,
  contact_first_name      text not null,
  contact_last_name       text not null,
  shop_name               text not null,
  street                  text not null,
  house_number            text not null,
  city                    text not null,
  post_code               text not null,
  landline_number         text,
  mobile_number           text not null,
  email                   text not null,

  -- relationships
  branch                  text,
  zone                    text,
  created_by              uuid references public.app_users(id) on delete set null,

  -- storage paths
  retailer_signature_path text,
  staff_signature_path    text,
  pdf_path                text,

  -- status & audit
  status                  text not null default 'GENERATED'
                          check (status in ('GENERATED','PENDING','SIGNED')),
  signed_at               timestamptz,
  emailed_at              timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  -- OTP / remote signing (was script 005)
  otp_hash                text,
  otp_salt                text,
  otp_sent_at             timestamptz,
  otp_expires_at          timestamptz,
  otp_verified_at         timestamptz,
  otp_attempts            integer not null default 0,
  otp_verify_ip           text,
  otp_verify_user_agent   text,
  retailer_ack            boolean,
  retailer_gdpr           boolean,
  retailer_signed_at      timestamptz,
  retailer_sign_ip        text,
  retailer_sign_user_agent text,
  sign_link_hash          text,
  sign_link_sent_at       timestamptz,
  sign_link_expires_at    timestamptz,
  sign_link_used_at       timestamptz
);

create index if not exists contracts_created_by_idx on public.contracts(created_by);
create index if not exists contracts_branch_idx     on public.contracts(branch);
create index if not exists contracts_zone_idx       on public.contracts(zone);
create index if not exists contracts_status_idx     on public.contracts(status);
create index if not exists contracts_sign_link_idx  on public.contracts(sign_link_hash);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists trg_contracts_updated_at on public.contracts;
create trigger trg_contracts_updated_at
  before update on public.contracts
  for each row execute function public.touch_updated_at();

-- ############################################################################
-- C. RETAILER INCENTIVE STATEMENT
-- ############################################################################

create table if not exists public.retailer_incentives (
  id uuid primary key default gen_random_uuid(),

  -- identity / period
  retailer_id                 text not null,
  accmgrid                    text,       -- branch scope key
  hotspotid                   text,       -- zone scope key
  month                       text not null,
  payment_mood                text,
  incentive_group             text check (incentive_group in ('NOR_RET','SPL_RET')),

  -- activation & topup counts
  total_noofactivations       numeric,
  total_topup_less_6_portin   numeric,
  total_topup_great_6_portin  numeric,
  total_topup_less_6          numeric,
  total_topup_great_6         numeric,
  blocked_noofactivations     numeric,
  total_portout               numeric,

  -- core commissions
  bundle1_comm                numeric,
  quality_bonus_m_1           numeric,
  volume_bonus_m_1            numeric,
  portout_deduction           numeric,
  portin_comm                 numeric,
  onboarding_comm             numeric,
  nonhp_comm                  numeric,
  gara_comm                   numeric,
  usage_clawback              numeric,
  usage_refund                numeric,
  t3ren_bonus                 numeric,
  total_comm                  numeric,

  -- reconciliation
  opening_balance             numeric,
  total_paid_sbt_bt_vou       numeric,

  -- activation performance
  new_act_cnt                 numeric,
  new_act_renewal_cnt         numeric,
  new_activations             numeric,
  portin_act_cnt              numeric,
  portin_act_renewal_cnt      numeric,
  port_in                     numeric,
  total_bundle_act            numeric,
  bundle_act_not_eligible     numeric,
  usage_percentage            numeric,

  -- tier bonuses / renewals
  t1_bonus                    numeric,
  t2_bonus                    numeric,
  t1_renewal                  numeric,
  t2_renewal                  numeric,

  -- additional metrics
  fake_port_out_pct           numeric,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists ri_retailer_idx      on public.retailer_incentives(retailer_id);
create index if not exists ri_month_idx         on public.retailer_incentives(month);
create index if not exists ri_accmgrid_idx      on public.retailer_incentives(accmgrid);
create index if not exists ri_hotspotid_idx     on public.retailer_incentives(hotspotid);
create index if not exists ri_group_idx         on public.retailer_incentives(incentive_group);
create index if not exists ri_month_retailer_idx on public.retailer_incentives(month, retailer_id);

-- ############################################################################
-- D. LYCA MARKET ASSISTANCE
-- ############################################################################

create table if not exists public.tickets (
  id                   uuid primary key default gen_random_uuid(),
  ticket_number        text not null unique,
  reporter_id          uuid not null references public.app_users(id),
  reporter_name        text not null,
  reporter_email       text not null,
  reporter_role        text,
  reporter_designation text,
  reporter_territory   text,
  category             text not null,
  sub_category         text not null,
  impact               text not null,
  urgency              text not null,
  subject              text not null,
  description          text not null,
  msisdns              jsonb not null default '[]'::jsonb,
  status               text not null default 'Open'
                       check (status in ('Open','In Progress','Pending','Completed')),
  completed_at         timestamptz,
  created_date         timestamptz not null default now(),
  updated_date         timestamptz not null default now()
);

create index if not exists idx_tickets_reporter on public.tickets(reporter_id);
create index if not exists idx_tickets_status   on public.tickets(status);
create index if not exists idx_tickets_category on public.tickets(category);
create index if not exists idx_tickets_created  on public.tickets(created_date desc);

create table if not exists public.ticket_updates (
  id              uuid primary key default gen_random_uuid(),
  ticket_id       uuid not null references public.tickets(id) on delete cascade,
  update_type     text not null check (update_type in ('created','status_change','response','completed')),
  previous_status text,
  new_status      text,
  message         text,
  created_by      uuid not null references public.app_users(id),
  created_by_name text not null,
  created_by_role text,
  created_date    timestamptz not null default now()
);

create index if not exists idx_updates_ticket  on public.ticket_updates(ticket_id);
create index if not exists idx_updates_created on public.ticket_updates(created_date desc);

create or replace function public.set_updated_date()
returns trigger language plpgsql as $$
begin new.updated_date := now(); return new; end; $$;

drop trigger if exists trg_tickets_updated_date on public.tickets;
create trigger trg_tickets_updated_date
  before update on public.tickets
  for each row execute function public.set_updated_date();

-- Race-safe ticket numbering: INC-YYYY-000001
create or replace function public.generate_ticket_number()
returns text language plpgsql security definer set search_path = public, extensions as $$
declare
    v_year int := extract(year from now());
    v_next int;
begin
    perform pg_advisory_xact_lock(hashtext('lmac_ticket_number_' || v_year));
    select coalesce(max((substring(t.ticket_number from 10 for 6))::int), 0) + 1
      into v_next
      from public.tickets t
     where t.ticket_number like 'INC-' || v_year || '-%';
    return 'INC-' || v_year || '-' || lpad(v_next::text, 6, '0');
end;
$$;

create or replace function public.set_ticket_number()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
    if new.ticket_number is null
       or new.ticket_number = ''
       or exists (select 1 from public.tickets t where t.ticket_number = new.ticket_number) then
        new.ticket_number := public.generate_ticket_number();
    end if;
    return new;
end;
$$;

drop trigger if exists trg_tickets_number on public.tickets;
create trigger trg_tickets_number
  before insert on public.tickets
  for each row execute function public.set_ticket_number();

-- ############################################################################
-- E. updated_at / updated_date housekeeping for the rest
-- ############################################################################

do $$
declare t text;
begin
  foreach t in array array[
    'retailer_summary','retailer_monthly','monthly_zone_sum','retailer_stock',
    'kpi_data','retailer_coverage','isdm_data','isdm_settings','retailer_incentives'
  ] loop
    execute format('drop trigger if exists trg_%s_touch on public.%I', t, t);
    execute format(
      'create trigger trg_%s_touch before update on public.%I
       for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;
