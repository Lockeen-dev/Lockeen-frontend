import { getSupabaseAdmin, json, requireAuthenticatedUser } from './_billing-utils.js';

const DEFAULT_FREE_MONTHLY_QUOTA = 20;

function getFreeMonthlyQuota() {
  const quota = Number(process.env.AI_FREE_MONTHLY_QUOTA || process.env.AI_DAILY_QUOTA || DEFAULT_FREE_MONTHLY_QUOTA);
  return Number.isFinite(quota) && quota > 0 ? quota : DEFAULT_FREE_MONTHLY_QUOTA;
}

function getPlanTier(user = {}) {
  const metadata = user.app_metadata || {};
  const plan = String(metadata.plan_tier || metadata.plan || metadata.subscription_plan || 'free').toLowerCase();
  return plan === 'pro' ? 'pro' : 'free';
}

function getMonthWindow(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const reset = new Date(Date.UTC(year, month + 1, 1));
  return {
    usageDate: start.toISOString().slice(0, 10),
    resetAt: reset.toISOString(),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' } });
  }

  const authResult = await requireAuthenticatedUser(req, 'AI usage');
  if (authResult.error) {
    const status = authResult.error.code === 'SUPABASE_CONFIG_MISSING' ? 503 : 401;
    return json(res, status, { error: authResult.error });
  }

  const user = authResult.data.user;
  const planTier = getPlanTier(user);

  if (planTier === 'pro') {
    return json(res, 200, {
      data: {
        planTier,
        used: null,
        remaining: null,
        quota: null,
        resetAt: null,
        window: 'unlimited',
      },
      error: null,
    });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(res, 503, {
      error: {
        code: 'SUPABASE_SERVICE_ROLE_MISSING',
        message: 'AI usage requires server Supabase service role config.',
      },
    });
  }

  const quota = getFreeMonthlyQuota();
  const { usageDate, resetAt } = getMonthWindow();
  const { data, error } = await admin
    .from('ai_usage')
    .select('request_count')
    .eq('user_id', user.id)
    .eq('usage_date', usageDate)
    .maybeSingle();

  if (error) {
    return json(res, 500, {
      error: {
        code: error.code || 'SUPABASE_ERROR',
        message: error.message || 'Unable to read AI usage.',
      },
    });
  }

  const used = Math.max(0, Number(data?.request_count || 0));
  return json(res, 200, {
    data: {
      planTier,
      used,
      remaining: Math.max(quota - used, 0),
      quota,
      resetAt,
      window: 'monthly',
    },
    error: null,
  });
}
