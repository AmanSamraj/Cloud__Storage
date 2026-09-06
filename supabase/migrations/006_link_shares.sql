create table if not exists public.link_shares (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null,
  resource_id uuid not null,
  token text not null unique,
  role text not null default 'viewer',
  password_hash text,
  expires_at timestamptz,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint link_shares_resource_type_valid check (resource_type in ('file', 'folder')),
  constraint link_shares_role_valid check (role = 'viewer')
);

create index if not exists link_shares_resource_idx
  on public.link_shares (resource_type, resource_id);

create index if not exists link_shares_expiry_idx
  on public.link_shares (expires_at);

alter table public.link_shares enable row level security;
