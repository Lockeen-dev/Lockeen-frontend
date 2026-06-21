# P0 Production Real-Mode Smoke Runbook

## Scope

Goal: prove the production or production-like preview can complete the critical real-mode learning flow with Supabase Auth, real persistence, material processing, practice generation, progress tracking, and protected routes.

This runbook is documentation-only. It does not require code changes and must not use frontend mock mode.

## Environment

Use a production or release-candidate preview configured with:

```bash
VITE_API_MODE=real
VITE_AUTH_MODE=supabase
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Do not commit `.env.local`. Do not expose service-role keys or provider secrets in frontend env.

## QA Users

Use two confirmed Supabase Auth users:

- User A: primary P0 smoke user.
- User B: isolation and protected-route spot-check user.

Do not write credentials in this document, tickets, screenshots, commits, or chat. Store and share credentials only through the approved secret manager or local QA environment.

## Fixture PDF

Use a non-sensitive PDF fixture that can be safely uploaded to a production-like environment.

Fixture requirements:

- 1 to 3 pages.
- No personal data, customer data, credentials, internal financial data, or copyrighted textbook scans.
- Plain text content with clear headings and at least 8 to 12 factual statements.
- Includes enough material for quiz and flashcard generation.
- Filename format: `qa-p0-real-mode-smoke-YYYY-MM-DD.pdf`.

Suggested content: a short public-domain or self-authored study note about photosynthesis, HTTP basics, or algebra definitions.

## Evidence Requirements

For every run, collect:

- Screenshot after login showing authenticated app state, with email masked if visible.
- Screenshot after exam creation showing exam name and date/time.
- Screenshot after chapter creation.
- Screenshot after PDF upload and after extraction reaches a terminal state.
- Screenshot after quiz generation and after quiz completion.
- Screenshot after flashcard generation and after flashcard completion.
- Screenshot of analytics/progress after completion.
- Screenshot after refresh showing persisted exam, chapter, practice, and analytics.
- Screenshot after logout and protected-route check.
- Browser console errors and warnings: record whether any are blocking.
- Network errors: record failed requests, status codes, endpoint category, and whether the UI handled them.
- Persisted records when applicable: record visible IDs/slugs only if already exposed by the UI; otherwise record user-facing names and timestamps. Do not query production data with elevated privileges for this smoke.

## Pass, Fail, And Blocker Criteria

Pass:

- All P0 steps complete for User A.
- Refresh preserves authenticated session before logout.
- Created exam, chapter, uploaded material, generated practice, completed progress, and analytics persist after refresh.
- Logout clears authenticated UI state.
- Protected routes do not expose private content after logout.
- No logged-in real-mode step fails with `AUTH_REQUIRED`.
- No blocking console or network error remains unexplained.

Fail:

- User A cannot complete a required P0 step because of an app error.
- Data appears lost after refresh.
- Analytics do not reflect completed quiz or flashcard activity.
- Logout leaves private data visible after refresh or direct navigation.
- Protected routes expose private content while logged out.
- User B can see or act on User A data.
- Real-mode flow silently falls back to mock/local-only data.

Blocker:

- Login is unavailable for confirmed QA users.
- Supabase project/env is misconfigured and prevents real-mode operation.
- Upload or extraction cannot reach any terminal state.
- Quiz or flashcard generation cannot be started for extracted material.
- A frontend secret or service-role key appears in browser-visible env, source, logs, or network traffic.
- A production outage or quota exhaustion prevents determining whether the app behavior is correct.

## AI, Extraction, And Quota Classification

If AI, extraction, or provider quota fails, classify the result by observed behavior:

- Pass with provider warning: provider returns a clear quota/rate-limit/temporary failure, the UI shows an explicit non-success state, no fake generated content is shown, no mock fallback appears, and existing user data remains intact.
- Fail: the app claims success without generated quiz/flashcard content, shows mock/fake content in real mode, loses uploaded material, loops indefinitely without recovery, or records misleading completion/progress.
- Blocker: provider outage or quota prevents both quiz and flashcard generation, and the remaining P0 flow cannot be evaluated.

Expected behavior for provider failures:

- The user sees a clear error or retryable state.
- The app does not return `AUTH_REQUIRED` for a logged-in user unless the session is actually expired.
- The app does not create partial progress that looks completed.
- Refresh preserves the exam, chapter, material metadata, and any explicit failure state that the product is designed to persist.

## Step-By-Step Smoke

Use a unique run label:

```text
P0 Smoke YYYY-MM-DD User A
```

| Step | Action | Expected Result | Evidence |
| --- | --- | --- | --- |
| 1 | Open target URL in a clean browser profile/session. | App loads without private data visible while anonymous. No blocking console errors. | Screenshot of initial state; console/network notes. |
| 2 | Log in as User A. | User A reaches authenticated app state. No `AUTH_REQUIRED` while logged in. | Screenshot with user identity masked; failed network requests if any. |
| 3 | Refresh the browser while logged in. | Session restores automatically and remains on an authenticated route or valid app state. | Screenshot after refresh; console/network notes. |
| 4 | Create a new exam named with the run label and set date plus time. | Exam is created and visible with the selected date/time. | Screenshot; visible exam name/date/time. |
| 5 | Open the exam workspace/details. | Newly created exam loads from real data. | Screenshot of workspace/details. |
| 6 | Add one chapter under the exam. | Chapter appears under the correct exam only. | Screenshot showing chapter. |
| 7 | Upload the non-sensitive fixture PDF to the exam/chapter path supported by the UI. | Upload starts and reaches uploaded/processing state. No secret appears in request URLs or logs. | Screenshot after upload; network status codes; filename. |
| 8 | Wait for extraction to finish or reach a terminal failure. | Success: extracted material/content is available. Failure: explicit error state, no mock fallback. | Screenshot of terminal state; classification if provider failure. |
| 9 | Generate a quiz from the extracted material. | Quiz generation completes with real generated questions, or shows explicit provider failure per classification rules. | Screenshot of generated quiz or error; network status. |
| 10 | Generate flashcards from the extracted material. | Flashcard generation completes with real cards, or shows explicit provider failure per classification rules. | Screenshot of generated flashcards or error; network status. |
| 11 | Complete the quiz with any valid answers. | Quiz records completion and score/result. Progress updates are visible. | Screenshot of completion/result. |
| 12 | Complete the flashcard activity/session. | Flashcard progress records completion or studied state. | Screenshot of completed/studied state. |
| 13 | Open analytics/dashboard/progress views. | Analytics reflect the created exam and completed quiz/flashcard activity for User A only. | Screenshot of analytics/progress; note expected counts. |
| 14 | Refresh the browser. | Exam, chapter, material state, generated practice, completions, and analytics remain visible and consistent. | Screenshot after refresh; console/network notes. |
| 15 | Log out. | Authenticated UI state clears and app returns to anonymous/login state. | Screenshot after logout. |
| 16 | Directly open a protected route used during the smoke. | Private content is not visible. App redirects to login or shows an appropriate unauthorized state. | Screenshot of protected-route result; URL path. |
| 17 | Log in as User B. | User B authenticates successfully. User A smoke exam and related data are not visible. | Screenshot with identity masked; note whether User A data is absent. |
| 18 | Log out User B. | User B session clears. | Screenshot after logout. |

## Result Template

```md
## P0 Production Real-Mode Smoke Result

Date:
Tester:
Target URL:
Build/commit if visible:
Browser:
Fixture PDF:

### Checklist

- Login: pass/fail/blocker
- Refresh while logged in: pass/fail/blocker
- Create exam with date/time: pass/fail/blocker
- Add chapter: pass/fail/blocker
- Upload PDF: pass/fail/blocker
- Extraction terminal state: pass/fail/blocker
- Generate quiz: pass/fail/blocker/provider warning
- Generate flashcards: pass/fail/blocker/provider warning
- Complete quiz: pass/fail/blocker
- Complete flashcards: pass/fail/blocker
- Analytics/progress: pass/fail/blocker
- Refresh persistence: pass/fail/blocker
- Logout: pass/fail/blocker
- Protected routes after logout: pass/fail/blocker
- User B isolation spot-check: pass/fail/blocker
- Blocking console errors: yes/no
- Blocking network errors: yes/no
- Frontend secret exposure: yes/no
- Mock/local fallback in real mode: yes/no

### AI/Quota Classification

- Extraction:
- Quiz:
- Flashcards:

### Evidence

- Screenshots:
- Console errors:
- Network errors:
- Persisted record evidence:

### Issues

- None
```
