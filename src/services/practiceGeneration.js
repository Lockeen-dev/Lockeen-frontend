import { isMockMode } from '../lib/apiClient';
import { requireSupabaseClient, supabase } from '../lib/supabaseClient';
import { fail, ok } from './_shared';

const PRACTICE_TIMEOUT_MS = 30000;
const DIFFICULTIES = ['easy', 'medium', 'hard', 'extreme'];

function normalizeQuestion(question = {}) {
  const options = Array.isArray(question.options)
    ? question.options.map((option) => String(option || '').trim()).filter(Boolean).slice(0, 4)
    : [];
  const correct = Number(question.correct ?? question.correctAnswer ?? 0);
  return {
    q: String(question.q || question.prompt || '').trim(),
    options,
    correct: Number.isInteger(correct) && correct >= 0 && correct < options.length ? correct : 0,
    explanation: String(question.explanation || '').trim(),
    difficulty: DIFFICULTIES.includes(String(question.difficulty || '').toLowerCase()) ? String(question.difficulty).toLowerCase() : 'medium',
    topic: String(question.topic || '').trim(),
  };
}

function normalizeCard(card = {}) {
  return {
    front: String(card.front || card.q || '').trim(),
    back: String(card.back || card.a || '').trim(),
  };
}

export async function generatePracticeFromText({ kind = 'quiz', title, sourceText, questionCount, cardCount, difficulties, coverageHint }) {
  if (isMockMode()) return fail('AI practice generation is not available in mock mode.', 'AI_NOT_AVAILABLE');

  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (sessionError || !token) {
    return fail('AI practice generation requires an authenticated Supabase session.', 'AUTH_REQUIRED');
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), PRACTICE_TIMEOUT_MS);

  let response;
  try {
    response = await fetch('/api/generate-practice', {
      signal: controller.signal,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ kind, title, sourceText, questionCount, cardCount, difficulties, coverageHint }),
    });
  } catch (error) {
    return fail(
      error?.name === 'AbortError' ? 'AI practice generation timed out.' : 'AI practice generation failed.',
      error?.name || 'AI_PRACTICE_FAILED',
    );
  } finally {
    window.clearTimeout(timeoutId);
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok || payload.error) {
    const error = payload.error || {};
    return fail(error.message || 'AI practice generation failed.', error.code || 'AI_PRACTICE_FAILED');
  }

  if (kind === 'flashcards') {
    const cards = (payload.data?.cards || []).map(normalizeCard).filter((card) => card.front && card.back);
    return cards.length ? ok({ cards, provider: payload.data?.provider || 'openai' }) : fail('AI returned no valid flashcards.', 'AI_PRACTICE_EMPTY');
  }

  const questions = (payload.data?.questions || []).map(normalizeQuestion).filter((question) => question.q && question.options.length >= 2);
  return questions.length ? ok({ questions, provider: payload.data?.provider || 'openai' }) : fail('AI returned no valid questions.', 'AI_PRACTICE_EMPTY');
}
