import { isMockMode } from '../lib/apiClient';
import { requireSupabaseClient, supabase } from '../lib/supabaseClient';
import { requireAuthenticatedUserId } from './auth';
import { fail, normalizeError, ok } from './_shared';

const mockSessions = [];
const mockFolders = [];

function normalizeFolderName(name) {
  return String(name || '').trim();
}

function toSession(row) {
  return {
    id: row.id,
    title: row.title,
    msgs: row.messages || [],
    status: row.status,
    pinned: Boolean(row.pinned),
    folderId: row.folder_id || null,
    date: row.updated_at ? new Date(row.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Today',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toFolder(row) {
  return {
    id: row.id,
    name: row.name,
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
    pinned: Boolean(input.pinned),
    ...(input.folderId ? { folder_id: input.folderId } : {}),
  };
}

function toPatch(patch) {
  return {
    ...(patch.title !== undefined ? { title: patch.title || 'New conversation' } : {}),
    ...(patch.msgs !== undefined ? { messages: patch.msgs || [] } : {}),
    ...(patch.messages !== undefined ? { messages: patch.messages || [] } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.pinned !== undefined ? { pinned: Boolean(patch.pinned) } : {}),
    ...(patch.folderId !== undefined ? { folder_id: patch.folderId || null } : {}),
    updated_at: new Date().toISOString(),
  };
}

async function listRealTutorFolders() {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('tutor_folders')
    .select('*')
    .eq('user_id', userResult.data)
    .order('updated_at', { ascending: false });

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }

  return ok((data || []).map(toFolder));
}

async function createRealTutorFolder(input = {}) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;
  const cleanName = normalizeFolderName(input.name);
  if (!cleanName) return fail('Folder name is required.', 'VALIDATION_ERROR');

  const { data, error } = await supabase
    .from('tutor_folders')
    .insert({ user_id: userResult.data, name: cleanName })
    .select()
    .single();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }

  return ok(toFolder(data));
}

async function updateRealTutorFolder(id, patch = {}) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;
  const cleanName = patch.name !== undefined ? normalizeFolderName(patch.name) : null;
  if (patch.name !== undefined && !cleanName) return fail('Folder name is required.', 'VALIDATION_ERROR');

  const update = {
    ...(patch.name !== undefined ? { name: cleanName } : {}),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('tutor_folders')
    .update(update)
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select()
    .maybeSingle();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  if (!data) return fail('Tutor folder not found.', 'NOT_FOUND');

  return ok(toFolder(data));
}

async function deleteRealTutorFolder(id) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('tutor_folders')
    .delete()
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select('id')
    .maybeSingle();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  if (!data) return fail('Tutor folder not found.', 'NOT_FOUND');

  return ok({ id: data.id });
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
    .order('pinned', { ascending: false })
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

async function deleteRealTutorSession(id) {
  const clientError = requireSupabaseClient();
  if (clientError) return clientError;
  const userResult = await requireAuthenticatedUserId();
  if (userResult.error) return userResult;

  const { data, error } = await supabase
    .from('tutor_sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select('id')
    .maybeSingle();

  if (error) {
    const normalized = normalizeError(error);
    return fail(normalized.message, normalized.code);
  }
  if (!data) return fail('Tutor session not found.', 'NOT_FOUND');

  return ok({ id: data.id });
}

export async function listTutorSessions() {
  if (!isMockMode()) return listRealTutorSessions();
  return ok([...mockSessions].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
  }));
}

export async function listTutorFolders() {
  if (!isMockMode()) return listRealTutorFolders();
  return ok([...mockFolders].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))));
}

export async function createTutorFolder(input = {}) {
  if (!isMockMode()) return createRealTutorFolder(input);
  const now = new Date().toISOString();
  const cleanName = normalizeFolderName(input.name);
  if (!cleanName) return fail('Folder name is required.', 'VALIDATION_ERROR');
  const duplicate = mockFolders.some(folder => String(folder.name || '').trim().toLowerCase() === cleanName.toLowerCase());
  if (duplicate) return fail('A folder with this name already exists.', 'DUPLICATE_FOLDER');
  const folder = {
    id: `mock-folder-${crypto.randomUUID()}`,
    name: cleanName,
    createdAt: now,
    updatedAt: now,
  };
  mockFolders.unshift(folder);
  return ok(folder);
}

export async function updateTutorFolder(id, patch = {}) {
  if (!isMockMode()) return updateRealTutorFolder(id, patch);
  const index = mockFolders.findIndex((folder) => String(folder.id) === String(id));
  if (index === -1) return fail('Tutor folder not found.', 'NOT_FOUND');
  const cleanName = patch.name !== undefined ? normalizeFolderName(patch.name) : mockFolders[index].name;
  if (patch.name !== undefined && !cleanName) return fail('Folder name is required.', 'VALIDATION_ERROR');
  const duplicate = mockFolders.some((folder) => (
    String(folder.id) !== String(id) &&
    String(folder.name || '').trim().toLowerCase() === cleanName.toLowerCase()
  ));
  if (duplicate) return fail('A folder with this name already exists.', 'DUPLICATE_FOLDER');
  mockFolders[index] = {
    ...mockFolders[index],
    ...(patch.name !== undefined ? { name: cleanName } : {}),
    updatedAt: new Date().toISOString(),
  };
  return ok(mockFolders[index]);
}

export async function deleteTutorFolder(id) {
  if (!isMockMode()) return deleteRealTutorFolder(id);
  const index = mockFolders.findIndex((folder) => String(folder.id) === String(id));
  if (index === -1) return fail('Tutor folder not found.', 'NOT_FOUND');
  const [removed] = mockFolders.splice(index, 1);
  mockSessions.forEach((session) => {
    if (session.folderId === removed.id) session.folderId = null;
  });
  return ok({ id: removed.id });
}

export async function createTutorSession(input = {}) {
  if (!isMockMode()) return createRealTutorSession(input);
  const now = new Date().toISOString();
  const session = {
    id: `mock-tutor-${crypto.randomUUID()}`,
    title: input.title || 'New conversation',
    msgs: input.msgs || input.messages || [],
    status: input.status || 'active',
    pinned: Boolean(input.pinned),
    folderId: input.folderId || null,
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

export async function deleteTutorSession(id) {
  if (!isMockMode()) return deleteRealTutorSession(id);
  const index = mockSessions.findIndex((session) => String(session.id) === String(id));
  if (index === -1) return fail('Tutor session not found.', 'NOT_FOUND');
  const [removed] = mockSessions.splice(index, 1);
  return ok({ id: removed.id });
}
