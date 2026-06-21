create table if not exists public.quiz_generation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid references public.exams(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  note_id uuid references public.notes(id) on delete cascade,
  source_material_id uuid references public.study_materials(id) on delete set null,
  model text,
  status text not null default 'running',
  requested_count integer not null default 0,
  generated_count integer not null default 0,
  valid_count integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.material_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material_id uuid not null references public.study_materials(id) on delete cascade,
  chunk_index integer not null default 0,
  title text,
  text text not null,
  token_estimate integer not null default 0,
  created_at timestamptz not null default now(),
  unique (material_id, chunk_index)
);

create table if not exists public.material_concepts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material_id uuid not null references public.study_materials(id) on delete cascade,
  chunk_id uuid references public.material_chunks(id) on delete cascade,
  concept_key text not null,
  title text not null,
  summary text not null,
  importance integer not null default 3 check (importance between 1 and 5),
  created_at timestamptz not null default now(),
  unique (material_id, concept_key)
);

alter table public.quiz_questions
  add column if not exists question_type text not null default 'multiple_choice',
  add column if not exists concept_key text,
  add column if not exists source_snippet text,
  add column if not exists quality_score numeric(4,2),
  add column if not exists generation_run_id uuid references public.quiz_generation_runs(id) on delete set null,
  add column if not exists validation_status text not null default 'valid',
  add column if not exists validation_notes jsonb not null default '[]'::jsonb;

alter table public.quiz_questions
  drop constraint if exists quiz_questions_question_type_check;

alter table public.quiz_questions
  add constraint quiz_questions_question_type_check
  check (question_type in ('multiple_choice'));

alter table public.quiz_questions
  drop constraint if exists quiz_questions_validation_status_check;

alter table public.quiz_questions
  add constraint quiz_questions_validation_status_check
  check (validation_status in ('valid', 'rejected', 'needs_review'));

create index if not exists quiz_generation_runs_user_id_idx on public.quiz_generation_runs(user_id);
create index if not exists quiz_generation_runs_source_material_id_idx on public.quiz_generation_runs(source_material_id);
create index if not exists quiz_generation_runs_status_idx on public.quiz_generation_runs(status);
create index if not exists material_chunks_user_id_idx on public.material_chunks(user_id);
create index if not exists material_chunks_material_id_idx on public.material_chunks(material_id);
create index if not exists material_concepts_user_id_idx on public.material_concepts(user_id);
create index if not exists material_concepts_material_id_idx on public.material_concepts(material_id);
create index if not exists quiz_questions_concept_key_idx on public.quiz_questions(concept_key);
create index if not exists quiz_questions_generation_run_id_idx on public.quiz_questions(generation_run_id);
create index if not exists quiz_questions_validation_status_idx on public.quiz_questions(validation_status);

alter table public.quiz_generation_runs enable row level security;
alter table public.material_chunks enable row level security;
alter table public.material_concepts enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quiz_generation_runs' and policyname = 'quiz_generation_runs select own') then
    create policy "quiz_generation_runs select own" on public.quiz_generation_runs for select to authenticated using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quiz_generation_runs' and policyname = 'quiz_generation_runs insert own') then
    create policy "quiz_generation_runs insert own" on public.quiz_generation_runs for insert to authenticated
    with check (
      user_id = auth.uid()
      and (exam_id is null or exists (select 1 from public.exams where exams.id = quiz_generation_runs.exam_id and exams.user_id = auth.uid()))
      and (chapter_id is null or exists (select 1 from public.chapters where chapters.id = quiz_generation_runs.chapter_id and chapters.user_id = auth.uid()))
      and (note_id is null or exists (select 1 from public.notes where notes.id = quiz_generation_runs.note_id and notes.user_id = auth.uid()))
      and (source_material_id is null or exists (select 1 from public.study_materials where study_materials.id = quiz_generation_runs.source_material_id and study_materials.user_id = auth.uid()))
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quiz_generation_runs' and policyname = 'quiz_generation_runs update own') then
    create policy "quiz_generation_runs update own" on public.quiz_generation_runs for update to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quiz_generation_runs' and policyname = 'quiz_generation_runs delete own') then
    create policy "quiz_generation_runs delete own" on public.quiz_generation_runs for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'material_chunks' and policyname = 'material_chunks select own') then
    create policy "material_chunks select own" on public.material_chunks for select to authenticated using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'material_chunks' and policyname = 'material_chunks insert own') then
    create policy "material_chunks insert own" on public.material_chunks for insert to authenticated
    with check (
      user_id = auth.uid()
      and exists (select 1 from public.study_materials where study_materials.id = material_chunks.material_id and study_materials.user_id = auth.uid())
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'material_chunks' and policyname = 'material_chunks update own') then
    create policy "material_chunks update own" on public.material_chunks for update to authenticated
    using (user_id = auth.uid())
    with check (
      user_id = auth.uid()
      and exists (select 1 from public.study_materials where study_materials.id = material_chunks.material_id and study_materials.user_id = auth.uid())
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'material_chunks' and policyname = 'material_chunks delete own') then
    create policy "material_chunks delete own" on public.material_chunks for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'material_concepts' and policyname = 'material_concepts select own') then
    create policy "material_concepts select own" on public.material_concepts for select to authenticated using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'material_concepts' and policyname = 'material_concepts insert own') then
    create policy "material_concepts insert own" on public.material_concepts for insert to authenticated
    with check (
      user_id = auth.uid()
      and exists (select 1 from public.study_materials where study_materials.id = material_concepts.material_id and study_materials.user_id = auth.uid())
      and (chunk_id is null or exists (select 1 from public.material_chunks where material_chunks.id = material_concepts.chunk_id and material_chunks.user_id = auth.uid()))
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'material_concepts' and policyname = 'material_concepts update own') then
    create policy "material_concepts update own" on public.material_concepts for update to authenticated
    using (user_id = auth.uid())
    with check (
      user_id = auth.uid()
      and exists (select 1 from public.study_materials where study_materials.id = material_concepts.material_id and study_materials.user_id = auth.uid())
      and (chunk_id is null or exists (select 1 from public.material_chunks where material_chunks.id = material_concepts.chunk_id and material_chunks.user_id = auth.uid()))
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'material_concepts' and policyname = 'material_concepts delete own') then
    create policy "material_concepts delete own" on public.material_concepts for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;

grant select, insert, update, delete on public.quiz_generation_runs to authenticated;
grant select, insert, update, delete on public.material_chunks to authenticated;
grant select, insert, update, delete on public.material_concepts to authenticated;
