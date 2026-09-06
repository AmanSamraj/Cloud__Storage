-- Unified Stars Table
create table if not exists public.stars (
  user_id uuid not null references public.users(id) on delete cascade,
  resource_type text not null,
  resource_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, resource_type, resource_id),
  constraint stars_resource_type_valid check (resource_type in ('file', 'folder'))
);

create index if not exists stars_user_created_idx
  on public.stars (user_id, created_at desc);

create index if not exists stars_resource_idx
  on public.stars (resource_type, resource_id);

-- Migrate any earlier records from starred_files & starred_folders
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'starred_files') then
    insert into public.stars (user_id, resource_type, resource_id, created_at)
    select user_id, 'file', file_id, created_at from public.starred_files
    on conflict (user_id, resource_type, resource_id) do nothing;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'starred_folders') then
    insert into public.stars (user_id, resource_type, resource_id, created_at)
    select user_id, 'folder', folder_id, created_at from public.starred_folders
    on conflict (user_id, resource_type, resource_id) do nothing;
  end if;
end $$;

alter table public.stars enable row level security;
