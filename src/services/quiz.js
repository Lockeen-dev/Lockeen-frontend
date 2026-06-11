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
  const filtersSourceMaterial = Object.prototype.hasOwnProperty.call(filters, 'sourceMaterialId');
  return (
    (!filters.examId || String(quiz.examId) === String(filters.examId)) &&
    (!filters.chapterId || String(quiz.chapterId) === String(filters.chapterId)) &&
    (!filters.noteId || String(quiz.noteId) === String(filters.noteId)) &&
    (!filtersSourceMaterial ||
      (filters.sourceMaterialId
        ? String(quiz.sourceMaterialId) === String(filters.sourceMaterialId)
        : !quiz.sourceMaterialId))
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
    sourceMaterialId: row.source_material_id || null,
    prompt: row.prompt,
    q: row.prompt,
    options: row.options || [],
    correctAnswer: row.correct_answer,
    correct: Number(row.correct_answer),
    explanation: row.explanation || '',
    difficulty: row.difficulty || 'medium',
    topic: row.topic || '',
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

function toAttemptRun(row) {
  const quiz = row.quizzes || row.quiz || {};
  const questions = (quiz.quiz_questions || []).map(toQuestion).sort((a, b) => a.position - b.position);
  const percent = Number(row.total) > 0 ? Math.round((Number(row.score) / Number(row.total)) * 100) : 0;
  const difficultyWeights = { easy: 0.75, medium: 1, hard: 1.25, extreme: 1.5 };
  const weighted = questions.reduce((acc, question, index) => {
    const difficulty = ['easy', 'medium', 'hard', 'extreme'].includes(question.difficulty) ? question.difficulty : 'medium';
    const weight = difficultyWeights[difficulty] || 1;
    const answer = Array.isArray(row.answers) ? row.answers[index] : null;
    const correct = Number(answer) === Number(question.correct);
    return {
      score: acc.score + (correct ? weight : 0),
      total: acc.total + weight,
      difficulty,
    };
  }, { score: 0, total: 0, difficulty: 'medium' });
  const weightedScore = weighted.total > 0 ? Math.round((weighted.score / weighted.total) * 100) : percent;
  return {
    id: row.id,
    attemptId: row.id,
    quizId: row.quiz_id,
    score: percent,
    weightedScore,
    rawScore: Number(row.score || 0),
    total: Number(row.total || 0),
    answers: row.answers || [],
    completedAt: row.completed_at,
    createdAt: row.created_at,
    date: row.completed_at ? new Date(row.completed_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : 'Recent',
    examId: quiz.exam_id || null,
    chapterId: quiz.chapter_id || 'all',
    noteId: quiz.note_id || null,
    sourceMaterialId: quiz.source_material_id || null,
    chapterName: quiz.title || 'Quiz',
    title: quiz.title || 'Quiz',
    numQ: Number(row.total || questions.length || 0),
    questions,
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
  const difficulty = ['easy', 'medium', 'hard', 'extreme'].includes(question.difficulty) ? question.difficulty : 'medium';
  return {
    user_id: userId,
    quiz_id: quizId,
    source_material_id: question.sourceMaterialId || null,
    prompt: question.prompt || question.q || '',
    options: question.options || [],
    correct_answer: String(Number.isFinite(correct) ? correct : 0),
    explanation: question.explanation || '',
    difficulty,
    topic: question.topic || null,
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

function randomIndex(max) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function shuffleQuestionOptions(question = {}) {
  const options = Array.isArray(question.options) ? [...question.options] : [];
  const correct = Number(question.correct ?? question.correctAnswer ?? 0);
  const entries = options.map((option, index) => ({
    option,
    correct: index === correct,
  }));

  for (let index = entries.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [entries[index], entries[swapIndex]] = [entries[swapIndex], entries[index]];
  }

  const nextCorrect = Math.max(0, entries.findIndex((entry) => entry.correct));
  return {
    ...question,
    options: entries.map((entry) => entry.option),
    correct: nextCorrect,
    correctAnswer: String(nextCorrect),
  };
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
  if (Object.prototype.hasOwnProperty.call(filters, 'sourceMaterialId')) {
    query = filters.sourceMaterialId
      ? query.eq('source_material_id', filters.sourceMaterialId)
      : query.is('source_material_id', null);
  }

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

async function deleteRealQuiz(id) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  await supabase
    .from('quiz_attempts')
    .delete()
    .eq('quiz_id', id)
    .eq('user_id', userResult.data);

  await supabase
    .from('quiz_questions')
    .delete()
    .eq('quiz_id', id)
    .eq('user_id', userResult.data);

  const { data, error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select('*, quiz_questions(*)')
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

  const shuffledQuestions = input.questions.map(shuffleQuestionOptions);
  const questionRows = shuffledQuestions.map((question, index) =>
    toQuestionInsert({ ...question, sourceMaterialId: input.sourceMaterialId || question.sourceMaterialId || null }, quiz.id, userResult.data, index),
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

async function listRealQuizAttempts(filters = {}) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  let query = supabase
    .from('quiz_attempts')
    .select('id, quiz_id, score, total, answers, completed_at, created_at, quizzes(id, title, exam_id, chapter_id, note_id, source_material_id, quiz_questions(*))')
    .eq('user_id', userResult.data)
    .order('completed_at', { ascending: false })
    .limit(Math.max(1, Math.min(100, Number(filters.limit || 50))));

  if (filters.quizId) query = query.eq('quiz_id', filters.quizId);

  const { data, error } = await query;
  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }

  let attempts = (data || []).map(toAttemptRun);
  if (filters.examId) attempts = attempts.filter((attempt) => String(attempt.examId) === String(filters.examId));
  if (filters.chapterId) attempts = attempts.filter((attempt) => String(attempt.chapterId) === String(filters.chapterId));
  if (filters.sourceMaterialId) attempts = attempts.filter((attempt) => String(attempt.sourceMaterialId) === String(filters.sourceMaterialId));
  return ok(attempts);
}

export async function listQuizzes(filters = {}) {
  if (!isMockMode()) return listRealQuizzes(filters);
  return ok(mockQuizzes.filter((quiz) => matchesFilters(quiz, filters)));
}

export async function listQuizAttempts(filters = {}) {
  if (!isMockMode()) return listRealQuizAttempts(filters);
  let attempts = mockAttempts.map((attempt) => {
    const quiz = mockQuizzes.find((item) => String(item.id) === String(attempt.quizId)) || {};
    return toAttemptRun({
      id: attempt.id,
      quiz_id: attempt.quizId,
      score: attempt.score,
      total: attempt.total,
      answers: attempt.answers,
      completed_at: attempt.completedAt,
      created_at: attempt.createdAt,
      quizzes: {
        id: quiz.id,
        title: quiz.title,
        exam_id: quiz.examId,
        chapter_id: quiz.chapterId,
        note_id: quiz.noteId,
        source_material_id: quiz.sourceMaterialId,
        quiz_questions: (quiz.questions || []).map((question, index) => ({
          id: question.id,
          quiz_id: quiz.id,
          prompt: question.prompt || question.q,
          options: question.options || [],
          correct_answer: String(question.correctAnswer ?? question.correct ?? 0),
          explanation: question.explanation || '',
          position: index,
        })),
      },
    });
  });
  if (filters.quizId) attempts = attempts.filter((attempt) => String(attempt.quizId) === String(filters.quizId));
  if (filters.examId) attempts = attempts.filter((attempt) => String(attempt.examId) === String(filters.examId));
  if (filters.chapterId) attempts = attempts.filter((attempt) => String(attempt.chapterId) === String(filters.chapterId));
  return ok(attempts.slice(0, Math.max(1, Math.min(100, Number(filters.limit || 50)))));
}

export async function getQuiz(id) {
  if (!isMockMode()) return getRealQuiz(id);
  const quiz = mockQuizzes.find((item) => String(item.id) === String(id));
  if (!quiz) return fail('Quiz not found.', 'NOT_FOUND');
  return ok(quiz);
}

export async function deleteQuiz(id) {
  if (!isMockMode()) return deleteRealQuiz(id);
  const index = mockQuizzes.findIndex((quiz) => String(quiz.id) === String(id));
  if (index === -1) return fail('Quiz not found.', 'NOT_FOUND');
  const [deleted] = mockQuizzes.splice(index, 1);
  for (let attemptIndex = mockAttempts.length - 1; attemptIndex >= 0; attemptIndex -= 1) {
    if (String(mockAttempts[attemptIndex].quizId) === String(id)) mockAttempts.splice(attemptIndex, 1);
  }
  return ok(deleted);
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
    questions: input.questions.map(shuffleQuestionOptions).map((question, index) => ({
      id: `mock-question-${crypto.randomUUID()}`,
      quizId: null,
      prompt: question.prompt || question.q || '',
      q: question.prompt || question.q || '',
      options: question.options || [],
      correctAnswer: String(Number(question.correct ?? question.correctAnswer ?? 0)),
      correct: Number(question.correct ?? question.correctAnswer ?? 0),
      explanation: question.explanation || '',
      difficulty: ['easy', 'medium', 'hard', 'extreme'].includes(question.difficulty) ? question.difficulty : 'medium',
      topic: question.topic || '',
      sourceMaterialId: input.sourceMaterialId || question.sourceMaterialId || null,
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
