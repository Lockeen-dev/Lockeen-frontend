import { seedExams } from '../data/mockData';
import { isMockMode } from '../lib/apiClient';
import { requireSupabaseClient, supabase } from '../lib/supabaseClient';
import { requireAuthenticatedUserId } from './auth';

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
      sourceMaterialId: null,
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

function matchesFilters(quiz, filters = {}) {
  return (
    (!filters.examId || String(quiz.examId) === String(filters.examId)) &&
    (!filters.chapterId || String(quiz.chapterId) === String(filters.chapterId)) &&
    (!filters.noteId || String(quiz.noteId) === String(filters.noteId))
  );
}

function hasKnownMockParent(input = {}) {
  if (!input.examId && !input.chapterId && !input.noteId) return false;
  if (input.noteId) return true;
  if (input.examId && seedExams.some((exam) => String(exam.id) === String(input.examId))) return true;
  return seedExams.some((exam) =>
    (exam.chapters || []).some((chapter) => String(chapter.id) === String(input.chapterId)),
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
    sourceMaterialId: row.source_material_id || null,
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

function toQuizInsert(input, userId) {
  return {
    user_id: userId,
    exam_id: input.examId || null,
    chapter_id: input.chapterId || null,
    note_id: input.noteId || null,
    source_material_id: input.sourceMaterialId || null,
    title: input.title,
    status: input.status || 'active',
  };
}

function toQuestionInsert(question, quizId, userId, position) {
  const correct = Number(question.correct ?? question.correctAnswer ?? 0);
  return {
    user_id: userId,
    quiz_id: quizId,
    prompt: question.prompt || question.q || '',
    options: question.options || [],
    correct_answer: String(Number.isFinite(correct) ? correct : 0),
    explanation: question.explanation || '',
    position,
  };
}

function validateQuiz(input = {}) {
  if (!input.title?.trim()) return fail('Quiz title is required.', 'VALIDATION_ERROR');
  if (!input.examId && !input.chapterId && !input.noteId) {
    return fail('Quiz requires examId, chapterId, or noteId.', 'VALIDATION_ERROR');
  }
  if (!Array.isArray(input.questions) || input.questions.length === 0) {
    return fail('Quiz requires at least one question.', 'VALIDATION_ERROR');
  }
  const invalidQuestion = input.questions.find((question) => {
    const correct = Number(question.correct ?? question.correctAnswer ?? 0);
    return (
      !(question.prompt || question.q || '').trim() ||
      !Array.isArray(question.options) ||
      question.options.length < 2 ||
      !Number.isInteger(correct) ||
      correct < 0 ||
      correct >= question.options.length
    );
  });
  if (invalidQuestion) return fail('Quiz questions require prompt, options, and valid correct answer.', 'VALIDATION_ERROR');
  return null;
}

async function listRealQuizzes(filters = {}) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
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
  const userResult = await requireAuthenticatedUserId();
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

async function createRealQuiz(input = {}) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;
  const validationError = validateQuiz(input);
  if (validationError) return validationError;

  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .insert(toQuizInsert(input, userResult.data))
    .select()
    .single();

  if (quizError) {
    const normalized = normalizeError(quizError);
    return fail(normalized.message, normalized.code);
  }

  const questionRows = input.questions.map((question, index) =>
    toQuestionInsert(question, quiz.id, userResult.data, index),
  );
  const { data: questions, error: questionsError } = await supabase
    .from('quiz_questions')
    .insert(questionRows)
    .select();

  if (questionsError) {
    await supabase.from('quizzes').delete().eq('id', quiz.id).eq('user_id', userResult.data);
    const normalized = normalizeError(questionsError);
    return fail(normalized.message, normalized.code);
  }

  return ok(toQuiz({ ...quiz, quiz_questions: questions || [] }));
}

async function submitRealQuizAttempt(quizId, input = {}) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
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

export async function createQuiz(input = {}) {
  if (!isMockMode()) return createRealQuiz(input);
  const validationError = validateQuiz(input);
  if (validationError) return validationError;
  if (!hasKnownMockParent(input)) return fail('Quiz requires a known mock parent.', 'VALIDATION_ERROR');

  const now = new Date().toISOString();
  const quiz = {
    id: `mock-quiz-${crypto.randomUUID()}`,
    examId: input.examId || null,
    chapterId: input.chapterId || null,
    noteId: input.noteId || null,
    sourceMaterialId: input.sourceMaterialId || null,
    title: input.title,
    status: input.status || 'active',
    questions: input.questions.map((question, index) => ({
      id: `mock-question-${crypto.randomUUID()}`,
      quizId: null,
      prompt: question.prompt || question.q || '',
      q: question.prompt || question.q || '',
      options: question.options || [],
      correctAnswer: String(Number(question.correct ?? question.correctAnswer ?? 0)),
      correct: Number(question.correct ?? question.correctAnswer ?? 0),
      explanation: question.explanation || '',
      position: index,
    })),
    createdAt: now,
    updatedAt: now,
  };
  quiz.questions = quiz.questions.map((question) => ({ ...question, quizId: quiz.id }));
  mockQuizzes.unshift(quiz);
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
