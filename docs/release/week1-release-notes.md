# Week 1 Release Notes

## Summary

Week 1 converted Lockeen frontend from prototype-only flow into a repo with documented contracts, service boundaries, CI baseline, auth shell, and first real backend path for exams.

## Completed

### Repo governance

- Architecture snapshot documented.
- Backend platform ADR added.
- Auth provider ADR added.
- Issue template added.
- Two-computer ownership workflow established.

### Service layer

- Exams service created.
- UI no longer needs direct mockData access for core exam operations.
- Mock mode remains available.

### Auth shell

- Auth service contract added.
- AuthContext added.
- Auth UI connected to session state.
- Soft protected app shell added.

### Real backend foundation

- Supabase client added.
- Supabase migration added for profiles, subjects, exams, chapters.
- RLS ownership policies added.
- Real exam mode added behind VITE_API_MODE=real.

### Read models

- Dashboard service derives summary/upcoming exams from exams.
- Calendar service derives events from exams.date.
- No calendar_events table added in Week 1.

### CI and bug bash

- GitHub Actions CI added.
- Build and high-severity audit gate added.
- Tracked env-file guard added.
- Login bug bash report added.

## Real vs Mock

Real:

- Supabase schema and RLS.
- Exams/chapters backend path.
- Dashboard/calendar read model services.

Mock:

- Auth provider.
- Temporary real-user bridge.
- AI tutor.
- Quiz.
- File upload.
- Some analytics/non-exam data.

## Risks

- Real auth not connected yet.
- Temporary lockeen_real_user_id bridge must be removed.
- Bundle chunk warning remains.
- Test runner not added yet.
- Some components may still import mockData for non-exam domains.

## Demo Path

login -> create exam -> dashboard -> calendar -> refresh -> delete.