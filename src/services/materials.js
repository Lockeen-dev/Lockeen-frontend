import { seedExams } from '../data/mockData';
import { isMockMode } from '../lib/apiClient';
import { requireSupabaseClient, supabase } from '../lib/supabaseClient';
import { createStudyMaterialSignedUrl } from './storage';
import { requireAuthenticatedUserId } from './auth';

const mockMaterials = [];
const MATERIAL_PROCESSING_STATUSES = new Set(['uploaded', 'processing', 'ready', 'failed', 'unsupported']);
const MATERIAL_OCR_TIMEOUT_MS = 90000;

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

function timeoutSignal(ms) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), ms);
  return { controller, timeoutId };
}

function hasKnownMockParent(input = {}) {
  if (!isMockMode()) return true;
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
    processingStatus: row.processing_status || 'uploaded',
    extractedText: row.extracted_text || null,
    extractionError: row.extraction_error || null,
    processedAt: row.processed_at || null,
    pageCount: row.page_count ?? null,
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
    processing_status: input.processingStatus || 'uploaded',
    extracted_text: input.extractedText || null,
    extraction_error: input.extractionError || null,
    processed_at: input.processedAt || null,
    page_count: input.pageCount ?? null,
  };
}

function toMaterialPatch(patch) {
  return {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.sourceUrl !== undefined ? { source_url: patch.sourceUrl || null } : {}),
    ...(patch.storagePath !== undefined ? { storage_path: patch.storagePath || null } : {}),
    ...(patch.mimeType !== undefined ? { mime_type: patch.mimeType || null } : {}),
    ...(patch.sizeBytes !== undefined ? { size_bytes: patch.sizeBytes ?? null } : {}),
    ...(patch.type !== undefined ? { type: patch.type } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.processingStatus !== undefined ? { processing_status: patch.processingStatus } : {}),
    ...(patch.extractedText !== undefined ? { extracted_text: patch.extractedText || null } : {}),
    ...(patch.extractionError !== undefined ? { extraction_error: patch.extractionError || null } : {}),
    ...(patch.processedAt !== undefined ? { processed_at: patch.processedAt || null } : {}),
    ...(patch.pageCount !== undefined ? { page_count: patch.pageCount ?? null } : {}),
    updated_at: new Date().toISOString(),
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
    processingStatus: input.processingStatus || 'uploaded',
    extractedText: input.extractedText || null,
    extractionError: input.extractionError || null,
    processedAt: input.processedAt || null,
    pageCount: input.pageCount ?? null,
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

  if (input.processingStatus && !MATERIAL_PROCESSING_STATUSES.has(input.processingStatus)) {
    return fail('Material processing status is invalid.', 'VALIDATION_ERROR');
  }

  return null;
}

function repairCommonMojibake(text = '') {
  return String(text)
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€�/g, '"')
    .replace(/â€“|â€”/g, '-')
    .replace(/â€¢/g, '-')
    .replace(/Â/g, '');
}

function normalizeWhitespace(text = '') {
  return repairCommonMojibake(text)
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

async function readTextFile(file) {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  if (!utf8.includes('\uFFFD')) return utf8;
  try {
    return new TextDecoder('windows-1252', { fatal: false }).decode(buffer);
  } catch {
    return utf8;
  }
}

async function extractPdfText(file) {
  const pdfjs = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data, useSystemFonts: true });
  const pdf = await loadingTask.promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    const normalized = normalizeWhitespace(text);
    if (normalized) pages.push(`Page ${pageNumber}\n${normalized}`);
  }

  return {
    text: normalizeWhitespace(pages.join('\n\n')),
    pageCount: pdf.numPages,
  };
}

export async function extractTextFromFile(file) {
  if (!file) return ok({ processingStatus: 'uploaded', extractedText: null, extractionError: null, processedAt: null });

  const processedAt = new Date().toISOString();
  if (file.type === 'text/plain' || file.name?.toLowerCase().endsWith('.txt')) {
    try {
      const text = normalizeWhitespace(await readTextFile(file));
      if (!text) {
        return ok({
          processingStatus: 'failed',
          extractedText: null,
          extractionError: 'TXT file has no readable text.',
          processedAt,
        });
      }
      return ok({ processingStatus: 'ready', extractedText: text, extractionError: null, processedAt });
    } catch (error) {
      return ok({
        processingStatus: 'failed',
        extractedText: null,
        extractionError: error?.message || 'TXT extraction failed.',
        processedAt,
      });
    }
  }

  if (file.type === 'application/pdf') {
    try {
      const { text, pageCount } = await extractPdfText(file);
      if (!text) {
        return ok({
          processingStatus: 'unsupported',
          extractedText: null,
          extractionError: 'PDF has no selectable text. OCR not available yet.',
          processedAt,
          pageCount,
        });
      }
      return ok({ processingStatus: 'ready', extractedText: text, extractionError: null, processedAt, pageCount });
    } catch (error) {
      return ok({
        processingStatus: 'failed',
        extractedText: null,
        extractionError: error?.message || 'PDF extraction failed.',
        processedAt,
      });
    }
  }

  if (file.type === 'image/png' || file.type === 'image/jpeg') {
    return ok({
      processingStatus: 'processing',
      extractedText: null,
      extractionError: null,
      processedAt,
      pageCount: 1,
    });
  }

  return ok({
    processingStatus: 'unsupported',
    extractedText: null,
    extractionError: 'File type is not supported for extraction yet.',
    processedAt,
  });
}

export function getMaterialProcessingLabel(material = {}) {
  const status = material.processingStatus || 'uploaded';
  if (status === 'ready') return 'Ready for AI';
  if (status === 'processing') return 'Processing';
  if (status === 'failed') return 'Extraction failed';
  if (status === 'unsupported') {
    const message = String(material.extractionError || '');
    return message.toLowerCase().includes('ocr') ? 'OCR not ready' : 'Extraction not ready';
  }
  return 'Uploaded';
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

async function updateRealMaterial(id, patch = {}) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('study_materials')
    .update(toMaterialPatch(patch))
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

export async function updateMaterial(id, patch = {}) {
  if (!isMockMode()) return updateRealMaterial(id, patch);

  const index = mockMaterials.findIndex((material) => String(material.id) === String(id));
  if (index === -1) return fail('Material not found.', 'NOT_FOUND');

  mockMaterials[index] = {
    ...mockMaterials[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  return ok(mockMaterials[index]);
}

export async function updateMaterialProcessing(id, patch = {}) {
  return updateMaterial(id, {
    processingStatus: patch.processingStatus,
    extractedText: patch.extractedText,
    extractionError: patch.extractionError,
    processedAt: patch.processedAt,
    pageCount: patch.pageCount,
  });
}

export async function requestMaterialOcr(materialId) {
  if (isMockMode()) {
    return fail('OCR is not available in mock mode.', 'OCR_NOT_AVAILABLE');
  }

  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (sessionError || !token) {
    return fail('OCR requires an authenticated Supabase session.', 'AUTH_REQUIRED');
  }

  let response;
  const { controller, timeoutId } = timeoutSignal(MATERIAL_OCR_TIMEOUT_MS);
  try {
    response = await fetch('/api/material-ocr', {
      signal: controller.signal,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ materialId }),
    });
  } catch (error) {
    return fail(
      error?.name === 'AbortError' ? 'OCR extraction timed out.' : (error?.message || 'OCR extraction failed.'),
      error?.name === 'AbortError' ? 'OCR_TIMEOUT' : (error?.code || 'OCR_FAILED'),
    );
  } finally {
    window.clearTimeout(timeoutId);
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok || payload.error) {
    const error = payload.error || {};
    return fail(error.message || 'OCR extraction failed.', error.code || 'OCR_FAILED');
  }

  return ok(payload.data?.material || null);
}

export async function getMaterialDownloadUrl(id) {
  const materials = isMockMode() ? mockMaterials : (await listRealMaterials()).data || [];
  const material = materials.find((item) => String(item.id) === String(id));

  if (!material) return fail('Material not found.', 'NOT_FOUND');
  if (material.sourceUrl) return ok({ url: material.sourceUrl });
  if (!material.storagePath) return fail('Material has no downloadable source.', 'NOT_FOUND');

  return createStudyMaterialSignedUrl(material.storagePath);
}
