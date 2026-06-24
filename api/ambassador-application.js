import { json, requireAuthenticatedUser } from './_billing-utils.js';
import { cleanText, getAdminClient, normalizeEmail, readJson } from './_ambassador-utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } });
  }

  const authResult = await requireAuthenticatedUser(req, 'Ambassador application');
  if (authResult.error) return json(res, 401, { error: authResult.error });

  const adminResult = getAdminClient();
  if (adminResult.error) return json(res, 503, { error: adminResult.error });

  const body = await readJson(req);
  const user = authResult.data.user;
  const firstName = cleanText(body.firstName, 120);
  const lastName = cleanText(body.lastName, 120);
  const email = normalizeEmail(body.email || user.email);
  const university = cleanText(body.university, 180);
  const studyField = cleanText(body.studyField, 180);
  const studyYear = cleanText(body.studyYear, 80);
  const cityCountry = cleanText(body.cityCountry, 180);
  const communityReach = cleanText(body.communityReach, 500);
  const motivation = cleanText(body.motivation, 1200);
  const locale = body.locale === 'it' ? 'it' : 'en';

  if (!firstName || !lastName || !email || !university || !studyField) {
    return json(res, 400, {
      error: { code: 'VALIDATION_ERROR', message: 'Please complete first name, last name, email, university, and study field.' },
    });
  }

  const admin = adminResult.data;

  const { data: ambassador, error: ambassadorError } = await admin
    .from('ambassadors')
    .select('id,status,referral_code')
    .eq('user_id', user.id)
    .maybeSingle();

  if (ambassadorError) {
    return json(res, 500, { error: { code: 'AMBASSADOR_LOOKUP_FAILED', message: ambassadorError.message } });
  }
  if (ambassador?.id) {
    return json(res, 409, {
      error: { code: 'ALREADY_AMBASSADOR', message: 'You already have an ambassador profile.' },
      ambassador,
    });
  }

  const { data: existing, error: existingError } = await admin
    .from('partner_applications')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['new', 'reviewing', 'contacted', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingError) {
    return json(res, 500, { error: { code: 'APPLICATION_LOOKUP_FAILED', message: existingError.message } });
  }
  if (existing?.[0]) {
    return json(res, 200, { application: existing[0], status: existing[0].status });
  }

  const { data, error } = await admin
    .from('partner_applications')
    .insert([{
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      email,
      university,
      study_field: studyField,
      study_year: studyYear || null,
      city_country: cityCountry || null,
      community_reach: communityReach || null,
      motivation: motivation || null,
      locale,
      source: 'earn',
      status: 'new',
      metadata: {
        page: 'dashboard-earn',
        userAgent: req.headers['user-agent'] || null,
      },
    }])
    .select('*')
    .single();

  if (error) {
    return json(res, 500, { error: { code: 'APPLICATION_CREATE_FAILED', message: error.message } });
  }

  return json(res, 200, { application: data, status: data.status });
}
