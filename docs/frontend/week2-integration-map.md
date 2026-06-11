# Week 2 Frontend Integration Map

Goal: prepare study views to consume real services without redesigning product UI.

## Owner

Founder B owns:

- study view wiring
- loading/error/empty states
- manual QA docs
- mock fallback behavior

Founder B does not own:

- Supabase migrations
- RLS policies
- service-role/server secrets
- backend schema decisions

## Component plan

### `src/components/NotesView.jsx`

Data needed:

- exams/chapters from existing services
- notes from `src/services/notes.js`
- materials from `src/services/materials.js`

States required:

- loading notes
- no notes for selected context
- backend error
- validation error for empty title/body
- upload unavailable fallback

Week 2 UI output:

- create/edit/delete note
- add material metadata or optional upload
- preserve current visual layout

### `src/components/Flashcards.jsx`

Data needed:

- flashcards from `src/services/flashcards.js`
- optional exam/chapter filter

States required:

- loading flashcards
- no flashcards yet
- save/delete error

Week 2 UI output:

- list cards
- create/edit/delete card if current UI supports it
- keep mock fallback until real service exists

### `src/components/Quiz.jsx`

Data needed:

- quizzes/questions from `src/services/quiz.js`
- submit attempt result

States required:

- loading quiz
- no quiz for selected chapter
- submit error
- score saved confirmation

Week 2 UI output:

- complete quiz
- persist attempt in real mode
- show score after refresh when service supports it

### `src/components/AnalyticsView.jsx`

Data needed:

- summary from `src/services/analytics.js`
- existing exam/dashboard service values

States required:

- loading metrics
- zero-data analytics
- partial data warning only when useful

Week 2 UI output:

- notes/materials/flashcards/quiz counts
- latest activity
- no fake progress when backend has no data

### `src/components/TutorView.jsx`

Data needed:

- AI response from `src/services/ai.js`
- fallback response when provider not configured

States required:

- loading answer
- auth required
- quota/rate limit
- provider unavailable fallback

Week 2 UI output:

- beta-safe tutor call
- no direct provider key in client

### `src/components/AIStudyPlanner.jsx`

Data needed:

- exam/chapter context
- AI planner response from `src/services/ai.js`
- fallback static plan

States required:

- loading plan
- provider unavailable
- no exam selected

Week 2 UI output:

- planner remains usable in mock/fallback mode
- real AI waits for backend gate

## Files to avoid unless agreed

- `package.json`
- `supabase/`
- `src/lib/supabaseClient.js`
- `src/services/auth.js`

## Done when

- every touched view has loading/error/empty handling
- mock mode still works
- manual test doc updated with each flow
- no backend secret added to frontend
- screenshots added to PR only when visible UI changes
