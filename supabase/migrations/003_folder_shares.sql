create table if not exists public.folder_shares (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.folders(id) on delete cascade,
  shared_by uuid not null references public.users(id) on delete cascade,
  shared_with_user_id uuid not null references public.users(id) on delete cascade,
  permission text not null default 'viewer',
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint folder_shares_permission_valid check (permission in ('viewer', 'editor')),
  constraint folder_shares_not_self check (shared_by <> shared_with_user_id),
  constraint folder_shares_unique_recipient unique (folder_id, shared_with_user_id)
);

create index if not exists folder_shares_recipient_idx
  on public.folder_shares (shared_with_user_id, folder_id);

create index if not exists folder_shares_folder_idx
  on public.folder_shares (folder_id);

alter table public.folder_shares enable row level security;
