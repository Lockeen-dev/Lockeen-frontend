# ADR 0001 - Backend Platform

Status: Proposed

Decision:
Use Supabase for week 1 backend foundation.

Options considered:
- Supabase
- Custom backend
- Mock-only temporary mode

Why Supabase:
- Fast auth + Postgres + RLS.
- Good fit for user-owned exams/chapters.
- Low backend overhead for MVP.
- Works with Vercel frontend through env vars.

Tradeoffs:
- Need correct RLS policies from day one.
- Front must never expose service-role secrets.
- Vendor coupling acceptable for MVP.

Risks:
- Bad RLS can leak user data.
- Schema changes need migrations.
- Auth/session integration must be tested on refresh.

Reversibility:
Medium. Domain service layer keeps UI decoupled from Supabase.
