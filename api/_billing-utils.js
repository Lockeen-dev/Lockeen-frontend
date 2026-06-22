import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

let stripeClient = null;
let supabaseAuthClient = null;
let supabaseAdminClient = null;

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export function getBearerToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}

export function getJsonBody(req) {
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

export function getOrigin(req) {
  const origin = req.headers.origin;
  if (origin) return origin;

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return host ? `${proto}://${host}` : 'https://lockeen-frontend.vercel.app';
}

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

export function getSupabaseAuthClient() {
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

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseAdminClient;
}

export async function requireAuthenticatedUser(req, feature = 'Billing') {
  const token = getBearerToken(req);
  if (!token) {
    return {
      data: null,
      error: { code: 'AUTH_REQUIRED', message: `${feature} requires an authenticated Supabase session.` },
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
      error: { code: 'AUTH_REQUIRED', message: `${feature} requires a valid Supabase session.` },
    };
  }

  return { data: { user: data.user }, error: null };
}

export async function readRawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body;

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function updateUserBillingMetadata(userId, billingMetadata = {}) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      data: null,
      error: { code: 'SUPABASE_SERVICE_ROLE_MISSING', message: 'Supabase service role key is required for billing updates.' },
    };
  }

  const { data: currentUser, error: getError } = await admin.auth.admin.getUserById(userId);
  if (getError || !currentUser?.user?.id) {
    return {
      data: null,
      error: { code: 'USER_LOOKUP_FAILED', message: getError?.message || 'Unable to load user for billing update.' },
    };
  }

  const nextAppMetadata = {
    ...(currentUser.user.app_metadata || {}),
    ...billingMetadata,
    billing_updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: nextAppMetadata,
  });

  if (error) {
    return {
      data: null,
      error: { code: 'USER_BILLING_UPDATE_FAILED', message: error.message },
    };
  }

  return { data, error: null };
}
