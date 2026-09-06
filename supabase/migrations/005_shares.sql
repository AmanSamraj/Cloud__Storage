create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null,
  resource_id uuid not null,
  grantee_user_id uuid not null references public.users(id) on delete cascade,
  role text not null,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint shares_resource_type_valid check (resource_type in ('file', 'folder')),
  constraint shares_role_valid check (role in ('editor', 'viewer')),
  constraint shares_not_self check (grantee_user_id <> created_by),
  constraint shares_unique_grantee unique (resource_type, resource_id, grantee_user_id)
);

create index if not exists shares_resource_idx
  on public.shares (resource_type, resource_id);

create index if not exists shares_grantee_idx
  on public.shares (grantee_user_id, resource_type);

-- Preserve shares created by the earlier resource-specific tables.
insert into public.shares (resource_type, resource_id, grantee_user_id, role, created_by)
select 'file', file_id, shared_with_user_id, permission, shared_by
from public.file_shares
on conflict (resource_type, resource_id, grantee_user_id) do nothing;

insert into public.shares (resource_type, resource_id, grantee_user_id, role, created_by)
select 'folder', folder_id, shared_with_user_id, permission, shared_by
from public.folder_shares
on conflict (resource_type, resource_id, grantee_user_id) do nothing;

alter table public.shares enable row level security;
