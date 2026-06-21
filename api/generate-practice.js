import { createClient } from '@supabase/supabase-js';

const DEFAULT_MODEL = 'gpt-4.1-mini';
const MAX_SOURCE_CHARS = 24000;
let supabaseAuthClient = null;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
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

function getBearerToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
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

async function requireAuthenticatedUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    return {
      data: null,
      error: { code: 'AUTH_REQUIRED', message: 'Practice generation requires an authenticated session.' },
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
      error: { code: 'AUTH_REQUIRED', message: 'Practice generation requires a valid Supabase session.' },
    };
  }

  return { data: { userId: data.user.id }, error: null };
}

function normalizeWhitespace(text = '') {
  return String(text).replace(/\u0000/g, '').replace(/\s+/g, ' ').trim();
}

function safeJsonParse(text = '') {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text).match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

const QUIZ_DIFFICULTIES = ['easy', 'medium', 'hard', 'extreme'];

function normalizeDifficulty(value, fallback = 'medium') {
  const difficulty = String(value || '').toLowerCase().trim();
  return QUIZ_DIFFICULTIES.includes(difficulty) ? difficulty : fallback;
}

function normalizeQuizQuestions(value, { limit = 5, difficulties = QUIZ_DIFFICULTIES } = {}) {
  const raw = Array.isArray(value) ? value : [];
  const fallbackDifficulties = difficulties.length ? difficulties : QUIZ_DIFFICULTIES;
  return raw
    .map((question, index) => {
      const options = Array.isArray(question.options)
        ? question.options.map((option) => normalizeWhitespace(option)).filter(Boolean).slice(0, 4)
        : [];
      const correct = Number(question.correct ?? question.correctAnswer ?? 0);
      const fallbackDifficulty = fallbackDifficulties[index % fallbackDifficulties.length] || 'medium';
      return {
        q: normalizeWhitespace(question.q || question.prompt),
        options,
        correct: Number.isInteger(correct) && correct >= 0 && correct < options.length ? correct : 0,
        explanation: normalizeWhitespace(question.explanation || ''),
        difficulty: normalizeDifficulty(question.difficulty, fallbackDifficulty),
        topic: normalizeWhitespace(question.topic || ''),
      };
    })
    .filter((question) => question.q && question.options.length >= 2)
    .slice(0, limit);
}

function normalizeFlashcards(value, { limit = 8 } = {}) {
  const raw = Array.isArray(value) ? value : [];
  return raw
    .map((card) => ({
      front: normalizeWhitespace(card.front || card.q),
      back: normalizeWhitespace(card.back || card.a),
    }))
    .filter((card) => card.front && card.back)
    .slice(0, limit);
}

async function callOpenAI({ kind, title, sourceText, questionCount = 5, cardCount = 8, difficulties = QUIZ_DIFFICULTIES, coverageHint = '' }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      data: null,
      providerError: 'AI practice provider is not configured.',
    };
  }

  const wantsQuiz = kind === 'quiz';
  const quizCount = Math.max(5, Math.min(60, Number(questionCount) || 5));
  const flashcardCount = Math.max(5, Math.min(60, Number(cardCount) || 8));
  const quizDifficulties = (Array.isArray(difficulties) ? difficulties : QUIZ_DIFFICULTIES)
    .map((difficulty) => normalizeDifficulty(difficulty, 'medium'))
    .filter((difficulty, index, all) => all.indexOf(difficulty) === index);
  const schemaInstruction = wantsQuiz
    ? 'Return JSON only: {"questions":[{"q":"...","options":["...","...","...","..."],"correct":0,"explanation":"...","difficulty":"easy|medium|hard|extreme","topic":"..."}]}. Options must be plausible. Correct index must match answer.'
    : `Return JSON only: {"cards":[{"front":"...","back":"..."}]}. Create up to ${flashcardCount} flashcards. Make at least ${Math.min(5, flashcardCount)} if source supports it. Cards must be atomic, concrete, and based only on source.`;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_PRACTICE_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODEL,
      input: [
        {
          role: 'system',
          content: [
            'You generate study practice from uploaded material.',
            'Use only supplied source text. Do not invent facts.',
            'If source text is sparse, ask factual questions about visible extracted content.',
            'Keep output concise and exam-useful.',
            wantsQuiz ? `Create ${quizCount} high-quality questions unless source is truly too sparse; never return fewer than ${Math.min(5, quizCount)} questions when the source has enough content. Cover the whole supplied source proportionally. Difficulty mix must fit the content, not be evenly split. Use easy for definitions, medium for understanding, hard for application/common mistakes, extreme only when source supports exam-like reasoning, traps, or concept comparison. ${coverageHint}` : `Create flashcards across the whole supplied source; more cards for dense topics, fewer for sparse text. ${coverageHint}`,
            schemaInstruction,
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify({
            kind,
            title,
            questionCount: quizCount,
            cardCount: flashcardCount,
            difficulties: quizDifficulties,
            coverageHint,
            sourceText: sourceText.slice(0, MAX_SOURCE_CHARS),
          }),
        },
      ],
      max_output_tokens: wantsQuiz ? 9000 : Math.min(7000, Math.max(1800, flashcardCount * 220)),
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      data: null,
      providerError: `OpenAI ${response.status}: ${errorText.slice(0, 300)}`,
    };
  }

  const payload = await response.json();
  const text = payload.output_text ||
    (payload.output || [])
      .flatMap((item) => item.content || [])
      .map((item) => item.text || '')
      .join('\n')
      .trim();

  const parsed = safeJsonParse(text);
  if (!parsed) {
    return { data: null, providerError: 'AI practice response was not valid JSON.' };
  }

  if (wantsQuiz) {
    const questions = normalizeQuizQuestions(parsed.questions, { limit: quizCount, difficulties: quizDifficulties });
    return questions.length ? { data: { questions }, providerError: null } : { data: null, providerError: 'AI returned no valid questions.' };
  }

  const cards = normalizeFlashcards(parsed.cards, { limit: flashcardCount });
  return cards.length ? { data: { cards }, providerError: null } : { data: null, providerError: 'AI returned no valid flashcards.' };
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

  const body = getJsonBody(req);
  const kind = body.kind === 'flashcards' ? 'flashcards' : 'quiz';
  const title = normalizeWhitespace(body.title || 'Uploaded material');
  const sourceText = normalizeWhitespace(body.sourceText || '');
  const questionCount = Math.max(5, Math.min(60, Number(body.questionCount) || 5));
  const cardCount = Math.max(5, Math.min(60, Number(body.cardCount) || Number(body.questionCount) || 8));
  const difficulties = Array.isArray(body.difficulties) && body.difficulties.length ? body.difficulties : QUIZ_DIFFICULTIES;
  const coverageHint = normalizeWhitespace(body.coverageHint || '');

  if (sourceText.length < 20) {
    return json(res, 400, { error: { code: 'SOURCE_TOO_SHORT', message: 'Source text is too short for AI practice.' } });
  }

  try {
    const result = await callOpenAI({ kind, title, sourceText, questionCount, cardCount, difficulties, coverageHint });
    if (!result.data) {
      return json(res, 503, { error: { code: 'AI_PRACTICE_FAILED', message: result.providerError || 'AI practice generation failed.' } });
    }
    return json(res, 200, { data: { ...result.data, provider: 'openai' }, error: null });
  } catch (error) {
    return json(res, 503, {
      error: {
        code: error?.name || 'AI_PRACTICE_FAILED',
        message: error?.message || 'AI practice generation failed.',
      },
    });
  }
}
