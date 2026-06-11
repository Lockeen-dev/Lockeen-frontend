# Week 2 Environment Setup

Goal: start every day from clean branch, known env, green build, no secret leak.

## Local modes

Mock mode:

- `VITE_API_MODE=mock`
- `VITE_AUTH_MODE=mock`
- used for UI work, demos without Supabase, fast bug bash

Real mode:

- `VITE_API_MODE=real`
- `VITE_AUTH_MODE=supabase`
- requires `VITE_SUPABASE_URL`
- requires `VITE_SUPABASE_PUBLISHABLE_KEY`
- used for backend/RLS/storage/auth validation

## First setup

```bash
cp .env.example .env.local
npm ci
npm run setup:check
npm run build
```

## Daily start

```bash
git checkout main
git pull --ff-only
git checkout -b codex/week2-backend-study-core
npm ci
npm run setup:check
npm run build
```

Founder B branch:

```bash
git checkout main
git pull --ff-only
git checkout -b feature/week2-study-integration
```

## Supabase local/remote checks

Use Supabase dashboard or CLI to apply migrations in order.

Required before real-mode demo:

- auth provider active
- migration `20260522202853_day4_real_exams_backend.sql` applied
- RLS enabled for `profiles`, `subjects`, `exams`, `chapters`
- two test users created
- user A cannot read user B exams

## Vercel env

Set same public env in Vercel project settings:

- `VITE_API_MODE=real`
- `VITE_AUTH_MODE=supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Do not set service-role keys in Vercel frontend env.

## Done when

- `.env.local` exists locally and is untracked
- `npm run setup:check` passes
- `npm run build` passes
- CI passes on PR
- demo path is known before coding starts
