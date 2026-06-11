create table if not exists public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid references public.exams(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  note_id uuid references public.notes(id) on delete cascade,
  source_material_id uuid references public.study_materials(id) on delete set null,
  score integer not null check (score >= 0),
  total integer not null check (total >= 0),
  known_count integer not null default 0 check (known_count >= 0),
  answers jsonb not null default '[]'::jsonb,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint flashcard_reviews_parent_required check (
    exam_id is not null or chapter_id is not null or note_id is not null
  )
);

create index if not exists flashcard_reviews_user_id_idx on public.flashcard_reviews(user_id);
create index if not exists flashcard_reviews_exam_id_idx on public.flashcard_reviews(exam_id);
create index if not exists flashcard_reviews_chapter_id_idx on public.flashcard_reviews(chapter_id);
create index if not exists flashcard_reviews_completed_at_idx on public.flashcard_reviews(completed_at);

alter table public.flashcard_reviews enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'flashcard_reviews' and policyname = 'flashcard_reviews select own') then
    create policy "flashcard_reviews select own" on public.flashcard_reviews
      for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'flashcard_reviews' and policyname = 'flashcard_reviews insert own') then
    create policy "flashcard_reviews insert own" on public.flashcard_reviews
      for insert to authenticated
      with check (
        user_id = auth.uid()
        and (exam_id is null or exists (select 1 from public.exams where exams.id = flashcard_reviews.exam_id and exams.user_id = auth.uid()))
        and (chapter_id is null or exists (select 1 from public.chapters where chapters.id = flashcard_reviews.chapter_id and chapters.user_id = auth.uid()))
        and (note_id is null or exists (select 1 from public.notes where notes.id = flashcard_reviews.note_id and notes.user_id = auth.uid()))
        and (source_material_id is null or exists (select 1 from public.study_materials where study_materials.id = flashcard_reviews.source_material_id and study_materials.user_id = auth.uid()))
      );
  end if;
end $$;
