import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

let stripeClient = null;
let supabaseAuthClient = null;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function getBearerToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}

function getJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function getOrigin(req) {
  const origin = req.headers.origin;
  if (origin) return origin;

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return host ? `${proto}://${host}` : 'https://lockeen-frontend.vercel.app';
}

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

function getSupabaseAuthClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const publicKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publicKey) return null;

  if (!supabaseAuthClient) {
    supabaseAuthClient = createClient(supabaseUrl, publicKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseAuthClient;
}

function getPriceId(billingPeriod) {
  if (billingPeriod === 'yearly') return process.env.STRIPE_PRO_YEARLY_PRICE_ID;
  if (billingPeriod === 'monthly') return process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  return null;
}

async function requireAuthenticatedUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    return {
      data: null,
      error: { code: 'AUTH_REQUIRED', message: 'Checkout requires an authenticated Supabase session.' },
    };
  }

  const client = getSupabaseAuthClient();
  if (!client) {
    return {
      data: null,
      error: { code: 'SUPABASE_CONFIG_MISSING', message: 'Supabase server auth config is missing.' },
    };
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user?.id) {
    return {
      data: null,
      error: { code: 'AUTH_REQUIRED', message: 'Checkout requires a valid Supabase session.' },
    };
  }

  return { data: { user: data.user }, error: null };
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

  const authResult = await requireAuthenticatedUser(req);
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
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
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
