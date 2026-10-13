-- Accelerate substring retailer-ID searches.
create extension if not exists pg_trgm with schema extensions;

create index if not exists ri_retailer_id_trgm_idx
  on public.retailer_incentives
  using gin (retailer_id extensions.gin_trgm_ops);

create or replace function public.search_incentive_records(
  p_month       text,
  p_retailer_id text default null,
  p_accmgrid    text default null,
  p_hotspotid   text default null,
  p_limit       integer default 500
)
returns setof public.retailer_incentives
language sql stable security invoker set search_path = public as $$
  select ri.*
    from public.retailer_incentives ri
   where ri.month = p_month
     and nullif(trim(p_retailer_id), '') is not null
     and (
       ri.retailer_id = trim(p_retailer_id)
       or (
         length(trim(p_retailer_id)) >= 3
         and ri.retailer_id ilike '%' || trim(p_retailer_id) || '%'
       )
     )
     and (nullif(trim(p_accmgrid), '') is null or ri.accmgrid = trim(p_accmgrid))
     and (nullif(trim(p_hotspotid), '') is null or ri.hotspotid = trim(p_hotspotid))
   order by ri.retailer_id, ri.id
   limit least(greatest(coalesce(p_limit, 500), 1), 500);
$$;

grant execute on function public.search_incentive_records(text, text, text, text, integer)
  to authenticated;