import { createClient } from '@supabase/supabase-js';

const MAX_PROMPT_CHARS = 4000;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAILY_QUOTA = 20;
const DEFAULT_MODEL = 'gpt-4.1-mini';

const usageByUser = new Map();
let supabaseAdmin = null;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function getUserKey(req) {
  const headerUser = req.headers['x-lockeen-user-id'];
  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return String(headerUser || bearer || '').trim();
}

function getJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function parseUserId(userKey) {
  const normalized = String(userKey || '').trim();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(normalized) ? normalized : null;
}

function getQuotaLimit() {
  const quota = Number(process.env.AI_DAILY_QUOTA || DEFAULT_DAILY_QUOTA);
  return Number.isFinite(quota) && quota > 0 ? quota : DEFAULT_DAILY_QUOTA;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseAdmin;
}

function checkMemoryQuota(userKey) {
  const now = Date.now();
  const quota = getQuotaLimit();
  const record = usageByUser.get(userKey) || { count: 0, resetAt: now + WINDOW_MS };

  if (record.resetAt <= now) {
    record.count = 0;
    record.resetAt = now + WINDOW_MS;
  }

  if (record.count >= quota) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(record.resetAt).toISOString(),
      source: 'memory',
    };
  }

  record.count += 1;
  usageByUser.set(userKey, record);

  return {
    allowed: true,
    remaining: Math.max(quota - record.count, 0),
    resetAt: new Date(record.resetAt).toISOString(),
    source: 'memory',
  };
}

async function checkPersistentQuota(userKey) {
  const userId = parseUserId(userKey);
  const client = getSupabaseAdmin();

  if (!client || !userId) return checkMemoryQuota(userKey);

  const quota = getQuotaLimit();
  const usageDate = new Date().toISOString().slice(0, 10);
  const resetAt = new Date(`${usageDate}T00:00:00.000Z`);
  resetAt.setUTCDate(resetAt.getUTCDate() + 1);

  const { data, error } = await client.rpc('increment_ai_usage', {
    p_user_id: userId,
    p_usage_date: usageDate,
    p_quota: quota,
  });

  if (error) throw error;

  const quotaRecord = Array.isArray(data) ? data[0] : data;
  const nextCount = Number(quotaRecord?.request_count || 0);
  const allowed = Boolean(quotaRecord?.allowed);

  return {
    allowed,
    remaining: Math.max(quota - nextCount, 0),
    resetAt: resetAt.toISOString(),
    source: 'persistent',
  };
}

function fallbackFor(kind, prompt) {
  if (kind === 'planner') {
    return [
      '1. Pick one exam or chapter as focus.',
      '2. Split study into 25 minute blocks with 5 minute breaks.',
      '3. Start with weak chapters, then quiz yourself.',
      '4. End with 10 flashcards and one written summary.',
    ].join('\n');
  }

  return [
    'I can help, but the AI provider is not configured yet.',
    'Use this safe fallback: restate the topic, list what you know, identify the first unclear point, then make one flashcard and one quiz question from it.',
    prompt ? `Your prompt focus: ${prompt.slice(0, 220)}` : '',
  ].filter(Boolean).join('\n\n');
}

async function callOpenAI({ kind, prompt, context }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      text: fallbackFor(kind, prompt),
      provider: 'fallback',
      fallback: true,
    };
  }

  const systemText = [
    'You are Lockeen AI, a concise study assistant.',
    'Help students study safely and practically.',
    'Do not claim to have parsed private files unless context is provided.',
    'Keep answers short, structured, and actionable.',
  ].join(' ');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      input: [
        { role: 'system', content: systemText },
        {
          role: 'user',
          content: JSON.stringify({
            kind,
            prompt,
            context: context || {},
          }),
        },
      ],
      max_output_tokens: 700,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      text: fallbackFor(kind, prompt),
      provider: 'fallback',
      fallback: true,
      providerError: `OpenAI ${response.status}: ${errorText.slice(0, 300)}`,
    };
  }

  const data = await response.json();
  const text = data.output_text ||
    (data.output || [])
      .flatMap((item) => item.content || [])
      .map((item) => item.text || '')
      .join('\n')
      .trim();

  return {
    text: text || fallbackFor(kind, prompt),
    provider: 'openai',
    fallback: !text,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } });
  }

  const userKey = getUserKey(req);
  if (!userKey) {
    return json(res, 401, { error: { code: 'AUTH_REQUIRED', message: 'AI requests require a user id or bearer token.' } });
  }

  const body = getJsonBody(req);
  const prompt = String(body.prompt || '').trim();
  const kind = body.kind === 'planner' ? 'planner' : 'tutor';

  if (!prompt) {
    return json(res, 400, { error: { code: 'VALIDATION_ERROR', message: 'Prompt is required.' } });
  }

  if (prompt.length > MAX_PROMPT_CHARS) {
    return json(res, 400, { error: { code: 'PROMPT_TOO_LONG', message: `Prompt must be ${MAX_PROMPT_CHARS} characters or less.` } });
  }

  let quota;
  try {
    quota = await checkPersistentQuota(userKey);
  } catch (error) {
    return json(res, 503, {
      error: {
        code: error?.code || error?.name || 'AI_QUOTA_UNAVAILABLE',
        message: 'AI quota is temporarily unavailable.',
      },
    });
  }

  if (!quota.allowed) {
    return json(res, 429, { error: { code: 'AI_QUOTA_EXCEEDED', message: 'Daily AI quota reached.', resetAt: quota.resetAt } });
  }

  try {
    const result = await callOpenAI({ kind, prompt, context: body.context });
    return json(res, 200, {
      data: {
        ...result,
        kind,
        quota,
      },
      error: null,
    });
  } catch (error) {
    return json(res, 200, {
      data: {
        text: fallbackFor(kind, prompt),
        provider: 'fallback',
        fallback: true,
        kind,
        quota,
      },
      error: {
        code: error?.name || 'AI_PROVIDER_ERROR',
        message: error?.message || 'AI provider failed; fallback returned.',
      },
    });
  }
}
