insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'career-applications',
  'career-applications',
  false,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.career_applications (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  desired_role text,
  first_name text not null,
  last_name text not null,
  email text not null,
  portfolio_url text,
  note text,
  cv_bucket text not null default 'career-applications',
  cv_path text not null,
  cv_file_name text not null,
  cv_mime_type text not null,
  cv_size_bytes integer not null,
  locale text not null default 'en',
  source text not null default 'careers',
  status text not null default 'new',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint career_applications_email_format check (
    email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  constraint career_applications_locale_check check (locale in ('en', 'it')),
  constraint career_applications_status_check check (status in ('new', 'reviewing', 'contacted', 'rejected', 'hired')),
  constraint career_applications_role_length_check check (char_length(role) between 2 and 120),
  constraint career_applications_name_length_check check (
    char_length(first_name) between 1 and 120
    and char_length(last_name) between 1 and 120
  ),
  constraint career_applications_cv_size_check check (cv_size_bytes > 0 and cv_size_bytes <= 5242880),
  constraint career_applications_cv_mime_check check (
    cv_mime_type in (
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  )
);

create index if not exists career_applications_created_at_idx
  on public.career_applications (created_at desc);

create index if not exists career_applications_role_idx
  on public.career_applications (role);

alter table public.career_applications enable row level security;

revoke all on public.career_applications from anon;
revoke all on public.career_applications from authenticated;

grant insert on public.career_applications to anon;
grant insert on public.career_applications to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'career_applications' and policyname = 'career applications insert public') then
    create policy "career applications insert public" on public.career_applications
    for insert to anon, authenticated
    with check (
      source = 'careers'
      and status = 'new'
      and cv_bucket = 'career-applications'
      and cv_path <> ''
      and locale in ('en', 'it')
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'career applications upload public') then
    create policy "career applications upload public" on storage.objects
    for insert to anon, authenticated
    with check (bucket_id = 'career-applications');
  end if;
end $$;
