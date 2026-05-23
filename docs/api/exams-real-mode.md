# Exams Real Mode

## Scope

Day 4 connects exams and chapters service to Supabase behind `VITE_API_MODE=real`.

Mock mode remains available.

## Environment

Local real mode needs:

```bash
VITE_API_MODE=real
VITE_AUTH_MODE=supabase
VITE_SUPABASE_URL=https://nozrnnjqndtwcnyhciod.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_ANON_KEY=
```

## Tables

- profiles
- subjects
- exams
- chapters

## Ownership

Every real row has `user_id`.

RLS policies allow authenticated users to read/write only own rows.

Week 3 ownership

Real services read the current Supabase Auth session and use `auth.users.id` as `user_id`.

## Manual test

Set `VITE_API_MODE=real`.
Set `VITE_AUTH_MODE=supabase`.
Put anon/public key in `.env.local`.
Apply migration to Supabase.
Create or use a confirmed Supabase auth user.
Sign in through the app.
Create exam.
Refresh browser.
Exam still visible.
Edit exam.
Delete exam.
Test another user id cannot see same rows.

## Known gaps

- Subjects table exists but UI does not manage subjects yet.
- Chapters backend exists but UI coverage may be partial.
