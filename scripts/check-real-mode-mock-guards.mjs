import { readFileSync } from 'node:fs';

const guardedFiles = [
  'src/services/flashcards.js',
  'src/services/materials.js',
  'src/services/notes.js',
  'src/services/quiz.js',
];

const errors = [];

for (const file of guardedFiles) {
  const source = readFileSync(file, 'utf8');
  const hasMockData = source.includes("from '../data/mockData'");
  const hasParentGuard = /function\s+hasKnownMockParent\s*\([^)]*\)\s*\{\s*if\s*\(!isMockMode\(\)\)\s*return\s+true;/s.test(source);

  if (hasMockData && !hasParentGuard) {
    errors.push(`${file}: hasKnownMockParent must bypass mock seed validation outside mock mode.`);
  }
}

if (errors.length) {
  console.error('Real-mode mock guard check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Real-mode mock guard check OK: mock parent validation is mock-mode only.');
