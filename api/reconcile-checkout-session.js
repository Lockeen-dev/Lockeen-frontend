import { getJsonBody, getStripe, json, requireAuthenticatedUser } from './_billing-utils.js';
import { handleCheckoutCompleted } from './stripe-webhook.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } });
  }

  const stripe = getStripe();
  if (!stripe) {
    return json(res, 503, {
      error: { code: 'STRIPE_CONFIG_MISSING', message: 'Stripe is not configured yet.' },
    });
  }

  const authResult = await requireAuthenticatedUser(req, 'Checkout reconciliation');
  if (authResult.error) {
    return json(res, 401, { error: authResult.error });
  }

  const body = getJsonBody(req);
  const sessionId = String(body.sessionId || '').trim();
  if (!sessionId || !sessionId.startsWith('cs_')) {
    return json(res, 400, {
      error: { code: 'CHECKOUT_SESSION_REQUIRED', message: 'A valid Checkout session ID is required.' },
    });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const expectedUserId = session?.metadata?.supabase_user_id || session?.client_reference_id;
    if (!expectedUserId || expectedUserId !== authResult.data.user.id) {
      return json(res, 403, {
        error: { code: 'CHECKOUT_SESSION_USER_MISMATCH', message: 'Checkout session does not belong to this user.' },
      });
    }

    const result = await handleCheckoutCompleted(session, stripe);
    if (result?.error) return json(res, 500, { error: result.error });

    return json(res, 200, { data: result?.data || null, skipped: result?.skipped || false });
  } catch (error) {
    return json(res, 500, {
      error: { code: 'CHECKOUT_RECONCILE_FAILED', message: error?.message || 'Could not reconcile Checkout session.' },
    });
  }
}
