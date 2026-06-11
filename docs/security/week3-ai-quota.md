# Week 3 AI Quota

## Goal

Move AI quota from process memory toward persistent per-user daily usage.

## Database

Table: `public.ai_usage`

- `user_id`
- `usage_date`
- `request_count`
- unique `(user_id, usage_date)`

Users can select only own usage through RLS.

Server writes usage with Supabase service role from the API route only.

Increment uses `public.increment_ai_usage(...)` so concurrent requests update the daily counter atomically.

## Server Environment

Persistent quota requires server-only Vercel env:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Do not prefix these with `VITE_`.

Frontend still only uses:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Behavior

- `AI_DAILY_QUOTA` controls daily request limit.
- Usage date resets at UTC day boundary.
- When server Supabase env is present and `x-lockeen-user-id` is a Supabase UUID, quota source is `persistent`.
- On Vercel preview/production, missing server Supabase env returns `AI_QUOTA_UNAVAILABLE` instead of falling back to in-memory quota.
- Local development can still fall back to in-memory quota for mock/dev setup.
- Provider fallback behavior is unchanged.

## Deployment Status

- Supabase migration applied on 2026-05-24.
- Persistent source still requires Vercel server env:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Verification

```bash
npm run ci
supabase db push --dry-run
```

Manual checks:

- authenticated user can make AI request
- response contains `quota.source: "persistent"` after server env is configured
- quota exceeded returns `AI_QUOTA_EXCEEDED`
- no Supabase service-role key appears in frontend env or tracked files
