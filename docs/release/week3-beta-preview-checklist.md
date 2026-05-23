# Week 3 Beta Preview Checklist

## Purpose

Week 3 preview is a private beta gate, not public launch.

Do not mark beta ready until Founder B completes real two-user QA.

## Required Environment

Frontend/Vite:

- `VITE_API_MODE=real`
- `VITE_AUTH_MODE=supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Server-only:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` optional
- `AI_DAILY_QUOTA` optional

Never expose server secrets with `VITE_`.

## Security Checks

Run before every beta preview PR:

```bash
npm run security:frontend-env
npm run security:rls
npm run ci
supabase db push --dry-run
```

Expected:

- no tracked `.env` files
- no service-role key in frontend files
- no OpenAI key in frontend files
- RLS baseline passes
- remote DB up to date

## Founder B Manual Path

Founder B should pull latest `main`, use real Supabase public env, and fill:

- `docs/qa/week3-real-auth.md`
- `docs/qa/week3-rls-two-user.md`
- `docs/qa/week3-real-mode-smoke.md`

Required user flows:

- user A login, create data, refresh, logout
- user B login, cannot see user A data
- user A return, cannot see user B data
- dashboard/analytics show only current user data
- AI Tutor/Planner does not show `AUTH_REQUIRED` while logged in

## Beta Preview Gate

Preview can be shared with a small beta group only when:

- GitHub CI green
- Vercel preview and production green
- B real-mode two-user QA has no P0/P1 blockers
- OpenAI key is server-only
- Supabase frontend env uses anon/publishable key only
- service-role key is absent from frontend env and tracked files
