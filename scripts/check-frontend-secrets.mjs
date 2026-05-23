import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const blockedTrackedFiles = [
  /^\.env$/,
  /^\.env\.(?!example$)/,
  /(^|\/)\.env$/,
  /(^|\/)\.env\.(?!example$)/,
];

const blockedContentPatterns = [
  { pattern: /SUPABASE_SERVICE_ROLE_KEY\s*=/i, label: 'Supabase service-role env key' },
  { pattern: /VITE_SUPABASE_SERVICE_ROLE/i, label: 'service-role key exposed through Vite env' },
  { pattern: /OPENAI_API_KEY\s*=/i, label: 'OpenAI server key value in tracked file' },
  { pattern: /VITE_OPENAI/i, label: 'OpenAI key exposed through Vite env' },
  { pattern: /service_role/i, label: 'Supabase service-role reference' },
];

const allowedContentFiles = new Set([
  '.env.example',
  'scripts/check-frontend-secrets.mjs',
  'docs/security/ai-baseline.md',
  'docs/security/week2-security-baseline.md',
  'docs/setup/week2-environment.md',
  'docs/release/week3-handoff.md',
  'docs/release/week3-beta-preview-checklist.md',
  'docs/openai.md',
]);

function trackedFiles() {
  return execFileSync('git', ['ls-files'], { encoding: 'utf8' })
    .split('\n')
    .map((file) => file.trim())
    .filter(Boolean);
}

const errors = [];

for (const file of trackedFiles()) {
  if (blockedTrackedFiles.some((pattern) => pattern.test(file))) {
    errors.push(`Tracked env file is not allowed: ${file}`);
    continue;
  }

  if (allowedContentFiles.has(file)) {
    continue;
  }

  const content = readFileSync(file, 'utf8');

  for (const { pattern, label } of blockedContentPatterns) {
    if (pattern.test(content)) {
      errors.push(`${label} found in tracked file: ${file}`);
    }
  }
}

if (errors.length) {
  console.error('Frontend secret check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Frontend secret check OK: no tracked env files or forbidden frontend secret patterns found.');
