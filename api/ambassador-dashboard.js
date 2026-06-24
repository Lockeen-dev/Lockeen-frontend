import { json, requireAuthenticatedUser } from './_billing-utils.js';
import { getAdminClient, maskEmail, summarizeMoney } from './_ambassador-utils.js';

async function claimPendingInvite(admin, user) {
  const email = String(user.email || '').trim().toLowerCase();
  if (!email) return null;

  const { data: invite, error: inviteError } = await admin
    .from('ambassador_invites')
    .select('*')
    .eq('email', email)
    .eq('status', 'pending_signup')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inviteError) throw inviteError;
  if (!invite?.id) return null;

  const { data: ambassador, error: ambassadorError } = await admin
    .from('ambassadors')
    .upsert([{
      user_id: user.id,
      email,
      first_name: invite.first_name,
      last_name: invite.last_name,
      university: invite.university,
      study_field: invite.study_field || null,
      referral_code: invite.referral_code,
      status: 'active',
      commission_cents: invite.commission_cents,
      payout_threshold_cents: invite.payout_threshold_cents,
      approved_by: invite.invited_by,
      approved_at: new Date().toISOString(),
      metadata: { ...(invite.metadata || {}), claimedFromInvite: invite.id },
    }], { onConflict: 'user_id' })
    .select('*')
    .single();

  if (ambassadorError) throw ambassadorError;

  const { error: updateError } = await admin
    .from('ambassador_invites')
    .update({
      status: 'claimed',
      claimed_user_id: user.id,
      claimed_ambassador_id: ambassador.id,
      claimed_at: new Date().toISOString(),
    })
    .eq('id', invite.id);

  if (updateError) throw updateError;

  return ambassador;
}

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

  let { data: ambassador, error: ambassadorError } = await admin
    .from('ambassadors')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!ambassador?.id && !ambassadorError) {
    try {
      ambassador = await claimPendingInvite(admin, user);
    } catch (error) {
      return json(res, 500, { error: { code: 'AMBASSADOR_INVITE_CLAIM_FAILED', message: error?.message || 'Could not activate ambassador invite.' } });
    }
  }

  const { data: applications, error: applicationError } = await admin
    .from('partner_applications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

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
    summary: summarizeMoney(commissions || [], payouts || [], ambassador.payout_threshold_cents),
  });
}
