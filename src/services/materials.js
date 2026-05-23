import { seedExams } from '../data/mockData';
import { isMockMode } from '../lib/apiClient';
import { requireSupabaseClient, supabase } from '../lib/supabaseClient';
import { createStudyMaterialSignedUrl } from './storage';
import { requireAuthenticatedUserId } from './auth';

const mockMaterials = [];

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

function hasKnownMockParent(input = {}) {
  if (!input.examId && !input.chapterId && !input.noteId) return false;
  if (input.noteId) return true;
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

function toMaterial(row) {
  return {
    id: row.id,
    examId: row.exam_id,
    chapterId: row.chapter_id,
    noteId: row.note_id,
    type: row.type,
    title: row.title,
    sourceUrl: row.source_url,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMaterialInsert(input, userId) {
  return {
    user_id: userId,
    exam_id: input.examId || null,
    chapter_id: input.chapterId || null,
    note_id: input.noteId || null,
    type: input.type || 'link',
    title: input.title,
    source_url: input.sourceUrl || null,
    storage_path: input.storagePath || null,
    mime_type: input.mimeType || null,
    size_bytes: input.sizeBytes ?? null,
    status: input.status || 'active',
  };
}

function toMockMaterial(input) {
  const now = new Date().toISOString();
  return {
    id: input.id || `mock-material-${crypto.randomUUID()}`,
    examId: input.examId || null,
    chapterId: input.chapterId || null,
    noteId: input.noteId || null,
    type: input.type || 'link',
    title: input.title,
    sourceUrl: input.sourceUrl || null,
    storagePath: input.storagePath || null,
    mimeType: input.mimeType || null,
    sizeBytes: input.sizeBytes ?? null,
    status: input.status || 'active',
    createdAt: now,
    updatedAt: now,
  };
}

function matchesFilters(material, filters = {}) {
  return (
    (!filters.examId || String(material.examId) === String(filters.examId)) &&
    (!filters.chapterId || String(material.chapterId) === String(filters.chapterId)) &&
    (!filters.noteId || String(material.noteId) === String(filters.noteId))
  );
}

function validateMaterial(input = {}) {
  if (!input.title?.trim()) {
    return fail('Material title is required.', 'VALIDATION_ERROR');
  }

  if (!input.examId && !input.chapterId && !input.noteId) {
    return fail('Material requires examId, chapterId, or noteId.', 'VALIDATION_ERROR');
  }

  return null;
}

async function listRealMaterials(filters = {}) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  let query = supabase
    .from('study_materials')
    .select('*')
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

  return ok((data || []).map(toMaterial));
}

async function createRealMaterial(input = {}) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  const validationError = validateMaterial(input);
  if (validationError) return validationError;

  const { data, error } = await supabase
    .from('study_materials')
    .insert(toMaterialInsert(input, userResult.data))
    .select()
    .single();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }

  return ok(toMaterial(data));
}

async function deleteRealMaterial(id) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('study_materials')
    .delete()
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select()
    .maybeSingle();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  if (!data) return fail('Material not found.', 'NOT_FOUND');

  return ok(toMaterial(data));
}

export async function listMaterials(filters = {}) {
  if (!isMockMode()) return listRealMaterials(filters);

  return ok(mockMaterials.filter((material) => matchesFilters(material, filters)));
}

export async function createMaterial(input = {}) {
  if (!isMockMode()) return createRealMaterial(input);

  const validationError = validateMaterial(input);
  if (validationError) return validationError;

  if (!hasKnownMockParent(input)) {
    return fail('Material requires a known mock parent.', 'VALIDATION_ERROR');
  }

  const material = toMockMaterial(input);
  mockMaterials.unshift(material);
  return ok(material);
}

export async function deleteMaterial(id) {
  if (!isMockMode()) return deleteRealMaterial(id);

  const index = mockMaterials.findIndex((material) => String(material.id) === String(id));
  if (index === -1) return fail('Material not found.', 'NOT_FOUND');

  const [deleted] = mockMaterials.splice(index, 1);
  return ok(deleted);
}

export async function getMaterialDownloadUrl(id) {
  const materials = isMockMode() ? mockMaterials : (await listRealMaterials()).data || [];
  const material = materials.find((item) => String(item.id) === String(id));

  if (!material) return fail('Material not found.', 'NOT_FOUND');
  if (material.sourceUrl) return ok({ url: material.sourceUrl });
  if (!material.storagePath) return fail('Material has no downloadable source.', 'NOT_FOUND');

  return createStudyMaterialSignedUrl(material.storagePath);
}
