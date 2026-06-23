import crypto from 'node:crypto';
import { json, requireAuthenticatedUser } from './_billing-utils.js';
import { cleanText, getAdminClient, normalizeReferralCode, readJson } from './_ambassador-utils.js';

function hashIp(req) {
  const raw = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
  const first = String(raw).split(',')[0]?.trim();
  if (!first) return null;
  const salt = process.env.REFERRAL_IP_HASH_SALT || process.env.STRIPE_WEBHOOK_SECRET || 'lockeen-referral';
  return crypto.createHash('sha256').update(`${salt}:${first}`).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } });
  }

  const authResult = await requireAuthenticatedUser(req, 'Referral attribution');
  if (authResult.error) return json(res, 401, { error: authResult.error });

  const adminResult = getAdminClient();
  if (adminResult.error) return json(res, 503, { error: adminResult.error });

  const body = await readJson(req);
  const referralCode = normalizeReferralCode(body.referralCode || body.ref || body.code);
  if (!referralCode) {
    return json(res, 400, { error: { code: 'REFERRAL_CODE_REQUIRED', message: 'Referral code is required.' } });
  }

  const admin = adminResult.data;
  const user = authResult.data.user;

  const { data: ambassador, error: ambassadorError } = await admin
    .from('ambassadors')
    .select('*')
    .ilike('referral_code', referralCode)
    .eq('status', 'active')
    .maybeSingle();

  if (ambassadorError) {
    return json(res, 500, { error: { code: 'AMBASSADOR_LOOKUP_FAILED', message: ambassadorError.message } });
  }
  if (!ambassador?.id) {
    return json(res, 404, { error: { code: 'REFERRAL_NOT_FOUND', message: 'Referral link is not active.' } });
  }
  if (ambassador.user_id === user.id) {
    return json(res, 200, { status: 'ignored', reason: 'self_referral' });
  }

  const { data: existing, error: existingError } = await admin
    .from('referrals')
    .select('*')
    .eq('referred_user_id', user.id)
    .maybeSingle();

  if (existingError) {
    return json(res, 500, { error: { code: 'REFERRAL_LOOKUP_FAILED', message: existingError.message } });
  }
  if (existing?.id) {
    return json(res, 200, { status: 'existing', referral: existing });
  }

  const { data: referral, error: referralError } = await admin
    .from('referrals')
    .insert([{
      ambassador_id: ambassador.id,
      referred_user_id: user.id,
      referral_code: ambassador.referral_code,
      referred_email: user.email || null,
      status: 'signed_up',
      metadata: {
        landingPath: cleanText(body.landingPath, 500) || null,
        attributedFrom: 'client_referral_capture',
      },
    }])
    .select('*')
    .single();

  if (referralError) {
    return json(res, 500, { error: { code: 'REFERRAL_CREATE_FAILED', message: referralError.message } });
  }

  await admin
    .from('referral_visits')
    .insert([{
      ambassador_id: ambassador.id,
      referral_code: ambassador.referral_code,
      anonymous_id: cleanText(body.anonymousId, 120) || null,
      landing_path: cleanText(body.landingPath, 500) || null,
      referrer: cleanText(body.referrer, 500) || null,
      user_agent: req.headers['user-agent'] || null,
      ip_hash: hashIp(req),
      metadata: { source: 'signup_attribution' },
    }]);

  return json(res, 200, { status: 'attributed', referral });
}
