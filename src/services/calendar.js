import { listExams } from './exams';
import { isMockMode } from '../lib/apiClient';
import { requireSupabaseClient, supabase } from '../lib/supabaseClient';
import { requireAuthenticatedUserId } from './auth';
import { fail, normalizeError, ok } from './_shared';

const LOCAL_ACTIVITY_STORAGE_KEY = 'lockeen.calendarActivities.v1';

function localActivityStorageKey(userId) {
  return `${LOCAL_ACTIVITY_STORAGE_KEY}:${userId || 'local'}`;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeClockTime(value = '09:00') {
  const [hour, minute] = String(value || '09:00').split(':').map(Number);
  return `${String(Number.isFinite(hour) ? hour : 9).padStart(2, '0')}:${String(Number.isFinite(minute) ? minute : 0).padStart(2, '0')}`;
}

function clampDuration(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return 60;
  return Math.max(1, Math.min(24 * 60, Math.round(value)));
}

function dateTimeSortKey(item = {}) {
  const date = String(item.activityDate || item.activity_date || item.date || '').trim();
  const time = normalizeClockTime(item.activityTime || item.activity_time || '00:00');
  return `${date}T${time}:00`;
}

function isCalendarActivitiesTableMissing(error = {}) {
  const message = String(error.message || '');
  return error.code === '42P01' || error.code === 'PGRST404' || message.includes('calendar_activities');
}

function failFrom(error) {
  const normalized = normalizeError(error, 'Calendar operation failed.', 'CALENDAR_ERROR');
  return fail(normalized.message, normalized.code);
}

function toCalendarActivityInsert(input = {}, userId) {
  return {
    user_id: userId,
    title: String(input.title || '').trim(),
    activity_date: input.activityDate || null,
    activity_time: input.activityTime || null,
    duration_min: clampDuration(input.durationMin || input.duration_min || 60),
    category: input.category || 'study',
    note_id: input.noteId || null,
    note_subject: input.noteSubject || null,
    note_color: input.noteColor || null,
    note_bg: input.noteBg || null,
    note_text: input.noteText || null,
    notes: input.notes || '',
    materials: input.materials || [],
    files: input.files || [],
    completed: Boolean(input.completed),
  };
}

function toCalendarActivityPatch(patch = {}) {
  return {
    ...(patch.title !== undefined ? { title: String(patch.title || '').trim() } : {}),
    ...(patch.activityDate !== undefined ? { activity_date: patch.activityDate || null } : {}),
    ...(patch.activityTime !== undefined ? { activity_time: patch.activityTime || null } : {}),
    ...(patch.durationMin !== undefined ? { duration_min: clampDuration(patch.durationMin) } : {}),
    ...(patch.category !== undefined ? { category: patch.category || 'study' } : {}),
    ...(patch.noteId !== undefined ? { note_id: patch.noteId || null } : {}),
    ...(patch.noteSubject !== undefined ? { note_subject: patch.noteSubject || null } : {}),
    ...(patch.noteColor !== undefined ? { note_color: patch.noteColor || null } : {}),
    ...(patch.noteBg !== undefined ? { note_bg: patch.noteBg || null } : {}),
    ...(patch.noteText !== undefined ? { note_text: patch.noteText || null } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes || '' } : {}),
    ...(patch.materials !== undefined ? { materials: patch.materials || [] } : {}),
    ...(patch.files !== undefined ? { files: patch.files || [] } : {}),
    ...(patch.completed !== undefined ? { completed: Boolean(patch.completed) } : {}),
  };
}

function toCalendarActivity(item = {}) {
  return {
    id: item.id,
    title: item.title,
    activityDate: item.activity_date,
    activityTime: item.activity_time ? normalizeClockTime(item.activity_time) : null,
    durationMin: clampDuration(item.duration_min),
    category: item.category || 'study',
    noteId: item.note_id || null,
    noteSubject: item.note_subject || null,
    noteColor: item.note_color || null,
    noteBg: item.note_bg || null,
    noteText: item.note_text || null,
    notes: item.notes || '',
    materials: Array.isArray(item.materials) ? item.materials : [],
    files: Array.isArray(item.files) ? item.files : [],
    completed: Boolean(item.completed),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function readStoredActivities(userId) {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(localActivityStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        ...row,
        noteId: row.noteId || row.note_id || null,
        noteSubject: row.noteSubject || row.note_subject || null,
        noteColor: row.noteColor || row.note_color || null,
        noteBg: row.noteBg || row.note_bg || null,
        noteText: row.noteText || row.note_text || null,
        durationMin: clampDuration(row.durationMin || row.duration_min || 60),
        activityDate: row.activityDate || row.activity_date,
        activityTime: normalizeClockTime(row.activityTime || row.activity_time || '09:00'),
        category: row.category || 'study',
        notes: row.notes || '',
        materials: Array.isArray(row.materials) ? row.materials : [],
        files: Array.isArray(row.files) ? row.files : [],
        completed: Boolean(row.completed),
      }))
      .sort((a, b) => new Date(dateTimeSortKey(a)).getTime() - new Date(dateTimeSortKey(b)).getTime());
  } catch (_) {
    return [];
  }
}

function writeStoredActivities(userId, rows = []) {
  try {
    if (typeof window === 'undefined') return;
    const payload = (rows || [])
      .map((row) => ({
        id: row.id,
        title: row.title,
        activityDate: row.activityDate,
        activityTime: normalizeClockTime(row.activityTime || '09:00'),
        durationMin: clampDuration(row.durationMin || row.duration_min || 60),
        category: row.category || 'study',
        noteId: row.noteId || null,
        noteSubject: row.noteSubject || null,
        noteColor: row.noteColor || null,
        noteBg: row.noteBg || null,
        noteText: row.noteText || null,
        notes: row.notes || '',
        materials: Array.isArray(row.materials) ? row.materials : [],
        files: Array.isArray(row.files) ? row.files : [],
        completed: Boolean(row.completed),
      }));
    window.localStorage.setItem(localActivityStorageKey(userId), JSON.stringify(payload));
  } catch (_) {}
}

function withLocalFallback(userId, callback) {
  const current = readStoredActivities(userId);
  const nextRows = callback(current) || current;
  writeStoredActivities(userId, nextRows);
  return nextRows;
}

export function hasValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function failIfNoId(input) {
  if (!input.title) {
    return fail('Calendar activity requires a title.', 'VALIDATION_ERROR');
  }
  if (!input.activityDate) {
    return fail('Calendar activity requires a date.', 'VALIDATION_ERROR');
  }
  return null;
}

function sortEventsByDateAsc(a, b) {
  return new Date(a.date).getTime() - new Date(b.date).getTime();
}

function examToCalendarEvent(exam) {
  return {
    id: `exam-${exam.id}`,
    type: 'exam',
    title: exam.name,
    date: exam.date,
    time: exam.time || exam.examTime || '09:00',
    durationMin: exam.durationMin || exam.examDurationMin || 120,
    examId: exam.id,
    subject: exam.subject || null,
    color: exam.color || null,
  };
}

export async function listExamEvents() {
  const result = await listExams();

  if (result.error) return failFrom(result.error);

  const events = (result.data || [])
    .filter((exam) => hasValidDate(exam.date))
    .map(examToCalendarEvent)
    .sort(sortEventsByDateAsc);

  return ok(events);
}

export async function listUserCalendarActivities(filters = {}) {
  const { fromDate, toDate, category, userId: forcedUserId } = filters || {};

  if (isMockMode()) {
    const rows = readStoredActivities(forcedUserId || 'mock').filter((row) => {
      if (fromDate && String(row.activityDate) < String(fromDate)) return false;
      if (toDate && String(row.activityDate) > String(toDate)) return false;
      if (category && row.category !== category) return false;
      return true;
    });
    return ok(rows);
  }

  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;
  const userId = userResult.data;

  const { data, error } = await supabase
    .from('calendar_activities')
    .select('*')
    .eq('user_id', userId)
    .order('activity_date', { ascending: true })
    .order('activity_time', { ascending: true });

  if (error) {
    if (isCalendarActivitiesTableMissing(error)) {
      const fallbackRows = readStoredActivities(userId).filter((row) => {
        if (fromDate && String(row.activityDate) < String(fromDate)) return false;
        if (toDate && String(row.activityDate) > String(toDate)) return false;
        if (category && row.category !== category) return false;
        return true;
      });
      return ok(fallbackRows);
    }
    return failFrom(error);
  }

  return ok((data || []).map(toCalendarActivity).filter((row) => {
    if (fromDate && String(row.activityDate) < String(fromDate)) return false;
    if (toDate && String(row.activityDate) > String(toDate)) return false;
    if (category && row.category !== category) return false;
    return true;
  }));
}

export async function createCalendarActivity(input = {}) {
  const validationError = failIfNoId(input);
  if (validationError) return validationError;

  if (isMockMode()) {
    const userId = input.userId || 'mock';
    const row = {
      id: input.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ca-${Date.now()}-${Math.floor(Math.random() * 9999)}`),
      user_id: userId,
      ...toCalendarActivityInsert(input, userId),
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    const activity = toCalendarActivity(row);
    withLocalFallback(userId, (current) => {
      return [activity, ...current].sort((a, b) => new Date(dateTimeSortKey(a)).getTime() - new Date(dateTimeSortKey(b)).getTime());
    });
    return ok(activity);
  }

  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;
  const userId = userResult.data;

  const result = await supabase
    .from('calendar_activities')
    .insert([toCalendarActivityInsert(input, userId)])
    .select('*')
    .single();

  if (result.error) {
    if (isCalendarActivitiesTableMissing(result.error)) {
      const fallback = toCalendarActivity({
        id: `local-${Date.now()}`,
        user_id: userId,
        ...toCalendarActivityInsert(input, userId),
        created_at: nowIso(),
        updated_at: nowIso(),
      });
      withLocalFallback(userId, (current) => [fallback, ...current].sort((a, b) => new Date(dateTimeSortKey(a)).getTime() - new Date(dateTimeSortKey(b)).getTime()));
      return ok(fallback);
    }
    return failFrom(result.error);
  }

  return ok(toCalendarActivity(result.data));
}

export async function updateCalendarActivity(activityId, patch = {}) {
  if (!activityId) return fail('Missing calendar activity id.', 'VALIDATION_ERROR');

  const mappedPatch = toCalendarActivityPatch(patch);

  if (isMockMode()) {
    const userId = patch.userId || 'mock';
    let found = null;
    const next = withLocalFallback(userId, (current) => current.map((item) => {
      if (String(item.id) !== String(activityId)) return item;
      const nextItem = { ...item, ...mappedPatch, updatedAt: nowIso(), activityTime: normalizeClockTime(item.activityTime) };
      found = nextItem;
      return nextItem;
    }));
    if (!found) return fail('Calendar activity not found.', 'NOT_FOUND');
    return ok(found);
  }

  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;
  const userId = userResult.data;

  const result = await supabase
    .from('calendar_activities')
    .update(mappedPatch)
    .eq('id', activityId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (result.error) {
    if (isCalendarActivitiesTableMissing(result.error)) {
      let found = null;
      withLocalFallback(userId, (current) => current.map((item) => {
        if (String(item.id) !== String(activityId)) return item;
        const nextItem = { ...item, ...mappedPatch, updatedAt: nowIso(), activityTime: normalizeClockTime(item.activityTime) };
        found = nextItem;
        return nextItem;
      }));
      if (!found) return fail('Calendar activity not found.', 'NOT_FOUND');
      return ok(found);
    }
    return failFrom(result.error);
  }

  return ok(toCalendarActivity(result.data));
}

export async function deleteCalendarActivity(activityId, options = {}) {
  if (!activityId) return fail('Missing calendar activity id.', 'VALIDATION_ERROR');

  if (isMockMode()) {
    const userId = options.userId || 'mock';
    let removed;
    withLocalFallback(userId, (current) => {
      const next = [];
      current.forEach((item) => {
        if (String(item.id) === String(activityId)) removed = item;
        else next.push(item);
      });
      return next;
    });
    return removed ? ok(removed) : fail('Calendar activity not found.', 'NOT_FOUND');
  }

  const clientError = requireSupabaseClient();
  if (clientError) return clientError;

  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;
  const userId = userResult.data;

  const result = await supabase
    .from('calendar_activities')
    .delete()
    .eq('id', activityId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (result.error) {
    if (isCalendarActivitiesTableMissing(result.error)) {
      let removed;
      withLocalFallback(userId, (current) => {
        const next = [];
        current.forEach((item) => {
          if (String(item.id) === String(activityId)) removed = item;
          else next.push(item);
        });
        return next;
      });
      if (!removed) return fail('Calendar activity not found.', 'NOT_FOUND');
      return ok(removed);
    }
    return failFrom(result.error);
  }

  return ok(toCalendarActivity(result.data));
}

export async function listCalendarEvents() {
  return listExamEvents();
}
