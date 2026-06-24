create table if not exists public.ambassadors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.partner_applications(id) on delete set null,
  email text not null,
  first_name text not null,
  last_name text not null,
  university text not null,
  study_field text,
  referral_code text not null,
  status text not null default 'active',
  commission_cents integer not null default 200,
  payout_threshold_cents integer not null default 2000,
  payout_method text not null default 'manual_bank',
  payout_notes text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint ambassadors_email_format check (
    email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  constraint ambassadors_status_check check (status in ('active', 'paused', 'rejected', 'archived')),
  constraint ambassadors_referral_code_format check (referral_code ~ '^[a-z0-9][a-z0-9-]{2,48}[a-z0-9]$'),
  constraint ambassadors_commission_positive_check check (commission_cents > 0),
  constraint ambassadors_threshold_positive_check check (payout_threshold_cents > 0)
);

create unique index if not exists ambassadors_user_id_idx
  on public.ambassadors (user_id);

create unique index if not exists ambassadors_referral_code_idx
  on public.ambassadors (lower(referral_code));

create index if not exists ambassadors_status_idx
  on public.ambassadors (status);

create table if not exists public.referral_visits (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.ambassadors(id) on delete cascade,
  referral_code text not null,
  anonymous_id text,
  landing_path text,
  referrer text,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists referral_visits_ambassador_id_idx
  on public.referral_visits (ambassador_id);

create index if not exists referral_visits_created_at_idx
  on public.referral_visits (created_at desc);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.ambassadors(id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  referral_code text not null,
  referred_email text,
  status text not null default 'signed_up',
  signed_up_at timestamptz not null default now(),
  first_paid_at timestamptz,
  current_subscription_id text,
  subscription_status text,
  last_paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint referrals_status_check check (status in ('signed_up', 'paid', 'active', 'cancelled', 'invalid')),
  constraint referrals_no_self_referral_check check (ambassador_id is not null)
);

create unique index if not exists referrals_referred_user_id_idx
  on public.referrals (referred_user_id);

create index if not exists referrals_ambassador_id_idx
  on public.referrals (ambassador_id);

create index if not exists referrals_status_idx
  on public.referrals (status);

create table if not exists public.ambassador_commissions (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.ambassadors(id) on delete cascade,
  referral_id uuid not null references public.referrals(id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  stripe_subscription_id text,
  stripe_invoice_id text,
  amount_cents integer not null default 200,
  currency text not null default 'eur',
  period_start date not null default current_date,
  period_end date,
  status text not null default 'pending',
  available_at timestamptz not null default (now() + interval '14 days'),
  paid_at timestamptz,
  payout_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint ambassador_commissions_amount_positive_check check (amount_cents > 0),
  constraint ambassador_commissions_currency_check check (currency = lower(currency) and char_length(currency) = 3),
  constraint ambassador_commissions_status_check check (status in ('pending', 'available', 'reversed', 'paid'))
);

create unique index if not exists ambassador_commissions_invoice_unique_idx
  on public.ambassador_commissions (stripe_invoice_id)
  where stripe_invoice_id is not null;

create index if not exists ambassador_commissions_ambassador_id_idx
  on public.ambassador_commissions (ambassador_id);

create index if not exists ambassador_commissions_status_idx
  on public.ambassador_commissions (status);

create table if not exists public.ambassador_payouts (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.ambassadors(id) on delete cascade,
  amount_cents integer not null,
  currency text not null default 'eur',
  status text not null default 'requested',
  method text not null default 'manual_bank',
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz,
  marked_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint ambassador_payouts_amount_positive_check check (amount_cents > 0),
  constraint ambassador_payouts_currency_check check (currency = lower(currency) and char_length(currency) = 3),
  constraint ambassador_payouts_status_check check (status in ('requested', 'approved', 'paid', 'failed', 'cancelled')),
  constraint ambassador_payouts_method_check check (method in ('manual_bank', 'paypal', 'other'))
);

create index if not exists ambassador_payouts_ambassador_id_idx
  on public.ambassador_payouts (ambassador_id);

create index if not exists ambassador_payouts_status_idx
  on public.ambassador_payouts (status);

alter table public.partner_applications
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists partner_applications_user_id_idx
  on public.partner_applications (user_id);

alter table public.ambassador_commissions
  drop constraint if exists ambassador_commissions_payout_id_fkey;

alter table public.ambassador_commissions
  add constraint ambassador_commissions_payout_id_fkey
  foreign key (payout_id) references public.ambassador_payouts(id) on delete set null;

create or replace function public.update_ambassadors_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.email = lower(trim(new.email));
  new.referral_code = lower(trim(new.referral_code));
  new.first_name = trim(new.first_name);
  new.last_name = trim(new.last_name);
  new.university = trim(new.university);
  new.study_field = nullif(trim(coalesce(new.study_field, '')), '');
  new.payout_notes = nullif(trim(coalesce(new.payout_notes, '')), '');
  return new;
end;
$$ language plpgsql set search_path = public;

create or replace function public.update_referrals_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.referral_code = lower(trim(new.referral_code));
  new.referred_email = nullif(lower(trim(coalesce(new.referred_email, ''))), '');
  return new;
end;
$$ language plpgsql set search_path = public;

create or replace function public.update_ambassador_commissions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.currency = lower(trim(new.currency));
  return new;
end;
$$ language plpgsql set search_path = public;

create or replace function public.update_ambassador_payouts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.currency = lower(trim(new.currency));
  new.notes = nullif(trim(coalesce(new.notes, '')), '');
  return new;
end;
$$ language plpgsql set search_path = public;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'ambassadors_set_updated_at') then
    create trigger ambassadors_set_updated_at
    before insert or update on public.ambassadors
    for each row execute function public.update_ambassadors_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'referrals_set_updated_at') then
    create trigger referrals_set_updated_at
    before insert or update on public.referrals
    for each row execute function public.update_referrals_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'ambassador_commissions_set_updated_at') then
    create trigger ambassador_commissions_set_updated_at
    before insert or update on public.ambassador_commissions
    for each row execute function public.update_ambassador_commissions_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'ambassador_payouts_set_updated_at') then
    create trigger ambassador_payouts_set_updated_at
    before insert or update on public.ambassador_payouts
    for each row execute function public.update_ambassador_payouts_updated_at();
  end if;
end $$;

alter table public.ambassadors enable row level security;
alter table public.referral_visits enable row level security;
alter table public.referrals enable row level security;
alter table public.ambassador_commissions enable row level security;
alter table public.ambassador_payouts enable row level security;

revoke all on public.ambassadors from anon;
revoke all on public.referral_visits from anon;
revoke all on public.referrals from anon;
revoke all on public.ambassador_commissions from anon;
revoke all on public.ambassador_payouts from anon;

revoke all on public.ambassadors from authenticated;
revoke all on public.referral_visits from authenticated;
revoke all on public.referrals from authenticated;
revoke all on public.ambassador_commissions from authenticated;
revoke all on public.ambassador_payouts from authenticated;

grant select on public.ambassadors to authenticated;
grant select on public.referrals to authenticated;
grant select on public.ambassador_commissions to authenticated;
grant select on public.ambassador_payouts to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ambassadors' and policyname = 'ambassadors select own') then
    create policy "ambassadors select own" on public.ambassadors
    for select to authenticated
    using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'referrals' and policyname = 'referrals select own ambassador') then
    create policy "referrals select own ambassador" on public.referrals
    for select to authenticated
    using (
      exists (
        select 1
        from public.ambassadors
        where ambassadors.id = referrals.ambassador_id
          and ambassadors.user_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ambassador_commissions' and policyname = 'ambassador_commissions select own ambassador') then
    create policy "ambassador_commissions select own ambassador" on public.ambassador_commissions
    for select to authenticated
    using (
      exists (
        select 1
        from public.ambassadors
        where ambassadors.id = ambassador_commissions.ambassador_id
          and ambassadors.user_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ambassador_payouts' and policyname = 'ambassador_payouts select own ambassador') then
    create policy "ambassador_payouts select own ambassador" on public.ambassador_payouts
    for select to authenticated
    using (
      exists (
        select 1
        from public.ambassadors
        where ambassadors.id = ambassador_payouts.ambassador_id
          and ambassadors.user_id = auth.uid()
      )
    );
  end if;
end $$;
