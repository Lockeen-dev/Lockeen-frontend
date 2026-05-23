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
