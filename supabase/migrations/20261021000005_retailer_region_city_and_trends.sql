-- Support the complete city chart and compact year-over-year trend chart.
create index if not exists retailer_region_yearly_city_report_idx
  on public.retailer_region_yearly(year, branch, zone, city, province);

create or replace function public.retailer_region_city_report(
  p_year integer,
  p_branches text[] default null,
  p_branch text default null,
  p_zone text default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'city', city_totals.city,
        'province', city_totals.province,
        'ga_cnt', city_totals.ga_cnt,
        'port_in', city_totals.port_in,
        'port_out', city_totals.port_out
      )
      order by city_totals.ga_cnt desc, city_totals.city
    ),
    '[]'::jsonb
  )
  from (
    select coalesce(nullif(btrim(sales.city), ''), 'Unspecified city') as city,
           sales.province,
           sum(sales.ga_cnt) as ga_cnt,
           sum(sales.port_in) as port_in,
           sum(sales.port_out) as port_out
      from public.retailer_region_yearly sales
     where sales.year = p_year
       and (p_branches is null or sales.branch = any(p_branches))
       and (p_branch is null or sales.branch = p_branch)
       and (p_zone is null or sales.zone = p_zone)
     group by coalesce(nullif(btrim(sales.city), ''), 'Unspecified city'), sales.province
  ) city_totals;
$$;

revoke all on function public.retailer_region_city_report(integer, text[], text, text) from public, anon;
grant execute on function public.retailer_region_city_report(integer, text[], text, text) to authenticated;

create or replace function public.retailer_region_yearly_trend(
  p_branches text[] default null,
  p_branch text default null,
  p_zone text default null
)
returns table(
  year integer,
  ga_cnt numeric,
  port_in numeric,
  port_out numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select sales.year,
         sum(sales.ga_cnt),
         sum(sales.port_in),
         sum(sales.port_out)
    from public.retailer_region_province_yearly sales
   where (p_branches is null or sales.branch = any(p_branches))
     and (p_branch is null or sales.branch = p_branch)
     and (p_zone is null or sales.zone = p_zone)
   group by sales.year
   order by sales.year;
$$;

revoke all on function public.retailer_region_yearly_trend(text[], text, text) from public, anon;
grant execute on function public.retailer_region_yearly_trend(text[], text, text) to authenticated;
