const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'mock';
const MOCK_SESSION_KEY = 'lockeen_mock_session';

export function getAuthMode() {
  return AUTH_MODE;
}

export function isMockAuthMode() {
  return AUTH_MODE === 'mock';
}

export function readMockSession() {
  try {
    const rawSession = localStorage.getItem(MOCK_SESSION_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
}

export function writeMockSession(session) {
  localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session));
}

export function clearMockSession() {
  localStorage.removeItem(MOCK_SESSION_KEY);
}

export function createMockUser(input = {}) {
  const email = input.email || 'demo@lockeen.app';
  const name = input.name || email.split('@')[0] || 'Demo User';

  return {
    id: `mock-user-${btoa(email).replace(/=+$/g, '')}`,
    email,
    name,
    provider: 'mock',
    createdAt: new Date().toISOString(),
  };
}
