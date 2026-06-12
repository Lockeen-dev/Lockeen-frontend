import { seedExams } from '../data/mockData';
import { isMockMode } from '../lib/apiClient';
import { requireSupabaseClient, supabase } from '../lib/supabaseClient';
import { requireAuthenticatedUserId } from './auth';
import { fail, normalizeError, ok } from './_shared';

const STUDY_PLAN_MODES = new Set(['daily', 'weekly', 'monthly', 'until_exam']);
const STUDY_PLAN_STATUSES = new Set(['active', 'completed', 'archived']);
const STUDY_PLAN_ITEM_TYPES = new Set(['review', 'quiz', 'flashcards', 'mock_exam', 'buffer']);
const STUDY_PLAN_ITEM_STATUSES = new Set(['planned', 'done', 'missed', 'rescheduled', 'skipped']);
const STUDY_PLAN_ITEM_SOURCES = new Set(['generated', 'manual']);

const mockStudyPlans = [];
const mockStudyPlanItems = [];

function nowIso() {
  return new Date().toISOString();
}

function toStudyPlan(row) {
  return {
    id: row.id,
    title: row.title,
    mode: row.mode,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    settings: row.settings || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toStudyPlanItem(row) {
  return {
    id: row.id,
    planId: row.plan_id,
    examId: row.exam_id,
    chapterId: row.chapter_id,
    materialId: row.material_id,
    type: row.type,
    plannedDate: row.planned_date,
    plannedTime: row.planned_time,
    durationMin: row.duration_min,
    status: row.status,
    source: row.source,
    materialPending: Boolean(row.material_pending),
    completedAt: row.completed_at,
    rescheduledFrom: row.rescheduled_from,
    reason: row.reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toStudyPlanInsert(input, userId) {
  return {
    user_id: userId,
    title: String(input.title || '').trim(),
    mode: input.mode || 'until_exam',
    start_date: input.startDate,
    end_date: input.endDate || null,
    status: input.status || 'active',
    settings: input.settings || {},
  };
}

function toStudyPlanPatch(patch = {}) {
  return {
    ...(patch.title !== undefined ? { title: String(patch.title || '').trim() } : {}),
    ...(patch.mode !== undefined ? { mode: patch.mode } : {}),
    ...(patch.startDate !== undefined ? { start_date: patch.startDate } : {}),
    ...(patch.endDate !== undefined ? { end_date: patch.endDate || null } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.settings !== undefined ? { settings: patch.settings || {} } : {}),
    updated_at: nowIso(),
  };
}

function toStudyPlanItemInsert(input, userId) {
  return {
    user_id: userId,
    plan_id: input.planId,
    exam_id: input.examId || null,
    chapter_id: input.chapterId || null,
    material_id: input.materialId || null,
    type: input.type,
    planned_date: input.plannedDate,
    planned_time: input.plannedTime || null,
    duration_min: input.durationMin,
    status: input.status || 'planned',
    source: input.source || 'generated',
    material_pending: Boolean(input.materialPending),
    completed_at: input.completedAt || null,
    rescheduled_from: input.rescheduledFrom || null,
    reason: input.reason || null,
  };
}

function toStudyPlanItemPatch(patch = {}) {
  return {
    ...(patch.planId !== undefined ? { plan_id: patch.planId } : {}),
    ...(patch.examId !== undefined ? { exam_id: patch.examId || null } : {}),
    ...(patch.chapterId !== undefined ? { chapter_id: patch.chapterId || null } : {}),
    ...(patch.materialId !== undefined ? { material_id: patch.materialId || null } : {}),
    ...(patch.type !== undefined ? { type: patch.type } : {}),
    ...(patch.plannedDate !== undefined ? { planned_date: patch.plannedDate } : {}),
    ...(patch.plannedTime !== undefined ? { planned_time: patch.plannedTime || null } : {}),
    ...(patch.durationMin !== undefined ? { duration_min: patch.durationMin } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.source !== undefined ? { source: patch.source } : {}),
    ...(patch.materialPending !== undefined ? { material_pending: Boolean(patch.materialPending) } : {}),
    ...(patch.completedAt !== undefined ? { completed_at: patch.completedAt || null } : {}),
    ...(patch.rescheduledFrom !== undefined ? { rescheduled_from: patch.rescheduledFrom || null } : {}),
    ...(patch.reason !== undefined ? { reason: patch.reason || null } : {}),
    updated_at: nowIso(),
  };
}

function validateStudyPlan(input = {}) {
  if (!String(input.title || '').trim()) return fail('Study plan title is required.', 'VALIDATION_ERROR');
  if (!input.startDate) return fail('Study plan startDate is required.', 'VALIDATION_ERROR');
  if (input.mode && !STUDY_PLAN_MODES.has(input.mode)) return fail('Study plan mode is invalid.', 'VALIDATION_ERROR');
  if (input.status && !STUDY_PLAN_STATUSES.has(input.status)) return fail('Study plan status is invalid.', 'VALIDATION_ERROR');
  return null;
}

function validateStudyPlanItem(input = {}) {
  if (!input.planId) return fail('Study plan item planId is required.', 'VALIDATION_ERROR');
  if (!input.type || !STUDY_PLAN_ITEM_TYPES.has(input.type)) return fail('Study plan item type is invalid.', 'VALIDATION_ERROR');
  if (!input.plannedDate) return fail('Study plan item plannedDate is required.', 'VALIDATION_ERROR');
  if (!Number.isFinite(Number(input.durationMin)) || Number(input.durationMin) <= 0) return fail('Study plan item durationMin must be greater than 0.', 'VALIDATION_ERROR');
  if (input.status && !STUDY_PLAN_ITEM_STATUSES.has(input.status)) return fail('Study plan item status is invalid.', 'VALIDATION_ERROR');
  if (input.source && !STUDY_PLAN_ITEM_SOURCES.has(input.source)) return fail('Study plan item source is invalid.', 'VALIDATION_ERROR');
  return null;
}

function findMockPlan(planId) {
  return mockStudyPlans.find((plan) => String(plan.id) === String(planId));
}

function hasKnownMockExam(examId) {
  if (!examId) return true;
  return seedExams.some((exam) => String(exam.id) === String(examId));
}

function hasKnownMockChapter(chapterId) {
  if (!chapterId) return true;
  return seedExams.some((exam) =>
    (exam.chapters || []).some((chapter) => String(chapter.id) === String(chapterId)),
  );
}

function validateMockItemParents(input = {}) {
  if (!findMockPlan(input.planId)) return fail('Study plan item requires a known mock planId.', 'VALIDATION_ERROR');
  if (!hasKnownMockExam(input.examId)) return fail('Study plan item requires a known mock examId.', 'VALIDATION_ERROR');
  if (!hasKnownMockChapter(input.chapterId)) return fail('Study plan item requires a known mock chapterId.', 'VALIDATION_ERROR');
  return null;
}

function matchesPlanFilters(plan, filters = {}) {
  return (
    (!filters.status || plan.status === filters.status) &&
    (!filters.mode || plan.mode === filters.mode)
  );
}

function matchesItemFilters(item, filters = {}) {
  return (
    (!filters.planId || String(item.planId) === String(filters.planId)) &&
    (!filters.examId || String(item.examId) === String(filters.examId)) &&
    (!filters.chapterId || String(item.chapterId) === String(filters.chapterId)) &&
    (!filters.materialId || String(item.materialId) === String(filters.materialId)) &&
    (!filters.status || item.status === filters.status) &&
    (!filters.type || item.type === filters.type) &&
    (!filters.dateFrom || String(item.plannedDate) >= String(filters.dateFrom)) &&
    (!filters.dateTo || String(item.plannedDate) <= String(filters.dateTo))
  );
}

function toMockStudyPlan(input = {}) {
  const now = nowIso();
  return {
    id: input.id || `mock-study-plan-${crypto.randomUUID()}`,
    title: String(input.title || '').trim(),
    mode: input.mode || 'until_exam',
    startDate: input.startDate,
    endDate: input.endDate || null,
    status: input.status || 'active',
    settings: input.settings || {},
    createdAt: now,
    updatedAt: now,
  };
}

function toMockStudyPlanItem(input = {}) {
  const now = nowIso();
  return {
    id: input.id || `mock-study-plan-item-${crypto.randomUUID()}`,
    planId: input.planId,
    examId: input.examId || null,
    chapterId: input.chapterId || null,
    materialId: input.materialId || null,
    type: input.type,
    plannedDate: input.plannedDate,
    plannedTime: input.plannedTime || null,
    durationMin: Number(input.durationMin),
    status: input.status || 'planned',
    source: input.source || 'generated',
    materialPending: Boolean(input.materialPending),
    completedAt: input.completedAt || null,
    rescheduledFrom: input.rescheduledFrom || null,
    reason: input.reason || null,
    createdAt: now,
    updatedAt: now,
  };
}

async function requireRealUserId() {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  return requireAuthenticatedUserId();
}

async function listRealStudyPlans(filters = {}) {
  const userResult = await requireRealUserId();
  if (userResult.error) return userResult;

  let query = supabase
    .from('study_plans')
    .select('*')
    .eq('user_id', userResult.data)
    .order('start_date', { ascending: true })
    .order('created_at', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.mode) query = query.eq('mode', filters.mode);

  const { data, error } = await query;
  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }

  return ok((data || []).map(toStudyPlan));
}

async function getRealStudyPlan(id) {
  const userResult = await requireRealUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('study_plans')
    .select('*')
    .eq('id', id)
    .eq('user_id', userResult.data)
    .maybeSingle();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  if (!data) return fail('Study plan not found.', 'NOT_FOUND');

  return ok(toStudyPlan(data));
}

async function createRealStudyPlan(input = {}) {
  const validationError = validateStudyPlan(input);
  if (validationError) return validationError;

  const userResult = await requireRealUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('study_plans')
    .insert(toStudyPlanInsert(input, userResult.data))
    .select()
    .single();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }

  return ok(toStudyPlan(data));
}

async function updateRealStudyPlan(id, patch = {}) {
  const validationError = validateStudyPlan({
    title: patch.title === undefined ? 'existing' : patch.title,
    startDate: patch.startDate === undefined ? 'existing' : patch.startDate,
    mode: patch.mode,
    status: patch.status,
  });
  if (validationError) return validationError;

  const userResult = await requireRealUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('study_plans')
    .update(toStudyPlanPatch(patch))
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select()
    .maybeSingle();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  if (!data) return fail('Study plan not found.', 'NOT_FOUND');

  return ok(toStudyPlan(data));
}

async function deleteRealStudyPlan(id) {
  const userResult = await requireRealUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('study_plans')
    .delete()
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select()
    .maybeSingle();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  if (!data) return fail('Study plan not found.', 'NOT_FOUND');

  return ok(toStudyPlan(data));
}

async function listRealStudyPlanItems(filters = {}) {
  const userResult = await requireRealUserId();
  if (userResult.error) return userResult;

  let query = supabase
    .from('study_plan_items')
    .select('*')
    .eq('user_id', userResult.data)
    .order('planned_date', { ascending: true })
    .order('planned_time', { ascending: true, nullsFirst: false });

  if (filters.planId) query = query.eq('plan_id', filters.planId);
  if (filters.examId) query = query.eq('exam_id', filters.examId);
  if (filters.chapterId) query = query.eq('chapter_id', filters.chapterId);
  if (filters.materialId) query = query.eq('material_id', filters.materialId);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.dateFrom) query = query.gte('planned_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('planned_date', filters.dateTo);

  const { data, error } = await query;
  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }

  return ok((data || []).map(toStudyPlanItem));
}

async function createRealStudyPlanItem(input = {}) {
  const validationError = validateStudyPlanItem(input);
  if (validationError) return validationError;

  const userResult = await requireRealUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('study_plan_items')
    .insert(toStudyPlanItemInsert(input, userResult.data))
    .select()
    .single();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }

  return ok(toStudyPlanItem(data));
}

async function updateRealStudyPlanItem(id, patch = {}) {
  const validationError = validateStudyPlanItem({
    planId: patch.planId === undefined ? 'existing' : patch.planId,
    type: patch.type === undefined ? 'review' : patch.type,
    plannedDate: patch.plannedDate === undefined ? 'existing' : patch.plannedDate,
    durationMin: patch.durationMin === undefined ? 1 : patch.durationMin,
    status: patch.status,
    source: patch.source,
  });
  if (validationError) return validationError;

  const userResult = await requireRealUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('study_plan_items')
    .update(toStudyPlanItemPatch(patch))
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select()
    .maybeSingle();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  if (!data) return fail('Study plan item not found.', 'NOT_FOUND');

  return ok(toStudyPlanItem(data));
}

async function deleteRealStudyPlanItem(id) {
  const userResult = await requireRealUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('study_plan_items')
    .delete()
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select()
    .maybeSingle();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  if (!data) return fail('Study plan item not found.', 'NOT_FOUND');

  return ok(toStudyPlanItem(data));
}

export async function listStudyPlans(filters = {}) {
  if (!isMockMode()) return listRealStudyPlans(filters);
  return ok(mockStudyPlans.filter((plan) => matchesPlanFilters(plan, filters)));
}

export async function getStudyPlan(id) {
  if (!isMockMode()) return getRealStudyPlan(id);
  const plan = findMockPlan(id);
  if (!plan) return fail('Study plan not found.', 'NOT_FOUND');
  return ok(plan);
}

export async function createStudyPlan(input = {}) {
  if (!isMockMode()) return createRealStudyPlan(input);

  const validationError = validateStudyPlan(input);
  if (validationError) return validationError;

  const plan = toMockStudyPlan(input);
  mockStudyPlans.unshift(plan);
  return ok(plan);
}

export async function updateStudyPlan(id, patch = {}) {
  if (!isMockMode()) return updateRealStudyPlan(id, patch);

  const validationError = validateStudyPlan({
    title: patch.title === undefined ? 'existing' : patch.title,
    startDate: patch.startDate === undefined ? 'existing' : patch.startDate,
    mode: patch.mode,
    status: patch.status,
  });
  if (validationError) return validationError;

  const index = mockStudyPlans.findIndex((plan) => String(plan.id) === String(id));
  if (index === -1) return fail('Study plan not found.', 'NOT_FOUND');

  mockStudyPlans[index] = {
    ...mockStudyPlans[index],
    ...patch,
    id: mockStudyPlans[index].id,
    updatedAt: nowIso(),
  };
  return ok(mockStudyPlans[index]);
}

export async function deleteStudyPlan(id) {
  if (!isMockMode()) return deleteRealStudyPlan(id);

  const index = mockStudyPlans.findIndex((plan) => String(plan.id) === String(id));
  if (index === -1) return fail('Study plan not found.', 'NOT_FOUND');

  const [deleted] = mockStudyPlans.splice(index, 1);
  for (let itemIndex = mockStudyPlanItems.length - 1; itemIndex >= 0; itemIndex -= 1) {
    if (String(mockStudyPlanItems[itemIndex].planId) === String(id)) mockStudyPlanItems.splice(itemIndex, 1);
  }
  return ok(deleted);
}

export async function listStudyPlanItems(filters = {}) {
  if (!isMockMode()) return listRealStudyPlanItems(filters);
  return ok(mockStudyPlanItems.filter((item) => matchesItemFilters(item, filters)));
}

export async function createStudyPlanItem(input = {}) {
  if (!isMockMode()) return createRealStudyPlanItem(input);

  const validationError = validateStudyPlanItem(input) || validateMockItemParents(input);
  if (validationError) return validationError;

  const item = toMockStudyPlanItem(input);
  mockStudyPlanItems.push(item);
  return ok(item);
}

export async function updateStudyPlanItem(id, patch = {}) {
  if (!isMockMode()) return updateRealStudyPlanItem(id, patch);

  const validationError = validateStudyPlanItem({
    planId: patch.planId === undefined ? 'existing' : patch.planId,
    type: patch.type === undefined ? 'review' : patch.type,
    plannedDate: patch.plannedDate === undefined ? 'existing' : patch.plannedDate,
    durationMin: patch.durationMin === undefined ? 1 : patch.durationMin,
    status: patch.status,
    source: patch.source,
  });
  if (validationError) return validationError;

  const index = mockStudyPlanItems.findIndex((item) => String(item.id) === String(id));
  if (index === -1) return fail('Study plan item not found.', 'NOT_FOUND');

  const nextItem = {
    ...mockStudyPlanItems[index],
    ...patch,
    id: mockStudyPlanItems[index].id,
    updatedAt: nowIso(),
  };

  const parentError = validateMockItemParents(nextItem);
  if (parentError) return parentError;

  mockStudyPlanItems[index] = nextItem;
  return ok(nextItem);
}

export async function deleteStudyPlanItem(id) {
  if (!isMockMode()) return deleteRealStudyPlanItem(id);

  const index = mockStudyPlanItems.findIndex((item) => String(item.id) === String(id));
  if (index === -1) return fail('Study plan item not found.', 'NOT_FOUND');

  const [deleted] = mockStudyPlanItems.splice(index, 1);
  return ok(deleted);
}
