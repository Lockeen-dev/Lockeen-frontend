# Week 3 Real-Mode Smoke

For the P0 production real-mode end-to-end gate, use:

- [P0 Production Real-Mode Smoke Runbook](./p0-production-real-mode-smoke.md)

## Setup

Use real mode:

```bash
VITE_API_MODE=real
VITE_AUTH_MODE=supabase
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Do not commit `.env.local`.

## Smoke Matrix

| Area | User A | User B isolation | Notes |
| --- | --- | --- | --- |
| Auth restore/logout | pending | pending | Refresh must keep session. |
| Exams | pending | pending | Create `Smoke Week3 A/B`. |
| Notes | pending | pending | Note under own exam only. |
| Materials | pending | pending | Link or upload if available. |
| Flashcards | pending | pending | Own parent only. |
| Quiz attempt | pending | pending | Own quiz only. |
| Dashboard | pending | pending | Counts current user only. |
| Analytics | pending | pending | No cross-user activity. |
| AI Tutor/Planner | pending | pending | No `AUTH_REQUIRED` when logged in. |

## Result Template

```md
## Smoke Result

Date:
Tester:
Preview URL:

- Auth restore/logout: pass/fail
- Exams: pass/fail
- Notes: pass/fail/not tested
- Materials: pass/fail/not tested
- Flashcards: pass/fail/not tested
- Quiz attempt: pass/fail/not tested
- Dashboard: pass/fail
- Analytics: pass/fail
- AI Tutor/Planner: pass/fail/not tested
- Cross-user isolation: pass/fail
- Console blocking errors: yes/no

### Issues

- None
```
