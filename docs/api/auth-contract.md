# Auth Service Contract

## Scope

Day 3 auth shell.

Goal: frontend thinks in authenticated app states before real provider integration.

Current mode: mock.
Future mode: Supabase Auth.

## Auth mode

`VITE_AUTH_MODE=mock` uses localStorage mock session.

Future `VITE_AUTH_MODE=supabase` will keep same service function signatures and context values.

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
Future Supabase behavior
Supabase implementation must keep:

same service function names
same return shape
same context values
same session states
Expected Supabase mapping:

restoreSession() -> supabase.auth.getSession() / getUser()
signIn() -> password or magic-link provider
signUp() -> Supabase sign up
signOut() -> Supabase sign out
onAuthStateChange() -> Supabase auth listener
Known gaps Day 3
No real Supabase auth call yet.
No password validation beyond required email.
No email verification.
No route-level router guard.
No user profile table.
No RLS.
