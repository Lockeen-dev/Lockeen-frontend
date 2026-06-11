import { isMockMode } from '../lib/apiClient';
import { requireSupabaseClient, supabase } from '../lib/supabaseClient';
import { requireAuthenticatedUserId } from './auth';

export const STUDY_MATERIALS_BUCKET = 'study-materials';
export const MAX_STUDY_MATERIAL_BYTES = 10 * 1024 * 1024;
export const ALLOWED_STUDY_MATERIAL_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
]);

function ok(data) {
  return { data: structuredClone(data), error: null };
}

function fail(message, code = 'UNKNOWN_ERROR') {
  return { data: null, error: { code, message } };
}

function normalizeError(error, fallback = 'Storage request failed.') {
  return {
    code: error?.code || error?.name || 'STORAGE_ERROR',
    message: error?.message || fallback,
  };
}

function sanitizeFileName(fileName = 'material') {
  return fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'material';
}

export function validateStudyMaterialFile(file) {
  if (!file) {
    return fail('File is required.', 'VALIDATION_ERROR');
  }

  if (file.size > MAX_STUDY_MATERIAL_BYTES) {
    return fail('File must be 10 MB or smaller.', 'FILE_TOO_LARGE');
  }

  if (!ALLOWED_STUDY_MATERIAL_TYPES.has(file.type)) {
    return fail('File type is not allowed.', 'FILE_TYPE_NOT_ALLOWED');
  }

  return ok({
    name: file.name,
    size: file.size,
    type: file.type,
  });
}

export function buildStudyMaterialPath({ userId, materialId, fileName }) {
  return `${userId}/${materialId}/${sanitizeFileName(fileName)}`;
}

export async function uploadStudyMaterialFile({ file, materialId }) {
  if (isMockMode()) {
    const validation = validateStudyMaterialFile(file);
    if (validation.error) return validation;

    return ok({
      bucket: STUDY_MATERIALS_BUCKET,
      path: `mock/${materialId || crypto.randomUUID()}/${sanitizeFileName(file.name)}`,
      mimeType: file.type,
      sizeBytes: file.size,
    });
  }

  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  const validation = validateStudyMaterialFile(file);
  if (validation.error) return validation;

  const path = buildStudyMaterialPath({
    userId: userResult.data,
    materialId: materialId || crypto.randomUUID(),
    fileName: file.name,
  });

  const { data, error } = await supabase.storage
    .from(STUDY_MATERIALS_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }

  return ok({
    bucket: STUDY_MATERIALS_BUCKET,
    path: data?.path || path,
    mimeType: file.type,
    sizeBytes: file.size,
  });
}

export async function createStudyMaterialSignedUrl(storagePath, expiresInSeconds = 3600) {
  if (!storagePath) {
    return fail('Storage path is required.', 'VALIDATION_ERROR');
  }

  if (isMockMode()) {
    return fail('Mock storage has no signed URL.', 'STORAGE_NOT_IMPLEMENTED');
  }

  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const { data, error } = await supabase.storage
    .from(STUDY_MATERIALS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }

  return ok({ url: data.signedUrl, expiresInSeconds });
}

export async function deleteStudyMaterialFile(storagePath) {
  if (!storagePath) {
    return fail('Storage path is required.', 'VALIDATION_ERROR');
  }

  if (isMockMode()) {
    return ok({ path: storagePath });
  }

  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const { data, error } = await supabase.storage
    .from(STUDY_MATERIALS_BUCKET)
    .remove([storagePath]);

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }

  return ok({ removed: data || [] });
}
