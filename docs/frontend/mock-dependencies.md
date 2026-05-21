# Front Mock Dependencies

## Scope

Map current mock-driven UI before service-layer migration. No component refactor in Day 1.

## Direct / likely mock dependencies

Command used:

```bash
rg "mockData|seed|mock|initial|SUBJECT|exam|chapter|localStorage" src
```

## Data ownership map

| Component | Data | Current Source | Future Service | Risk |
|---|---|---|---|---|
| `NotesView` | exams, chapters, notes | `src/data/mockData.js`, local state | `src/services/exams.js` | high |
| `ExamModals` | create/edit/delete form state | local state + parent state | `src/services/exams.js` | high |
| `DashboardHome` | today tasks, upcoming exams, recommendations | mock data / derived state | `src/services/dashboard.js` | medium |
| `CalendarView` | events, exam dates, study plan | mock events / local state | `src/services/calendar.js` | medium |
| `Quiz` | questions, quiz runs, scores | seeded questions + local state | future quiz service | medium |
| `Flashcards` | decks, card progress | seeded cards + local state | future flashcards service | medium |
| `TutorView` | chat sessions, messages | local state / mock replies | future tutor service | low for week 1 |
| `AnalyticsView` | week data, progress, history | derived mock/local state | future analytics service | low for week 1 |

## Missing UI states

### `NotesView`

- loading: needed when `listExams()` starts
- empty: needed when no exams exist
- error: needed when exam fetch fails
- saving: needed for create/edit/delete
- validation: needed for exam form fields
- unauthorized: needed when session missing

### `ExamModals`

- loading/saving: needed during submit
- error: backend failure near form
- validation: required fields and invalid date
- delete pending: disable repeated delete

### `DashboardHome`

- loading: summary fetch
- empty: no upcoming exams
- error: summary failure
- unauthorized: no user/session

### `CalendarView`

- loading: calendar read model fetch
- empty: no exams/events
- error: calendar service failure
- saving: later for planned sessions

## Day 2 touch plan

Touch:

- `src/components/NotesView.jsx`
- `src/components/ExamModals.jsx`
- `src/services/exams.js`

Do not touch:

- visual redesign
- real AI Tutor
- real PDF upload
- real analytics
- broad `mockData.js` migration

## Risks

- `src/data/mockData.js` feeds many components.
- `package.json` changes affect both streams.
- Service signatures must be stable before UI wiring.
