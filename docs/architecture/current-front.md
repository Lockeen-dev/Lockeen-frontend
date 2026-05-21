# Current Front Architecture

Stack: React, Vite, Tailwind, Vercel.

Core components:
- DashboardHome
- CalendarView
- NotesView
- ExamModals
- Flashcards
- Quiz
- AnalyticsView
- TutorView
- AIStudyPlanner
- AuthModal

Main data source today:
- src/data/mockData.js
- component local state
- some localStorage session/app state

Main flows:
- Auth UI exists, but no real provider yet.
- Exams/notes are mock-driven.
- Calendar derives events from mock/local state.
- Quiz and flashcards use seeded content.
- Tutor is UI/mock reply flow.
- Analytics is derived/mock data.

Conflict risk:
- src/data/mockData.js is shared by many components.
- package.json affects both streams.
- src/components/* should stay Persona B ownership.
- docs, env, .github are Persona A ownership.
