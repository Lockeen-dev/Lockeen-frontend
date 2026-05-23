const AI_MODE = import.meta.env.VITE_AI_MODE || 'mock';

function ok(data) {
  return { data: structuredClone(data), error: null };
}

function fail(message, code = 'AI_ERROR') {
  return { data: null, error: { code, message } };
}

function getCurrentUserId() {
  return localStorage.getItem('lockeen_real_user_id') || 'mock-ai-user';
}

function fallbackText(kind, prompt) {
  if (kind === 'planner') {
    return [
      'Fallback study plan:',
      '1. Review one chapter for 25 minutes.',
      '2. Write 5 key points.',
      '3. Make 5 flashcards.',
      '4. Take one short quiz.',
      '5. Repeat tomorrow with the weakest topic.',
    ].join('\n');
  }

  return [
    'Fallback tutor answer:',
    'Break the topic into one definition, one example, and one practice question.',
    prompt ? `Focus: ${prompt.slice(0, 220)}` : '',
  ].filter(Boolean).join('\n\n');
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

  const response = await fetch('/api/ai-study-assist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-lockeen-user-id': getCurrentUserId(),
    },
    body: JSON.stringify({ kind, prompt, context }),
  });

  const payload = await response.json().catch(() => null);

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
