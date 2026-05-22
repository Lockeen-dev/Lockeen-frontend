# Week 2 Backlog

## P0

### Connect real Supabase Auth

Goal:

- remove lockeen_real_user_id
- use Supabase session user id
- keep AuthContext contract stable

Tasks:

- implement Supabase auth mode in src/services/auth.js
- map Supabase user to app user
- restore session via Supabase
- logout via Supabase
- update real exams service to use current session user

### Finish exams real mode

Goal:

- create/edit/delete exams real path fully demoable

Tasks:

- test RLS with two users
- handle Supabase errors in UI
- confirm refresh persistence
- document env setup for Vercel

## P1

### Notes real data

Goal:

- migrate notes/chapters beyond basic exam metadata

Tasks:

- define notes schema
- add notes service
- wire NotesView states

### Calendar polish

Goal:

- calendar reads all exam events reliably

Tasks:

- month/week empty state
- date formatting
- timezone decisions
- event detail click-through

### Dashboard metrics

Goal:

- replace remaining mock metrics where tied to exams

Tasks:

- upcoming exams
- exams without date
- completion progress from chapters
- study streak remains mock until tracking exists

## P2

### Quiz / Flashcards / AI Tutor planning

Goal:

- stop vague AI scope

Tasks:

- define data contracts
- decide what stays mock
- define upload/file pipeline
- define AI tutor MVP boundaries

### Testing

Goal:

- add reliable checks beyond build

Tasks:

- add unit test runner
- add service tests for mock/real adapters
- add Playwright smoke test for login/demo path

## Non-goals

- Full redesign
- Full AI implementation
- Full file upload
- Complex analytics
- Calendar recurrence