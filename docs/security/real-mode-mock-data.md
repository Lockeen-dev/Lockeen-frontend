# Real Mode Mock Data Guard

## Goal

`VITE_API_MODE=real` must never validate user data against `src/data/mockData.js`.

Mock data can stay available for local demo mode, but real mode must use Supabase-backed paths only.

## Guarded Areas

These services import mock seed data for local mode:

- `src/services/flashcards.js`
- `src/services/materials.js`
- `src/services/notes.js`
- `src/services/quiz.js`

Their `hasKnownMockParent(...)` helpers must immediately return `true` outside mock mode:

```js
if (!isMockMode()) return true;
```

This prevents mock seed exams or chapters from blocking real Supabase records if helper call order changes later.

## Verification

```bash
npm run security:real-mode
VITE_API_MODE=real VITE_AUTH_MODE=supabase VITE_AI_MODE=real npm run build
```
