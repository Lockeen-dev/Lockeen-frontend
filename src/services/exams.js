import { seedExams } from '../data/mockData';
import { getApiMode, isMockMode } from '../lib/apiClient';
import { requireSupabaseClient, supabase } from '../lib/supabaseClient';

const mockExams = structuredClone(seedExams || []);

function ok(data) {
  return { data: structuredClone(data), error: null };
}

function fail(message, code = 'UNKNOWN_ERROR') {
  return { data: null, error: { code, message } };
}

function normalizeError(error, fallback = 'Request failed.') {
  return {
    code: error?.code || error?.name || 'SUPABASE_ERROR',
    message: error?.message || fallback,
  };
}

function findExam(id) {
  return mockExams.find((exam) => String(exam.id) === String(id));
}

function getCurrentUserId() {
  return localStorage.getItem('lockeen_real_user_id') || null;
}

function requireRealUserId() {
  const userId = getCurrentUserId();

  if (!userId) {
    return fail('Real mode requires lockeen_real_user_id in localStorage.', 'AUTH_REQUIRED');
  }

  return { data: userId, error: null };
}

function toExam(row) {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    subjectId: row.subject_id,
    date: row.date,
    color: row.color,
    status: row.status,
    chapters: (row.chapters || []).map(toChapter),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toChapter(row) {
  return {
    id: row.id,
    examId: row.exam_id,
    title: row.title,
    description: row.description,
    progress: row.progress,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toExamInsert(input, userId) {
  return {
    user_id: userId,
    name: input.name,
    subject: input.subject || null,
    subject_id: input.subjectId || null,
    date: input.date || null,
    color: input.color || null,
    status: input.status || 'active',
  };
}

function toExamPatch(patch) {
  return {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.subject !== undefined ? { subject: patch.subject } : {}),
    ...(patch.subjectId !== undefined ? { subject_id: patch.subjectId } : {}),
    ...(patch.date !== undefined ? { date: patch.date } : {}),
    ...(patch.color !== undefined ? { color: patch.color } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    updated_at: new Date().toISOString(),
  };
}

function toChapterInsert(examId, input, userId) {
  return {
    user_id: userId,
    exam_id: examId,
    title: input.title,
    description: input.description || null,
    progress: input.progress || 0,
    position: input.position || 0,
  };
}

function toChapterPatch(patch) {
  return {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.progress !== undefined ? { progress: patch.progress } : {}),
    ...(patch.position !== undefined ? { position: patch.position } : {}),
    updated_at: new Date().toISOString(),
  };
}

async function listRealExams() {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = requireRealUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('exams')
    .select('*, chapters(*)')
    .eq('user_id', userResult.data)
    .order('date', { ascending: true })
    .order('position', { foreignTable: 'chapters', ascending: true });

  if (error) return fail(normalizeError(error).message, normalizeError(error).code);

  return ok((data || []).map(toExam));
}

async function getRealExam(id) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = requireRealUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('exams')
    .select('*, chapters(*)')
    .eq('id', id)
    .eq('user_id', userResult.data)
    .maybeSingle();

  if (error) return fail(normalizeError(error).message, normalizeError(error).code);
  if (!data) return fail('Exam not found.', 'EXAM_NOT_FOUND');

  return ok(toExam(data));
}

async function createRealExam(input) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = requireRealUserId();
  if (userResult.error) return userResult;

  if (!input?.name) {
    return fail('Exam name is required.', 'VALIDATION_ERROR');
  }

  const { data, error } = await supabase
    .from('exams')
    .insert(toExamInsert(input, userResult.data))
    .select('*, chapters(*)')
    .single();

  if (error) return fail(normalizeError(error).message, normalizeError(error).code);

  return ok(toExam(data));
}

async function updateRealExam(id, patch) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = requireRealUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('exams')
    .update(toExamPatch(patch))
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select('*, chapters(*)')
    .maybeSingle();

  if (error) return fail(normalizeError(error).message, normalizeError(error).code);
  if (!data) return fail('Exam not found.', 'EXAM_NOT_FOUND');

  return ok(toExam(data));
}

async function deleteRealExam(id) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = requireRealUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('exams')
    .delete()
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select()
    .maybeSingle();

  if (error) return fail(normalizeError(error).message, normalizeError(error).code);
  if (!data) return fail('Exam not found.', 'EXAM_NOT_FOUND');

  return ok(toExam({ ...data, chapters: [] }));
}

async function listRealChapters(examId) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = requireRealUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('exam_id', examId)
    .eq('user_id', userResult.data)
    .order('position', { ascending: true });

  if (error) return fail(normalizeError(error).message, normalizeError(error).code);

  return ok((data || []).map(toChapter));
}

async function createRealChapter(examId, input) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = requireRealUserId();
  if (userResult.error) return userResult;

  if (!input?.title) {
    return fail('Chapter title is required.', 'VALIDATION_ERROR');
  }

  const { data, error } = await supabase
    .from('chapters')
    .insert(toChapterInsert(examId, input, userResult.data))
    .select()
    .single();

  if (error) return fail(normalizeError(error).message, normalizeError(error).code);

  return ok(toChapter(data));
}

async function updateRealChapter(examId, chapterId, patch) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = requireRealUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('chapters')
    .update(toChapterPatch(patch))
    .eq('id', chapterId)
    .eq('exam_id', examId)
    .eq('user_id', userResult.data)
    .select()
    .maybeSingle();

  if (error) return fail(normalizeError(error).message, normalizeError(error).code);
  if (!data) return fail('Chapter not found.', 'CHAPTER_NOT_FOUND');

  return ok(toChapter(data));
}

async function deleteRealChapter(examId, chapterId) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = requireRealUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('chapters')
    .delete()
    .eq('id', chapterId)
    .eq('exam_id', examId)
    .eq('user_id', userResult.data)
    .select()
    .maybeSingle();

  if (error) return fail(normalizeError(error).message, normalizeError(error).code);
  if (!data) return fail('Chapter not found.', 'CHAPTER_NOT_FOUND');

  return ok(toChapter(data));
}

function requireMockMode() {
  if (!isMockMode() && getApiMode() !== 'mock') {
    return fail('Unsupported API mode.', 'UNSUPPORTED_API_MODE');
  }

  return null;
}

export async function listExams() {
  if (getApiMode() === 'real') return listRealExams();

  const modeError = requireMockMode();
  if (modeError) return modeError;

  return ok(mockExams);
}

export async function getExam(id) {
  if (getApiMode() === 'real') return getRealExam(id);

  const modeError = requireMockMode();
  if (modeError) return modeError;

  const exam = findExam(id);
  if (!exam) return fail('Exam not found.', 'EXAM_NOT_FOUND');

  return ok(exam);
}

export async function createExam(input) {
  if (getApiMode() === 'real') return createRealExam(input);

  const modeError = requireMockMode();
  if (modeError) return modeError;

  if (!input?.name) {
    return fail('Exam name is required.', 'VALIDATION_ERROR');
  }

  const exam = {
    id: crypto.randomUUID(),
    chapters: [],
    ...input,
  };

  mockExams.push(exam);

  return ok(exam);
}

export async function updateExam(id, patch) {
  if (getApiMode() === 'real') return updateRealExam(id, patch);

  const modeError = requireMockMode();
  if (modeError) return modeError;

  const index = mockExams.findIndex((exam) => String(exam.id) === String(id));
  if (index === -1) return fail('Exam not found.', 'EXAM_NOT_FOUND');

  mockExams[index] = {
    ...mockExams[index],
    ...patch,
    id: mockExams[index].id,
  };

  return ok(mockExams[index]);
}

export async function deleteExam(id) {
  if (getApiMode() === 'real') return deleteRealExam(id);

  const modeError = requireMockMode();
  if (modeError) return modeError;

  const index = mockExams.findIndex((exam) => String(exam.id) === String(id));
  if (index === -1) return fail('Exam not found.', 'EXAM_NOT_FOUND');

  const [deletedExam] = mockExams.splice(index, 1);

  return ok(deletedExam);
}

export async function listChapters(examId) {
  if (getApiMode() === 'real') return listRealChapters(examId);

  const modeError = requireMockMode();
  if (modeError) return modeError;

  const exam = findExam(examId);
  if (!exam) return fail('Exam not found.', 'EXAM_NOT_FOUND');

  return ok(exam.chapters || []);
}

export async function createChapter(examId, input) {
  if (getApiMode() === 'real') return createRealChapter(examId, input);

  const modeError = requireMockMode();
  if (modeError) return modeError;

  const exam = findExam(examId);
  if (!exam) return fail('Exam not found.', 'EXAM_NOT_FOUND');

  const chapter = {
    id: crypto.randomUUID(),
    ...input,
  };

  exam.chapters = [...(exam.chapters || []), chapter];

  return ok(chapter);
}

export async function updateChapter(examId, chapterId, patch) {
  if (getApiMode() === 'real') return updateRealChapter(examId, chapterId, patch);

  const modeError = requireMockMode();
  if (modeError) return modeError;

  const exam = findExam(examId);
  if (!exam) return fail('Exam not found.', 'EXAM_NOT_FOUND');

  const chapters = exam.chapters || [];
  const index = chapters.findIndex((chapter) => String(chapter.id) === String(chapterId));
  if (index === -1) return fail('Chapter not found.', 'CHAPTER_NOT_FOUND');

  chapters[index] = {
    ...chapters[index],
    ...patch,
    id: chapters[index].id,
  };

  exam.chapters = chapters;

  return ok(chapters[index]);
}

export async function deleteChapter(examId, chapterId) {
  if (getApiMode() === 'real') return deleteRealChapter(examId, chapterId);

  const modeError = requireMockMode();
  if (modeError) return modeError;

  const exam = findExam(examId);
  if (!exam) return fail('Exam not found.', 'EXAM_NOT_FOUND');

  const chapters = exam.chapters || [];
  const index = chapters.findIndex((chapter) => String(chapter.id) === String(chapterId));
  if (index === -1) return fail('Chapter not found.', 'CHAPTER_NOT_FOUND');

  const [deletedChapter] = chapters.splice(index, 1);
  exam.chapters = chapters;

  return ok(deletedChapter);
}
