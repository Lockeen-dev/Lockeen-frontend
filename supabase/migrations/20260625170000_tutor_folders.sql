alter table public.tutor_sessions
  add column if not exists folder_id uuid;

create table if not exists public.tutor_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tutor_folders_name_not_blank check (length(trim(name)) > 0)
);

create index if not exists tutor_folders_user_id_idx
  on public.tutor_folders (user_id, updated_at desc);

create unique index if not exists tutor_folders_user_name_unique_idx
  on public.tutor_folders (user_id, lower(trim(name)));

create unique index if not exists tutor_folders_id_user_id_unique_idx
  on public.tutor_folders (id, user_id);

create index if not exists tutor_sessions_folder_id_idx
  on public.tutor_sessions (folder_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tutor_sessions_folder_user_fkey'
      and conrelid = 'public.tutor_sessions'::regclass
  ) then
    alter table public.tutor_sessions
      add constraint tutor_sessions_folder_user_fkey
      foreign key (folder_id, user_id)
      references public.tutor_folders(id, user_id)
      on delete set null (folder_id);
  end if;
end $$;

alter table public.tutor_folders enable row level security;

revoke all on public.tutor_folders from anon;
revoke all on public.tutor_folders from authenticated;
grant select, insert, update, delete on public.tutor_folders to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tutor_folders'
      and policyname = 'tutor_folders select own'
  ) then
    create policy "tutor_folders select own" on public.tutor_folders
    for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tutor_folders'
      and policyname = 'tutor_folders insert own'
  ) then
    create policy "tutor_folders insert own" on public.tutor_folders
    for insert to authenticated with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tutor_folders'
      and policyname = 'tutor_folders update own'
  ) then
    create policy "tutor_folders update own" on public.tutor_folders
    for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tutor_folders'
      and policyname = 'tutor_folders delete own'
  ) then
    create policy "tutor_folders delete own" on public.tutor_folders
    for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;
