import { createClient } from '@supabase/supabase-js';

const MAX_PROMPT_CHARS = 4000;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAILY_QUOTA = 20;
const DEFAULT_MODEL = 'gpt-4.1-mini';
const MAX_ATTACHMENT_TEXT_CHARS = 12000;
const MAX_INLINE_IMAGES = 3;

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

function requiresPersistentQuota() {
  return ['production', 'preview'].includes(process.env.VERCEL_ENV || '');
}

function quotaUnavailable(message) {
  const error = new Error(message);
  error.code = 'AI_QUOTA_UNAVAILABLE';
  return error;
}

function aiProviderError(message, code = 'AI_PROVIDER_UNAVAILABLE', status = 503) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
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

  if (!client) {
    if (requiresPersistentQuota()) {
      throw quotaUnavailable('Persistent AI quota requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }
    return checkMemoryQuota(userKey);
  }

  if (!userId) {
    if (requiresPersistentQuota()) {
      throw quotaUnavailable('Persistent AI quota requires a Supabase user id.');
    }
    return checkMemoryQuota(userKey);
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

function normalizeTutorAttachments(attachments = []) {
  if (!Array.isArray(attachments)) return { summary: [], images: [] };

  const summary = [];
  const images = [];

  for (const raw of attachments.slice(0, 5)) {
    const item = {
      name: String(raw?.name || 'attachment').slice(0, 180),
      type: String(raw?.type || ''),
      size: Number(raw?.size || 0),
      kind: String(raw?.kind || ''),
      status: String(raw?.status || ''),
      note: raw?.note ? String(raw.note).slice(0, 240) : '',
    };

    if (typeof raw?.text === 'string' && raw.text.trim()) {
      item.text = raw.text.slice(0, MAX_ATTACHMENT_TEXT_CHARS);
      item.truncated = Boolean(raw.truncated || raw.text.length > MAX_ATTACHMENT_TEXT_CHARS);
    }

    if (
      images.length < MAX_INLINE_IMAGES &&
      item.kind === 'image' &&
      typeof raw?.dataUrl === 'string' &&
      /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(raw.dataUrl)
    ) {
      images.push({ name: item.name, imageUrl: raw.dataUrl });
      item.hasImageContent = true;
    }

    summary.push(item);
  }

  return { summary, images };
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
    '- Use attached image or text content when provided.',
    '- If an attachment is metadata_only, say you can use filename context only; do not pretend to read it.',
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
    throw aiProviderError('AI provider is not configured.', 'AI_PROVIDER_UNAVAILABLE', 503);
  }

  const mode = inferResponseMode(prompt, kind);
  const depth = inferDepth(prompt);
  const systemText = buildTutorSystemText({ mode, depth });
  const { summary: attachments, images } = normalizeTutorAttachments(context?.attachments);
  const safeContext = { ...(context || {}), attachments };
  const userContent = [
    {
      type: 'input_text',
      text: JSON.stringify({
        kind,
        responseMode: mode,
        depth,
        prompt,
        context: safeContext,
      }),
    },
    ...images.map((image) => ({
      type: 'input_image',
      image_url: image.imageUrl,
    })),
  ];

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
          content: userContent,
        },
      ],
      max_output_tokens: depth === 'deep' ? 900 : 520,
      temperature: 0.35,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const code = response.status === 429 ? 'AI_PROVIDER_QUOTA_EXCEEDED' : 'AI_PROVIDER_ERROR';
    throw aiProviderError(`OpenAI ${response.status}: ${errorText.slice(0, 300)}`, code, response.status === 429 ? 429 : 502);
  }

  const data = await response.json();
  const text = data.output_text ||
    (data.output || [])
      .flatMap((item) => item.content || [])
      .map((item) => item.text || '')
      .join('\n')
      .trim();

  if (!text) {
    throw aiProviderError('AI provider returned an empty response.', 'AI_PROVIDER_EMPTY_RESPONSE', 502);
  }

  return {
    text,
    provider: 'openai',
    fallback: false,
    responseMode: mode,
    depth,
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
    return json(res, error?.status || 502, {
      data: null,
      error: {
        code: error?.code || error?.name || 'AI_PROVIDER_ERROR',
        message: error?.message || 'AI provider failed.',
      },
    });
  }
}
