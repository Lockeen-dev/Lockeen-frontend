# Week 2 API Contract

Goal: keep UI stable while backend moves from exams-only to study core.

## Mode rule

All services must support:

- `mock` mode for local UI work
- `real` mode for Supabase-backed beta

Services must return consistent shapes:

```js
{ data, error }
```

No component should import Supabase directly.

## Services to add

### `src/services/notes.js`

Functions:

- `listNotes({ examId, chapterId } = {})`
- `createNote(input)`
- `updateNote(id, input)`
- `deleteNote(id)`

Note shape:

```js
{
  id,
  examId,
  chapterId,
  title,
  body,
  status,
  createdAt,
  updatedAt
}
```

### `src/services/materials.js`

Functions:

- `listMaterials({ examId, chapterId, noteId } = {})`
- `createMaterial(input)`
- `deleteMaterial(id)`
- `getMaterialDownloadUrl(id)`

Material shape:

```js
{
  id,
  examId,
  chapterId,
  noteId,
  type,
  title,
  sourceUrl,
  storagePath,
  mimeType,
  sizeBytes,
  status,
  createdAt,
  updatedAt
}
```

### `src/services/flashcards.js`

Functions:

- `listFlashcards({ examId, chapterId, noteId } = {})`
- `createFlashcard(input)`
- `updateFlashcard(id, input)`
- `deleteFlashcard(id)`

Flashcard shape:

```js
{
  id,
  examId,
  chapterId,
  noteId,
  front,
  back,
  status,
  createdAt,
  updatedAt
}
```

Day 4 implemented:

- mock mode reads seed chapter cards
- real mode reads `public.flashcards`
- create/update/delete supported
- parent scope: `examId`, `chapterId`, or `noteId`

### `src/services/quiz.js`

Functions:

- `listQuizzes({ examId, chapterId } = {})`
- `getQuiz(id)`
- `submitQuizAttempt(quizId, input)`

Attempt shape:

```js
{
  id,
  quizId,
  score,
  total,
  answers,
  completedAt,
  createdAt
}
```

Day 4 implemented:

- mock mode reads seed chapter questions
- real mode reads `public.quizzes` + `public.quiz_questions`
- `submitQuizAttempt` persists score/answers in `public.quiz_attempts`
- quiz generation is not implemented yet
- adaptive/spaced practice is not implemented yet

### `src/services/analytics.js`

Functions:

- `getStudySummary()`
- `listRecentActivity({ limit } = {})`

Summary shape:

```js
{
  totalExams,
  upcomingExams,
  nextExam,
  notesCount,
  materialsCount,
  flashcardsCount,
  quizzesCount,
  quizAttemptsCount,
  averageQuizScore,
  latestActivity
}
```

Day 5 implemented:

- `getStudySummary()` returns a backend-derived read model
- `listRecentActivity({ limit })` returns latest notes/materials/quiz attempts
- mock mode derives from existing mock services
- real mode queries Supabase user-owned tables
- missing data returns zero/empty values, not fake progress

## Error contract

Use normalized error:

```js
{
  code,
  message
}
```

Required codes:

- `AUTH_REQUIRED`
- `SUPABASE_CONFIG_MISSING`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `NETWORK_ERROR`
- `UNKNOWN_ERROR`

## Component contract

Every connected view needs:

- loading state
- empty state
- error state
- retry or safe fallback
- mock data path until real mode is complete

## Security contract

Frontend may use:

- Supabase URL
- Supabase publishable/anon key

Frontend must not use:

- service-role key
- database password
- OpenAI API key
- private storage signing secret

AI and signed storage must happen server-side.

## Day 2 implementation note

Migration:

- `supabase/migrations/20260523_day2_notes_materials.sql`

Implemented services:

- `src/services/notes.js`
- `src/services/materials.js`

Day 2 limits:

- notes require `examId` or `chapterId`
- materials require `examId`, `chapterId`, or `noteId`
- materials can be metadata-only; `sourceUrl` and `storagePath` are optional
- storage signed URLs work for real-mode materials with `storagePath` after Day 3 migration
- no PDF parsing
- no UI integration in backend PR

### `src/services/storage.js`

Functions:

- `validateStudyMaterialFile(file)`
- `uploadStudyMaterialFile({ file, materialId })`
- `createStudyMaterialSignedUrl(storagePath, expiresInSeconds)`
- `deleteStudyMaterialFile(storagePath)`

Rules:

- bucket: `study-materials`
- max file size: 10 MB
- allowed types: PDF, PNG, JPEG, TXT
- path pattern: `{userId}/{materialId}/{fileName}`
- signed URLs expire after 3600 seconds by default

## Day 4 implementation note

Migration:

- `supabase/migrations/20260523130000_day4_practice.sql`

Implemented services:

- `src/services/flashcards.js`
- `src/services/quiz.js`

Day 4 limits:

- manual flashcard CRUD only
- quiz list/get/attempt submit only
- no AI generation
- no spaced repetition
- no UI integration in backend PR

## Day 5 implementation note

Implemented services:

- `src/services/analytics.js`
- `src/services/dashboard.js` now prefers analytics read model

Day 5 limits:

- no new migration
- no analytics warehouse
- no retention cohorts
- no UI integration in backend PR
