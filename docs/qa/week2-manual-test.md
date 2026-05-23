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

## Materials

- [ ] create material without file works
- [ ] invalid file type blocked or shows error
- [ ] large file blocked or shows error
- [ ] delete material works
- [ ] storage unavailable fallback does not break notes

## Flashcards

- [ ] flashcards view opens
- [ ] empty state visible
- [ ] create/list card works when enabled
- [ ] delete card works when enabled
- [ ] mock fallback works

## Quiz

- [ ] quiz view opens
- [ ] no quiz empty state visible
- [ ] answer questions
- [ ] submit attempt
- [ ] score visible
- [ ] submit error handled
- [ ] score persists after refresh in real mode

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

- 
