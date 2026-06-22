import { getJsonBody, getOrigin, getStripe, json, requireAuthenticatedUser } from './_billing-utils.js';

function getPriceId(billingPeriod) {
  if (billingPeriod === 'yearly') return process.env.STRIPE_PRO_YEARLY_PRICE_ID;
  if (billingPeriod === 'monthly') return process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  return null;
}

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

  const authResult = await requireAuthenticatedUser(req, 'Checkout');
  if (authResult.error) {
    return json(res, 401, { error: authResult.error });
  }

  const body = getJsonBody(req);
  const billingPeriod = body.billingPeriod === 'yearly' ? 'yearly' : 'monthly';
  const priceId = getPriceId(billingPeriod);

  if (!priceId) {
    return json(res, 503, {
      error: { code: 'STRIPE_PRICE_MISSING', message: 'Stripe price is not configured for this plan.' },
    });
  }

  const origin = getOrigin(req);
  const user = authResult.data.user;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      metadata: {
        supabase_user_id: user.id,
        plan_tier: 'pro',
        billing_period: billingPeriod,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_tier: 'pro',
          billing_period: billingPeriod,
        },
      },
      success_url: `${origin}/app?view=account&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app?view=account&checkout=cancelled`,
    });

    return json(res, 200, { url: session.url });
  } catch (error) {
    return json(res, 500, {
      error: {
        code: 'STRIPE_CHECKOUT_FAILED',
        message: error?.message || 'Could not start Stripe Checkout.',
      },
    });
  }
}
