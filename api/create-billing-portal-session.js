import { getOrigin, getStripe, json, requireAuthenticatedUser } from './_billing-utils.js';

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

  const authResult = await requireAuthenticatedUser(req, 'Billing portal');
  if (authResult.error) {
    return json(res, 401, { error: authResult.error });
  }

  const user = authResult.data.user;
  const customerId = user.app_metadata?.stripe_customer_id;

  if (!customerId) {
    return json(res, 409, {
      error: { code: 'STRIPE_CUSTOMER_MISSING', message: 'No Stripe customer is connected to this account yet.' },
    });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getOrigin(req)}/?billing=return`,
    });

    return json(res, 200, { url: session.url });
  } catch (error) {
    return json(res, 500, {
      error: {
        code: 'STRIPE_PORTAL_FAILED',
        message: error?.message || 'Could not open the Stripe billing portal.',
      },
    });
  }
}
