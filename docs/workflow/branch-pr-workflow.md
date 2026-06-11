# Branch And PR Workflow

## Branches

Founder A:

- `codex/week2-backend-study-core`
- owns `supabase/`, `src/services/`, `src/lib/`, `docs/api/`, `docs/security/`

Founder B:

- `feature/week2-study-integration`
- owns `src/components/`, `docs/qa/`, UI states and product wiring

## Rules

- no direct work on `main`
- one PR per behavior slice
- one migration per PR when possible
- no redesign inside backend/data PR
- no secret in tracked files
- avoid parallel edits to `lockeen-app.jsx`, `src/App.jsx`, `package.json`

## PR size

Good PR:

- one domain or one view
- build passes
- manual test written
- screenshots only when UI changed

Too big:

- migration + auth refactor + redesign + analytics in one PR
- hard to verify in 10 minutes

## Commit rhythm

```bash
git status --short
npm run setup:check
npm run build
git add <changed-files>
git commit -m "week2: add notes service contract"
git push -u origin <branch>
```

## Merge gate

- CI green
- no tracked `.env.local`
- no service-role key in code
- manual test path documented
- mock mode still works unless PR explicitly removes it
