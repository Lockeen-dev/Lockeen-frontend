const DEFAULT_MODEL = 'gpt-4.1-mini';
const MAX_SOURCE_CHARS = 12000;

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

function normalizeQuizQuestions(value) {
  const raw = Array.isArray(value) ? value : [];
  return raw
    .map((question) => {
      const options = Array.isArray(question.options)
        ? question.options.map((option) => normalizeWhitespace(option)).filter(Boolean).slice(0, 4)
        : [];
      const correct = Number(question.correct ?? question.correctAnswer ?? 0);
      return {
        q: normalizeWhitespace(question.q || question.prompt),
        options,
        correct: Number.isInteger(correct) && correct >= 0 && correct < options.length ? correct : 0,
        explanation: normalizeWhitespace(question.explanation || ''),
      };
    })
    .filter((question) => question.q && question.options.length >= 2)
    .slice(0, 5);
}

function normalizeFlashcards(value) {
  const raw = Array.isArray(value) ? value : [];
  return raw
    .map((card) => ({
      front: normalizeWhitespace(card.front || card.q),
      back: normalizeWhitespace(card.back || card.a),
    }))
    .filter((card) => card.front && card.back)
    .slice(0, 8);
}

async function callOpenAI({ kind, title, sourceText }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      data: null,
      providerError: 'AI practice provider is not configured.',
    };
  }

  const wantsQuiz = kind === 'quiz';
  const schemaInstruction = wantsQuiz
    ? 'Return JSON only: {"questions":[{"q":"...","options":["...","...","...","..."],"correct":0,"explanation":"..."}]}. Create exactly 5 questions. Options must be plausible. Correct index must match answer.'
    : 'Return JSON only: {"cards":[{"front":"...","back":"..."}]}. Create exactly 8 flashcards. Cards must be atomic, concrete, and based only on source.';

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
            schemaInstruction,
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify({
            kind,
            title,
            sourceText: sourceText.slice(0, MAX_SOURCE_CHARS),
          }),
        },
      ],
      max_output_tokens: wantsQuiz ? 1600 : 1400,
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
    const questions = normalizeQuizQuestions(parsed.questions);
    return questions.length ? { data: { questions }, providerError: null } : { data: null, providerError: 'AI returned no valid questions.' };
  }

  const cards = normalizeFlashcards(parsed.cards);
  return cards.length ? { data: { cards }, providerError: null } : { data: null, providerError: 'AI returned no valid flashcards.' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } });
  }

  if (!getBearerToken(req)) {
    return json(res, 401, { error: { code: 'AUTH_REQUIRED', message: 'Practice generation requires an authenticated session.' } });
  }

  const body = getJsonBody(req);
  const kind = body.kind === 'flashcards' ? 'flashcards' : 'quiz';
  const title = normalizeWhitespace(body.title || 'Uploaded material');
  const sourceText = normalizeWhitespace(body.sourceText || '');

  if (sourceText.length < 20) {
    return json(res, 400, { error: { code: 'SOURCE_TOO_SHORT', message: 'Source text is too short for AI practice.' } });
  }

  try {
    const result = await callOpenAI({ kind, title, sourceText });
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
