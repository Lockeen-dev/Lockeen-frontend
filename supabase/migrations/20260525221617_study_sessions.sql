create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  minutes integer not null check (minutes > 0),
  studied_at timestamptz not null default now(),
  source text not null default 'timer',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists study_sessions_user_id_idx on public.study_sessions(user_id);
create index if not exists study_sessions_studied_at_idx on public.study_sessions(studied_at);
create index if not exists study_sessions_user_studied_at_idx on public.study_sessions(user_id, studied_at desc);

alter table public.study_sessions enable row level security;

grant select, insert, update, delete on public.study_sessions to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'study_sessions' and policyname = 'study_sessions select own') then
    create policy "study_sessions select own" on public.study_sessions
    for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'study_sessions' and policyname = 'study_sessions insert own') then
    create policy "study_sessions insert own" on public.study_sessions
    for insert to authenticated with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'study_sessions' and policyname = 'study_sessions update own') then
    create policy "study_sessions update own" on public.study_sessions
    for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'study_sessions' and policyname = 'study_sessions delete own') then
    create policy "study_sessions delete own" on public.study_sessions
    for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;
