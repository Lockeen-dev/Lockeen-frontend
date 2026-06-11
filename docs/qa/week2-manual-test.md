# Week 2 Manual Test

Run in mock mode first:

```bash
npm run setup:check
npm run build
npm run dev
```

## Environment

- Branch:
- Commit:
- Mode: `mock` or `real`
- Browser:
- Viewport: desktop/mobile

## Smoke

- [ ] app loads
- [ ] no console crash on first render
- [ ] mock login works
- [ ] logout works
- [ ] refresh does not blank app

## Notes

- [ ] notes view opens
- [ ] loading state visible when service waits
- [ ] empty state visible when no notes
- [ ] create note works
- [ ] edit note works
- [ ] delete note works
- [ ] validation catches empty required fields
- [ ] backend/service error shows readable message
- [ ] refresh preserves real data when in real mode
- [ ] mock mode create/edit/delete works without Supabase env
- [ ] note list remains scoped to selected exam

## Materials

- [ ] create material without file works
- [ ] create material metadata with optional source URL works
- [ ] create material with valid PDF works
- [ ] create material with valid PNG/JPG works
- [ ] create material with valid TXT works
- [ ] invalid file type blocked or shows error
- [ ] file larger than 10 MB blocked or shows error
- [ ] open/download material works through source URL or signed URL
- [ ] delete material works
- [ ] storage unavailable fallback does not break notes
- [ ] storage unavailable still allows metadata/source URL material
- [ ] material list remains scoped to selected exam
- [ ] mock mode material upload smoke works
- [ ] refresh behavior documented: mock mode resets in-memory service data, real mode persists after db push

## Flashcards

- [ ] flashcards view opens
- [ ] empty state visible
- [ ] loading state visible while flashcards service waits
- [ ] error state visible when flashcards service fails
- [ ] list cards from service by exam/chapter
- [ ] create flashcard works from UI
- [ ] edit flashcard works from UI
- [ ] delete flashcard works from UI
- [ ] mock mode smoke works without Supabase env
- [ ] real mode list flashcards by exam/chapter works after Day 4 db push
- [ ] real mode create/edit/delete flashcard persists after refresh
- [ ] cross-user flashcard access blocked by RLS

## Quiz

- [ ] quiz view opens
- [ ] no quiz empty state visible
- [ ] loading state visible while quiz service waits
- [ ] error state visible when quiz service fails
- [ ] list quiz from service
- [ ] get quiz from service before starting
- [ ] answer questions
- [ ] submit attempt via service
- [ ] score visible
- [ ] submit error handled
- [ ] score persists after refresh in real mode
- [ ] real mode list/get quiz works after Day 4 db push
- [ ] real mode quiz attempt writes score/answers
- [ ] mock mode smoke works without Supabase env
- [ ] no console crash
- [ ] mobile quick check
- [ ] cross-user quiz/attempt access blocked by RLS

## Analytics

- [ ] dashboard loads read model
- [ ] dashboard loading state visible when service waits
- [ ] dashboard error state visible when service fails
- [ ] analytics view opens
- [ ] analytics loads read model
- [ ] analytics loading state visible when service waits
- [ ] analytics error state visible when service fails
- [ ] zero-data state is not broken
- [ ] notes/materials/flashcards/quiz counts visible
- [ ] notes count updates when note exists
- [ ] materials count updates when material exists
- [ ] quiz attempts count updates after submit
- [ ] quiz score shown only if attempts exist
- [ ] latest activity shown when data exists
- [ ] mock mode smoke works without Supabase env
- [ ] real mode smoke works if Supabase env and authenticated Supabase session are ready
- [ ] mobile quick check
- [ ] no fake progress shown for missing backend data

## AI Tutor / Planner

- [ ] tutor view opens
- [ ] TutorView calls `askTutor({ prompt, context })`
- [ ] planner view opens
- [ ] AIStudyPlanner calls `generateStudyPlan({ prompt, context })`
- [ ] loading state visible
- [ ] provider unavailable fallback works
- [ ] quota/rate-limit message readable
- [ ] empty prompt is blocked or ignored
- [ ] no direct OpenAI request from frontend
- [ ] no secret appears in browser console or source
- [ ] mock mode AI fallback smoke works
- [ ] real mode AI smoke works if provider env is ready
- [ ] logout blocks real AI request

## Regression

- [ ] dashboard still loads
- [ ] calendar still loads
- [ ] exams create/edit/delete still work
- [ ] mobile layout usable
- [ ] no secret appears in browser console or source

## Notes

Record bugs here:

- Week 2 Day 2 B wires `NotesView` to `notes` and `materials` services in mock mode first.
- Real mode notes/materials should be retested after Supabase db push and authenticated Supabase session setup.
- Week 2 Day 3 B adds optional material file upload UI. No PDF parsing or advanced upload flow.
- Week 2 Day 4 B wires Flashcards and Quiz UI to practice services. No AI generation or adaptive quiz.
- Week 2 Day 5 B wires DashboardHome and AnalyticsView to analytics/dashboard read models.
- Week 2 Day 6 B wires TutorView and AIStudyPlanner to server-side AI gate. No direct OpenAI calls.
