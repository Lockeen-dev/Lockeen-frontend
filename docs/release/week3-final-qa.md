# Week 3 Final QA

## Automated QA

Passed on Founder A branches:

- `npm run ci`
- `npm run security:frontend-env`
- `npm run security:rls`
- `VITE_API_MODE=real VITE_AUTH_MODE=supabase ... npm run build`
- `supabase db push --dry-run`
- GitHub PR checks
- Vercel preview checks
- Vercel production checks after merge

## Manual QA Status

Pending Founder B:

- mock sanity
- real auth user A
- real auth user B
- two-user data isolation
- dashboard/analytics isolation
- AI Tutor/Planner logged-in smoke
- UI check for no `lockeen_real_user_id`

Founder B should update:

- `docs/qa/week3-real-auth.md`
- `docs/qa/week3-rls-two-user.md`
- `docs/qa/week3-real-mode-smoke.md`

## Beta Gate

Beta preview can move forward only after:

- Founder B real-mode smoke passes
- no P0/P1 isolation bugs
- no service-role key in frontend env
- no OpenAI key in frontend env
- Vercel production green
- server-only Supabase env configured for persistent AI quota

## Known Non-Blocking Warnings

- Vite chunk size warning remains.
- GitHub Actions Node.js 20 deprecation warning remains.

## Known Blockers

- B manual QA not finished.
- Persistent AI quota not fully active until server env is added.
