import fs from 'node:fs';

const api = fs.readFileSync('api/generate-practice.js', 'utf8');
const notesView = fs.readFileSync('src/components/NotesView.jsx', 'utf8');
const flashcardsView = fs.readFileSync('src/components/Flashcards.jsx', 'utf8');
const flashcardsService = fs.readFileSync('src/services/flashcards.js', 'utf8');
const practiceService = fs.readFileSync('src/services/practiceGeneration.js', 'utf8');
const browserOpenAIEnvPattern = new RegExp('VITE_' + 'OPENAI');

const checks = [
  {
    label: 'flashcard endpoint uses OpenAI Responses API server-side only',
    ok: /https:\/\/api\.openai\.com\/v1\/responses/.test(api) &&
      /process\.env\.OPENAI_API_KEY/.test(api) &&
      !browserOpenAIEnvPattern.test(api + practiceService),
  },
  {
    label: 'flashcard prompt is source-grounded and language-aware',
    ok: [
      'Use only the supplied source. Do not invent facts.',
      'Write in the dominant language of the supplied source.',
      'Do not mix languages.',
      'Create premium flashcards from real concepts in the supplied source.',
    ].every((text) => api.includes(text)),
  },
  {
    label: 'flashcard prompt bans layout, file and page references',
    ok: [
      'Never mention the PDF, file name, source name, page number, chapter number, index, table of contents, headings, layout, section number, or study points.',
      'sourceSnippet must be a short content snippet proving the answer, not a layout/header/page reference.',
    ].every((text) => api.includes(text)),
  },
  {
    label: 'flashcard prompt asks for atomic active-recall cards',
    ok: [
      'One atomic idea per card.',
      'front must be a short active-recall prompt or named concept',
      'Avoid generic fronts like',
      'definitions, key concepts, comparisons, examples, applications, formulas, and common misconceptions',
    ].every((text) => api.includes(text)),
  },
  {
    label: 'server quality rejects bad flashcards',
    ok: [
      'flashcardQualityNotes',
      'missing_front',
      'missing_back',
      'front_too_short',
      'back_too_short',
      'layout_or_source_reference',
      'generic_front',
      'front_equals_back',
      'front_repeated_in_back',
      'validationStatus',
    ].every((text) => api.includes(text)),
  },
  {
    label: 'server dedupes generated flashcards',
    ok: /function normalizeFlashcards/.test(api) &&
      /const seen = new Set/.test(api) &&
      /seen\.has\(card\._key\)/.test(api),
  },
  {
    label: 'client generation requires authenticated Supabase session',
    ok: /supabase\.auth\.getSession/.test(practiceService) &&
      /Authorization: `Bearer \$\{token\}`/.test(practiceService) &&
      /AUTH_REQUIRED/.test(practiceService),
  },
  {
    label: 'notes pipeline creates flashcards from ready extracted material',
    ok: /function estimateFlashcardPlan/.test(notesView) &&
      /async function buildFlashcardBankCards/.test(notesView) &&
      /material\.processingStatus !== 'ready'/.test(notesView) &&
      /!material\.extractedText/.test(notesView),
  },
  {
    label: 'notes pipeline stores generated flashcards with exam/chapter/material links',
    ok: /async function createFlashcardBankForMaterial/.test(notesView) &&
      /sourceMaterialId: material\.id/.test(notesView) &&
      /examId,\s*chapterId,\s*noteId,\s*sourceMaterialId: material\.id,\s*front: card\.front,\s*back: card\.back/s.test(notesView),
  },
  {
    label: 'notes pipeline reuses good existing material flashcards',
    ok: /listFlashcards\(\{ examId,[\s\S]+sourceMaterialId: material\.id \}\)/.test(notesView) &&
      /reuseThreshold/.test(notesView) &&
      /existingCards\.length >= reuseThreshold/.test(notesView),
  },
  {
    label: 'notes pipeline rejects generic, broken, duplicate flashcards',
    ok: [
      'function isPlayableFlashcard',
      'isGenericFlashcardFront',
      'hasBadFlashcardReference',
      'hasBrokenFlashcardText',
      'function dedupeFlashcards',
      'frontSeen',
    ].every((text) => notesView.includes(text)),
  },
  {
    label: 'flashcard service persists sourceMaterialId and owner scope',
    ok: /source_material_id: input\.sourceMaterialId/.test(flashcardsService) &&
      /\.eq\('user_id', userResult\.data\)/.test(flashcardsService) &&
      /query\.eq\('source_material_id', filters\.sourceMaterialId\)/.test(flashcardsService),
  },
  {
    label: 'flashcard UI filters unusable cards before practice',
    ok: [
      'function isPlayableFlashcard',
      'isGenericFlashcardFront',
      'hasBadFlashcardReference',
      'hasBrokenFlashcardText',
      '.filter(isPlayableFlashcard)',
    ].every((text) => flashcardsView.includes(text)),
  },
  {
    label: 'flashcard UI keeps selected exam/chapter context',
    ok: /selectedExamId/.test(flashcardsView) &&
      /selectedChapterId/.test(flashcardsView) &&
      /deck\?\._practiceConfig/.test(flashcardsView) &&
      /sourceMaterialId/.test(flashcardsView),
  },
];

const failed = checks.filter((check) => !check.ok);

if (failed.length) {
  console.error('Flashcard generation contract check failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`Flashcard generation contract check OK: ${checks.length} contracts checked.`);
