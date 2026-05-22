# Week 1 Frontend Demo Checklist

## Scope

Frontend readiness check for Week 1 demo.

Demo path:

login -> create exam -> dashboard -> calendar -> refresh -> delete

## Checklist

- [ ] App loads without crash
- [ ] Login/signup reaches dashboard
- [ ] Logout returns to auth
- [ ] Refresh keeps session state
- [ ] Create exam works
- [ ] Created exam appears in notes/exams
- [ ] Created exam appears in dashboard
- [ ] Created exam appears in calendar
- [ ] Delete exam removes it from notes/exams
- [ ] Delete exam removes it from dashboard
- [ ] Delete exam removes it from calendar
- [ ] Empty states are readable
- [ ] Backend errors show readable UI feedback
- [ ] No blocking console errors

## MockData Remaining

Known mock-backed areas:

- AI tutor
- quiz
- flashcards
- file upload
- analytics/streaks where not derived from exams
- any non-exam dashboard content still not backed by services

## Notes

No redesign in this PR.
No service changes in this PR.
No Supabase/env changes in this PR.
