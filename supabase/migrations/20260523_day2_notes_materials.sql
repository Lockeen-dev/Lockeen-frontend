create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid references public.exams(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  title text not null,
  body text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_parent_required check (exam_id is not null or chapter_id is not null)
);

create table if not exists public.study_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid references public.exams(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  note_id uuid references public.notes(id) on delete cascade,
  type text not null,
  title text not null,
  source_url text,
  storage_path text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_materials_parent_required check (
    exam_id is not null or chapter_id is not null or note_id is not null
  )
);

create index if not exists notes_user_id_idx on public.notes(user_id);
create index if not exists notes_exam_id_idx on public.notes(exam_id);
create index if not exists notes_chapter_id_idx on public.notes(chapter_id);
create index if not exists notes_status_idx on public.notes(status);

create index if not exists study_materials_user_id_idx on public.study_materials(user_id);
create index if not exists study_materials_exam_id_idx on public.study_materials(exam_id);
create index if not exists study_materials_chapter_id_idx on public.study_materials(chapter_id);
create index if not exists study_materials_note_id_idx on public.study_materials(note_id);
create index if not exists study_materials_status_idx on public.study_materials(status);

alter table public.notes enable row level security;
alter table public.study_materials enable row level security;

create policy "notes select own" on public.notes for select to authenticated using (user_id = auth.uid());

create policy "notes insert own" on public.notes for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    exam_id is null
    or exists (
      select 1 from public.exams
      where exams.id = notes.exam_id
      and exams.user_id = auth.uid()
    )
  )
  and (
    chapter_id is null
    or exists (
      select 1 from public.chapters
      where chapters.id = notes.chapter_id
      and chapters.user_id = auth.uid()
    )
  )
);

create policy "notes update own" on public.notes for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    exam_id is null
    or exists (
      select 1 from public.exams
      where exams.id = notes.exam_id
      and exams.user_id = auth.uid()
    )
  )
  and (
    chapter_id is null
    or exists (
      select 1 from public.chapters
      where chapters.id = notes.chapter_id
      and chapters.user_id = auth.uid()
    )
  )
);

create policy "notes delete own" on public.notes for delete to authenticated using (user_id = auth.uid());

create policy "study_materials select own" on public.study_materials
for select to authenticated using (user_id = auth.uid());

create policy "study_materials insert own" on public.study_materials for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    exam_id is null
    or exists (
      select 1 from public.exams
      where exams.id = study_materials.exam_id
      and exams.user_id = auth.uid()
    )
  )
  and (
    chapter_id is null
    or exists (
      select 1 from public.chapters
      where chapters.id = study_materials.chapter_id
      and chapters.user_id = auth.uid()
    )
  )
  and (
    note_id is null
    or exists (
      select 1 from public.notes
      where notes.id = study_materials.note_id
      and notes.user_id = auth.uid()
    )
  )
);

create policy "study_materials update own" on public.study_materials for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    exam_id is null
    or exists (
      select 1 from public.exams
      where exams.id = study_materials.exam_id
      and exams.user_id = auth.uid()
    )
  )
  and (
    chapter_id is null
    or exists (
      select 1 from public.chapters
      where chapters.id = study_materials.chapter_id
      and chapters.user_id = auth.uid()
    )
  )
  and (
    note_id is null
    or exists (
      select 1 from public.notes
      where notes.id = study_materials.note_id
      and notes.user_id = auth.uid()
    )
  )
);

create policy "study_materials delete own" on public.study_materials
for delete to authenticated using (user_id = auth.uid());
