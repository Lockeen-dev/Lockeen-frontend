create table if not exists public.ambassador_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text not null,
  last_name text not null,
  university text not null,
  study_field text,
  referral_code text not null,
  status text not null default 'pending_signup',
  commission_cents integer not null default 200,
  payout_threshold_cents integer not null default 2000,
  invited_by uuid references auth.users(id) on delete set null,
  claimed_user_id uuid references auth.users(id) on delete set null,
  claimed_ambassador_id uuid references public.ambassadors(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint ambassador_invites_email_format check (
    email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  constraint ambassador_invites_status_check check (status in ('pending_signup', 'claimed', 'cancelled')),
  constraint ambassador_invites_referral_code_format check (referral_code ~ '^[a-z0-9][a-z0-9-]{2,48}[a-z0-9]$'),
  constraint ambassador_invites_commission_positive_check check (commission_cents > 0),
  constraint ambassador_invites_threshold_positive_check check (payout_threshold_cents > 0)
);

create unique index if not exists ambassador_invites_pending_email_idx
  on public.ambassador_invites (lower(email))
  where status = 'pending_signup';

create unique index if not exists ambassador_invites_referral_code_idx
  on public.ambassador_invites (lower(referral_code));

create index if not exists ambassador_invites_status_idx
  on public.ambassador_invites (status);

create or replace function public.update_ambassador_invites_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.email = lower(trim(new.email));
  new.referral_code = lower(trim(new.referral_code));
  new.first_name = trim(new.first_name);
  new.last_name = trim(new.last_name);
  new.university = trim(new.university);
  new.study_field = nullif(trim(coalesce(new.study_field, '')), '');
  return new;
end;
$$ language plpgsql set search_path = public;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'ambassador_invites_set_updated_at') then
    create trigger ambassador_invites_set_updated_at
    before insert or update on public.ambassador_invites
    for each row execute function public.update_ambassador_invites_updated_at();
  end if;
end $$;

alter table public.ambassador_invites enable row level security;

revoke all on public.ambassador_invites from anon;
revoke all on public.ambassador_invites from authenticated;
