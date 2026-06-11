# ADR 0002 - Auth Provider

Status: Proposed

Decision:
Use Supabase Auth for week 1.

Session model:
- App restores current user on load.
- Auth service exposes loading, authenticated, anonymous, error states.
- Logout clears session and returns to auth/landing.

User ownership:
- profiles table keyed by auth.users.id.
- exams, chapters, subjects owned by user_id.
- RLS enforces user can only read/write own data.

Expected RLS:
- authenticated users can select/insert/update/delete own rows.
- anonymous users cannot access app data.
- service-role key never used in frontend.

Mock remaining on day 1:
- actual login may still be mock until day 3.
- quiz, flashcards, tutor, analytics remain mock for week 1 unless explicitly migrated.
