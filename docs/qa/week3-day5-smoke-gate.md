# Week 3 Day 5 Smoke Gate

## Gate Status

Status: pending Founder B manual QA.

Day 5 adds the runbook and gate. It does not claim real-mode smoke has passed.

## Automated Checks

Required on Founder A branch:

```bash
npm run ci
supabase db push --dry-run
```

Expected:

- frontend secret scan passes
- RLS static baseline passes
- build passes
- remote database is up to date

## Manual Gate

Founder B owns manual real-mode smoke using:

- `docs/qa/week3-founder-b-runbook.md`
- `docs/qa/week3-real-auth.md`
- `docs/qa/week3-rls-two-user.md`
- `docs/qa/week3-real-mode-smoke.md`

## Beta Decision

Beta preview remains gated until Founder B reports:

- real auth restore/logout pass
- user A/user B isolation pass
- dashboard/analytics current-user-only pass
- no logged-in `AUTH_REQUIRED`
- no frontend secret leak

## Conflicts

Founder A should not edit Founder B result sections after this gate. Founder B should update QA result docs in a separate `qa/` branch.
