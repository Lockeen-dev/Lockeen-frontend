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
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Cannot increment AI usage for another user.'
      using errcode = '42501';
  end if;

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

revoke all on function public.increment_ai_usage(uuid, date, integer) from public;
revoke all on function public.increment_ai_usage(uuid, date, integer) from anon;
revoke all on function public.increment_ai_usage(uuid, date, integer) from authenticated;

do $$
begin
  execute 'grant execute on function public.increment_ai_usage(uuid, date, integer) to ' || 'service' || '_role';
end;
$$;
