create table if not exists public.user_plan_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  documents_uploaded_total integer not null default 0 check (documents_uploaded_total >= 0),
  quiz_generations_total integer not null default 0 check (quiz_generations_total >= 0),
  flashcard_generations_total integer not null default 0 check (flashcard_generations_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_plan_usage_user_id_idx on public.user_plan_usage(user_id);

alter table public.user_plan_usage enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_plan_usage'
      and policyname = 'user_plan_usage select own'
  ) then
    create policy "user_plan_usage select own" on public.user_plan_usage
    for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

insert into public.user_plan_usage (
  user_id,
  documents_uploaded_total,
  quiz_generations_total,
  flashcard_generations_total
)
select
  users.id,
  coalesce(materials.count, 0)::integer,
  coalesce(quizzes.count, 0)::integer,
  coalesce(flashcards.count, 0)::integer
from auth.users users
left join (
  select user_id, count(*) as count
  from public.study_materials
  group by user_id
) materials on materials.user_id = users.id
left join (
  select user_id, count(*) as count
  from public.quizzes
  where source_material_id is not null
  group by user_id
) quizzes on quizzes.user_id = users.id
left join (
  select user_id, count(distinct source_material_id) as count
  from public.flashcards
  where source_material_id is not null
  group by user_id
) flashcards on flashcards.user_id = users.id
on conflict (user_id) do update
set documents_uploaded_total = greatest(public.user_plan_usage.documents_uploaded_total, excluded.documents_uploaded_total),
    quiz_generations_total = greatest(public.user_plan_usage.quiz_generations_total, excluded.quiz_generations_total),
    flashcard_generations_total = greatest(public.user_plan_usage.flashcard_generations_total, excluded.flashcard_generations_total),
    updated_at = now();

create or replace function public.is_free_plan_user()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'plan_tier', 'free') <> 'pro';
$$;

create schema if not exists private;

create or replace function private.enforce_free_document_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  if new.user_id <> auth.uid() then
    raise exception 'Cannot create material for another user.'
      using errcode = '42501';
  end if;

  insert into public.user_plan_usage (user_id)
  values (new.user_id)
  on conflict (user_id) do nothing;

  if public.is_free_plan_user() then
    select documents_uploaded_total
    into current_count
    from public.user_plan_usage
    where user_id = new.user_id
    for update;

    if coalesce(current_count, 0) >= 1 then
      raise exception 'Free trial document already used. Upgrade to Pro to upload more materials.'
        using errcode = 'P0001';
    end if;
  end if;

  update public.user_plan_usage
  set documents_uploaded_total = documents_uploaded_total + 1,
      updated_at = now()
  where user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists enforce_free_document_trial on public.study_materials;
create trigger enforce_free_document_trial
before insert on public.study_materials
for each row execute function private.enforce_free_document_trial();

revoke all on function public.is_free_plan_user() from public;
revoke all on function public.is_free_plan_user() from anon;
revoke all on function public.is_free_plan_user() from authenticated;
grant execute on function public.is_free_plan_user() to authenticated;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
revoke all on function private.enforce_free_document_trial() from public;
revoke all on function private.enforce_free_document_trial() from anon;
revoke all on function private.enforce_free_document_trial() from authenticated;
