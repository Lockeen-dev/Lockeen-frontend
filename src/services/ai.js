import { requireSupabaseClient, supabase } from '../lib/supabaseClient';

const AI_MODE = import.meta.env.VITE_AI_MODE || (import.meta.env.PROD ? 'real' : 'mock');
const AI_REQUEST_TIMEOUT_MS = 45000;

function ok(data) {
  return { data: structuredClone(data), error: null };
}

function fail(message, code = 'AI_ERROR') {
  return { data: null, error: { code, message } };
}

function timeoutSignal(ms) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), ms);
  return { controller, timeoutId };
}

function fallbackText(kind, prompt) {
  if (kind === 'planner') {
    return [
      '## Study plan',
      '',
      '**Key idea:** use one focused loop: review, practice, check, repeat.',
      '',
      '### Session structure',
      '1. Review one chapter for 25 minutes.',
      '2. Write 5 key points.',
      '3. Make 5 flashcards.',
      '4. Take one short quiz.',
    ].join('\n');
  }

  return [
    '## Quick explanation',
    '',
    prompt
      ? `Focus on: ${prompt.slice(0, 180)}`
      : 'Break the topic into one core idea and one useful example.',
    '',
    '**Core idea:** define it simply, then test it with one example.',
    '',
    '### How to study it',
    '1. Define the topic in one sentence.',
    '2. Connect it to one concrete example.',
    '3. Identify the confusing part.',
    '4. Practice that part once.',
  ].filter(Boolean).join('\n');
}

async function requestAi({ kind = 'tutor', prompt, context = {} }) {
  if (!prompt?.trim()) {
    return fail('Prompt is required.', 'VALIDATION_ERROR');
  }

  if (AI_MODE !== 'real') {
    return ok({
      text: fallbackText(kind, prompt),
      provider: 'mock',
      fallback: true,
      kind,
    });
  }

  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (sessionError || !token) {
    return fail('AI requests require an authenticated Supabase session.', 'AUTH_REQUIRED');
  }

  let response;
  const { controller, timeoutId } = timeoutSignal(AI_REQUEST_TIMEOUT_MS);
  try {
    response = await fetch('/api/ai-study-assist', {
      signal: controller.signal,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ kind, prompt, context }),
    });
  } catch (error) {
    return fail(
      error?.name === 'AbortError' ? 'AI request timed out.' : (error?.message || 'AI API route unavailable.'),
      error?.name === 'AbortError' ? 'AI_PROVIDER_TIMEOUT' : 'AI_PROVIDER_UNAVAILABLE',
    );
  } finally {
    window.clearTimeout(timeoutId);
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!payload) {
    return fail('AI API route unavailable in this environment.', 'AI_PROVIDER_UNAVAILABLE');
  }

  if (!response.ok) {
    return fail(payload?.error?.message || 'AI request failed.', payload?.error?.code || 'AI_REQUEST_FAILED');
  }

  if (payload?.error && !payload?.data) {
    return fail(payload.error.message, payload.error.code);
  }

  return ok(payload.data);
}

export function askTutor(input = {}) {
  return requestAi({ kind: 'tutor', ...input });
}

export function generateStudyPlan(input = {}) {
  return requestAi({ kind: 'planner', ...input });
}
