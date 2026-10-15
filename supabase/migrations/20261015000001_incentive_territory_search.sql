-- Support scoped territory searches without a retailer ID and page the result set.
create index if not exists ri_month_branch_retailer_page_idx
  on public.retailer_incentives(month, accmgrid, retailer_id, id);

create index if not exists ri_month_zone_retailer_page_idx
  on public.retailer_incentives(month, hotspotid, retailer_id, id);

drop function if exists public.search_incentive_records(text, text, text, text, integer);

create function public.search_incentive_records(
  p_month       text,
  p_retailer_id text default null,
  p_accmgrid    text default null,
  p_hotspotid   text default null,
  p_limit       integer default 500,
  p_offset      integer default 0
)
returns setof public.retailer_incentives
language sql stable security invoker set search_path = public as $$
  select ri.*
    from public.retailer_incentives ri
   where ri.month = p_month
     and (
       nullif(trim(p_retailer_id), '') is null
       or ri.retailer_id = trim(p_retailer_id)
       or (
         length(trim(p_retailer_id)) >= 3
         and ri.retailer_id ilike '%' || trim(p_retailer_id) || '%'
       )
     )
     and (nullif(trim(p_accmgrid), '') is null or ri.accmgrid = trim(p_accmgrid))
     and (nullif(trim(p_hotspotid), '') is null or ri.hotspotid = trim(p_hotspotid))
     and (
       nullif(trim(p_retailer_id), '') is not null
       or nullif(trim(p_accmgrid), '') is not null
       or nullif(trim(p_hotspotid), '') is not null
     )
   order by ri.retailer_id, ri.id
   limit least(greatest(coalesce(p_limit, 500), 1), 500)
   offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.search_incentive_records(text, text, text, text, integer, integer)
  from public, anon;
grant execute on function public.search_incentive_records(text, text, text, text, integer, integer)
  to authenticated;