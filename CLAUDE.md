# Lockeen Frontend - Claude Operating Guide

## Role

Claude is a second developer/reviewer for Lockeen, not the primary deploy agent.

Default job:
- review architecture and PR diffs
- implement isolated feature branches
- find bugs before merge
- keep changes small and reversible

Codex remains primary builder/deployer unless Federico says otherwise.

## Correct Workspace

Use only:

```bash
/Users/federicodeluca/Documents/lockeen front
```

Never use:

```bash
/Users/federicodeluca/Documents/lock
```

That folder is not the app.

## Stack

- React 18
- Vite 5
- JavaScript modules
- Supabase client/auth/storage/database services
- React Router
- Lucide icons
- Framer Motion where already present
- Tailwind is installed, but much of the app still uses component-level styles and shared style objects
- Vercel production + preview deployments

Main scripts:

```bash
npm run dev
npm run build
npm run preview
npm run ci
```

## Collaboration Workflow

Never work directly on `main` for code changes.

Start every task:

```bash
cd "/Users/federicodeluca/Documents/lockeen front"
git checkout main
git pull origin main
git status --short --branch
```

Create separate branch or worktree:

```bash
git checkout -b codex/short-task-name
```

or:

```bash
git worktree add ../lockeen-claude -b codex/short-task-name main
```

Rules:
- one agent per branch
- one task per branch
- small commits
- run `npm run build` before push
- use Vercel preview before merge
- merge to `main` only after human approval

If another agent has uncommitted changes, do not overwrite them. Read `git status` and `git diff` first.

## Sensitive Files

Do not edit these unless Federico explicitly asks for that exact area:

```txt
.env
.env.local
.env.production
.env.*
vercel.json
package.json
package-lock.json
vite.config.js
src/main.jsx
src/App.jsx
src/LockeenRuntime.jsx
src/marketingBoot.js
src/context/AuthContext.jsx
src/lib/supabaseClient.js
src/lib/authClient.js
src/lib/apiClient.js
src/services/auth.js
src/services/storage.js
supabase/**
scripts/check-frontend-secrets.mjs
scripts/check-rls-baseline.mjs
scripts/validate-env.mjs
.github/workflows/**
```

Special rule for Supabase:
- schema changes only through migrations
- every user table needs ownership/RLS
- never commit `supabase/.temp/`
- never commit service-role keys or database passwords

## Safer UI Work Areas

For dashboard/UI work, prefer these files:

```txt
src/components/DashboardHome.jsx
src/components/Dashboard.jsx
src/components/Sidebar.jsx
src/components/StudyTimer.jsx
src/components/LanguageSelect.jsx
src/styles/dashboardStyles.js
src/index.css
```

For feature-specific views:

```txt
src/components/CalendarView.jsx
src/components/Quiz.jsx
src/components/Flashcards.jsx
src/components/NotesView.jsx
src/components/TutorView.jsx
src/components/AnalyticsView.jsx
src/components/ExamModals.jsx
src/components/ExamControls.jsx
```

## Current Dashboard Contract

Dashboard must use real user data where available.

Important behavior:
- today's schedule comes from calendar/user events
- completion toggles on and off
- hero progress is truthful: no fake percentages
- recent activity should show quiz/flashcard learning activity, not raw file uploads
- recommended today should suggest quiz/flashcard work from real exams or planned study
- CTA for recommended quiz should open actual quiz flow, not dead card

Do not reintroduce hardcoded biology/chemistry/example subjects unless used as empty-state placeholders only.

## Design Direction

Lockeen UI direction:
- clean SaaS dashboard
- white/light background
- indigo/purple brand accents
- strong typography
- rounded cards
- minimal clutter
- real controls over decorative copy
- mobile must not overlap or horizontally scroll

Primary colors already used:

```txt
#3730E8
#4F46E5
#5B53F0
#6D5DF6
#8B5CF6
#0F1035
#6B7280
#E5E7EB
#F8F9FF
```

Avoid:
- fake stats
- fake progress
- unrelated demo subjects
- huge decorative sections that reduce usability
- touching auth/backend config while doing visual work

## Review Checklist

Before sending work back:

```bash
npm run build
git status --short
git diff --stat
```

Check:
- no `.env*` committed
- no `supabase/.temp/` committed
- no unrelated formatting churn
- no direct `main` work unless docs-only and approved
- UI still loads locally
- important buttons navigate or perform real action

## Commit Style

Use Conventional Commits:

```txt
feat: add dashboard recommendation cards
fix: prevent auth restore hang
docs: update Claude workflow guide
refactor: split dashboard helpers
```

No AI attribution trailers.

## When Unsure

Stop and ask before changing:
- auth/session handling
- Supabase migrations or RLS
- payment/billing logic
- Vercel/deployment config
- package dependency changes
- cross-app routing

For normal UI text/layout bugs, proceed with small focused patch.
