import { createClient } from '@supabase/supabase-js';

const DEFAULT_MODEL = 'gpt-4.1-mini';
const MAX_SOURCE_CHARS = 28000;
const MAX_OPTION_CHARS = 260;
const MAX_QUESTION_CHARS = 260;
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
  return String(text)
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function compactLine(text = '') {
  return normalizeWhitespace(text).replace(/\s+/g, ' ').trim();
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

function normalizeSlug(text = '') {
  return compactLine(text)
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function titleTokens(title = '') {
  return normalizeSlug(title)
    .split('-')
    .filter((token) => token.length >= 4 && !/^\d+$/.test(token));
}

function isFileLikeTitle(title = '') {
  return /\.(pdf|docx?|pptx?|txt)$/i.test(title) || /\b(tesi|matr|matricola|documento|file)\b/i.test(title);
}

function promptSafeTitle(title = '') {
  const clean = compactLine(title).replace(/\.[a-z0-9]{2,5}$/i, '');
  if (!clean || isFileLikeTitle(clean)) return 'Materiale di studio';
  return clean.slice(0, 80);
}

function hasSourceName(text = '', title = '') {
  const value = compactLine(text).toLowerCase();
  const sourceLooksLikeFile = isFileLikeTitle(title);
  if (/\b(pdf|file|documento|materiale caricato|uploaded material|source text)\b/.test(value)) return true;
  if (/\btesi\s+matr\b|\bmatr\.\s*\d+/i.test(value)) return true;
  return sourceLooksLikeFile && titleTokens(title).some((token) => value.includes(token.toLowerCase()));
}

function hasLayoutReference(text = '') {
  const value = compactLine(text).toLowerCase();
  return (
    /\b(page|pagina|pages|pagine|chapter|capitolo|indice|index|table of contents|sommario|study point|punto\s+studio|sezione\s+\d+|paragrafo\s+\d+)\b/.test(value) ||
    /^\s*\d{1,3}\s+[a-zà-ù]/i.test(value) ||
    /\b\d{1,2}\.\d{1,2}(?:\.\d{1,2})?\b/.test(value)
  );
}

function hasTruncatedText(text = '') {
  const value = compactLine(text);
  return (
    !value ||
    /\.{2,}|…/.test(value) ||
    /^[,.;:)\]-]/.test(value) ||
    /(?:\b(di|del|della|delle|che|per|con|tra|fra|a|in|il|la|lo|gli|le|un|una|the|of|to|and|with|for|come|da|al|ai)\b)[,;:]?$/i.test(value)
  );
}

function hasFragmentStart(text = '') {
  const value = compactLine(text);
  if (!value) return true;
  if (/^[,.;:)\]-]/.test(value)) return true;
  if (/^[a-zà-ù]/.test(value) && !/^(e-commerce|iOS|iPad|ln\(|log\()/i.test(value)) return true;
  return false;
}

function isGenericQuestion(text = '') {
  const value = compactLine(text).toLowerCase();
  return [
    'quale affermazione descrive meglio un concetto',
    'quale affermazione descrive meglio un concetto chiave',
    'which statement best explains the concept',
    'which statement best matches the concept',
    'which statement is directly supported by the uploaded material',
    'which example best matches the idea',
    'what is the main implication of this concept',
  ].some((pattern) => value.includes(pattern));
}

function hasBalancedOptions(options = []) {
  const lengths = options.map((option) => compactLine(option).length).filter(Boolean);
  if (lengths.length !== 4) return false;
  const shortest = Math.min(...lengths);
  const longest = Math.max(...lengths);
  return shortest >= 18 && longest <= MAX_OPTION_CHARS && longest / Math.max(shortest, 1) <= 2.8;
}

const OBVIOUS_OPTION_CUE_RE = /(^|[\s,.;:])(?:sempre|mai|solo|soltanto|qualsiasi|automaticamente|elimina(?:re|no|te)?|garantisce|garantiscono|impedisce|impossibile|nessun[oa]?|tutt[ioe]|completamente|scomparir[aà]|scompare|prive? di|senza ulteriori)(?=$|[\s,.;:])/i;

function hasCorrectLengthBias(options = [], correct = 0) {
  const lengths = options.map((option) => compactLine(option).length);
  if (lengths.length !== 4 || !Number.isInteger(correct) || correct < 0 || correct >= lengths.length) return false;
  const correctLen = lengths[correct];
  const otherLengths = lengths.filter((_, index) => index !== correct).sort((a, b) => b - a);
  const secondLongest = otherLengths[0] || 0;
  const medianOther = otherLengths[1] || secondLongest || 1;
  return correctLen > secondLongest + 12 && correctLen / Math.max(medianOther, 1) > 1.12;
}

function hasObviousDistractorBias(options = [], correct = 0) {
  if (options.length !== 4 || !Number.isInteger(correct) || correct < 0 || correct >= options.length) return false;
  const cueScores = options.map((option) => (compactLine(option).match(OBVIOUS_OPTION_CUE_RE) ? 1 : 0));
  const correctScore = cueScores[correct] || 0;
  const distractorCueCount = cueScores.filter((score, index) => index !== correct && score > 0).length;
  return correctScore === 0 && distractorCueCount >= 2;
}

function qualityNotes(question, title) {
  const options = Array.isArray(question.options)
    ? question.options.map(compactLine).filter(Boolean).slice(0, 4)
    : [];
  const correct = Number(question.correct ?? question.correctAnswer ?? 0);
  const visibleTexts = [question.q, question.explanation, question.topic, ...options].map(compactLine);
  const uniqueOptions = new Set(options.map((option) => option.toLowerCase()));
  const notes = [];

  if (!compactLine(question.q)) notes.push('missing_question');
  if (compactLine(question.q).length > MAX_QUESTION_CHARS) notes.push('question_too_long');
  if (options.length !== 4) notes.push('wrong_option_count');
  if (uniqueOptions.size !== 4) notes.push('duplicate_options');
  if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) notes.push('invalid_correct_index');
  if (visibleTexts.some((text) => hasLayoutReference(text))) notes.push('layout_reference');
  if (visibleTexts.some((text) => hasSourceName(text, title))) notes.push('source_name_reference');
  if (visibleTexts.some((text) => hasTruncatedText(text))) notes.push('truncated_text');
  if (options.some((option) => hasFragmentStart(option))) notes.push('fragment_option');
  if (isGenericQuestion(question.q)) notes.push('generic_question');
  if (!hasBalancedOptions(options)) notes.push('unbalanced_options');
  if (hasCorrectLengthBias(options, correct)) notes.push('correct_length_bias');
  if (hasObviousDistractorBias(options, correct)) notes.push('obvious_distractor_bias');
  if (!compactLine(question.explanation) || compactLine(question.explanation).length < 35) notes.push('weak_explanation');
  if (!compactLine(question.topic) || compactLine(question.topic).length < 3) notes.push('missing_topic');
  return notes;
}

const QUIZ_DIFFICULTIES = ['easy', 'medium', 'hard'];

function normalizeDifficulty(value, index = 0) {
  const difficulty = String(value || '').toLowerCase().trim();
  if (QUIZ_DIFFICULTIES.includes(difficulty)) return difficulty;
  return index % 5 === 4 ? 'hard' : index % 2 === 0 ? 'easy' : 'medium';
}

function normalizeConcepts(value = []) {
  const seen = new Set();
  return (Array.isArray(value) ? value : [])
    .map((concept, index) => {
      const title = compactLine(concept.title || concept.topic || '');
      const summary = compactLine(concept.summary || concept.description || '');
      const conceptKey = normalizeSlug(concept.conceptKey || title || `concept-${index + 1}`);
      return {
        conceptKey: conceptKey || `concept-${index + 1}`,
        title,
        summary,
        importance: Math.max(1, Math.min(5, Number(concept.importance || 3))),
        chunkIndex: Number(concept.chunkIndex || 0),
      };
    })
    .filter((concept) => concept.title && concept.summary && !hasLayoutReference(concept.title))
    .filter((concept) => {
      if (seen.has(concept.conceptKey)) return false;
      seen.add(concept.conceptKey);
      return true;
    })
    .slice(0, 24);
}

function normalizeQuizQuestions(value, { limit = 5, title = '' } = {}) {
  const seen = new Set();
  return (Array.isArray(value) ? value : [])
    .map((question, index) => {
      const options = Array.isArray(question.options)
        ? question.options.map(compactLine).filter(Boolean).slice(0, 4)
        : [];
      const correct = Number(question.correct ?? question.correctAnswer ?? 0);
      const normalized = {
        q: compactLine(question.q || question.prompt),
        options,
        correct: Number.isInteger(correct) && correct >= 0 && correct < options.length ? correct : 0,
        explanation: compactLine(question.explanation || ''),
        difficulty: normalizeDifficulty(question.difficulty, index),
        topic: compactLine(question.topic || ''),
        conceptKey: normalizeSlug(question.conceptKey || question.topic || `concept-${index + 1}`),
        sourceChunk: compactLine(question.sourceChunk || question.sourceSnippet || '').slice(0, 320),
      };
      const notes = qualityNotes(normalized, title);
      const correctOption = normalized.options[normalized.correct] || '';
      const key = compactLine(`${normalized.q} ${correctOption}`).toLowerCase().slice(0, 240);
      return {
        ...normalized,
        qualityScore: Math.max(0, 1 - (notes.length * 0.16)),
        validationNotes: notes,
        validationStatus: notes.length ? 'rejected' : 'valid',
        _key: key,
      };
    })
    .filter((question) => {
      if (question.validationStatus !== 'valid') return false;
      if (!question._key || seen.has(question._key)) return false;
      seen.add(question._key);
      return true;
    })
    .map(({ _key, ...question }) => question)
    .slice(0, limit);
}

const FLASHCARD_TYPES = ['definition', 'comparison', 'formula', 'example', 'misconception'];
const FLASHCARD_DIFFICULTIES = ['easy', 'medium', 'hard'];

function normalizeFlashcardType(value = '') {
  const type = String(value || '').toLowerCase().trim();
  return FLASHCARD_TYPES.includes(type) ? type : 'definition';
}

function normalizeFlashcardDifficulty(value = '') {
  const difficulty = String(value || '').toLowerCase().trim();
  return FLASHCARD_DIFFICULTIES.includes(difficulty) ? difficulty : 'medium';
}

function hasBadFlashcardReference(text = '', title = '') {
  const value = compactLine(text).toLowerCase();
  return (
    hasSourceName(value, title) ||
    hasLayoutReference(value) ||
    /\b(pdf|file|documento|materiale caricato|uploaded material|source text|page|pagina|chapter|capitolo|figure|figura|index|indice|table of contents|sommario|appendix|appendice|section|sezione|study point|punto\s+studio)\b/.test(value)
  );
}

function isGenericFlashcardFront(text = '') {
  const value = compactLine(text).toLowerCase();
  return [
    'main point from uploaded material',
    'key detail',
    'core idea of',
    'best review method',
    'common weak point',
    'example check',
    'next step after a mistake',
    'what is the main idea',
    'qual è il concetto principale',
    'spiega questo concetto',
  ].some((pattern) => value.includes(pattern));
}

function flashcardQualityNotes(card = {}, title = '') {
  const front = compactLine(card.front);
  const back = compactLine(card.back);
  const visibleTexts = [front, back, card.topic].map(compactLine);
  const notes = [];

  if (!front) notes.push('missing_front');
  if (!back) notes.push('missing_back');
  if (front.length < 8) notes.push('front_too_short');
  if (front.length > 140) notes.push('front_too_long');
  if (back.length < 18) notes.push('back_too_short');
  if (back.length > 520) notes.push('back_too_long');
  if (visibleTexts.some((text) => hasBadFlashcardReference(text, title))) notes.push('layout_or_source_reference');
  if ([front, back].some(hasTruncatedText)) notes.push('truncated_text');
  if (isGenericFlashcardFront(front)) notes.push('generic_front');
  if (front.toLowerCase() === back.toLowerCase()) notes.push('front_equals_back');
  if (back.toLowerCase().startsWith(front.toLowerCase()) && back.length < front.length * 1.7) notes.push('front_repeated_in_back');

  return notes;
}

function normalizeFlashcards(value, { limit = 8, title = '' } = {}) {
  const raw = Array.isArray(value) ? value : [];
  const seen = new Set();
  return raw
    .map((card) => {
      const normalized = {
        front: compactLine(card.front || card.q),
        back: compactLine(card.back || card.a),
        type: normalizeFlashcardType(card.type || card.cardType || card.card_type),
        difficulty: normalizeFlashcardDifficulty(card.difficulty),
        topic: compactLine(card.topic || '').slice(0, 60),
        sourceSnippet: compactLine(card.sourceSnippet || card.sourceChunk || '').slice(0, 260),
      };
      const notes = flashcardQualityNotes(normalized, title);
      const key = compactLine(`${normalized.front} ${normalized.back}`).toLowerCase().slice(0, 220);
      return {
        ...normalized,
        qualityScore: Math.max(0, 1 - (notes.length * 0.2)),
        validationNotes: notes,
        validationStatus: notes.length ? 'rejected' : 'valid',
        _key: key,
      };
    })
    .filter((card) => {
      if (card.validationStatus !== 'valid') return false;
      if (!card._key || seen.has(card._key)) return false;
      seen.add(card._key);
      return true;
    })
    .map(({ _key, ...card }) => card)
    .slice(0, limit);
}

async function callOpenAI({ kind, title, sourceText, questionCount = 5, cardCount = 8, coverageHint = '' }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      data: null,
      providerError: 'AI practice provider is not configured.',
    };
  }

  const wantsQuiz = kind === 'quiz';
  const quizCount = Math.max(1, Math.min(60, Number(questionCount) || 5));
  const flashcardCount = Math.max(5, Math.min(60, Number(cardCount) || 8));
  const model = process.env.OPENAI_PRACTICE_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const safeTitle = promptSafeTitle(title);
  const schemaInstruction = wantsQuiz
    ? 'Return JSON only: {"concepts":[{"conceptKey":"short-stable-id","title":"...","summary":"...","importance":1-5}],"questions":[{"q":"...","options":["...","...","...","..."],"correct":0,"explanation":"...","difficulty":"easy|medium|hard","topic":"...","conceptKey":"matching-concept-key","sourceChunk":"short source snippet"}]}.'
    : `Return JSON only: {"cards":[{"front":"...","back":"...","type":"definition|comparison|formula|example|misconception","difficulty":"easy|medium|hard","topic":"...","sourceSnippet":"short proof snippet"}]}. Create up to ${flashcardCount} flashcards.`;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: [
            'You are the quiz engine of a premium study app. Use only the supplied source text. Do not invent facts.',
            wantsQuiz ? [
              'First identify the real concepts in the source. Then write multiple-choice questions from those concepts.',
              'Write in the dominant language of the supplied source. If the source is Italian, write Italian. If the source is English, write English. Do not mix languages.',
              `Create up to ${quizCount} high-quality questions, but return fewer if the source does not support enough good questions.`,
              'Never ask about the PDF, file name, source name, page number, chapter number, index, table of contents, headings, layout, or study points.',
              'A question must name the specific concept being tested. Avoid generic stems like "quale affermazione descrive meglio un concetto".',
              'Good stems ask for definition, implication, application, comparison, causal relation, or common misconception.',
              'Every option must be a complete readable phrase or sentence. No ellipsis. No trailing fragments. No copied headings.',
              'All four options must have similar length and grammatical shape. The correct option must stay close to the median option length and must not be consistently or noticeably longer than distractors.',
              'Distractors must be plausible misconceptions from the same concept area, not caricatures. Do not make wrong options obviously false with cues like sempre, mai, solo, qualsiasi, automaticamente, elimina, garantisce, or impossibile unless the source requires that wording and all options use comparable tone.',
              'Keep all options equally specific: if one option includes numbers, conditions, or examples, the other options should have comparable specificity.',
              'Exactly one answer must be clearly correct. Avoid double negatives and avoid "which is NOT".',
              'Use about 40% easy, 40% medium, 20% hard. Do not use extreme.',
              'sourceChunk must be a short content snippet that proves the answer. It must not be a layout/header/page reference.',
              coverageHint,
            ].join(' ') : [
              'Create premium flashcards from real concepts in the supplied source.',
              'Write in the dominant language of the supplied source. If the source is Italian, write Italian. If the source is English, write English. Do not mix languages.',
              `Create up to ${flashcardCount} high-quality cards, but return fewer if the source does not support enough good cards.`,
              'Use only the supplied source. Do not invent facts.',
              'Never mention the PDF, file name, source name, page number, chapter number, index, table of contents, headings, layout, section number, or study points.',
              'front must be a short active-recall prompt or named concept, max 100 characters. It must not be a copied sentence from the source.',
              'back must be a complete answer grounded in the source, max 300 characters. No ellipsis. No truncated phrases.',
              'One atomic idea per card. Split broad ideas into separate cards.',
              'Prefer cards about definitions, key concepts, comparisons, examples, applications, formulas, and common misconceptions.',
              'Use plausible learning prompts: "Che cosa misura...", "Perché...", "Qual è la differenza tra...", "Quando...", "Quale ruolo ha...".',
              'Avoid generic fronts like "Main point", "Key detail", "Core idea", "Spiega questo concetto", or "Concetto principale".',
              'topic must be a 2-4 word subject label from the material.',
              'sourceSnippet must be a short content snippet proving the answer, not a layout/header/page reference.',
              'Use about 45% easy, 40% medium, 15% hard. Do not use extreme.',
              coverageHint,
            ].join(' '),
            schemaInstruction,
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify({
            kind,
            title: safeTitle,
            questionCount: quizCount,
            cardCount: flashcardCount,
            coverageHint,
            sourceText: sourceText.slice(0, MAX_SOURCE_CHARS),
          }),
        },
      ],
      max_output_tokens: wantsQuiz ? Math.min(14000, Math.max(4200, quizCount * 430)) : Math.min(10000, Math.max(2600, flashcardCount * 320)),
      temperature: wantsQuiz ? 0.25 : 0.2,
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
    const concepts = normalizeConcepts(parsed.concepts);
    const questions = normalizeQuizQuestions(parsed.questions, { limit: quizCount, title });
    return questions.length
      ? { data: { questions, concepts, provider: 'openai', model }, providerError: null }
      : { data: null, providerError: 'AI returned no valid questions after quality validation.' };
  }

  const cards = normalizeFlashcards(parsed.cards, { limit: flashcardCount, title });
  return cards.length
    ? { data: { cards, provider: 'openai', model }, providerError: null }
    : { data: null, providerError: 'AI returned no valid flashcards.' };
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
  const title = compactLine(body.title || 'Study material');
  const sourceText = normalizeWhitespace(body.sourceText || '');
  const questionCount = Math.max(1, Math.min(60, Number(body.questionCount) || 5));
  const cardCount = Math.max(5, Math.min(60, Number(body.cardCount) || Number(body.questionCount) || 8));
  const coverageHint = compactLine(body.coverageHint || '');

  if (sourceText.length < 80) {
    return json(res, 400, { error: { code: 'SOURCE_TOO_SHORT', message: 'Source text is too short for AI practice.' } });
  }

  try {
    const result = await callOpenAI({ kind, title, sourceText, questionCount, cardCount, coverageHint });
    if (result.providerError) {
      return json(res, 502, { error: { code: 'AI_PROVIDER_ERROR', message: result.providerError } });
    }
    return json(res, 200, { data: result.data });
  } catch (error) {
    return json(res, 500, {
      error: {
        code: error?.name || 'AI_PRACTICE_FAILED',
        message: error?.message || 'AI practice generation failed.',
      },
    });
  }
}
