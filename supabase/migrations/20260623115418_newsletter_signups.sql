create table if not exists public.newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'blog',
  locale text not null default 'en',
  status text not null default 'subscribed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_signups_email_format check (
    email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  constraint newsletter_signups_source_check check (char_length(source) between 1 and 80),
  constraint newsletter_signups_locale_check check (locale in ('en', 'it')),
  constraint newsletter_signups_status_check check (status in ('subscribed', 'unsubscribed'))
);

create unique index if not exists newsletter_signups_email_lower_idx
  on public.newsletter_signups (lower(email));

create index if not exists newsletter_signups_created_at_idx
  on public.newsletter_signups (created_at desc);

alter table public.newsletter_signups enable row level security;

revoke all on public.newsletter_signups from anon;
revoke all on public.newsletter_signups from authenticated;

grant insert on public.newsletter_signups to anon;
grant insert on public.newsletter_signups to authenticated;
grant select, insert, update, delete on public.newsletter_signups to service_role;

create or replace function public.update_newsletter_signups_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.email = lower(trim(new.email));
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'newsletter_signups_set_updated_at') then
    create trigger newsletter_signups_set_updated_at
    before insert or update on public.newsletter_signups
    for each row execute function public.update_newsletter_signups_updated_at();
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'newsletter_signups' and policyname = 'newsletter_signups insert public') then
    create policy "newsletter_signups insert public" on public.newsletter_signups
    for insert to anon, authenticated
    with check (true);
  end if;
end $$;
