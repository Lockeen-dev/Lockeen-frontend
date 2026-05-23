import { seedExams } from '../data/mockData';
import { isMockMode } from '../lib/apiClient';
import { requireSupabaseClient, supabase } from '../lib/supabaseClient';

const mockNotes = [];

function clone(data) {
  return structuredClone(data);
}

function ok(data) {
  return { data: clone(data), error: null };
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

function hasKnownMockParent(input = {}) {
  if (!input.examId && !input.chapterId) return false;
  if (input.examId && seedExams.some((exam) => String(exam.id) === String(input.examId))) return true;
  if (
    input.chapterId &&
    seedExams.some((exam) =>
      (exam.chapters || []).some((chapter) => String(chapter.id) === String(input.chapterId)),
    )
  ) {
    return true;
  }
  return false;
}

function toNote(row) {
  return {
    id: row.id,
    examId: row.exam_id,
    chapterId: row.chapter_id,
    title: row.title,
    body: row.body || '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toNoteInsert(input, userId) {
  return {
    user_id: userId,
    exam_id: input.examId || null,
    chapter_id: input.chapterId || null,
    title: input.title,
    body: input.body || null,
    status: input.status || 'active',
  };
}

function toNotePatch(patch) {
  return {
    ...(patch.examId !== undefined ? { exam_id: patch.examId || null } : {}),
    ...(patch.chapterId !== undefined ? { chapter_id: patch.chapterId || null } : {}),
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.body !== undefined ? { body: patch.body || null } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    updated_at: new Date().toISOString(),
  };
}

function toMockNote(input) {
  const now = new Date().toISOString();
  return {
    id: input.id || `mock-note-${crypto.randomUUID()}`,
    examId: input.examId || null,
    chapterId: input.chapterId || null,
    title: input.title,
    body: input.body || '',
    status: input.status || 'active',
    createdAt: now,
    updatedAt: now,
  };
}

function matchesFilters(note, filters = {}) {
  return (
    (!filters.examId || String(note.examId) === String(filters.examId)) &&
    (!filters.chapterId || String(note.chapterId) === String(filters.chapterId))
  );
}

async function listRealNotes(filters = {}) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = requireRealUserId();
  if (userResult.error) return userResult;

  let query = supabase
    .from('notes')
    .select('*')
    .eq('user_id', userResult.data)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (filters.examId) query = query.eq('exam_id', filters.examId);
  if (filters.chapterId) query = query.eq('chapter_id', filters.chapterId);

  const { data, error } = await query;

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }

  return ok((data || []).map(toNote));
}

async function createRealNote(input = {}) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = requireRealUserId();
  if (userResult.error) return userResult;

  if (!input.title?.trim()) {
    return fail('Note title is required.', 'VALIDATION_ERROR');
  }

  if (!input.examId && !input.chapterId) {
    return fail('Note requires examId or chapterId.', 'VALIDATION_ERROR');
  }

  const { data, error } = await supabase
    .from('notes')
    .insert(toNoteInsert(input, userResult.data))
    .select()
    .single();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }

  return ok(toNote(data));
}

async function updateRealNote(id, patch = {}) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = requireRealUserId();
  if (userResult.error) return userResult;

  if (patch.title !== undefined && !patch.title?.trim()) {
    return fail('Note title is required.', 'VALIDATION_ERROR');
  }

  const { data, error } = await supabase
    .from('notes')
    .update(toNotePatch(patch))
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select()
    .maybeSingle();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  if (!data) return fail('Note not found.', 'NOT_FOUND');

  return ok(toNote(data));
}

async function deleteRealNote(id) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = requireRealUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select()
    .maybeSingle();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  if (!data) return fail('Note not found.', 'NOT_FOUND');

  return ok(toNote(data));
}

export async function listNotes(filters = {}) {
  if (!isMockMode()) return listRealNotes(filters);

  return ok(mockNotes.filter((note) => matchesFilters(note, filters)));
}

export async function createNote(input = {}) {
  if (!isMockMode()) return createRealNote(input);

  if (!input.title?.trim()) {
    return fail('Note title is required.', 'VALIDATION_ERROR');
  }

  if (!hasKnownMockParent(input)) {
    return fail('Note requires a known mock examId or chapterId.', 'VALIDATION_ERROR');
  }

  const note = toMockNote(input);
  mockNotes.unshift(note);
  return ok(note);
}

export async function updateNote(id, patch = {}) {
  if (!isMockMode()) return updateRealNote(id, patch);

  const index = mockNotes.findIndex((note) => String(note.id) === String(id));
  if (index === -1) return fail('Note not found.', 'NOT_FOUND');

  if (patch.title !== undefined && !patch.title?.trim()) {
    return fail('Note title is required.', 'VALIDATION_ERROR');
  }

  mockNotes[index] = {
    ...mockNotes[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  return ok(mockNotes[index]);
}

export async function deleteNote(id) {
  if (!isMockMode()) return deleteRealNote(id);

  const index = mockNotes.findIndex((note) => String(note.id) === String(id));
  if (index === -1) return fail('Note not found.', 'NOT_FOUND');

  const [deleted] = mockNotes.splice(index, 1);
  return ok(deleted);
}
