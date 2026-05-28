alter table public.study_materials
  add column if not exists processing_status text not null default 'uploaded',
  add column if not exists extracted_text text,
  add column if not exists extraction_error text,
  add column if not exists processed_at timestamptz,
  add column if not exists page_count integer check (page_count is null or page_count >= 0);

alter table public.study_materials
  drop constraint if exists study_materials_processing_status_check;

alter table public.study_materials
  add constraint study_materials_processing_status_check
  check (processing_status in ('uploaded', 'processing', 'ready', 'failed', 'unsupported'));

alter table public.quizzes
  add column if not exists source_material_id uuid references public.study_materials(id) on delete set null;

alter table public.flashcards
  add column if not exists source_material_id uuid references public.study_materials(id) on delete set null;

create index if not exists study_materials_processing_status_idx on public.study_materials(processing_status);
create index if not exists quizzes_source_material_id_idx on public.quizzes(source_material_id);
create index if not exists flashcards_source_material_id_idx on public.flashcards(source_material_id);

drop policy if exists "quizzes insert own" on public.quizzes;
create policy "quizzes insert own" on public.quizzes for insert to authenticated
with check (
  user_id = auth.uid()
  and (exam_id is null or exists (select 1 from public.exams where exams.id = quizzes.exam_id and exams.user_id = auth.uid()))
  and (chapter_id is null or exists (select 1 from public.chapters where chapters.id = quizzes.chapter_id and chapters.user_id = auth.uid()))
  and (note_id is null or exists (select 1 from public.notes where notes.id = quizzes.note_id and notes.user_id = auth.uid()))
  and (source_material_id is null or exists (
    select 1 from public.study_materials
    where study_materials.id = quizzes.source_material_id
    and study_materials.user_id = auth.uid()
  ))
);

drop policy if exists "quizzes update own" on public.quizzes;
create policy "quizzes update own" on public.quizzes for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (exam_id is null or exists (select 1 from public.exams where exams.id = quizzes.exam_id and exams.user_id = auth.uid()))
  and (chapter_id is null or exists (select 1 from public.chapters where chapters.id = quizzes.chapter_id and chapters.user_id = auth.uid()))
  and (note_id is null or exists (select 1 from public.notes where notes.id = quizzes.note_id and notes.user_id = auth.uid()))
  and (source_material_id is null or exists (
    select 1 from public.study_materials
    where study_materials.id = quizzes.source_material_id
    and study_materials.user_id = auth.uid()
  ))
);

drop policy if exists "flashcards insert own" on public.flashcards;
create policy "flashcards insert own" on public.flashcards for insert to authenticated
with check (
  user_id = auth.uid()
  and (exam_id is null or exists (select 1 from public.exams where exams.id = flashcards.exam_id and exams.user_id = auth.uid()))
  and (chapter_id is null or exists (select 1 from public.chapters where chapters.id = flashcards.chapter_id and chapters.user_id = auth.uid()))
  and (note_id is null or exists (select 1 from public.notes where notes.id = flashcards.note_id and notes.user_id = auth.uid()))
  and (source_material_id is null or exists (
    select 1 from public.study_materials
    where study_materials.id = flashcards.source_material_id
    and study_materials.user_id = auth.uid()
  ))
);

drop policy if exists "flashcards update own" on public.flashcards;
create policy "flashcards update own" on public.flashcards for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (exam_id is null or exists (select 1 from public.exams where exams.id = flashcards.exam_id and exams.user_id = auth.uid()))
  and (chapter_id is null or exists (select 1 from public.chapters where chapters.id = flashcards.chapter_id and chapters.user_id = auth.uid()))
  and (note_id is null or exists (select 1 from public.notes where notes.id = flashcards.note_id and notes.user_id = auth.uid()))
  and (source_material_id is null or exists (
    select 1 from public.study_materials
    where study_materials.id = flashcards.source_material_id
    and study_materials.user_id = auth.uid()
  ))
);
