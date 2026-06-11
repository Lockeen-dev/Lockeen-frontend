# Week 1 Demo Script

## Goal

Show one vertical learning flow working across the product.

Demo path: login -> create exam -> dashboard -> calendar -> refresh -> delete.

## Preconditions

Local or preview app has:

- VITE_API_MODE=mock or real
- VITE_AUTH_MODE=mock

For real mode:

- Supabase env vars configured
- Supabase migration applied
- temporary lockeen_real_user_id available until real auth is connected

## Demo Steps

### 1. Open app

Expected:

- app loads without crash
- auth screen appears if anonymous
- no console blocking error

### 2. Login or signup

Expected:

- user reaches dashboard
- refresh keeps mock session
- logout returns to auth screen

### 3. Create exam

Create exam with:

- name: Week 1 Demo Exam
- subject: Biology
- date: tomorrow or next week

Expected:

- exam appears in notes/exams view
- validation blocks empty name
- saving/error states are visible when needed

### 4. Dashboard propagation

Expected:

- new exam appears as upcoming exam
- dashboard uses read model service
- empty state appears if no exams exist

### 5. Calendar propagation

Expected:

- same exam appears as calendar event using exam date
- no separate calendar_events table needed in Week 1

### 6. Refresh

Expected:

- session behavior remains coherent
- exam data remains visible in real mode
- mock mode resets only where expected by mock memory rules

### 7. Delete exam

Expected:

- exam disappears from notes/exams
- exam disappears from dashboard
- exam disappears from calendar

## What Is Real

- Supabase project linked.
- Schema exists for profiles, subjects, exams, chapters.
- RLS policies exist for ownership.
- Exams service supports real mode behind VITE_API_MODE=real.
- Dashboard and calendar read models derive from exams.

## What Is Mock

- Auth is still mock shell.
- Real mode temporarily uses lockeen_real_user_id.
- Some non-exam product areas still use mockData.
- AI tutor, quiz, file upload, analytics are not real yet.

## Week 1 Demo Pass Criteria

- Build is green.
- CI is green.
- Vercel preview is green.
- Demo path can be explained without hidden code decisions.