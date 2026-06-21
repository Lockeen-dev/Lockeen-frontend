alter table public.tutor_sessions
  add column if not exists pinned boolean not null default false;

create index if not exists tutor_sessions_pinned_updated_at_idx
  on public.tutor_sessions (pinned desc, updated_at desc);
