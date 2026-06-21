import { createClient } from '@supabase/supabase-js';

const MAX_PROMPT_CHARS = 4000;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAILY_QUOTA = 20;
const DEFAULT_MODEL = 'gpt-4.1-mini';

const usageByUser = new Map();
let supabaseAdmin = null;
let supabaseAuthClient = null;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function getBearerToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
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

function getQuotaLimit() {
  const quota = Number(process.env.AI_DAILY_QUOTA || DEFAULT_DAILY_QUOTA);
  return Number.isFinite(quota) && quota > 0 ? quota : DEFAULT_DAILY_QUOTA;
}

function requiresPersistentQuota() {
  return ['production', 'preview'].includes(process.env.VERCEL_ENV || '');
}

function quotaUnavailable(message) {
  const error = new Error(message);
  error.code = 'AI_QUOTA_UNAVAILABLE';
  return error;
}

function getSupabaseAuthClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const publicKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publicKey) return null;

  if (!supabaseAuthClient) {
    supabaseAuthClient = createClient(supabaseUrl, publicKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseAuthClient;
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

async function requireAuthenticatedUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    return {
      data: null,
      error: { code: 'AUTH_REQUIRED', message: 'AI requests require an authenticated Supabase session.' },
    };
  }

  const client = getSupabaseAuthClient();
  if (!client) {
    return {
      data: null,
      error: { code: 'SUPABASE_CONFIG_MISSING', message: 'Supabase server auth config is missing.' },
    };
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user?.id) {
    return {
      data: null,
      error: { code: 'AUTH_REQUIRED', message: 'AI requests require a valid Supabase session.' },
    };
  }

  return { data: { userId: data.user.id }, error: null };
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

async function checkPersistentQuota(userId) {
  const client = getSupabaseAdmin();

  if (!client) {
    if (requiresPersistentQuota()) {
      throw quotaUnavailable('Persistent AI quota requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }
    return checkMemoryQuota(userId);
  }

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
      '## Study plan',
      '',
      '**Key idea:** use one focused loop: review, practice, check, repeat.',
      '',
      '### Session structure',
      '1. Pick one exam or chapter.',
      '2. Study for 25 minutes.',
      '3. Write 5 key points from memory.',
      '4. Do one short quiz or 5 flashcards.',
      '',
      '**Next action:** start a 25 minute session on that weak point now.',
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

function inferResponseMode(prompt, kind) {
  const text = String(prompt || '').toLowerCase();
  if (kind === 'planner' || /plan|schedule|timetable|study routine/.test(text)) return 'study_plan';
  if (/quiz|test me|ask me questions|questions only/.test(text)) return 'quiz_mode';
  if (/flashcard|flash card|anki/.test(text)) return 'flashcard_mode';
  if (/compare|difference|versus| vs |table/.test(text)) return 'comparison_table';
  if (/exam answer|formal answer|academic answer|write an answer/.test(text)) return 'exam_answer';
  if (/case study|case analysis|business case|scenario/.test(text)) return 'case_study';
  if (/formula|equation|derive|breakdown/.test(text)) return 'formula_breakdown';
  if (/step by step|tutorial|how do i|solve/.test(text)) return 'step_by_step';
  if (/make notes|study notes|notes/.test(text)) return 'study_notes';
  if (/summary|recap|summarize|tl;dr/.test(text)) return 'quick_summary';
  if (/deep|explain well|in detail|thorough/.test(text)) return 'deep_dive';
  if (/i don't understand|dont understand|confused|simpler|explain simply/.test(text)) return 'concept_explanation';
  return 'concept_explanation';
}

function inferDepth(prompt) {
  const text = String(prompt || '').toLowerCase();
  if (/quick|brief|short|tl;dr|in 30 seconds/.test(text)) return 'quick';
  if (/deep|well|detail|thorough|comprehensive/.test(text)) return 'deep';
  return 'standard';
}

function buildTutorSystemText({ mode, depth }) {
  return [
    'You are Lockeen AI, a high-quality private tutor for students.',
    'Tone: clear, direct, encouraging, mature, never childish, never generic.',
    'Use Markdown for readable educational answers.',
    '',
    `Selected response mode: ${mode}.`,
    `Depth: ${depth}. If quick, keep it very short. If deep, expand progressively. Otherwise default concise.`,
    '',
    'Choose structure dynamically. Do NOT force the same headings every time.',
    'Available internal modes:',
    '- concept_explanation: use "## Topic", "Core idea", "How it works", "Example".',
    '- deep_dive: layered explanation with intuition, mechanics, example, edge cases.',
    '- quick_summary: concise bullets plus one example.',
    '- study_notes: clean notes with definitions, key points, common mistake, exam tip.',
    '- quiz_mode: questions only unless user asks for answers; include answer key only when requested.',
    '- flashcard_mode: Q/A flashcards, short and atomic.',
    '- exam_answer: formal academic answer, structured and precise.',
    '- case_study: situation, analysis, implication, recommendation.',
    '- step_by_step: numbered steps, each with one action.',
    '- comparison_table: Markdown table with short rows, then one takeaway.',
    '- formula_breakdown: formula, variables, intuition, worked mini example, common mistake.',
    '',
    'Formatting rules:',
    '- Use headings only when useful.',
    '- Use **bold** for key terms.',
    '- Use bullets only when they improve scanning.',
    '- Use numbered steps for processes.',
    '- Use Markdown tables for comparisons.',
    '- Use blockquotes only for useful callouts, e.g. > Key idea: ... or > Exam tip: ...',
    '- Avoid long text blocks. Max 2-4 lines per paragraph.',
    '',
    'Default answer shape when user gives no special request:',
    'clear explanation, key points, example, optional next action.',
    'Do not add "Quick check" sections or callouts unless the user explicitly asks for a quiz/check.',
    '',
    'Personalization:',
    '- Use current subject, exam goals, preferred depth, weak topics, previous chat, and uploaded note context when provided.',
    '- If attachments only contain filenames, say you can use filename context only; do not pretend to read files.',
    '- If user says they are confused, simplify and build from intuition first.',
    '',
    'Length:',
    '- Default max about 220 words.',
    '- Quick answers max about 90 words.',
    '- Deep answers can be longer but must use sections and avoid dense blocks.',
  ].join('\n');
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

  const mode = inferResponseMode(prompt, kind);
  const depth = inferDepth(prompt);
  const systemText = buildTutorSystemText({ mode, depth });

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
            responseMode: mode,
            depth,
            prompt,
            context: context || {},
          }),
        },
      ],
      max_output_tokens: depth === 'deep' ? 900 : 520,
      temperature: 0.35,
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
    responseMode: mode,
    depth,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } });
  }

  const authResult = await requireAuthenticatedUser(req);
  if (authResult.error) {
    const status = authResult.error.code === 'SUPABASE_CONFIG_MISSING' ? 503 : 401;
    return json(res, status, { error: authResult.error });
  }
  const userId = authResult.data.userId;

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
    quota = await checkPersistentQuota(userId);
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
