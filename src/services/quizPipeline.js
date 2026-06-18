import { isMockMode } from '../lib/apiClient';
import { requireSupabaseClient, supabase } from '../lib/supabaseClient';
import { requireAuthenticatedUserId } from './auth';
import { fail, ok } from './_shared';

function normalizeError(error, fallback = 'Quiz pipeline request failed.') {
  return {
    code: error?.code || error?.name || 'SUPABASE_ERROR',
    message: error?.message || fallback,
  };
}

function toRun(row) {
  return {
    id: row.id,
    examId: row.exam_id,
    chapterId: row.chapter_id,
    noteId: row.note_id,
    sourceMaterialId: row.source_material_id,
    model: row.model,
    status: row.status,
    requestedCount: row.requested_count,
    generatedCount: row.generated_count,
    validCount: row.valid_count,
    errorMessage: row.error_message,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export async function createQuizGenerationRun(input = {}) {
  if (isMockMode()) {
    return ok({
      id: `mock-generation-${crypto.randomUUID()}`,
      ...input,
      status: 'running',
      createdAt: new Date().toISOString(),
    });
  }

  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('quiz_generation_runs')
    .insert({
      user_id: userResult.data,
      exam_id: input.examId || null,
      chapter_id: input.chapterId || null,
      note_id: input.noteId || null,
      source_material_id: input.sourceMaterialId || null,
      model: input.model || null,
      status: 'running',
      requested_count: Number(input.requestedCount || 0),
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  return ok(toRun(data));
}

export async function completeQuizGenerationRun(id, patch = {}) {
  if (!id) return fail('Generation run id is required.', 'VALIDATION_ERROR');
  if (isMockMode() || String(id).startsWith('mock-generation-')) {
    return ok({ id, ...patch, status: patch.status || 'completed', completedAt: new Date().toISOString() });
  }

  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('quiz_generation_runs')
    .update({
      status: patch.status || 'completed',
      generated_count: Number(patch.generatedCount || 0),
      valid_count: Number(patch.validCount || 0),
      error_message: patch.errorMessage || null,
      metadata: patch.metadata || {},
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select()
    .maybeSingle();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  return ok(data ? toRun(data) : null);
}

export async function replaceMaterialChunks(materialId, chunks = []) {
  if (!materialId) return fail('Material id is required.', 'VALIDATION_ERROR');
  if (isMockMode()) return ok(chunks.map((chunk, index) => ({ id: `mock-chunk-${index}`, ...chunk })));

  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  await supabase
    .from('material_concepts')
    .delete()
    .eq('material_id', materialId)
    .eq('user_id', userResult.data);

  await supabase
    .from('material_chunks')
    .delete()
    .eq('material_id', materialId)
    .eq('user_id', userResult.data);

  if (!chunks.length) return ok([]);

  const rows = chunks.map((chunk, index) => ({
    user_id: userResult.data,
    material_id: materialId,
    chunk_index: index,
    title: chunk.title || null,
    text: chunk.text,
    token_estimate: Number(chunk.tokenEstimate || Math.ceil(String(chunk.text || '').length / 4)),
  }));

  const { data, error } = await supabase
    .from('material_chunks')
    .insert(rows)
    .select();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  return ok(data || []);
}

export async function insertMaterialConcepts(materialId, concepts = [], chunks = []) {
  if (!materialId) return fail('Material id is required.', 'VALIDATION_ERROR');
  if (isMockMode()) return ok(concepts.map((concept, index) => ({ id: `mock-concept-${index}`, ...concept })));

  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  const chunkByIndex = new Map((chunks || []).map((chunk) => [Number(chunk.chunk_index ?? chunk.chunkIndex), chunk]));
  const rows = concepts.map((concept, index) => {
    const chunk = chunkByIndex.get(Number(concept.chunkIndex ?? concept.chunk_index ?? 0));
    return {
      user_id: userResult.data,
      material_id: materialId,
      chunk_id: chunk?.id || null,
      concept_key: concept.conceptKey || concept.concept_key || `concept-${index + 1}`,
      title: concept.title,
      summary: concept.summary,
      importance: Math.max(1, Math.min(5, Number(concept.importance || 3))),
    };
  });

  if (!rows.length) return ok([]);

  const { data, error } = await supabase
    .from('material_concepts')
    .insert(rows)
    .select();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  return ok(data || []);
}
