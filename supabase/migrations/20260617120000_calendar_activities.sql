create table if not exists public.calendar_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  activity_date date not null,
  activity_time time,
  duration_min integer not null default 60 check (duration_min > 0 and duration_min <= 1440),
  category text not null default 'study',
  note_id uuid,
  note_subject text,
  note_color text,
  note_bg text,
  note_text text,
  notes text not null default '',
  materials jsonb not null default '[]'::jsonb,
  files jsonb not null default '[]'::jsonb,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_activities_user_id_idx on public.calendar_activities (user_id);
create index if not exists calendar_activities_user_date_idx on public.calendar_activities (user_id, activity_date);

alter table public.calendar_activities enable row level security;

revoke all on public.calendar_activities from anon;
revoke all on public.calendar_activities from authenticated;

grant select, insert, update, delete on public.calendar_activities to authenticated;

create or replace function public.update_calendar_activities_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'calendar_activities_set_updated_at') then
    create trigger calendar_activities_set_updated_at
    before update on public.calendar_activities
    for each row execute function public.update_calendar_activities_updated_at();
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'calendar_activities' and policyname = 'calendar_activities select own') then
    create policy "calendar_activities select own" on public.calendar_activities
    for select to authenticated
    using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'calendar_activities' and policyname = 'calendar_activities insert own') then
    create policy "calendar_activities insert own" on public.calendar_activities
    for insert to authenticated
    with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'calendar_activities' and policyname = 'calendar_activities update own') then
    create policy "calendar_activities update own" on public.calendar_activities
    for update to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'calendar_activities' and policyname = 'calendar_activities delete own') then
    create policy "calendar_activities delete own" on public.calendar_activities
    for delete to authenticated
    using (user_id = auth.uid());
  end if;
end $$;
