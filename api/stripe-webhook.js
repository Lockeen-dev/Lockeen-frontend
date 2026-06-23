import { getStripe, getSupabaseAdmin, json, readRawBody, updateUserBillingMetadata } from './_billing-utils.js';

function asId(value) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id || null;
}

function normalizeReferralCode(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 60);
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

  const billingResult = await updateUserBillingMetadata(userId, {
    plan_tier: 'pro',
    subscription_plan: 'pro',
    stripe_customer_id: asId(session.customer),
    stripe_subscription_id: asId(session.subscription),
    stripe_checkout_session_id: session.id || null,
    stripe_subscription_status: 'checkout_completed',
    stripe_billing_period: session.metadata?.billing_period || null,
  });

  if (billingResult?.error) return billingResult;

  await ensureReferralFromCode({
    userId,
    referralCode: session.metadata?.referral_code,
    source: 'stripe_checkout_session',
  });

  return markReferralPaid({
    userId,
    subscriptionId: asId(session.subscription),
    subscriptionStatus: 'checkout_completed',
    paidAt: new Date().toISOString(),
  });
}

async function handleSubscriptionEvent(subscription) {
  const payload = subscriptionMetadata(subscription);
  if (!payload) return { skipped: true, reason: 'missing_user_id' };
  const billingResult = await updateUserBillingMetadata(payload.userId, payload.metadata);
  if (billingResult?.error) return billingResult;
  if (payload.metadata.plan_tier !== 'pro') {
    return markReferralPaid({
      userId: payload.userId,
      subscriptionId: payload.metadata.stripe_subscription_id,
      subscriptionStatus: 'deleted',
      paidAt: new Date().toISOString(),
    });
  }
  return { data: billingResult.data };
}

function invoicePeriodStart(invoice) {
  const unix =
    invoice?.lines?.data?.[0]?.period?.start ||
    invoice?.period_start ||
    Math.floor(Date.now() / 1000);
  return new Date(Number(unix) * 1000).toISOString().slice(0, 10);
}

function invoicePeriodEnd(invoice) {
  const unix = invoice?.lines?.data?.[0]?.period?.end || invoice?.period_end || null;
  return unix ? new Date(Number(unix) * 1000).toISOString().slice(0, 10) : null;
}

async function markReferralPaid({ userId, subscriptionId, subscriptionStatus = 'active', paidAt }) {
  if (!userId) return { skipped: true, reason: 'missing_user_id' };
  const admin = getSupabaseAdmin();
  if (!admin) return { skipped: true, reason: 'supabase_admin_missing' };

  const { data: referral, error: referralError } = await admin
    .from('referrals')
    .select('*')
    .eq('referred_user_id', userId)
    .maybeSingle();

  if (referralError) return { error: { code: 'REFERRAL_LOOKUP_FAILED', message: referralError.message } };
  if (!referral?.id) return { skipped: true, reason: 'no_referral' };

  const nextFirstPaidAt = referral.first_paid_at || paidAt || new Date().toISOString();
  const { error: updateError } = await admin
    .from('referrals')
    .update({
      status: subscriptionStatus === 'deleted' || subscriptionStatus === 'canceled' ? 'cancelled' : 'active',
      first_paid_at: nextFirstPaidAt,
      last_paid_at: paidAt || new Date().toISOString(),
      current_subscription_id: subscriptionId || referral.current_subscription_id,
      subscription_status: subscriptionStatus,
    })
    .eq('id', referral.id);

  if (updateError) return { error: { code: 'REFERRAL_UPDATE_FAILED', message: updateError.message } };
  return { data: referral };
}

async function ensureReferralFromCode({ userId, referralCode, source }) {
  const code = normalizeReferralCode(referralCode);
  if (!userId || !code) return { skipped: true, reason: 'missing_referral_code' };

  const admin = getSupabaseAdmin();
  if (!admin) return { skipped: true, reason: 'supabase_admin_missing' };

  const { data: existing, error: existingError } = await admin
    .from('referrals')
    .select('id')
    .eq('referred_user_id', userId)
    .maybeSingle();
  if (existingError) return { error: { code: 'REFERRAL_LOOKUP_FAILED', message: existingError.message } };
  if (existing?.id) return { data: existing };

  const { data: ambassador, error: ambassadorError } = await admin
    .from('ambassadors')
    .select('*')
    .ilike('referral_code', code)
    .eq('status', 'active')
    .maybeSingle();
  if (ambassadorError) return { error: { code: 'AMBASSADOR_LOOKUP_FAILED', message: ambassadorError.message } };
  if (!ambassador?.id || ambassador.user_id === userId) return { skipped: true, reason: 'invalid_referral_code' };

  const { data: userResult } = await admin.auth.admin.getUserById(userId);
  const { data: referral, error: referralError } = await admin
    .from('referrals')
    .insert([{
      ambassador_id: ambassador.id,
      referred_user_id: userId,
      referral_code: ambassador.referral_code,
      referred_email: userResult?.user?.email || null,
      status: 'signed_up',
      metadata: { attributedFrom: source || 'stripe' },
    }])
    .select('*')
    .single();

  if (referralError && referralError.code !== '23505') {
    return { error: { code: 'REFERRAL_CREATE_FAILED', message: referralError.message } };
  }
  return { data: referral };
}

async function handleInvoicePaid(invoice, stripe) {
  if (!invoice || Number(invoice.amount_paid || 0) <= 0) {
    return { skipped: true, reason: 'invoice_not_paid' };
  }

  const subscriptionId = asId(invoice.subscription) || asId(invoice.parent?.subscription_details?.subscription);
  let subscription = null;
  if (subscriptionId) {
    try {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
    } catch (_) {
      subscription = null;
    }
  }

  const userId =
    invoice.metadata?.supabase_user_id ||
    subscription?.metadata?.supabase_user_id ||
    invoice.parent?.subscription_details?.metadata?.supabase_user_id ||
    null;

  await ensureReferralFromCode({
    userId,
    referralCode:
      invoice.metadata?.referral_code ||
      subscription?.metadata?.referral_code ||
      invoice.parent?.subscription_details?.metadata?.referral_code,
    source: 'stripe_invoice_paid',
  });

  const paidResult = await markReferralPaid({
    userId,
    subscriptionId,
    subscriptionStatus: subscription?.status || 'active',
    paidAt: new Date((invoice.status_transitions?.paid_at || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
  });
  if (paidResult?.error || !paidResult?.data?.id) return paidResult;

  const admin = getSupabaseAdmin();
  if (!admin) return { skipped: true, reason: 'supabase_admin_missing' };

  const { data: ambassador, error: ambassadorError } = await admin
    .from('ambassadors')
    .select('*')
    .eq('id', paidResult.data.ambassador_id)
    .eq('status', 'active')
    .single();

  if (ambassadorError || !ambassador?.id) {
    return { error: { code: 'AMBASSADOR_LOOKUP_FAILED', message: ambassadorError?.message || 'Ambassador not found.' } };
  }

  const { error: commissionError } = await admin
    .from('ambassador_commissions')
    .insert([{
      ambassador_id: ambassador.id,
      referral_id: paidResult.data.id,
      referred_user_id: userId,
      stripe_subscription_id: subscriptionId,
      stripe_invoice_id: invoice.id,
      amount_cents: ambassador.commission_cents || 200,
      currency: String(invoice.currency || 'eur').toLowerCase(),
      period_start: invoicePeriodStart(invoice),
      period_end: invoicePeriodEnd(invoice),
      status: 'available',
      available_at: new Date().toISOString(),
      metadata: {
        invoiceAmountPaid: invoice.amount_paid,
        invoiceHostedUrl: invoice.hosted_invoice_url || null,
      },
    }]);

  if (commissionError && commissionError.code !== '23505') {
    return { error: { code: 'COMMISSION_CREATE_FAILED', message: commissionError.message } };
  }

  return { data: { referralId: paidResult.data.id, commissionCreated: commissionError?.code !== '23505' } };
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

    if (event.type === 'invoice.paid') {
      const result = await handleInvoicePaid(event.data.object, stripe);
      if (result?.error) return json(res, 500, { error: result.error });
    }

    return json(res, 200, { received: true });
  } catch (error) {
    return json(res, 500, {
      error: { code: 'STRIPE_WEBHOOK_FAILED', message: error?.message || 'Stripe webhook failed.' },
    });
  }
}
