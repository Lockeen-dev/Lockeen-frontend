import { isMockAuthMode } from '../lib/authClient';
import { requireSupabaseClient, supabase } from '../lib/supabaseClient';

function fail(message, code = 'BILLING_ERROR') {
  return { data: null, error: { code, message } };
}

function ok(data) {
  return { data, error: null };
}

async function getAccessToken() {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) {
    return fail('Please sign in again before upgrading.', 'AUTH_REQUIRED');
  }

  return ok(data.session.access_token);
}

export async function startCheckout({ billingPeriod = 'monthly' } = {}) {
  if (isMockAuthMode()) {
    return fail('Stripe Checkout is available only in real auth mode.', 'BILLING_REAL_MODE_REQUIRED');
  }

  const tokenResult = await getAccessToken();
  if (tokenResult.error) return tokenResult;

  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenResult.data}`,
    },
    body: JSON.stringify({
      billingPeriod: billingPeriod === 'yearly' ? 'yearly' : 'monthly',
    }),
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok || !payload.url) {
    return fail(
      payload?.error?.message || 'Could not start Stripe Checkout.',
      payload?.error?.code || 'STRIPE_CHECKOUT_FAILED',
    );
  }

  return ok({ url: payload.url });
}
