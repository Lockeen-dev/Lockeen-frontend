# Week 3 Founder B Runbook

## Purpose

Founder B validates the product path in real mode while Founder A keeps backend/security branches small.

This runbook is safe to follow after `main` reaches Week 3 Day 5.

## Start Clean

```bash
cd ~/Lockeen-frontend
git switch main
git pull --ff-only
git status --short --branch
git log --oneline -5
npm run ci
rg -n "lockeen_real_user_id" src -S
```

Expected:

- `main...origin/main`
- latest Week 3 commits are present
- CI passes
- no `lockeen_real_user_id` in `src`

## Local Env

Create `.env.local` locally only:

```bash
VITE_API_MODE=real
VITE_AUTH_MODE=supabase
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Rules:

- do not commit `.env.local`
- use anon/publishable key only
- do not use service-role key
- do not add OpenAI keys with `VITE_`

## Run App

```bash
npm run dev
```

Use the Vite port shown in the terminal. If `5173` is occupied, `5174` is fine.

## Manual Flow

Use two confirmed Supabase users.

User A:

- sign in
- create exam `B Smoke A`
- create note if UI path is available
- create material/link/upload if UI path is available
- create flashcard if UI path is available
- create quiz attempt if UI path is available
- refresh browser
- confirm data persists
- confirm dashboard/analytics show user A data
- confirm AI Tutor/Planner does not show `AUTH_REQUIRED`
- sign out

User B:

- sign in
- confirm `B Smoke A` is not visible
- create exam `B Smoke B`
- refresh browser
- confirm only user B data is visible
- sign out

User A return:

- sign in
- confirm `B Smoke A` is visible
- confirm `B Smoke B` is not visible
- sign out

## Where To Record Results

If no code bug:

1. Create branch:

```bash
git switch -c qa/week3-founder-b-real-smoke
```

2. Update only:

- `docs/qa/week3-real-auth.md`
- `docs/qa/week3-rls-two-user.md`
- `docs/qa/week3-real-mode-smoke.md`

3. Run:

```bash
npm run ci
```

4. Commit:

```bash
git add docs/qa/week3-real-auth.md docs/qa/week3-rls-two-user.md docs/qa/week3-real-mode-smoke.md
git commit -m "docs: add week3 founder b real smoke QA"
```

5. Open PR.

If code bug:

- stop docs PR
- write reproduction
- include screenshot if useful
- open separate bugfix branch
- keep fix small
- do not touch landing/design

## Blocking Criteria

Block beta preview if:

- user B can see user A data
- logged-in user sees `AUTH_REQUIRED`
- service-role key appears in frontend env
- OpenAI key appears in frontend env
- dashboard/analytics mix users
- Vercel preview fails

Non-blocking for Day 5:

- Supabase CLI not linked on B machine
- Vite port differs from `5173`
- optional material/upload UI path not available
- AI provider fallback if server OpenAI env is missing locally
