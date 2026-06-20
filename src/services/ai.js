import { requireAuthenticatedUserId } from './auth';

const AI_MODE = import.meta.env.VITE_AI_MODE || (import.meta.env.PROD ? 'real' : 'mock');

function ok(data) {
  return { data: structuredClone(data), error: null };
}

function fail(message, code = 'AI_ERROR') {
  return { data: null, error: { code, message } };
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

  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  let response;
  try {
    response = await fetch('/api/ai-study-assist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lockeen-user-id': userResult.data,
      },
      body: JSON.stringify({ kind, prompt, context }),
    });
  } catch (error) {
    return fail(error?.message || 'AI API route unavailable.', 'AI_PROVIDER_UNAVAILABLE');
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
