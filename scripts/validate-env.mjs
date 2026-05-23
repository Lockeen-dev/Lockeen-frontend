import { existsSync, readFileSync } from 'node:fs';

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
        return [line.slice(0, separator), line.slice(separator + 1)];
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

console.log(`Environment OK: api=${mode}, auth=${authMode}`);
