import { seedExams } from '../data/mockData';
import { isMockMode } from '../lib/apiClient';
import { requireSupabaseClient, supabase } from '../lib/supabaseClient';
import { requireAuthenticatedUserId } from './auth';

const mockFlashcards = seedExams.flatMap((exam) =>
  (exam.chapters || []).flatMap((chapter) =>
    (chapter.cards || []).map((card, index) => ({
      id: `mock-flashcard-${chapter.id}-${index}`,
      examId: exam.id,
      chapterId: chapter.id,
      noteId: null,
      sourceMaterialId: null,
      front: card.front || card.q || '',
      back: card.back || card.a || '',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  ),
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

function matchesFilters(card, filters = {}) {
  const filtersSourceMaterial = Object.prototype.hasOwnProperty.call(filters, 'sourceMaterialId');
  return (
    (!filters.examId || String(card.examId) === String(filters.examId)) &&
    (!filters.chapterId || String(card.chapterId) === String(filters.chapterId)) &&
    (!filters.noteId || String(card.noteId) === String(filters.noteId)) &&
    (!filtersSourceMaterial ||
      (filters.sourceMaterialId
        ? String(card.sourceMaterialId) === String(filters.sourceMaterialId)
        : !card.sourceMaterialId))
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

function toFlashcard(row) {
  return {
    id: row.id,
    examId: row.exam_id,
    chapterId: row.chapter_id,
    noteId: row.note_id,
    sourceMaterialId: row.source_material_id || null,
    front: row.front,
    back: row.back,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsert(input, userId) {
  return {
    user_id: userId,
    exam_id: input.examId || null,
    chapter_id: input.chapterId || null,
    note_id: input.noteId || null,
    source_material_id: input.sourceMaterialId || null,
    front: input.front,
    back: input.back,
    status: input.status || 'active',
  };
}

function toPatch(patch) {
  return {
    ...(patch.examId !== undefined ? { exam_id: patch.examId || null } : {}),
    ...(patch.chapterId !== undefined ? { chapter_id: patch.chapterId || null } : {}),
    ...(patch.noteId !== undefined ? { note_id: patch.noteId || null } : {}),
    ...(patch.sourceMaterialId !== undefined ? { source_material_id: patch.sourceMaterialId || null } : {}),
    ...(patch.front !== undefined ? { front: patch.front } : {}),
    ...(patch.back !== undefined ? { back: patch.back } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    updated_at: new Date().toISOString(),
  };
}

function validate(input = {}) {
  if (!input.front?.trim()) return fail('Flashcard front is required.', 'VALIDATION_ERROR');
  if (!input.back?.trim()) return fail('Flashcard back is required.', 'VALIDATION_ERROR');
  if (!input.examId && !input.chapterId && !input.noteId) {
    return fail('Flashcard requires examId, chapterId, or noteId.', 'VALIDATION_ERROR');
  }
  return null;
}

async function listRealFlashcards(filters = {}) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  let query = supabase
    .from('flashcards')
    .select('*')
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
  return ok((data || []).map(toFlashcard));
}

async function createRealFlashcard(input = {}) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;
  const validationError = validate(input);
  if (validationError) return validationError;

  const { data, error } = await supabase
    .from('flashcards')
    .insert(toInsert(input, userResult.data))
    .select()
    .single();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  return ok(toFlashcard(data));
}

async function updateRealFlashcard(id, patch = {}) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('flashcards')
    .update(toPatch(patch))
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select()
    .maybeSingle();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  if (!data) return fail('Flashcard not found.', 'NOT_FOUND');
  return ok(toFlashcard(data));
}

async function deleteRealFlashcard(id) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('flashcards')
    .delete()
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select()
    .maybeSingle();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  if (!data) return fail('Flashcard not found.', 'NOT_FOUND');
  return ok(toFlashcard(data));
}

export async function listFlashcards(filters = {}) {
  if (!isMockMode()) return listRealFlashcards(filters);
  return ok(mockFlashcards.filter((card) => matchesFilters(card, filters)));
}

export async function createFlashcard(input = {}) {
  if (!isMockMode()) return createRealFlashcard(input);
  const validationError = validate(input);
  if (validationError) return validationError;
  if (!hasKnownMockParent(input)) return fail('Flashcard requires a known mock parent.', 'VALIDATION_ERROR');

  const now = new Date().toISOString();
  const card = {
    id: `mock-flashcard-${crypto.randomUUID()}`,
    examId: input.examId || null,
    chapterId: input.chapterId || null,
    noteId: input.noteId || null,
    sourceMaterialId: input.sourceMaterialId || null,
    front: input.front,
    back: input.back,
    status: input.status || 'active',
    createdAt: now,
    updatedAt: now,
  };
  mockFlashcards.unshift(card);
  return ok(card);
}

export async function updateFlashcard(id, patch = {}) {
  if (!isMockMode()) return updateRealFlashcard(id, patch);
  const index = mockFlashcards.findIndex((card) => String(card.id) === String(id));
  if (index === -1) return fail('Flashcard not found.', 'NOT_FOUND');
  mockFlashcards[index] = { ...mockFlashcards[index], ...patch, updatedAt: new Date().toISOString() };
  return ok(mockFlashcards[index]);
}

export async function deleteFlashcard(id) {
  if (!isMockMode()) return deleteRealFlashcard(id);
  const index = mockFlashcards.findIndex((card) => String(card.id) === String(id));
  if (index === -1) return fail('Flashcard not found.', 'NOT_FOUND');
  const [deleted] = mockFlashcards.splice(index, 1);
  return ok(deleted);
}
