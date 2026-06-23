create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  university text not null,
  study_field text not null,
  study_year text not null,
  city_country text,
  community_reach text,
  motivation text,
  locale text not null default 'en',
  source text not null default 'earn',
  status text not null default 'new',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_applications_email_format check (
    email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  constraint partner_applications_locale_check check (locale in ('en', 'it')),
  constraint partner_applications_status_check check (status in ('new', 'reviewing', 'contacted', 'rejected', 'approved')),
  constraint partner_applications_source_check check (source = 'earn'),
  constraint partner_applications_name_length_check check (
    char_length(first_name) between 1 and 120
    and char_length(last_name) between 1 and 120
  ),
  constraint partner_applications_university_length_check check (char_length(university) between 2 and 180),
  constraint partner_applications_study_field_length_check check (char_length(study_field) between 2 and 180),
  constraint partner_applications_study_year_length_check check (char_length(study_year) between 1 and 80),
  constraint partner_applications_optional_length_check check (
    char_length(coalesce(city_country, '')) <= 180
    and char_length(coalesce(community_reach, '')) <= 500
    and char_length(coalesce(motivation, '')) <= 1200
  )
);

create index if not exists partner_applications_created_at_idx
  on public.partner_applications (created_at desc);

create index if not exists partner_applications_university_idx
  on public.partner_applications (university);

create index if not exists partner_applications_status_idx
  on public.partner_applications (status);

alter table public.partner_applications enable row level security;

revoke all on public.partner_applications from anon;
revoke all on public.partner_applications from authenticated;

grant insert on public.partner_applications to anon;
grant insert on public.partner_applications to authenticated;

create or replace function public.update_partner_applications_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.email = lower(trim(new.email));
  new.first_name = trim(new.first_name);
  new.last_name = trim(new.last_name);
  new.university = trim(new.university);
  new.study_field = trim(new.study_field);
  new.study_year = trim(new.study_year);
  new.city_country = nullif(trim(coalesce(new.city_country, '')), '');
  new.community_reach = nullif(trim(coalesce(new.community_reach, '')), '');
  new.motivation = nullif(trim(coalesce(new.motivation, '')), '');
  return new;
end;
$$ language plpgsql set search_path = public;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'partner_applications_set_updated_at') then
    create trigger partner_applications_set_updated_at
    before insert or update on public.partner_applications
    for each row execute function public.update_partner_applications_updated_at();
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'partner_applications' and policyname = 'partner applications insert public') then
    create policy "partner applications insert public" on public.partner_applications
    for insert to anon, authenticated
    with check (
      email = lower(trim(email))
      and source = 'earn'
      and status = 'new'
      and locale in ('en', 'it')
    );
  end if;
end $$;
