import { isMockMode } from '../lib/apiClient';
import { requireSupabaseClient, supabase } from '../lib/supabaseClient';
import { requireAuthenticatedUserId } from './auth';
import { listExams } from './exams';
import { listFlashcards } from './flashcards';
import { listMaterials } from './materials';
import { listNotes } from './notes';
import { listQuizzes } from './quiz';
import { listStudyPlanItems } from './studyPlans';

const STUDY_SESSIONS_TABLE = 'study_sessions';
const LOCAL_STUDY_SESSIONS_KEY = 'lockeen.studySessions.v1';

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

function readLocalStudySessions() {
  try {
    const raw = window.localStorage.getItem(LOCAL_STUDY_SESSIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeLocalStudySessions(sessions) {
  try {
    window.localStorage.setItem(LOCAL_STUDY_SESSIONS_KEY, JSON.stringify(sessions.slice(0, 300)));
  } catch (_) {}
}

function toStudySession(row) {
  return {
    id: row.id,
    minutes: Number(row.minutes ?? row.mins ?? 0),
    studiedAt: row.studied_at || row.studiedAt || row.created_at || row.createdAt || new Date().toISOString(),
    source: row.source || 'timer',
  };
}

function plannerItemToStudySession(item = {}) {
  const time = item.completedAt || `${item.plannedDate || new Date().toISOString().slice(0, 10)}T${item.plannedTime || '12:00'}:00`;
  return {
    id: `planner-${item.id}`,
    minutes: Number(item.durationMin || 0),
    studiedAt: time,
    source: 'study-plan',
  };
}

function mergeStudySessions(timerSessions = [], plannerItems = [], since = null) {
  const sinceTime = since?.getTime?.() || 0;
  const plannerSessions = (plannerItems || [])
    .filter((item) => item.status === 'done')
    .map(plannerItemToStudySession)
    .filter((session) => Number(session.minutes) > 0)
    .filter((session) => (parseDate(session.studiedAt)?.getTime() || 0) >= sinceTime);
  const seen = new Set();
  return [...timerSessions, ...plannerSessions]
    .filter((session) => {
      const key = `${session.source}:${session.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (parseDate(b.studiedAt)?.getTime() || 0) - (parseDate(a.studiedAt)?.getTime() || 0));
}

function isMissingStudySessionsTable(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes(STUDY_SESSIONS_TABLE);
}

function weekStartMonday(now = new Date()) {
  const start = new Date(now);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function sessionsToWeekData(sessions = [], now = new Date()) {
  const start = weekStartMonday(now);
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const week = labels.map((day) => ({ day, mins: 0 }));
  sessions.forEach((session) => {
    const date = parseDate(session.studiedAt);
    if (!date) return;
    const index = Math.floor((date.getTime() - start.getTime()) / 86400000);
    if (index >= 0 && index < 7) {
      week[index].mins += Math.max(0, Number(session.minutes || 0));
    }
  });
  return week.map((day) => ({ ...day, mins: Math.round(day.mins) }));
}

export function getStudyStreak(sessions = [], now = new Date()) {
  const studiedDays = new Set(
    sessions
      .filter((session) => Number(session.minutes) > 0)
      .map((session) => {
        const date = parseDate(session.studiedAt);
        if (!date) return null;
        date.setHours(0, 0, 0, 0);
        return date.toISOString().slice(0, 10);
      })
      .filter(Boolean),
  );

  let streak = 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  while (studiedDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function listStudySessions({ days = 30 } = {}) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const localTimerSessions = readLocalStudySessions().filter((session) => (parseDate(session.studiedAt)?.getTime() || 0) >= since.getTime());

  if (isMockMode()) {
    const planResult = await listStudyPlanItems({ status: 'done' });
    return ok(mergeStudySessions(localTimerSessions, planResult.error ? [] : (planResult.data || []), since));
  }

  const clientError = requireSupabaseClient();
  if (clientError) return ok(localTimerSessions);

  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return ok(localTimerSessions);

  const [timerResult, planResult] = await Promise.all([
    supabase
      .from(STUDY_SESSIONS_TABLE)
      .select('id, minutes, studied_at, source, created_at')
      .eq('user_id', userResult.data)
      .gte('studied_at', since.toISOString())
      .order('studied_at', { ascending: false }),
    listStudyPlanItems({ status: 'done' }),
  ]);

  if (timerResult.error) {
    if (isMissingStudySessionsTable(timerResult.error)) {
      return ok(mergeStudySessions(localTimerSessions, planResult.error ? [] : (planResult.data || []), since));
    }
    const normalized = normalizeError(timerResult.error);
    return fail(normalized.message, normalized.code);
  }

  if (planResult.error) return ok((timerResult.data || []).map(toStudySession));

  return ok(mergeStudySessions((timerResult.data || []).map(toStudySession), planResult.data || [], since));
}

export async function createStudySession(input = {}) {
  const minutes = Math.max(1, Math.round(Number(input.minutes || 0)));
  if (!Number.isFinite(minutes) || minutes < 1) {
    return fail('Study session minutes must be at least 1.', 'VALIDATION_ERROR');
  }
  const session = {
    id: input.id || `local-study-session-${crypto.randomUUID()}`,
    minutes,
    studiedAt: input.studiedAt || new Date().toISOString(),
    source: input.source || 'timer',
  };

  const localSessions = [session, ...readLocalStudySessions()];
  writeLocalStudySessions(localSessions);

  if (isMockMode()) return ok(session);

  const clientError = requireSupabaseClient();
  if (clientError) return ok(session);

  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return ok(session);

  const { data, error } = await supabase
    .from(STUDY_SESSIONS_TABLE)
    .insert({
      user_id: userResult.data,
      minutes: session.minutes,
      studied_at: session.studiedAt,
      source: session.source,
    })
    .select('id, minutes, studied_at, source, created_at')
    .single();

  if (error) {
    if (isMissingStudySessionsTable(error)) return ok(session);
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }

  return ok(toStudySession(data));
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
    flashcardReviewsCount: 0,
    averageQuizScore: null,
    averageFlashcardScore: null,
    averagePracticeScore: null,
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
    flashcardReviewsResult,
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
      .from('flashcard_reviews')
      .select('id, exam_id, chapter_id, note_id, score, total, known_count, completed_at, created_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(50),
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

  if (flashcardReviewsResult.error) {
    const normalized = normalizeError(flashcardReviewsResult.error);
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
  const flashcardReviews = flashcardReviewsResult.data || [];
  const averageQuizScore = averageScore(attempts);
  const averageFlashcardScore = averageScore(flashcardReviews);
  const combinedScores = [averageQuizScore, averageFlashcardScore]
    .filter((score) => Number.isFinite(Number(score)))
    .map(Number);
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
    ...flashcardReviews.slice(0, 5).map((review) => toActivity({
      type: 'flashcard_review',
      title: `Flashcards ${review.known_count || review.score}/${review.total}`,
      entityId: review.id,
      at: review.completed_at || review.created_at,
      metadata: { examId: review.exam_id, chapterId: review.chapter_id, score: review.score, total: review.total },
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
    flashcardReviewsCount: flashcardReviews.length,
    averageQuizScore,
    averageFlashcardScore,
    averagePracticeScore: combinedScores.length ? Math.round(combinedScores.reduce((sum, score) => sum + score, 0) / combinedScores.length) : null,
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
