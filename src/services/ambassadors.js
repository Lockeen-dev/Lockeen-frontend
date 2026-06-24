import { isMockAuthMode } from '../lib/authClient';
import { requireSupabaseClient, supabase } from '../lib/supabaseClient';
import { fail, ok } from './_shared';

async function getAccessToken(feature = 'Ambassador') {
  if (isMockAuthMode()) {
    return fail(`${feature} is available only in real auth mode.`, 'REAL_AUTH_REQUIRED');
  }

  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) {
    return fail('Please sign in again.', 'AUTH_REQUIRED');
  }

  return ok(data.session.access_token);
}

async function apiRequest(path, { method = 'GET', body, feature = 'Ambassador' } = {}) {
  const token = await getAccessToken(feature);
  if (token.error) return token;

  const response = await fetch(path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token.data}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    return fail(payload?.error?.message || 'Request failed.', payload?.error?.code || 'REQUEST_FAILED');
  }

  return ok(payload);
}

export async function getAmbassadorDashboard() {
  return apiRequest('/api/ambassador-dashboard', { feature: 'Ambassador dashboard' });
}

export async function submitLoggedAmbassadorApplication(input) {
  return apiRequest('/api/ambassador-application', {
    method: 'POST',
    body: input,
    feature: 'Ambassador application',
  });
}

export async function attributeReferral(input) {
  return apiRequest('/api/ambassador-attribution', {
    method: 'POST',
    body: input,
    feature: 'Referral attribution',
  });
}

export async function getAmbassadorAdmin() {
  return apiRequest('/api/admin-ambassadors', { feature: 'Ambassador admin' });
}

export async function runAmbassadorAdminAction(body) {
  return apiRequest('/api/admin-ambassadors', {
    method: 'POST',
    body,
    feature: 'Ambassador admin',
  });
}
