-- The requested bcrypt/JWT flow uses public.users as the application user table.
-- Supabase Auth is not used for this custom authentication flow.

alter table public.users
  drop constraint if exists users_id_fkey;

alter table public.users
  alter column id set default gen_random_uuid();

alter table public.users
  add column if not exists email text,
  add column if not exists password_hash text;

alter table public.users
  add constraint users_email_not_blank
  check (email is null or char_length(btrim(email)) > 3);

alter table public.users
  add constraint users_password_hash_not_blank
  check (password_hash is null or char_length(password_hash) > 0);

create unique index if not exists users_email_lower_unique_idx
  on public.users (lower(email))
  where email is not null;
