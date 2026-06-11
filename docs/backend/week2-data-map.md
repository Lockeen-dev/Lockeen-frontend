# Week 2 Data Map

Goal: extend week 1 backend from auth/exams/chapters into study core without migrating every product feature.

## Current backend baseline

Existing real-mode tables:

- `profiles`
- `subjects`
- `exams`
- `chapters`

Existing rule:

- every record belongs to `auth.users.id`
- RLS blocks cross-user access
- frontend talks through `src/services/*`
- mock mode stays available for UI work

## Week 2 domains

### notes

Purpose:

- user-written study notes
- attached to exam, chapter, or standalone study context

Minimum fields:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `exam_id uuid references public.exams(id)`
- `chapter_id uuid references public.chapters(id)`
- `title text not null`
- `body text`
- `status text default 'active'`
- `created_at timestamptz`
- `updated_at timestamptz`

Ownership:

- direct `user_id`
- insert/update must also validate parent `exam_id`/`chapter_id` belongs to same `auth.uid()`

Week 2 includes:

- CRUD notes
- list by exam/chapter
- empty/loading/error UI support

Week 2 excludes:

- rich text editor
- collaboration
- version history

### study_materials

Purpose:

- material metadata for links/uploads connected to note, chapter, or exam

Minimum fields:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `exam_id uuid references public.exams(id)`
- `chapter_id uuid references public.chapters(id)`
- `note_id uuid references public.notes(id)`
- `type text not null`
- `title text not null`
- `source_url text`
- `storage_path text`
- `mime_type text`
- `size_bytes bigint`
- `status text default 'active'`
- `created_at timestamptz`
- `updated_at timestamptz`

Ownership:

- direct `user_id`
- storage path must start with user id, when storage exists

Week 2 includes:

- create/list/delete material metadata
- optional upload/storage path
- size/type policy

Week 2 excludes:

- PDF parsing
- OCR
- multi-file bulk upload

### flashcards

Purpose:

- practice cards tied to notes/chapters/exams

Minimum fields:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `exam_id uuid references public.exams(id)`
- `chapter_id uuid references public.chapters(id)`
- `note_id uuid references public.notes(id)`
- `front text not null`
- `back text not null`
- `status text default 'active'`
- `created_at timestamptz`
- `updated_at timestamptz`

Ownership:

- direct `user_id`
- parent ownership check on insert/update

Week 2 includes:

- manual CRUD
- list by chapter/exam

Week 2 excludes:

- spaced repetition algorithm
- AI generation as default path

### quizzes

Purpose:

- question sets for study practice

Minimum tables:

- `quizzes`
- `quiz_questions`
- `quiz_attempts`

`quizzes` fields:

- `id`
- `user_id`
- `exam_id`
- `chapter_id`
- `title`
- `status`
- timestamps

`quiz_questions` fields:

- `id`
- `user_id`
- `quiz_id`
- `prompt`
- `options jsonb`
- `correct_answer text`
- `explanation text`
- `position integer`
- timestamps

`quiz_attempts` fields:

- `id`
- `user_id`
- `quiz_id`
- `score integer`
- `total integer`
- `answers jsonb`
- `completed_at timestamptz`
- `created_at timestamptz`

Ownership:

- all rows have `user_id`
- `quiz_questions.quiz_id` must belong to same user
- `quiz_attempts.quiz_id` must belong to same user

Week 2 includes:

- list quiz
- submit attempt
- persist score

Week 2 excludes:

- adaptive quiz
- question bank marketplace
- anti-cheat

### analytics_events

Purpose:

- minimal event log for progress/read models

Minimum fields:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `event_name text not null`
- `entity_type text`
- `entity_id uuid`
- `metadata jsonb default '{}'`
- `created_at timestamptz`

Ownership:

- direct `user_id`
- insert only for current user
- select only own events

Week 2 includes:

- quiz completed
- note created
- flashcard reviewed
- material added

Week 2 excludes:

- product analytics warehouse
- retention cohorts
- billing analytics

## Read models

Dashboard/Analytics should derive:

- upcoming exams count
- notes count
- materials count
- flashcards count
- quiz attempts count
- latest activity
- average quiz score when attempts exist

Rule:

- service returns zero/empty arrays when no data exists
- UI never invents progress from missing backend data

## RLS checklist per new table

- enable row level security
- `select own`
- `insert own`
- `update own`
- `delete own` where deletion is supported
- parent ownership validation for foreign keys
- index on `user_id`
- index on main parent ids

## Out of scope for week 2

- real AI content generation by default
- full PDF pipeline
- team/classroom accounts
- billing
- admin panel
- notification system
- full test suite

## Definition of Done

- data contract documented before migration
- migration can be reviewed in under 10 minutes
- mock mode still works
- real mode has two-user RLS manual test
- no service-role key in frontend
