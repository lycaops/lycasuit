-- Pre-aggregate Incentive Statement values by reporting month and zone.
create table if not exists public.incentive_zone_monthly_summary (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  accmgrid text not null default '',
  hotspotid text not null default '',
  retailer_count integer not null default 0,
  normal_retailer_count integer not null default 0,
  special_retailer_count integer not null default 0,
  total_noofactivations numeric not null default 0,
  total_topup_less_6_portin numeric not null default 0,
  total_topup_great_6_portin numeric not null default 0,
  total_topup_less_6 numeric not null default 0,
  total_topup_great_6 numeric not null default 0,
  blocked_noofactivations numeric not null default 0,
  total_portout numeric not null default 0,
  bundle1_comm numeric not null default 0,
  quality_bonus_m_1 numeric not null default 0,
  volume_bonus_m_1 numeric not null default 0,
  portout_deduction numeric not null default 0,
  portin_comm numeric not null default 0,
  onboarding_comm numeric not null default 0,
  nonhp_comm numeric not null default 0,
  gara_comm numeric not null default 0,
  usage_clawback numeric not null default 0,
  usage_refund numeric not null default 0,
  t3ren_bonus numeric not null default 0,
  total_comm numeric not null default 0,
  opening_balance numeric not null default 0,
  total_paid_sbt_bt_vou numeric not null default 0,
  new_act_cnt numeric not null default 0,
  new_act_renewal_cnt numeric not null default 0,
  new_activations numeric not null default 0,
  portin_act_cnt numeric not null default 0,
  portin_act_renewal_cnt numeric not null default 0,
  port_in numeric not null default 0,
  total_bundle_act numeric not null default 0,
  bundle_act_not_eligible numeric not null default 0,
  t1_bonus numeric not null default 0,
  t2_bonus numeric not null default 0,
  t1_renewal numeric not null default 0,
  t2_renewal numeric not null default 0,
  usage_percentage_avg numeric not null default 0,
  fake_port_out_pct_avg numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (month, accmgrid, hotspotid)
);

create index if not exists izms_month_idx
  on public.incentive_zone_monthly_summary(month);
create index if not exists izms_month_branch_idx
  on public.incentive_zone_monthly_summary(month, accmgrid);
create index if not exists ri_incentive_zone_month_idx
  on public.retailer_incentives(month, accmgrid, hotspotid);

alter table public.incentive_zone_monthly_summary enable row level security;
drop policy if exists "incentive zone summary: scoped read" on public.incentive_zone_monthly_summary;
create policy "incentive zone summary: scoped read"
  on public.incentive_zone_monthly_summary
  for select to authenticated
  using (
    public.has_tool_access('incentive')
    and public.can_see_incentive_retailer(accmgrid, hotspotid)
  );
grant select on public.incentive_zone_monthly_summary to authenticated;

create or replace function public.refresh_incentive_zone_monthly_summary(
  p_month text,
  p_accmgrid text,
  p_hotspotid text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.incentive_zone_monthly_summary (
    month, accmgrid, hotspotid, retailer_count, normal_retailer_count,
    special_retailer_count, total_noofactivations, total_topup_less_6_portin,
    total_topup_great_6_portin, total_topup_less_6, total_topup_great_6,
    blocked_noofactivations, total_portout, bundle1_comm, quality_bonus_m_1,
    volume_bonus_m_1, portout_deduction, portin_comm, onboarding_comm, nonhp_comm,
    gara_comm, usage_clawback, usage_refund, t3ren_bonus, total_comm,
    opening_balance, total_paid_sbt_bt_vou, new_act_cnt, new_act_renewal_cnt,
    new_activations, portin_act_cnt, portin_act_renewal_cnt, port_in,
    total_bundle_act, bundle_act_not_eligible, t1_bonus, t2_bonus, t1_renewal,
    t2_renewal, usage_percentage_avg, fake_port_out_pct_avg, updated_at
  )
  select
    p_month, coalesce(p_accmgrid, ''), coalesce(p_hotspotid, ''),
    count(distinct ri.retailer_id)::integer,
    count(distinct ri.retailer_id) filter (where ri.incentive_group = 'NOR_RET')::integer,
    count(distinct ri.retailer_id) filter (where ri.incentive_group = 'SPL_RET')::integer,
    coalesce(sum(ri.total_noofactivations), 0),
    coalesce(sum(ri.total_topup_less_6_portin), 0),
    coalesce(sum(ri.total_topup_great_6_portin), 0),
    coalesce(sum(ri.total_topup_less_6), 0),
    coalesce(sum(ri.total_topup_great_6), 0),
    coalesce(sum(ri.blocked_noofactivations), 0),
    coalesce(sum(ri.total_portout), 0),
    coalesce(sum(ri.bundle1_comm), 0),
    coalesce(sum(ri.quality_bonus_m_1), 0),
    coalesce(sum(ri.volume_bonus_m_1), 0),
    coalesce(sum(ri.portout_deduction), 0),
    coalesce(sum(ri.portin_comm), 0),
    coalesce(sum(ri.onboarding_comm), 0),
    coalesce(sum(ri.nonhp_comm), 0),
    coalesce(sum(ri.gara_comm), 0),
    coalesce(sum(ri.usage_clawback), 0),
    coalesce(sum(ri.usage_refund), 0),
    coalesce(sum(ri.t3ren_bonus), 0),
    coalesce(sum(ri.total_comm), 0),
    coalesce(sum(ri.opening_balance), 0),
    coalesce(sum(ri.total_paid_sbt_bt_vou), 0),
    coalesce(sum(ri.new_act_cnt), 0),
    coalesce(sum(ri.new_act_renewal_cnt), 0),
    coalesce(sum(ri.new_activations), 0),
    coalesce(sum(ri.portin_act_cnt), 0),
    coalesce(sum(ri.portin_act_renewal_cnt), 0),
    coalesce(sum(ri.port_in), 0),
    coalesce(sum(ri.total_bundle_act), 0),
    coalesce(sum(ri.bundle_act_not_eligible), 0),
    coalesce(sum(ri.t1_bonus), 0),
    coalesce(sum(ri.t2_bonus), 0),
    coalesce(sum(ri.t1_renewal), 0),
    coalesce(sum(ri.t2_renewal), 0),
    coalesce(avg(ri.usage_percentage), 0),
    coalesce(avg(ri.fake_port_out_pct), 0),
    now()
  from public.retailer_incentives ri
  where ri.month = p_month
    and coalesce(ri.accmgrid, '') = coalesce(p_accmgrid, '')
    and coalesce(ri.hotspotid, '') = coalesce(p_hotspotid, '')
  having count(*) > 0
  on conflict (month, accmgrid, hotspotid) do update set
    retailer_count = excluded.retailer_count,
    normal_retailer_count = excluded.normal_retailer_count,
    special_retailer_count = excluded.special_retailer_count,
    total_noofactivations = excluded.total_noofactivations,
    total_topup_less_6_portin = excluded.total_topup_less_6_portin,
    total_topup_great_6_portin = excluded.total_topup_great_6_portin,
    total_topup_less_6 = excluded.total_topup_less_6,
    total_topup_great_6 = excluded.total_topup_great_6,
    blocked_noofactivations = excluded.blocked_noofactivations,
    total_portout = excluded.total_portout,
    bundle1_comm = excluded.bundle1_comm,
    quality_bonus_m_1 = excluded.quality_bonus_m_1,
    volume_bonus_m_1 = excluded.volume_bonus_m_1,
    portout_deduction = excluded.portout_deduction,
    portin_comm = excluded.portin_comm,
    onboarding_comm = excluded.onboarding_comm,
    nonhp_comm = excluded.nonhp_comm,
    gara_comm = excluded.gara_comm,
    usage_clawback = excluded.usage_clawback,
    usage_refund = excluded.usage_refund,
    t3ren_bonus = excluded.t3ren_bonus,
    total_comm = excluded.total_comm,
    opening_balance = excluded.opening_balance,
    total_paid_sbt_bt_vou = excluded.total_paid_sbt_bt_vou,
    new_act_cnt = excluded.new_act_cnt,
    new_act_renewal_cnt = excluded.new_act_renewal_cnt,
    new_activations = excluded.new_activations,
    portin_act_cnt = excluded.portin_act_cnt,
    portin_act_renewal_cnt = excluded.portin_act_renewal_cnt,
    port_in = excluded.port_in,
    total_bundle_act = excluded.total_bundle_act,
    bundle_act_not_eligible = excluded.bundle_act_not_eligible,
    t1_bonus = excluded.t1_bonus,
    t2_bonus = excluded.t2_bonus,
    t1_renewal = excluded.t1_renewal,
    t2_renewal = excluded.t2_renewal,
    usage_percentage_avg = excluded.usage_percentage_avg,
    fake_port_out_pct_avg = excluded.fake_port_out_pct_avg,
    updated_at = now();

  if not found then
    delete from public.incentive_zone_monthly_summary
     where month = p_month
       and accmgrid = coalesce(p_accmgrid, '')
       and hotspotid = coalesce(p_hotspotid, '');
  end if;
end;
$$;

create or replace function public.incentive_zone_summary_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  item record;
begin
  for item in select distinct month, accmgrid, hotspotid from new_rows loop
    perform public.refresh_incentive_zone_monthly_summary(item.month, item.accmgrid, item.hotspotid);
  end loop;
  return null;
end;
$$;

create or replace function public.incentive_zone_summary_after_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  item record;
begin
  for item in select distinct month, accmgrid, hotspotid from old_rows loop
    perform public.refresh_incentive_zone_monthly_summary(item.month, item.accmgrid, item.hotspotid);
  end loop;
  return null;
end;
$$;

create or replace function public.incentive_zone_summary_after_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  item record;
begin
  for item in
    select month, accmgrid, hotspotid from old_rows
    union
    select month, accmgrid, hotspotid from new_rows
  loop
    perform public.refresh_incentive_zone_monthly_summary(item.month, item.accmgrid, item.hotspotid);
  end loop;
  return null;
end;
$$;

drop trigger if exists trg_incentive_zone_summary_insert on public.retailer_incentives;
create trigger trg_incentive_zone_summary_insert
  after insert on public.retailer_incentives
  referencing new table as new_rows
  for each statement execute function public.incentive_zone_summary_after_insert();

drop trigger if exists trg_incentive_zone_summary_update on public.retailer_incentives;
create trigger trg_incentive_zone_summary_update
  after update on public.retailer_incentives
  referencing old table as old_rows new table as new_rows
  for each statement execute function public.incentive_zone_summary_after_update();

drop trigger if exists trg_incentive_zone_summary_delete on public.retailer_incentives;
create trigger trg_incentive_zone_summary_delete
  after delete on public.retailer_incentives
  referencing old table as old_rows
  for each statement execute function public.incentive_zone_summary_after_delete();

do $$
declare
  item record;
begin
  for item in
    select distinct month, accmgrid, hotspotid from public.retailer_incentives
  loop
    perform public.refresh_incentive_zone_monthly_summary(item.month, item.accmgrid, item.hotspotid);
  end loop;
end;
$$;

revoke all on function public.refresh_incentive_zone_monthly_summary(text, text, text) from public, anon, authenticated;
revoke all on function public.incentive_zone_summary_after_insert() from public, anon, authenticated;
revoke all on function public.incentive_zone_summary_after_update() from public, anon, authenticated;
revoke all on function public.incentive_zone_summary_after_delete() from public, anon, authenticated;