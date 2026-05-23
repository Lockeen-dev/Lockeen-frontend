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

### `src/services/analytics.js`

Functions:

- `getStudySummary()`
- `listRecentActivity({ limit } = {})`

Summary shape:

```js
{
  upcomingExams,
  notesCount,
  materialsCount,
  flashcardsCount,
  quizAttemptsCount,
  averageQuizScore,
  latestActivity
}
```

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
- storage signed URLs return `STORAGE_NOT_IMPLEMENTED` until storage policy is added
- no PDF parsing
- no UI integration in backend PR
