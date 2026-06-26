import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDir = 'supabase/migrations';

const expectedTables = [
  {
    table: 'profiles',
    ownerColumn: 'id',
    operations: ['select', 'insert', 'update'],
  },
  {
    table: 'subjects',
    ownerColumn: 'user_id',
    operations: ['select', 'insert', 'update', 'delete'],
  },
  {
    table: 'exams',
    ownerColumn: 'user_id',
    operations: ['select', 'insert', 'update', 'delete'],
  },
  {
    table: 'chapters',
    ownerColumn: 'user_id',
    operations: ['select', 'insert', 'update', 'delete'],
    parentChecks: ['public.exams', 'exams.user_id = auth.uid()'],
  },
  {
    table: 'notes',
    ownerColumn: 'user_id',
    operations: ['select', 'insert', 'update', 'delete'],
    parentChecks: ['public.exams', 'public.chapters', 'exams.user_id = auth.uid()', 'chapters.user_id = auth.uid()'],
  },
  {
    table: 'study_materials',
    ownerColumn: 'user_id',
    operations: ['select', 'insert', 'update', 'delete'],
    parentChecks: [
      'public.exams',
      'public.chapters',
      'public.notes',
      'public.study_materials',
      'exams.user_id = auth.uid()',
      'chapters.user_id = auth.uid()',
      'notes.user_id = auth.uid()',
      'study_materials.user_id = auth.uid()',
    ],
  },
  {
    table: 'flashcards',
    ownerColumn: 'user_id',
    operations: ['select', 'insert', 'update', 'delete'],
    parentChecks: [
      'public.exams',
      'public.chapters',
      'public.notes',
      'public.study_materials',
      'exams.user_id = auth.uid()',
      'chapters.user_id = auth.uid()',
      'notes.user_id = auth.uid()',
      'study_materials.user_id = auth.uid()',
    ],
  },
  {
    table: 'quizzes',
    ownerColumn: 'user_id',
    operations: ['select', 'insert', 'update', 'delete'],
    parentChecks: [
      'public.exams',
      'public.chapters',
      'public.notes',
      'public.study_materials',
      'exams.user_id = auth.uid()',
      'chapters.user_id = auth.uid()',
      'notes.user_id = auth.uid()',
      'study_materials.user_id = auth.uid()',
    ],
  },
  {
    table: 'quiz_questions',
    ownerColumn: 'user_id',
    operations: ['select', 'insert', 'update', 'delete'],
    parentChecks: ['public.quizzes', 'quizzes.user_id = auth.uid()'],
  },
  {
    table: 'quiz_attempts',
    ownerColumn: 'user_id',
    operations: ['select', 'insert'],
    parentChecks: ['public.quizzes', 'quizzes.user_id = auth.uid()'],
  },
  {
    table: 'flashcard_reviews',
    ownerColumn: 'user_id',
    operations: ['select', 'insert'],
    parentChecks: [
      'public.exams',
      'public.chapters',
      'public.notes',
      'public.study_materials',
      'exams.user_id = auth.uid()',
      'chapters.user_id = auth.uid()',
      'notes.user_id = auth.uid()',
      'study_materials.user_id = auth.uid()',
    ],
  },
  {
    table: 'study_sessions',
    ownerColumn: 'user_id',
    operations: ['select', 'insert', 'update', 'delete'],
  },
  {
    table: 'tutor_sessions',
    ownerColumn: 'user_id',
    operations: ['select', 'insert', 'update', 'delete'],
  },
  {
    table: 'tutor_folders',
    ownerColumn: 'user_id',
    operations: ['select', 'insert', 'update', 'delete'],
  },
  {
    table: 'ai_usage',
    ownerColumn: 'user_id',
    operations: ['select'],
  },
  {
    table: 'user_plan_usage',
    ownerColumn: 'user_id',
    operations: ['select'],
  },
  {
    table: 'study_plans',
    ownerColumn: 'user_id',
    operations: ['select', 'insert', 'update', 'delete'],
  },
  {
    table: 'study_plan_items',
    ownerColumn: 'user_id',
    operations: ['select', 'insert', 'update', 'delete'],
    parentChecks: [
      'public.study_plans',
      'public.exams',
      'public.chapters',
      'public.study_materials',
      'study_plans.user_id = auth.uid()',
      'exams.user_id = auth.uid()',
      'chapters.user_id = auth.uid()',
      'study_materials.user_id = auth.uid()',
    ],
  },
];

const storageChecks = [
  'study-materials',
  'storage.objects',
  "bucket_id = 'study-materials'",
  'auth.uid()::text',
  'study materials select own',
  'study materials insert own',
  'study materials update own',
  'study materials delete own',
];

const functionChecks = [
  'function public.increment_ai_usage',
  'on conflict (user_id, usage_date) do update',
  'auth.uid() <> p_user_id',
  'revoke all on function public.increment_ai_usage(uuid, date, integer) from public',
  'revoke all on function public.increment_ai_usage(uuid, date, integer) from anon',
  'revoke all on function public.increment_ai_usage(uuid, date, integer) from authenticated',
  'grant execute on function public.increment_ai_usage(uuid, date, integer)',
  'function private.enforce_free_document_trial',
  'trigger enforce_free_document_trial',
  'documents_uploaded_total',
  'free trial document already used',
];

function readMigrations() {
  if (!existsSync(migrationsDir)) {
    return '';
  }

  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(join(migrationsDir, file), 'utf8'))
    .join('\n')
    .toLowerCase();
}

function assertContains(haystack, needle, label, errors) {
  if (!haystack.includes(needle.toLowerCase())) {
    errors.push(`${label}: missing "${needle}"`);
  }
}

function checkTable(sql, config, errors) {
  const { table, ownerColumn, operations, parentChecks = [] } = config;

  assertContains(sql, `alter table public.${table} enable row level security`, `${table} RLS`, errors);

  if (ownerColumn === 'user_id') {
    assertContains(sql, `${table}_user_id_idx`, `${table} owner index`, errors);
  }

  for (const operation of operations) {
    assertContains(sql, `policy "${table} ${operation} own"`, `${table} ${operation} policy`, errors);
  }

  assertContains(sql, `${ownerColumn} = auth.uid()`, `${table} owner check`, errors);

  for (const parentCheck of parentChecks) {
    assertContains(sql, parentCheck, `${table} parent ownership`, errors);
  }
}

const sql = readMigrations();
const errors = [];

if (!sql) {
  errors.push('No Supabase migrations found.');
}

for (const tableConfig of expectedTables) {
  checkTable(sql, tableConfig, errors);
}

for (const check of storageChecks) {
  assertContains(sql, check, 'storage policy', errors);
}

for (const check of functionChecks) {
  assertContains(sql, check, 'AI usage function', errors);
}

if (errors.length) {
  console.error('RLS baseline check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`RLS baseline OK: ${expectedTables.length} user tables and study-materials storage policy checked.`);
