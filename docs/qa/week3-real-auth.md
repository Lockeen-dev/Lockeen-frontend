# Week 3 Real Auth QA

## Day 1 Scope

Goal: connect Supabase Auth service without changing product UI or removing the temporary data bridge yet.

## Expected Modes

### Mock Mode

- `VITE_AUTH_MODE=mock`
- `signIn`, `signUp`, `restoreSession`, `signOut`, `onAuthStateChange` use localStorage mock session.
- No Supabase env required.

### Supabase Mode

- `VITE_AUTH_MODE=supabase`
- Requires `VITE_SUPABASE_URL`.
- Requires `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `signIn` uses `supabase.auth.signInWithPassword`.
- `signUp` uses `supabase.auth.signUp`.
- `restoreSession` uses `supabase.auth.getSession`.
- `signOut` uses `supabase.auth.signOut`.
- `onAuthStateChange` uses Supabase auth listener.

## Manual QA Checklist

- [ ] Mock mode sign in works.
- [ ] Mock mode sign up works.
- [ ] Mock mode refresh restores session.
- [ ] Mock mode logout returns anonymous.
- [ ] Supabase mode with missing env shows auth unavailable.
- [ ] Supabase mode sign up works with email confirmation disabled.
- [ ] Supabase mode sign up shows email confirmation message if confirmation is enabled.
- [ ] Supabase mode sign in works for confirmed beta user.
- [ ] Supabase mode refresh restores session.
- [ ] Supabase mode logout clears session.
- [ ] Google/OAuth button in Supabase mode shows beta unsupported error.

## Commands

```bash
npm run ci
supabase db push --dry-run
```

## Day 1 Result

- `npm run ci`: pass.
- `VITE_AUTH_MODE=supabase` build with dummy public env: pass.
- `supabase db push --dry-run`: pass, remote database up to date.

## Day 2 Result

- Data services now use authenticated Supabase session user id.
- `lockeen_real_user_id` is no longer required by frontend services.
