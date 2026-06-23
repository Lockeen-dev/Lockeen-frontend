import {
  clearMockSession,
  createMockUser,
  getAuthMode,
  isMockAuthMode,
  readMockSession,
  writeMockSession,
} from '../lib/authClient';
import { requireSupabaseClient, supabase } from '../lib/supabaseClient';

const listeners = new Set();
const AUTH_RETURN_VIEW_KEY = 'lockeen-auth-return-view';
const OAUTH_RELOAD_KEY = 'lockeen-oauth-reload';

function ok(data) {
  return { data: structuredClone(data), error: null };
}

function fail(message, code = 'AUTH_ERROR') {
  return { data: null, error: { code, message } };
}

function withTimeout(promise, ms, fallback) {
  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function notify(session) {
  listeners.forEach((callback) => callback(structuredClone(session)));
}

function createSession(user) {
  return {
    user,
    status: 'authenticated',
    accessToken: `mock-token-${user.id}`,
    createdAt: new Date().toISOString(),
  };
}

function mapSupabaseUser(user) {
  if (!user) return null;

  const metadata = user.user_metadata || {};
  const appMetadata = user.app_metadata || {};
  const authProviders = Array.isArray(user.identities)
    ? user.identities.map((identity) => String(identity?.provider || '').toLowerCase()).filter(Boolean)
    : [];
  const authProvider = authProviders[0] || String(appMetadata.provider || 'email').toLowerCase();
  const adminEmails = new Set(['support.lockeen@gmail.com']);
  const name =
    metadata.full_name ||
    metadata.name ||
    user.email?.split('@')[0] ||
    'Lockeen User';

  return {
    id: user.id,
    email: user.email || '',
    name,
    language: metadata.language || 'en',
    timezone: metadata.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Rome',
    planTier: appMetadata.plan_tier || appMetadata.plan || appMetadata.subscription_plan || 'free',
    isAdmin: Boolean(appMetadata.is_admin || appMetadata.admin || appMetadata.lockeen_role === 'admin' || appMetadata.role === 'admin' || adminEmails.has(String(user.email || '').toLowerCase())),
    provider: 'supabase',
    authProvider,
    authProviders,
    createdAt: user.created_at || new Date().toISOString(),
  };
}

function createSupabaseSession(session) {
  const user = mapSupabaseUser(session?.user);

  return {
    user,
    status: user ? 'authenticated' : 'anonymous',
    accessToken: session?.access_token || null,
    createdAt: new Date().toISOString(),
  };
}

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function readAuthCodeFromUrl() {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const isRecovery = url.searchParams.get('auth') === 'reset' || hashParams.get('type') === 'recovery';
  if (isRecovery) return null;
  return url.searchParams.get('code');
}

function readOAuthTokensFromUrl() {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const isRecovery = url.searchParams.get('auth') === 'reset' || hashParams.get('type') === 'recovery';
  if (isRecovery) return null;

  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  if (!accessToken || !refreshToken) return null;

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}

function cleanAuthCallbackFromUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const hasAuthCallback = url.searchParams.has('code') || window.location.hash;
  if (!hasAuthCallback) return;
  url.searchParams.delete('code');
  url.searchParams.delete('auth');
  window.history.replaceState({}, '', `${url.pathname}${url.search}`);
}

function reloadAfterOAuthCallback() {
  if (typeof window === 'undefined') return;
  if (sessionStorage.getItem(OAUTH_RELOAD_KEY) === 'done') return;
  sessionStorage.setItem(OAUTH_RELOAD_KEY, 'done');
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('auth');
  url.searchParams.set('oauth_ready', '1');
  url.searchParams.set('v', String(Date.now()));
  window.location.replace(`${url.pathname}${url.search}`);
}

function rememberReturnView() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  if (view) localStorage.setItem(AUTH_RETURN_VIEW_KEY, view);
}

function requireSupabaseAuthMode() {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  if (getAuthMode() !== 'supabase') {
    return fail(`Unsupported auth mode: ${getAuthMode()}.`, 'AUTH_MODE_UNSUPPORTED');
  }

  return null;
}

async function ensurePasswordRecoverySession() {
  if (typeof window === 'undefined') {
    return fail('Auth session missing. Request a new password reset email and open the latest link.', 'RECOVERY_SESSION_MISSING');
  }

  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const recoveryError = url.searchParams.get('error_description') || hashParams.get('error_description');
  const recoveryErrorCode = url.searchParams.get('error_code') || hashParams.get('error_code');
  if (recoveryError || recoveryErrorCode) {
    return fail(
      recoveryError || 'This reset link is invalid or expired. Request a new password reset email and open the latest link.',
      recoveryErrorCode || 'RECOVERY_LINK_INVALID',
    );
  }

  const code = url.searchParams.get('code');
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return fail(error.message, error.code || 'RECOVERY_SESSION_FAILED');
    }
    if (data?.session?.access_token) return ok(data.session);
  }

  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      return fail(error.message, error.code || 'RECOVERY_SESSION_FAILED');
    }
    if (data?.session?.access_token) return ok(data.session);
  }

  const { data: currentSession } = await supabase.auth.getSession();
  if (currentSession?.session?.access_token) {
    return ok(currentSession.session);
  }

  return fail('Auth session missing. Request a new password reset email and open the latest link.', 'RECOVERY_SESSION_MISSING');
}

export async function restoreSession() {
  if (!isMockAuthMode()) {
    const modeError = requireSupabaseAuthMode();
    if (modeError) return modeError;

    const authCode = readAuthCodeFromUrl();
    if (authCode) {
      const { error } = await supabase.auth.exchangeCodeForSession(authCode);
      cleanAuthCallbackFromUrl();
      if (error) return fail(error.message, error.code || 'OAUTH_SESSION_FAILED');
      reloadAfterOAuthCallback();
    }

    const oauthTokens = readOAuthTokensFromUrl();
    if (oauthTokens) {
      const { error } = await supabase.auth.setSession(oauthTokens);
      cleanAuthCallbackFromUrl();
      if (error) return fail(error.message, error.code || 'OAUTH_SESSION_FAILED');
      reloadAfterOAuthCallback();
    }

    const { data, error, timedOut } = await withTimeout(
      supabase.auth.getSession(),
      4500,
      { data: { session: null }, error: null, timedOut: true },
    );

    if (error) return fail(error.message, error.code || 'SESSION_RESTORE_FAILED');
    if (timedOut) {
      return ok({
        user: null,
        status: 'anonymous',
      });
    }

    if (!data.session?.user) {
      return ok(createSupabaseSession(data.session));
    }

    const freshUserResult = await withTimeout(
      supabase.auth.getUser(),
      3500,
      { data: null, error: null, timedOut: true },
    );

    if (!freshUserResult?.error && freshUserResult?.data?.user) {
      return ok(createSupabaseSession({
        ...data.session,
        user: freshUserResult.data.user,
      }));
    }

    return ok(createSupabaseSession(data.session));
  }

  const session = readMockSession();

  if (!session?.user) {
    return ok({
      user: null,
      status: 'anonymous',
    });
  }

  return ok({
    user: session.user,
    status: 'authenticated',
  });
}

export async function getCurrentUser() {
  const result = await restoreSession();

  if (result.error) return result;

  return ok(result.data.user);
}

export async function requireAuthenticatedUserId() {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const { data, error, timedOut } = await withTimeout(
    supabase.auth.getUser(),
    4500,
    { data: null, error: null, timedOut: true },
  );

  if (timedOut) {
    const sessionResult = await withTimeout(
      supabase.auth.getSession(),
      2500,
      { data: { session: null }, error: null, timedOut: true },
    );
    const sessionUserId = sessionResult?.data?.session?.user?.id;
    if (sessionUserId) return ok(sessionUserId);

    return fail('Authentication check timed out. Please refresh and try again.', 'AUTH_TIMEOUT');
  }

  if (error || !data?.user?.id) {
    return fail('Real mode requires an authenticated Supabase session.', 'AUTH_REQUIRED');
  }

  return ok(data.user.id);
}

export async function signIn(input = {}) {
  const email = normalizeEmail(input.email);
  if (!email) {
    return fail('Email is required.', 'VALIDATION_ERROR');
  }

  if (!isMockAuthMode()) {
    const modeError = requireSupabaseAuthMode();
    if (modeError) return modeError;

    if (!input.password) {
      return fail('Password is required.', 'VALIDATION_ERROR');
    }

    if (input.provider && input.provider !== 'password') {
      return fail('Only email and password sign-in is enabled for beta.', 'PROVIDER_UNSUPPORTED');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: input.password,
    });

    if (error) return fail(error.message, error.code || 'SIGN_IN_FAILED');

    return ok(createSupabaseSession(data.session));
  }

  const user = createMockUser(input);
  const session = createSession(user);

  writeMockSession(session);
  notify(session);

  return ok({
    user,
    status: 'authenticated',
  });
}

export async function signInWithGoogle() {
  if (!isMockAuthMode()) {
    const modeError = requireSupabaseAuthMode();
    if (modeError) return modeError;

    rememberReturnView();
    if (typeof window !== 'undefined') sessionStorage.removeItem(OAUTH_RELOAD_KEY);
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/?auth=oauth&v=${Date.now()}` : undefined;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) return fail(error.message, error.code || 'GOOGLE_SIGN_IN_FAILED');

    return ok({
      provider: 'google',
      status: 'redirecting',
      url: data?.url || null,
    });
  }

  const user = createMockUser({
    name: 'Alex',
    email: 'alex@gmail.com',
    provider: 'google',
  });
  const session = createSession(user);

  writeMockSession(session);
  notify(session);

  return ok({
    user,
    status: 'authenticated',
  });
}

export async function signUp(input = {}) {
  const email = normalizeEmail(input.email);
  if (!email) {
    return fail('Email is required.', 'VALIDATION_ERROR');
  }

  if (!isMockAuthMode()) {
    const modeError = requireSupabaseAuthMode();
    if (modeError) return modeError;

    if (!input.password) {
      return fail('Password is required.', 'VALIDATION_ERROR');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: {
          name: input.name || email.split('@')[0],
          full_name: input.name || email.split('@')[0],
        },
      },
    });

    if (error) return fail(error.message, error.code || 'SIGN_UP_FAILED');

    if (!data.session) {
      return fail('Check your email to confirm your account before signing in.', 'EMAIL_CONFIRMATION_REQUIRED');
    }

    return ok(createSupabaseSession(data.session));
  }

  const user = createMockUser(input);
  const session = createSession(user);

  writeMockSession(session);
  notify(session);

  return ok({
    user,
    status: 'authenticated',
  });
}

export async function requestPasswordReset(input = {}) {
  const email = normalizeEmail(input.email);
  if (!email) return fail('Email is required.', 'VALIDATION_ERROR');

  if (!isMockAuthMode()) {
    const modeError = requireSupabaseAuthMode();
    if (modeError) return modeError;

    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/?auth=reset` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) return fail(error.message, error.code || 'PASSWORD_RESET_FAILED');

    return ok({
      email,
      status: 'sent',
    });
  }

  return ok({
    email,
    status: 'sent',
  });
}

export async function updatePassword(input = {}) {
  if (!input.password) return fail('Password is required.', 'VALIDATION_ERROR');
  if (String(input.password).length < 6) {
    return fail('Password must be at least 6 characters.', 'VALIDATION_ERROR');
  }

  if (!isMockAuthMode()) {
    const modeError = requireSupabaseAuthMode();
    if (modeError) return modeError;

    const recoverySession = await withTimeout(
      ensurePasswordRecoverySession(),
      7000,
      fail('Password reset session timed out. Request a new reset email and try again.', 'RECOVERY_SESSION_TIMEOUT'),
    );
    if (recoverySession.error) return recoverySession;

    const { data, error } = await withTimeout(
      supabase.auth.updateUser({
        password: input.password,
      }),
      7000,
      { data: null, error: { message: 'Password update timed out. Please try again.', code: 'PASSWORD_UPDATE_TIMEOUT' } },
    );

    if (error) return fail(error.message, error.code || 'PASSWORD_UPDATE_FAILED');

    return ok(createSupabaseSession({ user: data.user }));
  }

  return ok({
    user: readMockSession()?.user || null,
    status: 'authenticated',
  });
}

export async function updateProfile(input = {}) {
  const name = String(input.name || '').trim();
  const language = input.language === 'it' ? 'it' : 'en';
  const timezone = String(input.timezone || '').trim() || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Rome';

  if (!name) return fail('Name is required.', 'VALIDATION_ERROR');

  if (!isMockAuthMode()) {
    const modeError = requireSupabaseAuthMode();
    if (modeError) return modeError;

    const { data, error } = await supabase.auth.updateUser({
      data: {
        name,
        full_name: name,
        language,
        timezone,
      },
    });

    if (error) return fail(error.message, error.code || 'PROFILE_UPDATE_FAILED');

    return ok(createSupabaseSession({ user: data.user }));
  }

  const session = readMockSession();
  if (!session?.user) return fail('You must be signed in to update your profile.', 'AUTH_REQUIRED');

  const nextSession = {
    ...session,
    user: {
      ...session.user,
      name,
      language,
      timezone,
    },
  };
  writeMockSession(nextSession);
  notify(nextSession);

  return ok({
    user: nextSession.user,
    status: 'authenticated',
  });
}

export async function updateEmail(input = {}) {
  const email = normalizeEmail(input.email);
  if (!email) return fail('Email is required.', 'VALIDATION_ERROR');

  if (!isMockAuthMode()) {
    const modeError = requireSupabaseAuthMode();
    if (modeError) return modeError;

    const { data, error } = await supabase.auth.updateUser({ email });

    if (error) return fail(error.message, error.code || 'EMAIL_UPDATE_FAILED');

    return ok({
      ...createSupabaseSession({ user: data.user }),
      pendingEmail: data.user?.new_email || email,
    });
  }

  const session = readMockSession();
  if (!session?.user) return fail('You must be signed in to update your email.', 'AUTH_REQUIRED');

  const nextSession = {
    ...session,
    user: {
      ...session.user,
      email,
    },
  };
  writeMockSession(nextSession);
  notify(nextSession);

  return ok({
    user: nextSession.user,
    status: 'authenticated',
    pendingEmail: null,
  });
}

export async function signOut() {
  if (!isMockAuthMode()) {
    const modeError = requireSupabaseAuthMode();
    if (modeError) return modeError;

    const { error } = await supabase.auth.signOut();

    if (error) return fail(error.message, error.code || 'SIGN_OUT_FAILED');

    return ok({
      user: null,
      status: 'anonymous',
    });
  }

  clearMockSession();

  const session = {
    user: null,
    status: 'anonymous',
  };

  notify(session);

  return ok(session);
}

export function onAuthStateChange(callback) {
  if (!isMockAuthMode()) {
    const modeError = requireSupabaseAuthMode();

    if (modeError) {
      queueMicrotask(() =>
        callback({
          user: null,
          status: 'error',
          error: modeError.error,
        }),
      );
      return function unsubscribe() {};
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback({
        ...createSupabaseSession(session),
        event,
      });
    });

    return function unsubscribe() {
      data.subscription.unsubscribe();
    };
  }

  listeners.add(callback);

  return function unsubscribe() {
    listeners.delete(callback);
  };
}
