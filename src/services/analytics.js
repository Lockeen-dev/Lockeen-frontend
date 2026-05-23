import { isMockMode } from '../lib/apiClient';
import { requireSupabaseClient, supabase } from '../lib/supabaseClient';
import { requireAuthenticatedUserId } from './auth';
import { listExams } from './exams';
import { listFlashcards } from './flashcards';
import { listMaterials } from './materials';
import { listNotes } from './notes';
import { listQuizzes } from './quiz';

function ok(data) {
  return { data: structuredClone(data), error: null };
}

function fail(message, code = 'UNKNOWN_ERROR') {
  return { data: null, error: { code, message } };
}

function normalizeError(error, fallback = 'Analytics request failed.') {
  return {
    code: error?.code || error?.name || 'SUPABASE_ERROR',
    message: error?.message || fallback,
  };
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isUpcomingExam(exam, now = new Date()) {
  const examDate = parseDate(exam.date);
  if (!examDate) return false;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return examDate >= today;
}

function sortByDateAsc(a, b) {
  const aDate = parseDate(a.date);
  const bDate = parseDate(b.date);
  if (!aDate && !bDate) return 0;
  if (!aDate) return 1;
  if (!bDate) return -1;
  return aDate.getTime() - bDate.getTime();
}

function toActivity({ type, title, at, entityId, metadata = {} }) {
  return {
    id: `${type}-${entityId || title}-${at || 'none'}`,
    type,
    title,
    entityId,
    at,
    metadata,
  };
}

function averageScore(attempts = []) {
  if (!attempts.length) return null;
  const percentages = attempts
    .filter((attempt) => Number(attempt.total) > 0)
    .map((attempt) => Math.round((Number(attempt.score) / Number(attempt.total)) * 100));

  if (!percentages.length) return null;
  return Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length);
}

async function countTable(table, userId) {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    const normalized = normalizeError(error);
    return { data: null, error: normalized };
  }

  return { data: count || 0, error: null };
}

async function getMockStudySummary() {
  const [examsResult, notesResult, materialsResult, flashcardsResult, quizzesResult] = await Promise.all([
    listExams(),
    listNotes(),
    listMaterials(),
    listFlashcards(),
    listQuizzes(),
  ]);

  const firstError = [examsResult, notesResult, materialsResult, flashcardsResult, quizzesResult].find((result) => result.error);
  if (firstError) return { data: null, error: firstError.error };

  const exams = examsResult.data || [];
  const upcomingExams = exams.filter((exam) => isUpcomingExam(exam)).sort(sortByDateAsc);
  const notes = notesResult.data || [];
  const materials = materialsResult.data || [];
  const flashcards = flashcardsResult.data || [];
  const quizzes = quizzesResult.data || [];
  const latestActivity = [
    ...notes.slice(0, 5).map((note) => toActivity({ type: 'note', title: note.title, entityId: note.id, at: note.updatedAt || note.createdAt })),
    ...materials.slice(0, 5).map((material) => toActivity({ type: 'material', title: material.title, entityId: material.id, at: material.updatedAt || material.createdAt })),
    ...flashcards.slice(0, 5).map((card) => toActivity({ type: 'flashcard', title: card.front, entityId: card.id, at: card.updatedAt || card.createdAt })),
  ].sort((a, b) => (parseDate(b.at)?.getTime() || 0) - (parseDate(a.at)?.getTime() || 0)).slice(0, 8);

  return ok({
    totalExams: exams.length,
    upcomingExams: upcomingExams.slice(0, 5),
    nextExam: upcomingExams[0] || null,
    notesCount: notes.length,
    materialsCount: materials.length,
    flashcardsCount: flashcards.length,
    quizzesCount: quizzes.length,
    quizAttemptsCount: 0,
    averageQuizScore: null,
    latestActivity,
  });
}

async function getRealStudySummary() {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;
  const userId = userResult.data;

  const [
    examsResult,
    notesCountResult,
    materialsCountResult,
    flashcardsCountResult,
    quizzesCountResult,
    attemptsResult,
    recentNotesResult,
    recentMaterialsResult,
  ] = await Promise.all([
    listExams(),
    countTable('notes', userId),
    countTable('study_materials', userId),
    countTable('flashcards', userId),
    countTable('quizzes', userId),
    supabase
      .from('quiz_attempts')
      .select('id, quiz_id, score, total, completed_at, created_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(20),
    supabase
      .from('notes')
      .select('id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('study_materials')
      .select('id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(5),
  ]);

  const errorResult = [examsResult, notesCountResult, materialsCountResult, flashcardsCountResult, quizzesCountResult]
    .find((result) => result.error);
  if (errorResult) return fail(errorResult.error.message, errorResult.error.code);

  if (attemptsResult.error) {
    const normalized = normalizeError(attemptsResult.error);
    return fail(normalized.message, normalized.code);
  }

  if (recentNotesResult.error) {
    const normalized = normalizeError(recentNotesResult.error);
    return fail(normalized.message, normalized.code);
  }

  if (recentMaterialsResult.error) {
    const normalized = normalizeError(recentMaterialsResult.error);
    return fail(normalized.message, normalized.code);
  }

  const exams = examsResult.data || [];
  const upcomingExams = exams.filter((exam) => isUpcomingExam(exam)).sort(sortByDateAsc);
  const attempts = attemptsResult.data || [];
  const latestActivity = [
    ...(recentNotesResult.data || []).map((note) => toActivity({ type: 'note', title: note.title, entityId: note.id, at: note.updated_at || note.created_at })),
    ...(recentMaterialsResult.data || []).map((material) => toActivity({ type: 'material', title: material.title, entityId: material.id, at: material.updated_at || material.created_at })),
    ...attempts.slice(0, 5).map((attempt) => toActivity({
      type: 'quiz_attempt',
      title: `Quiz score ${attempt.score}/${attempt.total}`,
      entityId: attempt.id,
      at: attempt.completed_at || attempt.created_at,
      metadata: { quizId: attempt.quiz_id, score: attempt.score, total: attempt.total },
    })),
  ].sort((a, b) => (parseDate(b.at)?.getTime() || 0) - (parseDate(a.at)?.getTime() || 0)).slice(0, 8);

  return ok({
    totalExams: exams.length,
    upcomingExams: upcomingExams.slice(0, 5),
    nextExam: upcomingExams[0] || null,
    notesCount: notesCountResult.data,
    materialsCount: materialsCountResult.data,
    flashcardsCount: flashcardsCountResult.data,
    quizzesCount: quizzesCountResult.data,
    quizAttemptsCount: attempts.length,
    averageQuizScore: averageScore(attempts),
    latestActivity,
  });
}

export async function getStudySummary() {
  if (isMockMode()) return getMockStudySummary();
  return getRealStudySummary();
}

export async function listRecentActivity({ limit = 8 } = {}) {
  const summary = await getStudySummary();
  if (summary.error) return summary;
  return ok((summary.data.latestActivity || []).slice(0, limit));
}
