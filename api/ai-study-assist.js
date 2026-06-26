import { createClient } from '@supabase/supabase-js';

const MAX_PROMPT_CHARS = 4000;
const DEFAULT_FREE_MONTHLY_QUOTA = 20;
const DEFAULT_MODEL = 'gpt-4.1-mini';
const MAX_ATTACHMENT_TEXT_CHARS = 12000;
const MAX_INLINE_IMAGES = 3;

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

function getFreeMonthlyQuota() {
  const quota = Number(process.env.AI_FREE_MONTHLY_QUOTA || process.env.AI_DAILY_QUOTA || DEFAULT_FREE_MONTHLY_QUOTA);
  return Number.isFinite(quota) && quota > 0 ? quota : DEFAULT_FREE_MONTHLY_QUOTA;
}

function getPlanTier(user = {}) {
  const metadata = user.app_metadata || {};
  const plan = String(metadata.plan_tier || metadata.plan || metadata.subscription_plan || 'free').toLowerCase();
  return plan === 'pro' ? 'pro' : 'free';
}

function getMonthWindow(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const reset = new Date(Date.UTC(year, month + 1, 1));
  return {
    usageDate: start.toISOString().slice(0, 10),
    resetAt: reset.toISOString(),
  };
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

  return { data: { user: data.user, userId: data.user.id, planTier: getPlanTier(data.user) }, error: null };
}

function checkMemoryQuota(userKey, quota = getFreeMonthlyQuota()) {
  const now = Date.now();
  const monthWindow = getMonthWindow(new Date(now));
  const record = usageByUser.get(userKey) || { count: 0, resetAt: Date.parse(monthWindow.resetAt) };

  if (record.resetAt <= now) {
    record.count = 0;
    record.resetAt = Date.parse(monthWindow.resetAt);
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
  const quota = getFreeMonthlyQuota();
  const { usageDate, resetAt } = getMonthWindow();

  if (!client) {
    if (requiresPersistentQuota()) {
      throw quotaUnavailable('Persistent AI quota requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }
    return {
      ...checkMemoryQuota(userId, quota),
      quota,
      window: 'monthly',
    };
  }

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
    resetAt,
    source: 'persistent',
    quota,
    window: 'monthly',
  };
}

function getUnlimitedQuota(planTier) {
  return {
    allowed: true,
    remaining: null,
    resetAt: null,
    source: 'plan',
    quota: null,
    window: 'unlimited',
    planTier,
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

function getTutorStyleInstruction(style) {
  const styles = {
    expert: 'Tutor style: rigorous professor. Explain precisely, structure the reasoning, define terms, and close with the highest-yield exam takeaway.',
    socratic: 'Tutor style: Socratic coach. Guide the student with short questions, hints, and checkpoints before giving full answers. Do not dump the solution immediately unless requested.',
    exam: 'Tutor style: exam coach. Be practical, prioritize what earns points, show answer structure, common traps, and fast revision strategy.',
  };
  return styles[style] || styles.expert;
}

function buildTutorSystemText({ mode, depth, tutorStyle }) {
  return [
    'You are Lockeen AI, a high-quality private tutor for students.',
    'Tone: clear, direct, encouraging, mature, never childish, never generic.',
    'Use Markdown for readable educational answers.',
    '',
    getTutorStyleInstruction(tutorStyle),
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
    '- Use current subject, exam goals, preferred depth, weak topics, previous chat, uploaded note context, and studyContext when provided.',
    '- studyContext contains the student’s real Lockeen exams, chapters, notes, and material snippets. Use it as the primary source when relevant.',
    '- If studyContext is missing, empty, or insufficient, say what information you need instead of inventing facts.',
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
  const tutorStyle = context?.tutorStyle || context?.tutorMode || 'expert';
  const systemText = buildTutorSystemText({ mode, depth, tutorStyle });
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

  const authResult = await requireAuthenticatedUser(req);
  if (authResult.error) {
    const status = authResult.error.code === 'SUPABASE_CONFIG_MISSING' ? 503 : 401;
    return json(res, status, { error: authResult.error });
  }
  const userId = authResult.data.userId;
  const planTier = authResult.data.planTier;

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
  if (planTier === 'pro') {
    quota = getUnlimitedQuota(planTier);
  } else {
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
      return json(res, 429, { error: { code: 'AI_QUOTA_EXCEEDED', message: 'Monthly AI Tutor quota reached.', resetAt: quota.resetAt } });
    }
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
