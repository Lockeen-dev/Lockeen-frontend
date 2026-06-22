import { getStripe, json, readRawBody, updateUserBillingMetadata } from './_billing-utils.js';

function asId(value) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id || null;
}

function toUnix(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function getPlanTierFromSubscription(subscription) {
  const status = subscription?.status;
  return status === 'active' || status === 'trialing' ? 'pro' : 'free';
}

function subscriptionMetadata(subscription) {
  const userId = subscription?.metadata?.supabase_user_id;
  if (!userId) return null;

  const planTier = getPlanTierFromSubscription(subscription);
  return {
    userId,
    metadata: {
      plan_tier: planTier,
      subscription_plan: planTier,
      stripe_customer_id: asId(subscription.customer),
      stripe_subscription_id: subscription.id || null,
      stripe_subscription_status: subscription.status || null,
      stripe_price_id: subscription.items?.data?.[0]?.price?.id || null,
      stripe_billing_period: subscription.metadata?.billing_period || null,
      stripe_current_period_end: toUnix(subscription.current_period_end),
    },
  };
}

async function handleCheckoutCompleted(session) {
  const userId = session?.metadata?.supabase_user_id || session?.client_reference_id;
  if (!userId) return { skipped: true, reason: 'missing_user_id' };

  return updateUserBillingMetadata(userId, {
    plan_tier: 'pro',
    subscription_plan: 'pro',
    stripe_customer_id: asId(session.customer),
    stripe_subscription_id: asId(session.subscription),
    stripe_checkout_session_id: session.id || null,
    stripe_subscription_status: 'checkout_completed',
    stripe_billing_period: session.metadata?.billing_period || null,
  });
}

async function handleSubscriptionEvent(subscription) {
  const payload = subscriptionMetadata(subscription);
  if (!payload) return { skipped: true, reason: 'missing_user_id' };
  return updateUserBillingMetadata(payload.userId, payload.metadata);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } });
  }

  const stripe = getStripe();
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return json(res, 503, {
      error: { code: 'STRIPE_WEBHOOK_CONFIG_MISSING', message: 'Stripe webhook is not configured yet.' },
    });
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return json(res, 400, {
      error: { code: 'STRIPE_SIGNATURE_MISSING', message: 'Missing Stripe signature.' },
    });
  }

  let event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return json(res, 400, {
      error: { code: 'STRIPE_SIGNATURE_INVALID', message: error?.message || 'Invalid Stripe signature.' },
    });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const result = await handleCheckoutCompleted(event.data.object);
      if (result?.error) return json(res, 500, { error: result.error });
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const result = await handleSubscriptionEvent(event.data.object);
      if (result?.error) return json(res, 500, { error: result.error });
    }

    return json(res, 200, { received: true });
  } catch (error) {
    return json(res, 500, {
      error: { code: 'STRIPE_WEBHOOK_FAILED', message: error?.message || 'Stripe webhook failed.' },
    });
  }
}
