create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid references public.exams(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  note_id uuid references public.notes(id) on delete cascade,
  front text not null,
  back text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flashcards_parent_required check (
    exam_id is not null or chapter_id is not null or note_id is not null
  )
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid references public.exams(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  note_id uuid references public.notes(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quizzes_parent_required check (
    exam_id is not null or chapter_id is not null or note_id is not null
  )
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  correct_answer text not null,
  explanation text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  score integer not null check (score >= 0),
  total integer not null check (total >= 0),
  answers jsonb not null default '[]'::jsonb,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists flashcards_user_id_idx on public.flashcards(user_id);
create index if not exists flashcards_exam_id_idx on public.flashcards(exam_id);
create index if not exists flashcards_chapter_id_idx on public.flashcards(chapter_id);
create index if not exists flashcards_note_id_idx on public.flashcards(note_id);
create index if not exists flashcards_status_idx on public.flashcards(status);

create index if not exists quizzes_user_id_idx on public.quizzes(user_id);
create index if not exists quizzes_exam_id_idx on public.quizzes(exam_id);
create index if not exists quizzes_chapter_id_idx on public.quizzes(chapter_id);
create index if not exists quizzes_note_id_idx on public.quizzes(note_id);
create index if not exists quizzes_status_idx on public.quizzes(status);

create index if not exists quiz_questions_user_id_idx on public.quiz_questions(user_id);
create index if not exists quiz_questions_quiz_id_idx on public.quiz_questions(quiz_id);
create index if not exists quiz_questions_position_idx on public.quiz_questions(position);

create index if not exists quiz_attempts_user_id_idx on public.quiz_attempts(user_id);
create index if not exists quiz_attempts_quiz_id_idx on public.quiz_attempts(quiz_id);
create index if not exists quiz_attempts_completed_at_idx on public.quiz_attempts(completed_at);

alter table public.flashcards enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'flashcards' and policyname = 'flashcards select own') then
    create policy "flashcards select own" on public.flashcards for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'flashcards' and policyname = 'flashcards insert own') then
    create policy "flashcards insert own" on public.flashcards for insert to authenticated
    with check (
      user_id = auth.uid()
      and (exam_id is null or exists (select 1 from public.exams where exams.id = flashcards.exam_id and exams.user_id = auth.uid()))
      and (chapter_id is null or exists (select 1 from public.chapters where chapters.id = flashcards.chapter_id and chapters.user_id = auth.uid()))
      and (note_id is null or exists (select 1 from public.notes where notes.id = flashcards.note_id and notes.user_id = auth.uid()))
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'flashcards' and policyname = 'flashcards update own') then
    create policy "flashcards update own" on public.flashcards for update to authenticated
    using (user_id = auth.uid())
    with check (
      user_id = auth.uid()
      and (exam_id is null or exists (select 1 from public.exams where exams.id = flashcards.exam_id and exams.user_id = auth.uid()))
      and (chapter_id is null or exists (select 1 from public.chapters where chapters.id = flashcards.chapter_id and chapters.user_id = auth.uid()))
      and (note_id is null or exists (select 1 from public.notes where notes.id = flashcards.note_id and notes.user_id = auth.uid()))
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'flashcards' and policyname = 'flashcards delete own') then
    create policy "flashcards delete own" on public.flashcards for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quizzes' and policyname = 'quizzes select own') then
    create policy "quizzes select own" on public.quizzes for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quizzes' and policyname = 'quizzes insert own') then
    create policy "quizzes insert own" on public.quizzes for insert to authenticated
    with check (
      user_id = auth.uid()
      and (exam_id is null or exists (select 1 from public.exams where exams.id = quizzes.exam_id and exams.user_id = auth.uid()))
      and (chapter_id is null or exists (select 1 from public.chapters where chapters.id = quizzes.chapter_id and chapters.user_id = auth.uid()))
      and (note_id is null or exists (select 1 from public.notes where notes.id = quizzes.note_id and notes.user_id = auth.uid()))
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quizzes' and policyname = 'quizzes update own') then
    create policy "quizzes update own" on public.quizzes for update to authenticated
    using (user_id = auth.uid())
    with check (
      user_id = auth.uid()
      and (exam_id is null or exists (select 1 from public.exams where exams.id = quizzes.exam_id and exams.user_id = auth.uid()))
      and (chapter_id is null or exists (select 1 from public.chapters where chapters.id = quizzes.chapter_id and chapters.user_id = auth.uid()))
      and (note_id is null or exists (select 1 from public.notes where notes.id = quizzes.note_id and notes.user_id = auth.uid()))
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quizzes' and policyname = 'quizzes delete own') then
    create policy "quizzes delete own" on public.quizzes for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quiz_questions' and policyname = 'quiz_questions select own') then
    create policy "quiz_questions select own" on public.quiz_questions for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quiz_questions' and policyname = 'quiz_questions insert own') then
    create policy "quiz_questions insert own" on public.quiz_questions for insert to authenticated
    with check (
      user_id = auth.uid()
      and exists (select 1 from public.quizzes where quizzes.id = quiz_questions.quiz_id and quizzes.user_id = auth.uid())
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quiz_questions' and policyname = 'quiz_questions update own') then
    create policy "quiz_questions update own" on public.quiz_questions for update to authenticated
    using (user_id = auth.uid())
    with check (
      user_id = auth.uid()
      and exists (select 1 from public.quizzes where quizzes.id = quiz_questions.quiz_id and quizzes.user_id = auth.uid())
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quiz_questions' and policyname = 'quiz_questions delete own') then
    create policy "quiz_questions delete own" on public.quiz_questions for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quiz_attempts' and policyname = 'quiz_attempts select own') then
    create policy "quiz_attempts select own" on public.quiz_attempts for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quiz_attempts' and policyname = 'quiz_attempts insert own') then
    create policy "quiz_attempts insert own" on public.quiz_attempts for insert to authenticated
    with check (
      user_id = auth.uid()
      and exists (select 1 from public.quizzes where quizzes.id = quiz_attempts.quiz_id and quizzes.user_id = auth.uid())
    );
  end if;
end $$;
