# Auth Service Contract

## Scope

Day 3 auth shell.

Goal: frontend thinks in authenticated app states before real provider integration.

Current modes:

- `mock`
- `supabase`

## Auth mode

`VITE_AUTH_MODE=mock` uses localStorage mock session.

`VITE_AUTH_MODE=supabase` uses Supabase Auth with email/password.

Both modes keep same service function signatures and context values.

## Session states

```text
loading
authenticated
anonymous
error
Return shape
Success:

{ data, error: null }
Failure:

{ data: null, error: { code, message } }
Service functions
restoreSession()
Restores existing session from current provider.

Mock behavior:

reads lockeen_mock_session from localStorage
returns authenticated when user exists
returns anonymous when no user exists
getCurrentUser()
Returns current user or null.

signIn(input)
Input:

{
  email: string,
  password?: string
}
Returns:

{
  user,
  status: 'authenticated'
}
Validation:

email required
signUp(input)
Input:

{
  email: string,
  password?: string,
  name?: string
}
Returns authenticated mock user.

Validation:

email required
signOut()
Clears session and returns anonymous state.

onAuthStateChange(callback)
Subscribes to auth session changes.

Returns unsubscribe function.

Auth context
AuthProvider exposes:

user
status
error
isAuthenticated
isLoading
signIn
signUp
signOut
refreshSession
useAuth() must be called inside AuthProvider.

Mock session
Mock session stored in localStorage key:

lockeen_mock_session
Refresh behavior:

logged-in mock user persists after browser refresh
logout clears localStorage session
Supabase behavior
Supabase implementation keeps:

same service function names
same return shape
same context values
same session states
Supabase mapping:

restoreSession() -> supabase.auth.getSession() / getUser()
signIn() -> Supabase email/password
signUp() -> Supabase sign up
signOut() -> Supabase sign out
onAuthStateChange() -> Supabase auth listener

User mapping:

```js
{
  id: user.id,
  email: user.email,
  name: user.user_metadata.full_name || user.user_metadata.name || email prefix,
  provider: 'supabase',
  createdAt: user.created_at
}
```

Beta constraints:

- Email/password only.
- Google/OAuth UI path returns `PROVIDER_UNSUPPORTED` in real mode.
- If Supabase email confirmation is enabled, sign up returns `EMAIL_CONFIRMATION_REQUIRED` until user confirms email.

Known gaps Day 1 Week 3
No password validation beyond required email.
No reset password flow.
No route-level router guard.
No profile upsert on auth callback.
Data services still use temporary `lockeen_real_user_id` until Week 3 Day 2.
