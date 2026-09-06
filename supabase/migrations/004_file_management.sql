alter table public.files
  add column if not exists is_deleted boolean not null default false;

create index if not exists files_owner_folder_active_idx
  on public.files (owner_id, folder_id)
  where is_deleted = false;
