import { json, requireAuthenticatedUser } from './_billing-utils.js';
import { getAdminClient, maskEmail, summarizeMoney } from './_ambassador-utils.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' } });
  }

  const authResult = await requireAuthenticatedUser(req, 'Ambassador dashboard');
  if (authResult.error) return json(res, 401, { error: authResult.error });

  const adminResult = getAdminClient();
  if (adminResult.error) return json(res, 503, { error: adminResult.error });

  const admin = adminResult.data;
  const user = authResult.data.user;

  const [{ data: ambassador, error: ambassadorError }, { data: applications, error: applicationError }] = await Promise.all([
    admin
      .from('ambassadors')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
    admin
      .from('partner_applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  if (ambassadorError) {
    return json(res, 500, { error: { code: 'AMBASSADOR_LOOKUP_FAILED', message: ambassadorError.message } });
  }
  if (applicationError) {
    return json(res, 500, { error: { code: 'APPLICATION_LOOKUP_FAILED', message: applicationError.message } });
  }

  if (!ambassador?.id) {
    return json(res, 200, {
      ambassador: null,
      application: applications?.[0] || null,
      referrals: [],
      commissions: [],
      payouts: [],
      summary: summarizeMoney([], []),
    });
  }

  const [{ data: referrals, error: referralsError }, { data: commissions, error: commissionsError }, { data: payouts, error: payoutsError }] = await Promise.all([
    admin
      .from('referrals')
      .select('*')
      .eq('ambassador_id', ambassador.id)
      .order('created_at', { ascending: false })
      .limit(80),
    admin
      .from('ambassador_commissions')
      .select('*')
      .eq('ambassador_id', ambassador.id)
      .order('created_at', { ascending: false })
      .limit(120),
    admin
      .from('ambassador_payouts')
      .select('*')
      .eq('ambassador_id', ambassador.id)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const error = referralsError || commissionsError || payoutsError;
  if (error) {
    return json(res, 500, { error: { code: 'AMBASSADOR_DASHBOARD_FAILED', message: error.message } });
  }

  const safeReferrals = (referrals || []).map((item) => ({
    ...item,
    referred_email_masked: maskEmail(item.referred_email),
    referred_email: undefined,
  }));

  return json(res, 200, {
    ambassador,
    application: applications?.[0] || null,
    referrals: safeReferrals,
    commissions: commissions || [],
    payouts: payouts || [],
    summary: summarizeMoney(commissions || [], payouts || []),
  });
}
