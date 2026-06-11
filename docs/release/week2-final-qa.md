# Week 2 Final QA

## Repo State

- Base branch: `main`
- Final Week 2 PR included: `week2: connect AI UI server gate`
- Open PRs during final check: none
- Local branch for Day 7: `codex/week2-day7-release-handoff`

## Final Commands

```bash
git pull --ff-only
npm run ci
supabase db push --dry-run
gh pr list --state open --limit 10
```

## Results

- `npm run setup:check`: pass
- `npm run build`: pass
- `npm run ci`: pass
- `supabase db push --dry-run`: remote database is up to date
- open PR list: empty

## Manual QA Focus

Use `docs/qa/week2-manual-test.md` as the full checklist.

Minimum final pass:

- app loads in mock mode
- mock login/logout works
- exams dashboard still loads
- notes create/edit/delete works
- materials metadata and file path smoke works
- flashcards create/edit/delete works
- quiz attempt submit works
- analytics/dashboard counts do not crash on empty data
- tutor/planner show fallback or response
- no provider secret appears in browser
- mobile smoke pass

## Final Risk Notes

- Manual real-mode QA still needs Supabase env and a valid real user id bridge.
- Real Auth is Week 3 P0.
- AI endpoint is safe for beta gate but needs persistent quota if opened wider.
- Bundle chunk warning is known and not Day 7 scope.

