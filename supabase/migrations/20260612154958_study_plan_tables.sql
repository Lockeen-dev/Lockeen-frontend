create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  mode text not null check (mode in ('daily', 'weekly', 'monthly', 'until_exam')),
  start_date date not null,
  end_date date,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  exam_id uuid references public.exams(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  material_id uuid references public.study_materials(id) on delete set null,
  type text not null check (type in ('review', 'quiz', 'flashcards', 'mock_exam', 'buffer')),
  planned_date date not null,
  planned_time time,
  duration_min integer not null check (duration_min > 0),
  status text not null default 'planned' check (status in ('planned', 'done', 'missed', 'rescheduled', 'skipped')),
  source text not null default 'generated' check (source in ('generated', 'manual')),
  material_pending boolean not null default false,
  completed_at timestamptz,
  rescheduled_from uuid references public.study_plan_items(id) on delete set null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists study_plans_user_id_idx on public.study_plans(user_id);
create index if not exists study_plan_items_user_id_idx on public.study_plan_items(user_id);
create index if not exists study_plan_items_plan_id_idx on public.study_plan_items(plan_id);
create index if not exists study_plan_items_user_date_idx on public.study_plan_items(user_id, planned_date);

alter table public.study_plans enable row level security;
alter table public.study_plan_items enable row level security;

revoke all on public.study_plans from anon;
revoke all on public.study_plans from authenticated;
revoke all on public.study_plan_items from anon;
revoke all on public.study_plan_items from authenticated;

grant select, insert, update, delete on public.study_plans to authenticated;
grant select, insert, update, delete on public.study_plan_items to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'study_plans' and policyname = 'study_plans select own') then
    create policy "study_plans select own" on public.study_plans
    for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'study_plans' and policyname = 'study_plans insert own') then
    create policy "study_plans insert own" on public.study_plans
    for insert to authenticated with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'study_plans' and policyname = 'study_plans update own') then
    create policy "study_plans update own" on public.study_plans
    for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'study_plans' and policyname = 'study_plans delete own') then
    create policy "study_plans delete own" on public.study_plans
    for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'study_plan_items' and policyname = 'study_plan_items select own') then
    create policy "study_plan_items select own" on public.study_plan_items
    for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'study_plan_items' and policyname = 'study_plan_items insert own') then
    create policy "study_plan_items insert own" on public.study_plan_items
    for insert to authenticated
    with check (
      user_id = auth.uid()
      and exists (
        select 1 from public.study_plans
        where study_plans.id = study_plan_items.plan_id
        and study_plans.user_id = auth.uid()
      )
      and (
        exam_id is null
        or exists (
          select 1 from public.exams
          where exams.id = study_plan_items.exam_id
          and exams.user_id = auth.uid()
        )
      )
      and (
        chapter_id is null
        or exists (
          select 1 from public.chapters
          where chapters.id = study_plan_items.chapter_id
          and chapters.user_id = auth.uid()
        )
      )
      and (
        material_id is null
        or exists (
          select 1 from public.study_materials
          where study_materials.id = study_plan_items.material_id
          and study_materials.user_id = auth.uid()
        )
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'study_plan_items' and policyname = 'study_plan_items update own') then
    create policy "study_plan_items update own" on public.study_plan_items
    for update to authenticated
    using (user_id = auth.uid())
    with check (
      user_id = auth.uid()
      and exists (
        select 1 from public.study_plans
        where study_plans.id = study_plan_items.plan_id
        and study_plans.user_id = auth.uid()
      )
      and (
        exam_id is null
        or exists (
          select 1 from public.exams
          where exams.id = study_plan_items.exam_id
          and exams.user_id = auth.uid()
        )
      )
      and (
        chapter_id is null
        or exists (
          select 1 from public.chapters
          where chapters.id = study_plan_items.chapter_id
          and chapters.user_id = auth.uid()
        )
      )
      and (
        material_id is null
        or exists (
          select 1 from public.study_materials
          where study_materials.id = study_plan_items.material_id
          and study_materials.user_id = auth.uid()
        )
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'study_plan_items' and policyname = 'study_plan_items delete own') then
    create policy "study_plan_items delete own" on public.study_plan_items
    for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;
