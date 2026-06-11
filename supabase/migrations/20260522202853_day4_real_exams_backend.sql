create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  name text not null,
  subject text,
  date date,
  color text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  title text not null,
  description text,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subjects_user_id_idx on public.subjects(user_id);
create index if not exists exams_user_id_idx on public.exams(user_id);
create index if not exists exams_subject_id_idx on public.exams(subject_id);
create index if not exists chapters_user_id_idx on public.chapters(user_id);
create index if not exists chapters_exam_id_idx on public.chapters(exam_id);

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.exams enable row level security;
alter table public.chapters enable row level security;

create policy "profiles select own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles insert own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "subjects select own" on public.subjects for select to authenticated using (user_id = auth.uid());
create policy "subjects insert own" on public.subjects for insert to authenticated with check (user_id = auth.uid());
create policy "subjects update own" on public.subjects for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "subjects delete own" on public.subjects for delete to authenticated using (user_id = auth.uid());

create policy "exams select own" on public.exams for select to authenticated using (user_id = auth.uid());
create policy "exams insert own" on public.exams for insert to authenticated with check (user_id = auth.uid());
create policy "exams update own" on public.exams for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "exams delete own" on public.exams for delete to authenticated using (user_id = auth.uid());

create policy "chapters select own" on public.chapters for select to authenticated using (user_id = auth.uid());

create policy "chapters insert own" on public.chapters for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.exams
    where exams.id = chapters.exam_id
    and exams.user_id = auth.uid()
  )
);

create policy "chapters update own" on public.chapters for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.exams
    where exams.id = chapters.exam_id
    and exams.user_id = auth.uid()
  )
);

create policy "chapters delete own" on public.chapters for delete to authenticated using (user_id = auth.uid());