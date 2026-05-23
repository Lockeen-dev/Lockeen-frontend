# Week 3 Release Notes

## Summary

Week 3 converted Lockeen real mode from temporary user-id bridge to Supabase Auth session ownership and added beta-readiness guardrails.

This is still private beta preview work, not public launch.

## Shipped

- Supabase Auth real mode.
- Session restore on reload.
- Supabase logout.
- Data services use authenticated Supabase session user id.
- `lockeen_real_user_id` removed from frontend source.
- RLS static baseline check added to CI.
- Frontend secret/env check added to CI.
- Real-mode smoke and two-user QA runbooks added for Founder B.
- Persistent AI quota schema and server route support added.

## Current Main

Latest Week 3 main after Day 6:

- `e4971ae week3: add persistent AI quota (#41)`

## Checks Used

```bash
npm run ci
supabase db push --dry-run
```

CI now includes:

- env contract validation
- frontend secret scan
- RLS baseline scan
- Vite build

## Production Status

Vercel production deploy succeeded after each merged PR through Day 6.

## Not Done Yet

- Founder B manual real-mode smoke is still pending.
- Founder B two-user RLS QA is still pending.
- Beta preview must not be marked ready until B completes QA.
- Persistent AI quota migration exists but must be applied to Supabase before quota source becomes persistent.
- Server-only Vercel env for persistent quota must be added.

## Required Server Env For Persistent AI Quota

Add in Vercel server/runtime env:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Do not add these with `VITE_`.

Frontend env remains:

- `VITE_API_MODE=real`
- `VITE_AUTH_MODE=supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

OpenAI env remains server-only:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` optional
- `AI_DAILY_QUOTA` optional

## Risk Notes

- If `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are missing, AI quota falls back to memory so current AI does not break.
- Persistent quota starts only after the migration is applied and server env exists.
- B should use anon/publishable key only in local `.env.local`.
