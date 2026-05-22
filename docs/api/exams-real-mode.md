# Exams Real Mode

## Scope

Day 4 connects exams and chapters service to Supabase behind `VITE_API_MODE=real`.

Mock mode remains available.

## Environment

Local real mode needs:

```bash
VITE_API_MODE=real
VITE_AUTH_MODE=mock
VITE_SUPABASE_URL=https://nozrnnjqndtwcnyhciod.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_ANON_KEY=
Tables
profiles
subjects
exams
chapters
Ownership
Every real row has user_id.

RLS policies allow authenticated users to read/write only own rows.

Day 4 temporary user id
Until real Supabase Auth is connected, real exams service reads:

localStorage.getItem('lockeen_real_user_id')
This is temporary bridge only.

Day 5 should replace it with authenticated Supabase user session.

Manual test
Set VITE_API_MODE=real.
Put anon/public key in .env.local.
Apply migration to Supabase.
Create or use a Supabase auth user.
Put user id in browser localStorage:
localStorage.setItem('lockeen_real_user_id', 'USER_UUID')
Create exam.
Refresh browser.
Exam still visible.
Edit exam.
Delete exam.
Test another user id cannot see same rows.
Known gaps
Auth real not wired yet.
Temporary lockeen_real_user_id bridge.
Subjects table exists but UI does not manage subjects yet.
Chapters backend exists but UI coverage may be partial.
