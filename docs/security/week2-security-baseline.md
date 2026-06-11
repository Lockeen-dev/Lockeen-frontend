# Week 2 Security Baseline

## Must hold before beta

- no service-role key in frontend
- `.env.local` untracked
- RLS enabled on every user table
- each new table scoped to `auth.uid()`
- storage paths scoped by user id
- AI provider key only server-side

## Manual RLS test

Create two users:

- `student-a`
- `student-b`

Test:

1. user A creates exam, chapter, note
2. user B logs in
3. user B cannot list or fetch user A records
4. user B cannot insert child record under user A parent id
5. user A still sees own records after refresh

Day 2 added tables:

- `notes`
- `study_materials`

Extra Day 2 checks:

- user B cannot insert a note under user A `exam_id`
- user B cannot insert a note under user A `chapter_id`
- user B cannot insert material under user A `note_id`
- user B cannot list user A materials
- deleting a note cascades related material metadata only when attached by `note_id`

## Storage rules

Allowed week 2 file policy:

- max file size: 10 MB
- allowed mime types: `application/pdf`, `image/png`, `image/jpeg`, `text/plain`
- path pattern: `{user_id}/{material_id}/{filename}`
- signed URL only for owner

Not allowed:

- public bucket for private study materials
- executable files
- unbounded upload size
- client-side secret signing

Day 2 storage state:

- material metadata supported
- external `source_url` supported
- `storage_path` field reserved
- signed download URLs implemented by storage service after Day 3 storage policy PR

Day 3 storage policy:

- bucket: `study-materials`
- bucket is private
- max file size: 10 MB
- allowed mime types: `application/pdf`, `image/png`, `image/jpeg`, `text/plain`
- object path must start with `auth.uid()`
- users can select/insert/update/delete only objects inside own user-id folder
- frontend service exposes upload validation and signed URL helper

Day 4 practice tables:

- `flashcards`
- `quizzes`
- `quiz_questions`
- `quiz_attempts`

Extra Day 4 checks:

- user B cannot list user A flashcards
- user B cannot create flashcard under user A `exam_id`, `chapter_id`, or `note_id`
- user B cannot list user A quizzes/questions
- user B cannot insert question under user A quiz
- user B cannot submit attempt under user A quiz
- quiz attempts are append-only through insert/select policies

## AI rules

Allowed:

- server-side endpoint/function
- authenticated request
- quota/rate limit
- fallback mock response
- log request metadata, not full private study text by default

Not allowed:

- OpenAI key in Vite env
- direct browser call to provider
- no-limit generation
- silent provider failure
