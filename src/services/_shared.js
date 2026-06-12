export function cloneData(data) {
  if (typeof structuredClone === 'function') return structuredClone(data);
  if (data == null) return data;
  return JSON.parse(JSON.stringify(data));
}

export function ok(data) {
  return { data: cloneData(data), error: null };
}

export function fail(message, code = 'UNKNOWN_ERROR') {
  return { data: null, error: { code, message } };
}

export function normalizeError(error, fallback = 'Request failed.', defaultCode = 'SUPABASE_ERROR') {
  return {
    code: error?.code || error?.name || defaultCode,
    message: error?.message || fallback,
  };
}
