import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

const SUPABASE_FETCH_TIMEOUT_MS = 8000;

function createTimeoutError() {
  return new DOMException('Supabase request timed out.', 'AbortError');
}

async function fetchWithTimeout(input, init = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(createTimeoutError()), SUPABASE_FETCH_TIMEOUT_MS);

  if (init.signal) {
    if (init.signal.aborted) controller.abort(init.signal.reason);
    else init.signal.addEventListener('abort', () => controller.abort(init.signal.reason), { once: true });
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseKey);
}

export const supabase = hasSupabaseConfig()
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        persistSession: true,
      },
      global: {
        fetch: fetchWithTimeout,
      },
    })
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
