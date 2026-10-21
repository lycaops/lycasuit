-- Location dimensions are also retained on the source rows so new monthly
-- imports can populate the regional analysis without changing existing reads.
alter table public.retailer_monthly
  add column if not exists postcode text not null default '',
  add column if not exists city text not null default '',
  add column if not exists province text not null default '',
  add column if not exists region text not null default '';
