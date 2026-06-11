# Week 3 Handoff

## Week 2 Backend Surface

Week 2 now gives product a backend-backed study loop:

- exams and chapters
- notes
- materials metadata
- storage policy and signed URL path
- flashcards
- quiz attempts
- dashboard summary
- analytics summary
- recent activity
- server-side AI tutor/planner gate

## Architecture At Handoff

Frontend components call service modules.

Service modules decide mock vs real mode.

Supabase owns persistent study data.

Vercel API route owns AI provider access.

No component should call Supabase tables or OpenAI directly.

## Week 3 P0

### Real Auth

Goal:

- remove `lockeen_real_user_id`
- use Supabase session user id
- keep AuthContext and service contracts stable

Tasks:

- implement real Supabase auth in `src/services/auth.js`
- restore session on reload
- logout from Supabase
- pass current user id to real services from auth/session, not localStorage bridge
- retest RLS with two users

### Real Mode QA

Goal:

- prove Week 2 data survives refresh and stays user-scoped

Tasks:

- create two test users
- create exam, notes, materials, flashcards, quiz attempt as user A
- confirm user B cannot read user A data
- confirm dashboard/analytics match backend records
- document failures in `docs/qa/`

### Deploy Preview Hardening

Goal:

- make preview safe to share with a small beta group

Tasks:

- configure Vercel env for real mode preview
- configure Supabase anon key only
- keep service role key out of Vercel frontend env
- set `OPENAI_API_KEY` only as server env
- verify `/api/ai-study-assist` does not expose provider details

## Week 3 P1

### Persistent AI Quota

Goal:

- replace in-memory quota with persistent quota table or Supabase Edge Function policy

Tasks:

- define `ai_usage` table
- count by user and day
- add reset behavior
- expose readable quota errors to UI

### Test Runner

Goal:

- reduce manual-only risk

Tasks:

- add unit test runner for services
- add tests for mock/real adapter contract
- add Playwright smoke for login -> exam -> note -> quiz -> analytics

### Upload Pipeline

Goal:

- decide file processing path without opening cost/security hole

Tasks:

- keep storage upload simple
- define allowed file types
- define max file size
- decide whether parsing is server-side only
- no client-side provider secrets

## Week 3 Non-Goals

- Full AI tutor product
- PDF parsing at scale
- Payments
- Public launch
- Redesign
- Complex analytics warehouse

## Suggested Week 3 First Day

Founder A:

- real auth service and user id removal plan
- RLS two-user test checklist

Founder B:

- auth UI real-mode smoke
- regression pass on dashboard, notes, practice, AI fallback

