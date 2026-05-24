alter table public.exams
  add column if not exists target_grade integer check (target_grade is null or (target_grade >= 18 and target_grade <= 30)),
  add column if not exists priority integer check (priority is null or (priority >= 1 and priority <= 5)),
  add column if not exists emoji text,
  add column if not exists dot text;

alter table public.chapters
  add column if not exists file_count integer not null default 0 check (file_count >= 0),
  add column if not exists page_count integer not null default 0 check (page_count >= 0);

create table if not exists public.tutor_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  messages jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tutor_sessions_user_id_idx on public.tutor_sessions(user_id);
create index if not exists tutor_sessions_status_idx on public.tutor_sessions(status);
create index if not exists tutor_sessions_updated_at_idx on public.tutor_sessions(updated_at desc);

alter table public.tutor_sessions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tutor_sessions'
      and policyname = 'tutor_sessions select own'
  ) then
    create policy "tutor_sessions select own" on public.tutor_sessions
    for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tutor_sessions'
      and policyname = 'tutor_sessions insert own'
  ) then
    create policy "tutor_sessions insert own" on public.tutor_sessions
    for insert to authenticated with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tutor_sessions'
      and policyname = 'tutor_sessions update own'
  ) then
    create policy "tutor_sessions update own" on public.tutor_sessions
    for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tutor_sessions'
      and policyname = 'tutor_sessions delete own'
  ) then
    create policy "tutor_sessions delete own" on public.tutor_sessions
    for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;
