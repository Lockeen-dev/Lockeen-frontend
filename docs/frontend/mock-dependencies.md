# Front Mock Dependencies

## Scope

Day 1 Persona B inventory for front/product integration. This document maps where the current UI reads mock data, which local state owns product data today, and what should later move behind service APIs.

Search command used:

```bash
rg "mockData|seed|mock|initial|SUBJECT|exam|chapter" src
```

## Direct Imports From `src/data/mockData.js`

| File | Imports | Current Use |
|---|---|---|
| `src/components/Dashboard.jsx` | `cellularRespirationCards`, `cellularRespirationQuestions`, `chemistryCards`, `mockDashboard`, `seedExams` | Seeds the main app state for exams, quiz deck, flashcard deck, and recommended dashboard completion checks. |
| `src/components/DashboardHome.jsx` | `mockDashboard` | Renders daily tasks, recommended quiz, and recommended flashcards. |
| `src/components/NotesView.jsx` | `EXTRA_SUBJECT_COLORS`, `daysLeft`, `formatExamDate`, `getSubjectPalette`, `inferSubjectFromName`, `makeSampleChapter` | Formats exam cards, derives subject palette, creates sample chapter objects during uploads. |
| `src/components/ExamModals.jsx` | `EXTRA_SUBJECT_COLORS`, `getSubjectPalette`, `inferSubjectFromName` | Derives palette and subject metadata for create/edit exam forms. |
| `src/components/AnalyticsView.jsx` | `formatExamDate`, `getSubjectPalette`, `seedExams` | Falls back to seeded exams when no notes are passed and derives grade/subject display. |
| `src/components/AIStudyPlanner.jsx` | `EXTRA_SUBJECT_COLORS`, `SUBJECT_COLORS`, `seedNotes` | Builds generated study plans from mock note subjects and exam dates. |
| `src/components/Flashcards.jsx` | `getSubjectPalette` | Styles exam/deck selections from exam subject metadata. |
| `src/components/Quiz.jsx` | `getSubjectPalette` | Styles exam and chapter quiz selections from exam subject metadata. |

## Components Reading Mock Or Seeded Data

### `Dashboard`

- Source data: `seedExams`, `cellularRespirationCards`, `cellularRespirationQuestions`, `chemistryCards`, `mockDashboard`, `initialWeekData`, `initCalEvents`.
- Product role: top-level owner for most front-only product state.
- Important local state: `exams`, `activeExamId`, `flashcardDeck`, `quizDeck`, `quizHistory`, `quizRuns`, `flashHistory`, `recentFlashDecks`, `weekData`, `recommendedQuizDone`, `recommendedFlashDone`, `calEvents`, `notifications`.
- Service candidates: `services/exams`, `services/chapters`, `services/quiz`, `services/flashcards`, `services/calendar`, `services/dashboard`, `services/analytics`.
- Risk: high. Most child flows receive data and mutators from this component, so a future service migration should start by creating narrow adapters rather than rewriting child UI.

### `NotesView`

- Source data: receives `exams` from `Dashboard`, initially seeded by `seedExams`.
- Direct mock helpers: palette/date/subject helpers plus `makeSampleChapter`.
- Important local state: search query, create/edit/delete modal state, active detail state, upload modal state, readiness view, editing chapter, PDF preview state.
- Mutations: create exam, edit exam, delete exam, add chapter, edit chapter, delete chapter. All are local `setExams` updates today.
- Derived data: filtered exams, active exam, filtered chapters, readiness score, quiz/flash averages, calendar event generated after exam creation.
- Service candidates: `services/exams` and `services/chapters`.
- Risk: high. This is the main owner-facing exam/chapter flow and currently assumes synchronous local mutation.

### `ExamModals`

- Source data: receives `exam` or `existingChapters` props from `NotesView`.
- Direct mock helpers: palette and subject inference helpers.
- Important local state: form fields for exam name, date, target grade, priority, emoji, upload selection, uploaded files, simulated upload progress, chapter title edits, delete confirmation.
- Mutations: emits `onCreate`, `onSave`, `onUpload`, `onDelete` callbacks; parent applies the mutation locally.
- Derived data: inferred subject, auto emoji, subject palette, safe ISO date, priority metadata.
- Service candidates: should stay presentation-only; persistence should live in `services/exams` and `services/chapters`.
- Risk: high. Needs saving/error/validation states before async persistence.

### `DashboardHome`

- Source data: `mockDashboard` plus `calEvents` from `Dashboard`.
- Important local state: checked today events and confirmation modal.
- Mutations: marks events complete via parent callback; starts timer from daily task duration.
- Derived data: today key, today events, completion count, recommended completion count, formatted duration.
- Service candidates: `services/dashboard`, `services/calendar`.
- Risk: medium. It mixes mock recommendations with live-ish calendar state.

### `CalendarView`

- Source data: local constants `LIFE_CATS`, `SUBJECT_NOTE_MAP`, `calSeedNotes`, and exported `initCalEvents`.
- Important local state: calendar view mode, week/month cursor, category filters, event modal fields, selected note, drag state, edit form, attached files/materials, reorder state.
- Mutations: add/edit/delete/reorder/drag calendar events through `setEvents` from `Dashboard`.
- Derived data: day keys, event duration minutes, subject-to-note mapping, note colors, event positioning.
- Service candidates: `services/calendar`.
- Risk: medium. Events are local and mutable but already passed in as props, which gives a clean future API boundary.

### `AIStudyPlanner`

- Source data: `seedNotes`, `SUBJECT_COLORS`, `SUBJECT_NOTE_MAP`, existing calendar events.
- Important local state: wizard step, selected subjects, available hours, study techniques, selected time slots, validation errors, generated plan, add status.
- Derived data: closest exam date from mock notes, non-overlapping sessions, calendar events to add.
- Service candidates: `services/study-plans`, `services/calendar`.
- Risk: medium. Planner output is deterministic local generation today, not real AI or backend persisted.

### `AnalyticsView`

- Source data: `weekData` and `notes` from `Dashboard`; falls back to `seedExams`.
- Important local state: animation/count-up only.
- Derived data: weekly totals, average target grade, subject mastery mock list, grade prediction from quiz/flash history.
- Service candidates: `services/analytics`.
- Risk: medium. Mostly derived display, but subject mastery is still hardcoded.

### `Quiz` / `Flashcards`

- Source data: decks and exams passed from `Dashboard`/`NotesView`, initially seeded from mock data.
- Important local state: selected exam/chapter, active deck, current question/card index, answers, score, review run, timer/difficulty settings.
- Derived data: generated quiz deck from selected exam chapters, flashcard deck from selected chapter cards, run metadata and score.
- Service candidates: `services/quiz`, `services/flashcards`, `services/exams`.
- Risk: medium. Local session state is fine, but deck source and history persistence need service ownership later.

## `localStorage` Usage

| File | Keys | Current Use |
|---|---|---|
| `src/LockeenRuntime.jsx` | `lockeen-authed`, `lockeen-user`, `lockeen-lang`, `lockeen-theme` | Restores mock auth session, user profile, language, and theme. |
| `src/marketingBoot.js` | `lockeen-lang` | Restores and updates landing/static-page language outside React runtime. |

No exam, chapter, quiz, flashcard, calendar, or analytics data is persisted to `localStorage` today. Those data sets are reset from module constants and React local state on reload.

## Data Ownership Map

| Component | Data | Current Source | Future Service | Risk |
|---|---|---|---|---|
| `NotesView` | exams/chapters | mock/local state | `services/exams` | high |
| `DashboardHome` | today/upcoming | mock/events | `services/dashboard` | medium |
| `CalendarView` | events/exam dates | mock/events | `services/calendar` | medium |
| `ExamModals` | create/edit form | local state | `services/exams` | high |

## UI Missing States

Priority order follows the Day 1 front readiness plan.

| Priority | Flow | Loading | Empty | Error | Saving | Validation | Unauthorized |
|---|---|---|---|---|---|---|---|
| 1 | `NotesView` | Missing for exam/chapter fetch. | Partial: chapter detail has an empty chapters state; exam list has no explicit empty search/no exams state. | Missing for failed exam/chapter load or mutation. | Missing for create/edit/delete exam and chapter updates. | Partial: modal-level required title/name checks exist, but list/detail validation is not surfaced. | Missing; assumes caller already owns auth. |
| 2 | `ExamModals` | Missing for initial async edit data. | Not applicable for create/edit forms; upload has no-files prompt through file picker state. | Missing for failed create/edit/upload/delete. | Partial: upload modal simulates uploading/progress; create/edit/delete do not expose async saving state. | Partial: required exam name, chapter name, date safety, and basic form constraints exist. | Missing; no per-action permission state. |
| 3 | `DashboardHome` | Missing for dashboard recommendation and today schedule fetch. | Partial: today schedule shows "Nessun impegno oggi"; recommendations and daily tasks have no empty state. | Missing for dashboard/calendar load failure. | Missing for marking event done or starting timer. | Not applicable for most read-only cards; completion confirm has no invalid action state. | Missing; assumes app shell auth. |
| 4 | `CalendarView` | Missing for event fetch. | Partial: empty days render no events, but there is no global empty calendar state. | Missing for failed event CRUD, drag/drop, or attachment handling. | Missing for add/edit/delete/reorder/drag event persistence. | Partial: add event blocks empty name; duration and edit fields have limited validation. | Missing; no permission state for private/shared calendars. |

## Week Touch Plan

| Day | Front Scope | Notes |
|---|---|---|
| Giorno 2 | `NotesView`, `ExamModals` | Prepare exam/chapter flows for async services and add missing loading/saving/error states around create, update, delete, and upload actions. |
| Giorno 3 | `AuthModal`, app shell | Align mock auth shell with backend/auth decisions, especially session restore and unauthorized routing states. |
| Giorno 5 | `DashboardHome`, `CalendarView` | Connect dashboard and calendar to agreed service boundaries after exam/chapter ownership is stable. |

Out of scope for this week touch plan:

- Redesign.
- Real AI Tutor.
- Real PDF upload.
- Real analytics.

## Source Data vs Derived Data

### Source-like data today

- `seedExams`: canonical mock exams with nested chapters, questions, cards, dates, priorities, and target grades.
- `mockDashboard`: canonical mock dashboard tasks and recommendations.
- `initCalEvents`: canonical mock calendar events generated relative to the current date.
- `seedNotes`: older note-shaped mock data used by the AI study planner.
- `cellularRespirationCards`, `chemistryCards`, `cellularRespirationQuestions`: default decks/questions for initial quiz and flashcard state.
- `SUBJECT_NOTE_MAP` and `calSeedNotes`: calendar/planner subject-to-note mapping.

### Derived data today

- Exam filters and active exam lookup in `NotesView`.
- Chapter filters and chapter readiness calculations in `ExamDetail`.
- Palette, emoji, date labels, days-left labels, priority labels.
- Quiz/flashcard averages, grade prediction, readiness score, weekly study totals.
- Calendar day keys, event duration minutes, event placement, completion counts.
- Planner sessions derived from selected subjects, available hours, techniques, existing events, and mock exam dates.

## Main Integration Notes

- The highest-risk front boundary is `Dashboard -> NotesView -> ExamModals`, because exam and chapter writes are synchronous local `setExams` mutations.
- `CalendarView` already has a cleaner boundary because it receives `events` and `setEvents`; this can become `listEvents/createEvent/updateEvent/deleteEvent` later.
- `DashboardHome` depends on both `mockDashboard` recommendations and calendar state, so future dashboard data should separate recommendation source data from user event state.
- `localStorage` currently covers only shell preferences and mock auth. Product data persistence is still entirely mock/local state.
