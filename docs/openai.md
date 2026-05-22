# OpenAI / Codex Workflow

## Scope

This repo uses Codex as an engineering copilot for scoped branches and small PRs.

## Branch Rules

- Never commit directly to `main`.
- One branch per workstream.
- One PR per clear task.
- Keep file ownership explicit.

## PR Rules

Each PR should include:

- scope
- changed files
- manual test
- risk/conflicts
- build result

Merge only when:

- CI is green
- Vercel preview is green
- files changed match ownership
- no secrets are committed

## Local Checks

Before push:

```bash
npm run build
git status --short
git diff --stat
Secrets
Never commit:

.env
.env.local
.env.*.local
service_role keys
private API keys
database passwords
Allowed in repo:

.env.example
Current CI
CI runs:

npm ci
npm run build
npm audit --audit-level=high
tracked env file guard
There is no unit test runner yet.

Bug Bash
Bug bash should capture:

flow tested
result
console errors
screenshots if useful
fixed bugs
remaining risks
Day 6 Baseline
Day 6 goal is merge safety, not feature expansion.
