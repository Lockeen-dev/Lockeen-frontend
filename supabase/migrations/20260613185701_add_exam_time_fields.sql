alter table public.exams
  add column if not exists exam_time time,
  add column if not exists exam_duration_min integer not null default 120 check (exam_duration_min > 0 and exam_duration_min <= 480);
