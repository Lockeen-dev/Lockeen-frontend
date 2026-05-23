# Week 4 Handoff

## Start State

Week 3 main includes:

- real Supabase Auth
- session-backed real services
- RLS static check in CI
- frontend secret scanner in CI
- beta preview docs/runbooks
- persistent AI quota migration/API support

## First Actions

1. Apply pending Supabase migration if not already applied:

```bash
supabase db push
```

2. Add server-only Vercel env:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

3. Confirm public Vite env:

- `VITE_API_MODE=real`
- `VITE_AUTH_MODE=supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

4. Run Founder B manual QA from:

- `docs/qa/week3-founder-b-runbook.md`

## Week 4 Recommended Focus

### P0

- Finish B manual real-mode smoke.
- Fix any P0/P1 auth/RLS/user-isolation issues.
- Confirm persistent AI quota source is `persistent` in real deployment.

### P1

- Add service/unit test runner for service contracts.
- Add Playwright smoke for login -> exam -> note -> quiz -> analytics.
- Add Vercel env audit evidence to release notes.

### P2

- Improve AI quota UI copy with remaining/reset info.
- Decide upload processing path and file parsing policy.
- Address GitHub Actions Node.js 20 deprecation.

## Non-Goals

- Public launch.
- Payments.
- Full AI tutor product.
- Large redesign.
- Analytics warehouse.

## Founder B Path

Founder B should work in separate QA branch:

```bash
git switch main
git pull --ff-only
git switch -c qa/week3-founder-b-real-smoke
```

Only update QA docs unless a clear bug is found.

If a bug is found, use separate bugfix branch and small PR.
