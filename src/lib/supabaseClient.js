import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseKey);
}

export const supabase = hasSupabaseConfig()
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export function requireSupabaseClient() {
  if (!supabase) {
    return {
      data: null,
      error: {
        code: 'SUPABASE_CONFIG_MISSING',
        message: 'Supabase URL or public key is missing.',
      },
    };
  }

  return null;
}
