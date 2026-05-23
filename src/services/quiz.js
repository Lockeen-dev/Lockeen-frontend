import { seedExams } from '../data/mockData';
import { isMockMode } from '../lib/apiClient';
import { requireSupabaseClient, supabase } from '../lib/supabaseClient';

const mockAttempts = [];
const mockQuizzes = seedExams.flatMap((exam) =>
  (exam.chapters || []).flatMap((chapter) => {
    const questions = chapter.questions || [];
    if (!questions.length) return [];
    return [{
      id: `mock-quiz-${chapter.id}`,
      examId: exam.id,
      chapterId: chapter.id,
      noteId: null,
      title: chapter.title,
      status: 'active',
      questions: questions.map((question, index) => ({
        id: `mock-question-${chapter.id}-${index}`,
        quizId: `mock-quiz-${chapter.id}`,
        prompt: question.q,
        options: question.options || [],
        correctAnswer: String(question.correct),
        explanation: question.explanation || '',
        position: index,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }];
  }),
);

function ok(data) {
  return { data: structuredClone(data), error: null };
}

function fail(message, code = 'UNKNOWN_ERROR') {
  return { data: null, error: { code, message } };
}

function normalizeError(error, fallback = 'Request failed.') {
  return { code: error?.code || error?.name || 'SUPABASE_ERROR', message: error?.message || fallback };
}

function getCurrentUserId() {
  return localStorage.getItem('lockeen_real_user_id') || null;
}

function requireRealUserId() {
  const userId = getCurrentUserId();
  if (!userId) return fail('Real mode requires lockeen_real_user_id in localStorage.', 'AUTH_REQUIRED');
  return { data: userId, error: null };
}

function matchesFilters(quiz, filters = {}) {
  return (
    (!filters.examId || String(quiz.examId) === String(filters.examId)) &&
    (!filters.chapterId || String(quiz.chapterId) === String(filters.chapterId)) &&
    (!filters.noteId || String(quiz.noteId) === String(filters.noteId))
  );
}

function toQuestion(row) {
  return {
    id: row.id,
    quizId: row.quiz_id,
    prompt: row.prompt,
    q: row.prompt,
    options: row.options || [],
    correctAnswer: row.correct_answer,
    correct: Number(row.correct_answer),
    explanation: row.explanation || '',
    position: row.position,
  };
}

function toQuiz(row) {
  return {
    id: row.id,
    examId: row.exam_id,
    chapterId: row.chapter_id,
    noteId: row.note_id,
    title: row.title,
    status: row.status,
    questions: (row.quiz_questions || []).map(toQuestion).sort((a, b) => a.position - b.position),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAttempt(row) {
  return {
    id: row.id,
    quizId: row.quiz_id,
    score: row.score,
    total: row.total,
    answers: row.answers || [],
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

async function listRealQuizzes(filters = {}) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = requireRealUserId();
  if (userResult.error) return userResult;

  let query = supabase
    .from('quizzes')
    .select('*, quiz_questions(*)')
    .eq('user_id', userResult.data)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (filters.examId) query = query.eq('exam_id', filters.examId);
  if (filters.chapterId) query = query.eq('chapter_id', filters.chapterId);
  if (filters.noteId) query = query.eq('note_id', filters.noteId);

  const { data, error } = await query;
  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  return ok((data || []).map(toQuiz));
}

async function getRealQuiz(id) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = requireRealUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('quizzes')
    .select('*, quiz_questions(*)')
    .eq('id', id)
    .eq('user_id', userResult.data)
    .maybeSingle();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  if (!data) return fail('Quiz not found.', 'NOT_FOUND');
  return ok(toQuiz(data));
}

async function submitRealQuizAttempt(quizId, input = {}) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = requireRealUserId();
  if (userResult.error) return userResult;

  const score = Number(input.score);
  const total = Number(input.total);
  if (!Number.isFinite(score) || !Number.isFinite(total)) {
    return fail('Quiz score and total are required.', 'VALIDATION_ERROR');
  }

  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id: userResult.data,
      quiz_id: quizId,
      score,
      total,
      answers: input.answers || [],
      completed_at: input.completedAt || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  return ok(toAttempt(data));
}

export async function listQuizzes(filters = {}) {
  if (!isMockMode()) return listRealQuizzes(filters);
  return ok(mockQuizzes.filter((quiz) => matchesFilters(quiz, filters)));
}

export async function getQuiz(id) {
  if (!isMockMode()) return getRealQuiz(id);
  const quiz = mockQuizzes.find((item) => String(item.id) === String(id));
  if (!quiz) return fail('Quiz not found.', 'NOT_FOUND');
  return ok(quiz);
}

export async function submitQuizAttempt(quizId, input = {}) {
  if (!isMockMode()) return submitRealQuizAttempt(quizId, input);

  const quiz = mockQuizzes.find((item) => String(item.id) === String(quizId));
  if (!quiz) return fail('Quiz not found.', 'NOT_FOUND');
  const score = Number(input.score);
  const total = Number(input.total);
  if (!Number.isFinite(score) || !Number.isFinite(total)) {
    return fail('Quiz score and total are required.', 'VALIDATION_ERROR');
  }

  const attempt = {
    id: `mock-quiz-attempt-${crypto.randomUUID()}`,
    quizId,
    score,
    total,
    answers: input.answers || [],
    completedAt: input.completedAt || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  mockAttempts.unshift(attempt);
  return ok(attempt);
}
