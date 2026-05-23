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
- [ ] create/list card works when enabled
- [ ] delete card works when enabled
- [ ] mock fallback works
- [ ] real mode list flashcards by exam/chapter works after Day 4 db push
- [ ] real mode create/edit/delete flashcard persists after refresh
- [ ] cross-user flashcard access blocked by RLS

## Quiz

- [ ] quiz view opens
- [ ] no quiz empty state visible
- [ ] answer questions
- [ ] submit attempt
- [ ] score visible
- [ ] submit error handled
- [ ] score persists after refresh in real mode
- [ ] real mode list/get quiz works after Day 4 db push
- [ ] real mode quiz attempt writes score/answers
- [ ] cross-user quiz/attempt access blocked by RLS

## Analytics

- [ ] analytics view opens
- [ ] zero-data state is not broken
- [ ] notes count updates when note exists
- [ ] materials count updates when material exists
- [ ] quiz attempts count updates after submit
- [ ] no fake progress shown for missing backend data

## AI Tutor / Planner

- [ ] tutor view opens
- [ ] planner view opens
- [ ] loading state visible
- [ ] provider unavailable fallback works
- [ ] quota/rate-limit message readable
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
- Real mode notes/materials should be retested after Supabase db push and `lockeen_real_user_id` setup.
- Week 2 Day 3 B adds optional material file upload UI. No PDF parsing or advanced upload flow.
