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

function ok(data) {
  return { data: structuredClone(data), error: null };
}

function fail(message, code = 'AUTH_ERROR') {
  return { data: null, error: { code, message } };
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
  const name =
    metadata.full_name ||
    metadata.name ||
    user.email?.split('@')[0] ||
    'Lockeen User';

  return {
    id: user.id,
    email: user.email || '',
    name,
    provider: 'supabase',
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

function requireSupabaseAuthMode() {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  if (getAuthMode() !== 'supabase') {
    return fail(`Unsupported auth mode: ${getAuthMode()}.`, 'AUTH_MODE_UNSUPPORTED');
  }

  return null;
}

export async function restoreSession() {
  if (!isMockAuthMode()) {
    const modeError = requireSupabaseAuthMode();
    if (modeError) return modeError;

    const { data, error } = await supabase.auth.getSession();

    if (error) return fail(error.message, error.code || 'SESSION_RESTORE_FAILED');

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

export async function signIn(input = {}) {
  if (!input.email) {
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
      email: input.email,
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

export async function signUp(input = {}) {
  if (!input.email) {
    return fail('Email is required.', 'VALIDATION_ERROR');
  }

  if (!isMockAuthMode()) {
    const modeError = requireSupabaseAuthMode();
    if (modeError) return modeError;

    if (!input.password) {
      return fail('Password is required.', 'VALIDATION_ERROR');
    }

    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          name: input.name || input.email.split('@')[0],
          full_name: input.name || input.email.split('@')[0],
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

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(createSupabaseSession(session));
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
