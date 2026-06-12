import { isMockMode } from '../lib/apiClient';
import { requireSupabaseClient, supabase } from '../lib/supabaseClient';
import { requireAuthenticatedUserId } from './auth';
import { fail, normalizeError, ok } from './_shared';

const mockSessions = [];

function toSession(row) {
  return {
    id: row.id,
    title: row.title,
    msgs: row.messages || [],
    status: row.status,
    date: row.updated_at ? new Date(row.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Today',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsert(input, userId) {
  return {
    user_id: userId,
    title: input.title || 'New conversation',
    messages: input.msgs || input.messages || [],
    status: input.status || 'active',
  };
}

function toPatch(patch) {
  return {
    ...(patch.title !== undefined ? { title: patch.title || 'New conversation' } : {}),
    ...(patch.msgs !== undefined ? { messages: patch.msgs || [] } : {}),
    ...(patch.messages !== undefined ? { messages: patch.messages || [] } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    updated_at: new Date().toISOString(),
  };
}

async function listRealTutorSessions() {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('tutor_sessions')
    .select('*')
    .eq('user_id', userResult.data)
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }

  return ok((data || []).map(toSession));
}

async function createRealTutorSession(input = {}) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('tutor_sessions')
    .insert(toInsert(input, userResult.data))
    .select()
    .single();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }

  return ok(toSession(data));
}

async function updateRealTutorSession(id, patch = {}) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('tutor_sessions')
    .update(toPatch(patch))
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select()
    .maybeSingle();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  if (!data) return fail('Tutor session not found.', 'NOT_FOUND');

  return ok(toSession(data));
}

export async function listTutorSessions() {
  if (!isMockMode()) return listRealTutorSessions();
  return ok(mockSessions);
}

export async function createTutorSession(input = {}) {
  if (!isMockMode()) return createRealTutorSession(input);
  const now = new Date().toISOString();
  const session = {
    id: `mock-tutor-${crypto.randomUUID()}`,
    title: input.title || 'New conversation',
    msgs: input.msgs || input.messages || [],
    status: input.status || 'active',
    date: 'Today',
    createdAt: now,
    updatedAt: now,
  };
  mockSessions.unshift(session);
  return ok(session);
}

export async function updateTutorSession(id, patch = {}) {
  if (!isMockMode()) return updateRealTutorSession(id, patch);
  const index = mockSessions.findIndex((session) => String(session.id) === String(id));
  if (index === -1) return fail('Tutor session not found.', 'NOT_FOUND');
  mockSessions[index] = { ...mockSessions[index], ...patch, updatedAt: new Date().toISOString() };
  return ok(mockSessions[index]);
}
