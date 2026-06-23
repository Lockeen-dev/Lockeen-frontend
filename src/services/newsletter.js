import { requireSupabaseClient, supabase } from '../lib/supabaseClient';
import { fail, ok } from './_shared';

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

export async function subscribeToNewsletter(input = {}) {
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail('Enter a valid email first.', 'VALIDATION_ERROR');
  }

  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const { error } = await supabase
    .from('newsletter_signups')
    .insert([{
      email,
      source: input.source || 'blog',
      locale: input.locale === 'it' ? 'it' : 'en',
      metadata: {
        page: input.page || 'blog',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      },
    }]);

  if (error) {
    if (error.code === '23505') {
      return ok({ email, status: 'already_subscribed' });
    }
    return fail(error.message || 'Newsletter signup failed.', error.code || 'NEWSLETTER_SIGNUP_FAILED');
  }

  return ok({ email, status: 'subscribed' });
}
