create table if not exists public.user_contract_permissions (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  can_download_draft boolean not null default true,
  can_remote_sign boolean not null default true,
  can_device_sign boolean not null default true,
  granted_by uuid references public.app_users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.user_contract_permissions enable row level security;

drop policy if exists "contract_permissions_self_read" on public.user_contract_permissions;
create policy "contract_permissions_self_read"
  on public.user_contract_permissions for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists "contract_permissions_super_admin_write" on public.user_contract_permissions;
create policy "contract_permissions_super_admin_write"
  on public.user_contract_permissions for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());