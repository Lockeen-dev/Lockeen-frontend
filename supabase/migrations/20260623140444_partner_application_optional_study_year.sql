alter table public.partner_applications
  alter column study_year drop not null;

alter table public.partner_applications
  drop constraint if exists partner_applications_study_year_length_check;

alter table public.partner_applications
  add constraint partner_applications_study_year_length_check
  check (
    study_year is null
    or char_length(study_year) between 1 and 80
  );

create or replace function public.update_partner_applications_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.email = lower(trim(new.email));
  new.first_name = trim(new.first_name);
  new.last_name = trim(new.last_name);
  new.university = trim(new.university);
  new.study_field = trim(new.study_field);
  new.study_year = nullif(trim(coalesce(new.study_year, '')), '');
  new.city_country = nullif(trim(coalesce(new.city_country, '')), '');
  new.community_reach = nullif(trim(coalesce(new.community_reach, '')), '');
  new.motivation = nullif(trim(coalesce(new.motivation, '')), '');
  return new;
end;
$$ language plpgsql set search_path = public;
