import { json } from './_billing-utils.js';
import {
  COMMISSION_CENTS,
  PAYOUT_THRESHOLD_CENTS,
  cleanText,
  getAdminClient,
  makeReferralCode,
  normalizeReferralCode,
  readJson,
  requireAdminUser,
  summarizeMoney,
} from './_ambassador-utils.js';

async function uniqueReferralCode(admin, base) {
  let candidate = normalizeReferralCode(base);
  for (let i = 0; i < 12; i += 1) {
    const code = i === 0 ? candidate : `${candidate}-${i + 1}`;
    const [{ data: ambassador, error: ambassadorError }, { data: invite, error: inviteError }] = await Promise.all([
      admin
        .from('ambassadors')
        .select('id')
        .eq('referral_code', code)
        .maybeSingle(),
      admin
        .from('ambassador_invites')
        .select('id')
        .eq('referral_code', code)
        .neq('status', 'cancelled')
        .maybeSingle(),
    ]);
    if (ambassadorError || inviteError) throw ambassadorError || inviteError;
    if (!ambassador?.id && !invite?.id) return code;
  }
  return `${candidate}-${Math.random().toString(36).slice(2, 7)}`;
}

async function getAdminPayload(admin) {
  const [{ data: applications, error: applicationsError }, { data: ambassadors, error: ambassadorsError }, { data: payouts, error: payoutsError }, { data: invites, error: invitesError }] = await Promise.all([
    admin
      .from('partner_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(80),
    admin
      .from('ambassadors')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(80),
    admin
      .from('ambassador_payouts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(80),
    admin
      .from('ambassador_invites')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(80),
  ]);

  const error = applicationsError || ambassadorsError || payoutsError || invitesError;
  if (error) throw error;

  const ambassadorIds = (ambassadors || []).map((item) => item.id);
  let referrals = [];
  let commissions = [];
  if (ambassadorIds.length > 0) {
    const [{ data: referralRows, error: referralsError }, { data: commissionRows, error: commissionsError }] = await Promise.all([
      admin
        .from('referrals')
        .select('*')
        .in('ambassador_id', ambassadorIds)
        .order('created_at', { ascending: false })
        .limit(300),
      admin
        .from('ambassador_commissions')
        .select('*')
        .in('ambassador_id', ambassadorIds)
        .order('created_at', { ascending: false })
        .limit(400),
    ]);
    if (referralsError || commissionsError) throw referralsError || commissionsError;
    referrals = referralRows || [];
    commissions = commissionRows || [];
  }

  const summaries = Object.fromEntries((ambassadors || []).map((ambassador) => {
    const ownCommissions = commissions.filter((item) => item.ambassador_id === ambassador.id);
    const ownPayouts = (payouts || []).filter((item) => item.ambassador_id === ambassador.id);
    const ownReferrals = referrals.filter((item) => item.ambassador_id === ambassador.id);
    return [ambassador.id, {
      ...summarizeMoney(ownCommissions, ownPayouts),
      referrals: ownReferrals.length,
      activeReferrals: ownReferrals.filter((item) => ['paid', 'active'].includes(item.status)).length,
    }];
  }));

  return {
    applications: applications || [],
    ambassadors: ambassadors || [],
    invites: invites || [],
    payouts: payouts || [],
    referrals,
    commissions,
    summaries,
  };
}

async function approveApplication(admin, actor, body) {
  const applicationId = cleanText(body.applicationId, 80);
  if (!applicationId) {
    return { error: { code: 'APPLICATION_ID_REQUIRED', message: 'Application ID is required.' } };
  }

  const { data: application, error: applicationError } = await admin
    .from('partner_applications')
    .select('*')
    .eq('id', applicationId)
    .single();

  if (applicationError || !application?.id) {
    return { error: { code: 'APPLICATION_NOT_FOUND', message: applicationError?.message || 'Application not found.' } };
  }
  if (!application.user_id) {
    return {
      error: {
        code: 'APPLICATION_USER_REQUIRED',
        message: 'Ask this candidate to apply while logged in before approval.',
      },
    };
  }

  const requested = normalizeReferralCode(body.referralCode);
  const baseCode = requested || makeReferralCode([application.first_name, application.last_name, application.university]);
  const referralCode = await uniqueReferralCode(admin, baseCode);

  const { data: ambassador, error: ambassadorError } = await admin
    .from('ambassadors')
    .upsert([{
      user_id: application.user_id,
      application_id: application.id,
      email: application.email,
      first_name: application.first_name,
      last_name: application.last_name,
      university: application.university,
      study_field: application.study_field,
      referral_code: referralCode,
      status: 'active',
      commission_cents: COMMISSION_CENTS,
      payout_threshold_cents: PAYOUT_THRESHOLD_CENTS,
      approved_by: actor.id,
      approved_at: new Date().toISOString(),
      metadata: { approvedFrom: 'admin_dashboard' },
    }], { onConflict: 'user_id' })
    .select('*')
    .single();

  if (ambassadorError) {
    return { error: { code: 'AMBASSADOR_APPROVAL_FAILED', message: ambassadorError.message } };
  }

  const { error: updateError } = await admin
    .from('partner_applications')
    .update({ status: 'approved', metadata: { ...(application.metadata || {}), ambassador_id: ambassador.id } })
    .eq('id', application.id);

  if (updateError) {
    return { error: { code: 'APPLICATION_UPDATE_FAILED', message: updateError.message } };
  }

  const { error: duplicateUpdateError } = await admin
    .from('partner_applications')
    .update({
      status: 'rejected',
      metadata: {
        closedAsDuplicateOf: application.id,
        closedReason: 'same_email_already_approved',
      },
    })
    .eq('email', application.email)
    .neq('id', application.id)
    .in('status', ['new', 'reviewing', 'contacted']);

  if (duplicateUpdateError) {
    return { error: { code: 'DUPLICATE_APPLICATIONS_CLOSE_FAILED', message: duplicateUpdateError.message } };
  }

  return { data: ambassador };
}

async function rejectApplication(admin, actor, body) {
  const applicationId = cleanText(body.applicationId, 80);
  const reason = cleanText(body.reason, 500) || 'not_a_fit';
  if (!applicationId) {
    return { error: { code: 'APPLICATION_ID_REQUIRED', message: 'Application ID is required.' } };
  }

  const { data: application, error: applicationError } = await admin
    .from('partner_applications')
    .select('*')
    .eq('id', applicationId)
    .single();

  if (applicationError || !application?.id) {
    return { error: { code: 'APPLICATION_NOT_FOUND', message: applicationError?.message || 'Application not found.' } };
  }
  if (application.status === 'approved') {
    return { error: { code: 'APPLICATION_ALREADY_APPROVED', message: 'Approved applications cannot be rejected from this action.' } };
  }

  const { data, error } = await admin
    .from('partner_applications')
    .update({
      status: 'rejected',
      metadata: {
        ...(application.metadata || {}),
        rejectedBy: actor.id,
        rejectedAt: new Date().toISOString(),
        rejectedReason: reason,
      },
    })
    .eq('id', application.id)
    .select('*')
    .single();

  if (error) {
    return { error: { code: 'APPLICATION_REJECT_FAILED', message: error.message } };
  }

  return { data };
}

async function findAuthUserByEmail(admin, email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return (data?.users || []).find((user) => String(user.email || '').toLowerCase() === String(email || '').toLowerCase()) || null;
}

async function createAmbassadorByEmail(admin, actor, body) {
  const email = cleanText(body.email, 320).toLowerCase();
  const firstName = cleanText(body.firstName, 120);
  const lastName = cleanText(body.lastName, 120);
  const university = cleanText(body.university, 180);
  const studyField = cleanText(body.studyField, 180);
  const requested = normalizeReferralCode(body.referralCode);

  if (!email || !firstName || !lastName || !university) {
    return {
      error: {
        code: 'OUTBOUND_AMBASSADOR_FIELDS_REQUIRED',
        message: 'Email, first name, last name, and university are required.',
      },
    };
  }

  const user = await findAuthUserByEmail(admin, email);
  const baseCode = requested || makeReferralCode([firstName, lastName, university]);
  const referralCode = await uniqueReferralCode(admin, baseCode);

  if (!user?.id) {
    const { data: existingInvite, error: lookupError } = await admin
      .from('ambassador_invites')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending_signup')
      .maybeSingle();

    if (lookupError) {
      return { error: { code: 'AMBASSADOR_INVITE_LOOKUP_FAILED', message: lookupError.message } };
    }

    const payload = {
      email,
      first_name: firstName,
      last_name: lastName,
      university,
      study_field: studyField || null,
      referral_code: referralCode,
      status: 'pending_signup',
      commission_cents: COMMISSION_CENTS,
      payout_threshold_cents: PAYOUT_THRESHOLD_CENTS,
      invited_by: actor.id,
      metadata: { approvedFrom: 'admin_outbound_preapproval' },
    };

    const query = existingInvite?.id
      ? admin.from('ambassador_invites').update(payload).eq('id', existingInvite.id)
      : admin.from('ambassador_invites').insert([payload]);

    const { data: invite, error } = await query
      .select('*')
      .single();

    if (error) {
      return { error: { code: 'AMBASSADOR_INVITE_FAILED', message: error.message } };
    }

    return { data: invite };
  }

  const { data: ambassador, error } = await admin
    .from('ambassadors')
    .upsert([{
      user_id: user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      university,
      study_field: studyField || null,
      referral_code: referralCode,
      status: 'active',
      commission_cents: COMMISSION_CENTS,
      payout_threshold_cents: PAYOUT_THRESHOLD_CENTS,
      approved_by: actor.id,
      approved_at: new Date().toISOString(),
      metadata: { approvedFrom: 'admin_outbound_create' },
    }], { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) {
    return { error: { code: 'AMBASSADOR_CREATE_FAILED', message: error.message } };
  }

  return { data: ambassador };
}

async function payAmbassador(admin, actor, body) {
  const ambassadorId = cleanText(body.ambassadorId, 80);
  if (!ambassadorId) {
    return { error: { code: 'AMBASSADOR_ID_REQUIRED', message: 'Ambassador ID is required.' } };
  }

  const { data: ambassador, error: ambassadorError } = await admin
    .from('ambassadors')
    .select('*')
    .eq('id', ambassadorId)
    .single();

  if (ambassadorError || !ambassador?.id) {
    return { error: { code: 'AMBASSADOR_NOT_FOUND', message: ambassadorError?.message || 'Ambassador not found.' } };
  }

  const { data: commissions, error: commissionsError } = await admin
    .from('ambassador_commissions')
    .select('*')
    .eq('ambassador_id', ambassador.id)
    .eq('status', 'available')
    .order('created_at', { ascending: true });

  if (commissionsError) {
    return { error: { code: 'COMMISSIONS_LOOKUP_FAILED', message: commissionsError.message } };
  }

  const amount = (commissions || []).reduce((sum, item) => sum + Number(item.amount_cents || 0), 0);
  if (amount < ambassador.payout_threshold_cents) {
    return {
      error: {
        code: 'PAYOUT_THRESHOLD_NOT_MET',
        message: `Available balance must be at least €${(ambassador.payout_threshold_cents / 100).toFixed(2)}.`,
      },
    };
  }

  const { data: payout, error: payoutError } = await admin
    .from('ambassador_payouts')
    .insert([{
      ambassador_id: ambassador.id,
      amount_cents: amount,
      currency: 'eur',
      status: 'paid',
      method: cleanText(body.method, 40) || 'manual_bank',
      approved_at: new Date().toISOString(),
      paid_at: new Date().toISOString(),
      marked_by: actor.id,
      notes: cleanText(body.notes, 800) || null,
      metadata: { source: 'manual_admin_payout' },
    }])
    .select('*')
    .single();

  if (payoutError) {
    return { error: { code: 'PAYOUT_CREATE_FAILED', message: payoutError.message } };
  }

  const commissionIds = (commissions || []).map((item) => item.id);
  if (commissionIds.length > 0) {
    const { error: updateError } = await admin
      .from('ambassador_commissions')
      .update({ status: 'paid', paid_at: new Date().toISOString(), payout_id: payout.id })
      .in('id', commissionIds);

    if (updateError) {
      return { error: { code: 'COMMISSIONS_MARK_PAID_FAILED', message: updateError.message } };
    }
  }

  return { data: payout };
}

async function deactivateAmbassador(admin, actor, body) {
  const ambassadorId = cleanText(body.ambassadorId, 80);
  const reason = cleanText(body.reason, 500) || 'manual_admin_pause';
  if (!ambassadorId) {
    return { error: { code: 'AMBASSADOR_ID_REQUIRED', message: 'Ambassador ID is required.' } };
  }

  const { data: ambassador, error: ambassadorError } = await admin
    .from('ambassadors')
    .select('*')
    .eq('id', ambassadorId)
    .single();

  if (ambassadorError || !ambassador?.id) {
    return { error: { code: 'AMBASSADOR_NOT_FOUND', message: ambassadorError?.message || 'Ambassador not found.' } };
  }

  const { data, error } = await admin
    .from('ambassadors')
    .update({
      status: 'paused',
      metadata: {
        ...(ambassador.metadata || {}),
        deactivatedBy: actor.id,
        deactivatedAt: new Date().toISOString(),
        deactivatedReason: reason,
      },
    })
    .eq('id', ambassador.id)
    .select('*')
    .single();

  if (error) {
    return { error: { code: 'AMBASSADOR_DEACTIVATE_FAILED', message: error.message } };
  }

  return { data };
}

async function reactivateAmbassador(admin, actor, body) {
  const ambassadorId = cleanText(body.ambassadorId, 80);
  const reason = cleanText(body.reason, 500) || 'manual_admin_reactivate';
  if (!ambassadorId) {
    return { error: { code: 'AMBASSADOR_ID_REQUIRED', message: 'Ambassador ID is required.' } };
  }

  const { data: ambassador, error: ambassadorError } = await admin
    .from('ambassadors')
    .select('*')
    .eq('id', ambassadorId)
    .single();

  if (ambassadorError || !ambassador?.id) {
    return { error: { code: 'AMBASSADOR_NOT_FOUND', message: ambassadorError?.message || 'Ambassador not found.' } };
  }

  const { data, error } = await admin
    .from('ambassadors')
    .update({
      status: 'active',
      metadata: {
        ...(ambassador.metadata || {}),
        reactivatedBy: actor.id,
        reactivatedAt: new Date().toISOString(),
        reactivatedReason: reason,
      },
    })
    .eq('id', ambassador.id)
    .select('*')
    .single();

  if (error) {
    return { error: { code: 'AMBASSADOR_REACTIVATE_FAILED', message: error.message } };
  }

  return { data };
}

export default async function handler(req, res) {
  const authResult = await requireAdminUser(req);
  if (authResult.error) {
    return json(res, authResult.error.code === 'ADMIN_REQUIRED' ? 403 : 401, { error: authResult.error });
  }

  const adminResult = getAdminClient();
  if (adminResult.error) return json(res, 503, { error: adminResult.error });
  const admin = adminResult.data;

  try {
    if (req.method === 'GET') {
      return json(res, 200, await getAdminPayload(admin));
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const action = cleanText(body.action, 80);
      let result;

      if (action === 'approve_application') result = await approveApplication(admin, authResult.data.user, body);
      else if (action === 'reject_application') result = await rejectApplication(admin, authResult.data.user, body);
      else if (action === 'create_ambassador') result = await createAmbassadorByEmail(admin, authResult.data.user, body);
      else if (action === 'pay_ambassador') result = await payAmbassador(admin, authResult.data.user, body);
      else if (action === 'deactivate_ambassador') result = await deactivateAmbassador(admin, authResult.data.user, body);
      else if (action === 'reactivate_ambassador') result = await reactivateAmbassador(admin, authResult.data.user, body);
      else result = { error: { code: 'UNKNOWN_ACTION', message: 'Unknown admin action.' } };

      if (result.error) return json(res, 400, { error: result.error });
      return json(res, 200, { data: result.data, ...(await getAdminPayload(admin)) });
    }

    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET or POST.' } });
  } catch (error) {
    return json(res, 500, {
      error: { code: 'ADMIN_AMBASSADORS_FAILED', message: error?.message || 'Admin ambassadors request failed.' },
    });
  }
}
