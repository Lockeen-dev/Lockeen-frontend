alter table public.quiz_questions
  add column if not exists difficulty text not null default 'medium',
  add column if not exists topic text,
  add column if not exists source_material_id uuid references public.study_materials(id) on delete set null;

alter table public.quiz_questions
  drop constraint if exists quiz_questions_difficulty_check;

alter table public.quiz_questions
  add constraint quiz_questions_difficulty_check
  check (difficulty in ('easy', 'medium', 'hard', 'extreme'));

update public.quiz_questions
set source_material_id = quizzes.source_material_id
from public.quizzes
where quiz_questions.quiz_id = quizzes.id
  and quiz_questions.source_material_id is null
  and quizzes.source_material_id is not null;

create index if not exists quiz_questions_difficulty_idx on public.quiz_questions(difficulty);
create index if not exists quiz_questions_source_material_id_idx on public.quiz_questions(source_material_id);
