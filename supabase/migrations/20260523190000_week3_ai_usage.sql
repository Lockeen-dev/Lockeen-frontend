create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  request_count integer not null default 0 check (request_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, usage_date)
);

create index if not exists ai_usage_user_id_idx on public.ai_usage(user_id);
create index if not exists ai_usage_usage_date_idx on public.ai_usage(usage_date);

alter table public.ai_usage enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_usage'
      and policyname = 'ai_usage select own'
  ) then
    create policy "ai_usage select own" on public.ai_usage
    for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

create or replace function public.increment_ai_usage(
  p_user_id uuid,
  p_usage_date date,
  p_quota integer
)
returns table(request_count integer, allowed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
begin
  insert into public.ai_usage (user_id, usage_date, request_count)
  values (p_user_id, p_usage_date, 1)
  on conflict (user_id, usage_date) do update
    set request_count = public.ai_usage.request_count + 1,
        updated_at = now()
    where public.ai_usage.request_count < p_quota
  returning public.ai_usage.request_count into next_count;

  if next_count is null then
    select public.ai_usage.request_count
    into next_count
    from public.ai_usage
    where user_id = p_user_id
      and usage_date = p_usage_date;

    return query select coalesce(next_count, 0), false;
    return;
  end if;

  return query select next_count, next_count <= p_quota;
end;
$$;
