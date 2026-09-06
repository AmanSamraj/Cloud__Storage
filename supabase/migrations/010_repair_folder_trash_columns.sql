-- Repair older databases where the folder trash migration was not applied.
alter table public.folders
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz;

alter table public.files
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz;

create index if not exists folders_owner_active_idx
  on public.folders (owner_id, parent_id)
  where is_deleted = false;

create index if not exists folders_owner_deleted_idx
  on public.folders (owner_id, is_deleted, deleted_at desc);

create index if not exists files_owner_deleted_idx
  on public.files (owner_id, is_deleted, deleted_at desc);

create index if not exists files_deleted_at_idx
  on public.files (deleted_at)
  where is_deleted = true;

create index if not exists folders_deleted_at_idx
  on public.folders (deleted_at)
  where is_deleted = true;
