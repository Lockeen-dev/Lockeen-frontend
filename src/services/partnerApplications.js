import { requireSupabaseClient, supabase } from '../lib/supabaseClient';
import { fail, ok } from './_shared';

function cleanText(value = '', maxLength = 1200) {
  return String(value).trim().slice(0, maxLength);
}

function normalizeEmail(email = '') {
  return cleanText(email, 320).toLowerCase();
}

export async function submitPartnerApplication(input = {}) {
  const firstName = cleanText(input.firstName, 120);
  const lastName = cleanText(input.lastName, 120);
  const email = normalizeEmail(input.email);
  const university = cleanText(input.university, 180);
  const studyField = cleanText(input.studyField, 180);
  const studyYear = cleanText(input.studyYear, 80);
  const cityCountry = cleanText(input.cityCountry || '', 180);
  const communityReach = cleanText(input.communityReach || '', 500);
  const motivation = cleanText(input.motivation || '', 1200);
  const locale = input.locale === 'it' ? 'it' : 'en';

  if (!firstName || !lastName || !email || !university || !studyField || !studyYear) {
    return fail('Please complete the required fields.', 'VALIDATION_ERROR');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail('Enter a valid email.', 'VALIDATION_ERROR');
  }

  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const { error } = await supabase
    .from('partner_applications')
    .insert([{
      first_name: firstName,
      last_name: lastName,
      email,
      university,
      study_field: studyField,
      study_year: studyYear,
      city_country: cityCountry || null,
      community_reach: communityReach || null,
      motivation: motivation || null,
      locale,
      source: 'earn',
      metadata: {
        page: 'earn',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      },
    }]);

  if (error) {
    return fail(error.message || 'Partner application failed.', error.code || 'PARTNER_APPLICATION_FAILED');
  }

  return ok({
    email,
    status: 'submitted',
  });
}
