# Supabase Setup

Project ref currently linked locally: `nozrnnjqndtwcnyhciod`.

## Migration order

1. `20260522202853_day4_real_exams_backend.sql`

## Week 2 rule

Every new table must have:

- `user_id` or parent ownership path
- RLS enabled
- select/insert/update/delete policies scoped to `auth.uid()`
- indexes for `user_id` and main parent ids
- manual two-user test

## Do not commit

- Supabase service-role key
- database password
- local `.env.local`
- `supabase/.temp/`
