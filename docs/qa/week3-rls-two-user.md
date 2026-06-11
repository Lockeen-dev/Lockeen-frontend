# Week 3 RLS Two-User QA

## Scope

Goal: prove real-mode data stays scoped to the authenticated Supabase user after removing the temporary user-id bridge.

This QA covers:

- exams
- chapters
- notes
- study materials metadata
- storage object ownership
- flashcards
- quizzes
- quiz questions
- quiz attempts
- dashboard and analytics read models

## Static Baseline

Run:

```bash
npm run security:rls
npm run ci
supabase db push --dry-run
```

Expected:

- RLS enabled for all user-owned public tables.
- Each table has own-user policies.
- Child tables validate parent ownership through `auth.uid()`.
- `study-materials` storage bucket policies scope object paths to `auth.uid()`.
- Remote database is up to date.

## Manual Setup

Use:

```bash
VITE_API_MODE=real
VITE_AUTH_MODE=supabase
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Create or use two confirmed Supabase Auth users:

- user A
- user B

Do not use a service-role key in frontend env.

## User A Flow

- [ ] Sign in as user A.
- [ ] Create exam `RLS Week3 A`.
- [ ] Create one chapter under `RLS Week3 A` if UI path is available.
- [ ] Create one note under `RLS Week3 A`.
- [ ] Create one study material metadata row or upload under `RLS Week3 A` if UI path is available.
- [ ] Create one flashcard under `RLS Week3 A` if UI path is available.
- [ ] Create one quiz and one quiz attempt if UI path is available.
- [ ] Refresh browser.
- [ ] Confirm user A data persists.
- [ ] Confirm dashboard and analytics reflect user A data.
- [ ] Sign out.

## User B Isolation Flow

- [ ] Sign in as user B.
- [ ] Confirm `RLS Week3 A` is not visible.
- [ ] Confirm user A notes/materials/flashcards/quizzes/attempts are not visible.
- [ ] Create exam `RLS Week3 B`.
- [ ] Refresh browser.
- [ ] Confirm only user B data is visible.
- [ ] Sign out.

## User A Return Flow

- [ ] Sign in as user A.
- [ ] Confirm `RLS Week3 A` is visible.
- [ ] Confirm `RLS Week3 B` is not visible.
- [ ] Confirm dashboard and analytics do not include user B data.
- [ ] Sign out.

## Negative Checks

Use browser DevTools or Supabase responses:

- [ ] No UI message mentions `lockeen_real_user_id`.
- [ ] Logged-in real-mode services do not return `AUTH_REQUIRED`.
- [ ] Anonymous real-mode access returns auth-required behavior.
- [ ] User B cannot create child records using user A parent ids.
- [ ] User B cannot fetch signed storage URLs for user A storage paths.

## Result Template

```md
## Day 3 Result

Date:
Tester:

- Static RLS baseline: pass/fail
- Supabase dry-run: pass/fail/blocked
- User A flow: pass/fail
- User B isolation: pass/fail
- User A return: pass/fail
- Storage isolation: pass/fail/not tested
- Dashboard/analytics isolation: pass/fail
- AUTH_REQUIRED while logged in: yes/no
- lockeen_real_user_id visible in UI/source: yes/no

### Issues

- None
```
