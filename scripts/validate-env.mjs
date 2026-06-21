import { existsSync, readFileSync } from 'node:fs';

function normalizeEnvValue(value = '') {
  const trimmed = String(value ?? '').trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function readEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        if (separator === -1) {
          return [line, ''];
        }
        return [line.slice(0, separator), normalizeEnvValue(line.slice(separator + 1))];
      }),
  );
}

const fileEnv = {
  ...readEnvFile('.env.example'),
  ...readEnvFile('.env.local'),
  ...process.env,
};

const mode = fileEnv.VITE_API_MODE || 'mock';
const authMode = fileEnv.VITE_AUTH_MODE || 'mock';
const supabaseUrl = fileEnv.VITE_SUPABASE_URL || '';
const supabaseKey =
  fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  fileEnv.VITE_SUPABASE_ANON_KEY ||
  '';

const validApiModes = new Set(['mock', 'real']);
const validAuthModes = new Set(['mock', 'supabase']);
const errors = [];

if (!validApiModes.has(mode)) {
  errors.push(`VITE_API_MODE must be one of: ${Array.from(validApiModes).join(', ')}`);
}

if (!validAuthModes.has(authMode)) {
  errors.push(`VITE_AUTH_MODE must be one of: ${Array.from(validAuthModes).join(', ')}`);
}

if ((mode === 'real' || authMode === 'supabase') && (!supabaseUrl || !supabaseKey)) {
  errors.push(
    'Supabase config missing: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
  );
}

if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
  errors.push('VITE_SUPABASE_URL must start with https://.');
}

if (errors.length) {
  console.error('Environment check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const aiMode = fileEnv.VITE_AI_MODE || (process.env.NODE_ENV === 'production' ? 'real' : 'mock');
const vercelEnv = fileEnv.VERCEL_ENV || '';
const requiresPersistentAiQuota = ['production', 'preview'].includes(vercelEnv);
const warnings = [];

if (aiMode === 'real') {
  if (!fileEnv.OPENAI_API_KEY) {
    warnings.push('OPENAI_API_KEY missing: AI requests will fall back to static text.');
  }
  const serverSupabaseUrl = fileEnv.SUPABASE_URL || fileEnv.VITE_SUPABASE_URL;
  if (!serverSupabaseUrl || !fileEnv.SUPABASE_SERVICE_ROLE_KEY) {
    const message = 'SUPABASE_URL or VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY missing: persistent AI quota is required on Vercel preview/production.';
    if (requiresPersistentAiQuota) {
      errors.push(message);
    } else {
      warnings.push(`${message} Local development falls back to in-memory limits.`);
    }
  }
}

if (errors.length) {
  console.error('Environment check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

if (warnings.length) {
  console.warn('Environment warnings:');
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

console.log(`Environment OK: api=${mode}, auth=${authMode}, ai=${aiMode}`);
