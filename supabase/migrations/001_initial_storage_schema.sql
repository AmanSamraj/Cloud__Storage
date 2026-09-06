-- MVP schema for the cloud storage application.
-- Supabase Auth owns authentication records in auth.users.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  parent_id uuid references public.folders(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint folders_name_not_blank check (char_length(btrim(name)) between 1 and 255)
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  name text not null,
  storage_path text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  checksum text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint files_name_not_blank check (char_length(btrim(name)) between 1 and 255),
  constraint files_size_not_negative check (size_bytes >= 0),
  constraint files_storage_path_not_blank check (char_length(btrim(storage_path)) > 0),
  constraint files_storage_path_unique unique (storage_path)
);

create table if not exists public.file_versions (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files(id) on delete cascade,
  version_number integer not null,
  storage_path text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  checksum text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint file_versions_number_positive check (version_number > 0),
  constraint file_versions_size_not_negative check (size_bytes >= 0),
  constraint file_versions_file_version_unique unique (file_id, version_number),
  constraint file_versions_storage_path_unique unique (storage_path)
);

create table if not exists public.file_shares (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files(id) on delete cascade,
  shared_by uuid not null references public.users(id) on delete cascade,
  shared_with_user_id uuid not null references public.users(id) on delete cascade,
  permission text not null default 'viewer',
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint file_shares_permission_valid check (permission in ('viewer', 'editor')),
  constraint file_shares_not_self check (shared_by <> shared_with_user_id),
  constraint file_shares_unique_recipient unique (file_id, shared_with_user_id)
);

create table if not exists public.public_share_links (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  allow_download boolean not null default true,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.starred_files (
  user_id uuid not null references public.users(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, file_id)
);

create table if not exists public.trash_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  file_id uuid references public.files(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete cascade,
  deleted_at timestamptz not null default now(),
  restored_at timestamptz,
  purged_at timestamptz,
  constraint trash_items_one_target check (
    (file_id is not null and folder_id is null)
    or (file_id is null and folder_id is not null)
  )
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint activity_logs_action_valid check (
    action in (
      'create_folder', 'rename', 'move', 'upload', 'update',
      'share', 'unshare', 'create_link', 'revoke_link',
      'star', 'unstar', 'trash', 'restore', 'purge'
    )
  ),
  constraint activity_logs_entity_type_valid check (
    entity_type in ('file', 'folder', 'share', 'share_link', 'version')
  )
);

-- Parent lookups and root-folder uniqueness for each owner.
create index if not exists folders_owner_parent_idx
  on public.folders (owner_id, parent_id);

create unique index if not exists folders_owner_root_name_idx
  on public.folders (owner_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

create index if not exists files_owner_folder_idx
  on public.files (owner_id, folder_id);

create index if not exists files_updated_at_idx
  on public.files (updated_at desc);

create index if not exists file_versions_file_created_idx
  on public.file_versions (file_id, created_at desc);

create index if not exists file_shares_recipient_idx
  on public.file_shares (shared_with_user_id, file_id);

create index if not exists public_share_links_file_idx
  on public.public_share_links (file_id);

create index if not exists starred_files_user_created_idx
  on public.starred_files (user_id, created_at desc);

create unique index if not exists trash_items_active_file_idx
  on public.trash_items (file_id)
  where restored_at is null and purged_at is null and file_id is not null;

create unique index if not exists trash_items_active_folder_idx
  on public.trash_items (folder_id)
  where restored_at is null and purged_at is null and folder_id is not null;

create index if not exists trash_items_owner_deleted_idx
  on public.trash_items (owner_id, deleted_at desc);

create index if not exists activity_logs_entity_idx
  on public.activity_logs (entity_type, entity_id, created_at desc);

create index if not exists activity_logs_actor_idx
  on public.activity_logs (actor_id, created_at desc);

-- Keep these tables protected when accessed with the publishable key.
-- Backend service-role requests bypass RLS; user policies should be added
-- together with authentication in the next step.
alter table public.users enable row level security;
alter table public.folders enable row level security;
alter table public.files enable row level security;
alter table public.file_versions enable row level security;
alter table public.file_shares enable row level security;
alter table public.public_share_links enable row level security;
alter table public.starred_files enable row level security;
alter table public.trash_items enable row level security;
alter table public.activity_logs enable row level security;
