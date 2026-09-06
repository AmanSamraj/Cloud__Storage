-- Search Optimization and Performance Indexes
-- Creates B-Tree indexes on normalized lower(name) for fast case-insensitive lookups,
-- as well as indexes for mime type, ownership, and starred items.

create extension if not exists pg_trgm;

-- Files Indexes for search & filters
create index if not exists files_lower_name_idx
  on public.files (lower(name))
  where is_deleted = false;

create index if not exists files_mime_type_idx
  on public.files (mime_type)
  where is_deleted = false;

create index if not exists files_owner_active_idx
  on public.files (owner_id, is_deleted);

create index if not exists files_created_at_idx
  on public.files (created_at desc);

create index if not exists files_size_bytes_idx
  on public.files (size_bytes desc);

-- Folders Indexes for search & filters
create index if not exists folders_lower_name_idx
  on public.folders (lower(name));

create index if not exists folders_owner_created_idx
  on public.folders (owner_id, created_at desc);

-- Starred Folders Table (to support starring folders alongside starred_files)
create table if not exists public.starred_folders (
  user_id uuid not null references public.users(id) on delete cascade,
  folder_id uuid not null references public.folders(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, folder_id)
);

create index if not exists starred_folders_user_created_idx
  on public.starred_folders (user_id, created_at desc);

alter table public.starred_folders enable row level security;
