import {
  clearMockSession,
  createMockUser,
  isMockAuthMode,
  readMockSession,
  writeMockSession,
} from '../lib/authClient';

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

function requireMockMode() {
  if (!isMockAuthMode()) {
    return fail('Real auth mode is not implemented yet.', 'REAL_AUTH_NOT_IMPLEMENTED');
  }

  return null;
}

export async function restoreSession() {
  const modeError = requireMockMode();
  if (modeError) return modeError;

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
  const modeError = requireMockMode();
  if (modeError) return modeError;

  if (!input.email) {
    return fail('Email is required.', 'VALIDATION_ERROR');
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
  const modeError = requireMockMode();
  if (modeError) return modeError;

  if (!input.email) {
    return fail('Email is required.', 'VALIDATION_ERROR');
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
  const modeError = requireMockMode();
  if (modeError) return modeError;

  clearMockSession();

  const session = {
    user: null,
    status: 'anonymous',
  };

  notify(session);

  return ok(session);
}

export function onAuthStateChange(callback) {
  listeners.add(callback);

  return function unsubscribe() {
    listeners.delete(callback);
  };
}
