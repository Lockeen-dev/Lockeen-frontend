# Week 2 Release Notes

## Summary

Week 2 moved Lockeen from Week 1 exam-only backend foundation into a broader study backend surface: notes, materials, storage policy, practice, analytics read models, and a server-side AI gate.

Scope stayed controlled: backend services first, UI wiring second, one PR per slice, no direct secrets in frontend, mock mode preserved.

## Completed

### Notes and materials

- Notes schema and service added.
- Materials metadata schema and service added.
- NotesView connected to notes/materials services.
- Loading, empty, error, create, edit, delete states added.
- Mock fallback kept for local demo.

### Storage

- Study materials storage bucket and policy added.
- File metadata linked to materials.
- Signed download URL path added.
- Upload UI supports PDF, PNG, JPG, and TXT.
- 10 MB file limit enforced in UI.

### Practice

- Flashcards schema and service added.
- Quiz schema, questions, and attempts service added.
- Flashcards and Quiz UI connected to services.
- Attempts and scores persist in real mode.

### Analytics and dashboard read models

- Dashboard read model added.
- Study analytics summary added.
- Recent activity read model added.
- DashboardHome and AnalyticsView connected to read models.
- Empty/partial data returns zero or empty state, not fake progress.

### AI gate

- Server-side endpoint added at `/api/ai-study-assist`.
- Client service added in `src/services/ai.js`.
- TutorView and AIStudyPlanner connected to AI service.
- Provider key stays server-side.
- Prompt length limit, quota, and fallback behavior added.

### Workflow

- Founder A/B split held across backend and product integration PRs.
- Supabase dry-run used before/after schema work.
- PRs kept small and mergeable.
- Main stayed buildable after each merged slice.

## Real vs Mock

Real:

- Supabase exams from Week 1.
- Notes and materials metadata.
- Study material storage policy.
- Flashcards, quiz, questions, and attempts.
- Dashboard/analytics read models derived from backend tables.
- AI endpoint available when server env is configured.

Mock:

- Auth provider remains mock by default.
- `lockeen_real_user_id` bridge still used for real-mode user scoping.
- AI returns local/server fallback when provider config is absent.
- File parsing and advanced document processing are not implemented.

## Checks

- `npm run setup:check` passed.
- `npm run build` passed.
- `npm run ci` passed.
- `supabase db push --dry-run` returned remote database up to date.
- GitHub Actions passed on Week 2 PRs.
- Vercel preview deployed on final Day 6 PRs.

## Known Limits

- Real Supabase Auth is not connected yet.
- Temporary `lockeen_real_user_id` bridge must be removed.
- Bundle chunk warning remains.
- No automated unit or browser test suite yet.
- AI quota is in-memory in the serverless function, so it is a beta guardrail, not billing-grade enforcement.
- No PDF parsing, OCR, embeddings, or advanced upload processing.

## Demo Path

login -> create exam -> create note -> add material -> create flashcard -> take quiz -> view dashboard/analytics -> ask tutor/planner -> refresh -> confirm no crash.

