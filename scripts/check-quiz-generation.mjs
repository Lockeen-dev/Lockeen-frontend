import fs from 'node:fs';

const api = fs.readFileSync('api/generate-practice.js', 'utf8');
const notesView = fs.readFileSync('src/components/NotesView.jsx', 'utf8');
const quizView = fs.readFileSync('src/components/Quiz.jsx', 'utf8');
const quizService = fs.readFileSync('src/services/quiz.js', 'utf8');
const quizPipeline = fs.readFileSync('src/services/quizPipeline.js', 'utf8');
const practiceService = fs.readFileSync('src/services/practiceGeneration.js', 'utf8');
const browserOpenAIEnvPattern = new RegExp('VITE_' + 'OPENAI');

const checks = [
  {
    label: 'quiz endpoint uses OpenAI Responses API server-side only',
    ok: /https:\/\/api\.openai\.com\/v1\/responses/.test(api) &&
      /process\.env\.OPENAI_API_KEY/.test(api) &&
      !browserOpenAIEnvPattern.test(api + practiceService),
  },
  {
    label: 'quiz generation requires authenticated Supabase session',
    ok: /async function requireAuthenticatedUser/.test(api) &&
      /AUTH_REQUIRED/.test(api) &&
      /supabase\.auth\.getSession/.test(practiceService) &&
      /Authorization: `Bearer \$\{token\}`/.test(practiceService),
  },
  {
    label: 'quiz prompt is source-grounded and language-aware',
    ok: [
      'Use only the supplied source text. Do not invent facts.',
      'First identify the real concepts in the source.',
      'Write in the dominant language of the supplied source.',
      'Do not mix languages.',
    ].every((text) => api.includes(text)),
  },
  {
    label: 'quiz prompt bans layout, file and page references',
    ok: [
      'Never ask about the PDF, file name, source name, page number, chapter number, index, table of contents, headings, layout, or study points.',
      'sourceChunk must be a short content snippet that proves the answer. It must not be a layout/header/page reference.',
    ].every((text) => api.includes(text)),
  },
  {
    label: 'quiz prompt asks for specific useful question stems',
    ok: [
      'A question must name the specific concept being tested.',
      'Good stems ask for definition, implication, application, comparison, causal relation, or common misconception.',
      'Exactly one answer must be clearly correct.',
      'Avoid double negatives and avoid "which is NOT".',
    ].every((text) => api.includes(text)),
  },
  {
    label: 'quiz prompt requires balanced plausible options',
    ok: [
      'All four options must have similar length and grammatical shape.',
      'Distractors must be plausible misconceptions from the same concept area',
      'Keep all options equally specific',
      'correct option must stay close to the median option length',
    ].every((text) => api.includes(text)),
  },
  {
    label: 'server quality rejects broken or weak quiz questions',
    ok: [
      'function qualityNotes',
      'missing_question',
      'wrong_option_count',
      'duplicate_options',
      'invalid_correct_index',
      'layout_reference',
      'source_name_reference',
      'truncated_text',
      'fragment_option',
      'generic_question',
      'unbalanced_options',
      'correct_length_bias',
      'obvious_distractor_bias',
      'weak_explanation',
      'missing_topic',
      'validationStatus',
    ].every((text) => api.includes(text)),
  },
  {
    label: 'server normalizes, validates and dedupes generated quiz questions',
    ok: /function normalizeQuizQuestions/.test(api) &&
      /const seen = new Set/.test(api) &&
      /seen\.has\(question\._key\)/.test(api) &&
      /validationStatus !== 'valid'/.test(api),
  },
  {
    label: 'notes pipeline creates quiz banks from ready extracted material',
    ok: /async function buildQuestionBankQuestions/.test(notesView) &&
      /generatePracticeFromText\(\{\s*[\s\S]*kind: 'quiz'/.test(notesView) &&
      /material\.processingStatus !== 'ready'/.test(notesView) &&
      /!material\.extractedText/.test(notesView),
  },
  {
    label: 'notes pipeline stores generated quizzes with exam/chapter/material links',
    ok: /async function createQuestionBankForMaterial/.test(notesView) &&
      /sourceMaterialId: material\.id/.test(notesView) &&
      /createQuiz\(\{\s*[\s\S]*examId,\s*[\s\S]*chapterId,\s*[\s\S]*noteId,\s*[\s\S]*sourceMaterialId: material\.id,\s*[\s\S]*questions,/m.test(notesView),
  },
  {
    label: 'notes pipeline reuses only complete material-generated quizzes',
    ok: /listQuizzes\(\{ examId,[\s\S]+sourceMaterialId: material\.id \}\)/.test(notesView) &&
      /reuseThreshold/.test(notesView) &&
      /generationRunId && question\.conceptKey && question\.sourceSnippet/.test(notesView) &&
      /isFallbackPracticeQuestion/.test(notesView),
  },
  {
    label: 'quiz pipeline tracks generation runs, chunks and concepts',
    ok: [
      'createQuizGenerationRun',
      'completeQuizGenerationRun',
      'replaceMaterialChunks',
      'insertMaterialConcepts',
      'source_material_id: input.sourceMaterialId',
    ].every((text) => quizPipeline.includes(text)) &&
      /completeQuizGenerationRun\(runId,[\s\S]+generatedCount:[\s\S]+validCount:/m.test(notesView),
  },
  {
    label: 'quiz service persists quality metadata and owner scope',
    ok: [
      'source_material_id: input.sourceMaterialId',
      'source_material_id: question.sourceMaterialId',
      'quality_score: question.qualityScore',
      'generation_run_id: question.generationRunId',
      'validation_status: question.validationStatus',
      'validation_notes: question.validationNotes',
      ".eq('user_id', userResult.data)",
    ].every((text) => quizService.includes(text)),
  },
  {
    label: 'quiz service preserves correct answer when shuffling options',
    ok: /function shuffleQuestionOptions/.test(quizService) &&
      /correct: index === correct/.test(quizService) &&
      /const nextCorrect = Math\.max\(0, entries\.findIndex/.test(quizService) &&
      /correctAnswer: String\(nextCorrect\)/.test(quizService),
  },
  {
    label: 'quiz UI filters unusable generated questions before practice',
    ok: [
      'function isPlayableQuestion',
      'isFallbackPracticeQuestion',
      'isGenericPrompt',
      'hasCorrectLengthBias',
      'hasObviousDistractorBias',
      'hasLayoutReference',
      'hasTruncatedText',
      '.filter(isPlayableQuestion)',
    ].every((text) => quizView.includes(text)),
  },
  {
    label: 'quiz UI keeps selected exam/chapter/material context',
    ok: /selectedExamId/.test(quizView) &&
      /selectedChapterId/.test(quizView) &&
      /deck\?\._practiceConfig/.test(quizView) &&
      /sourceMaterialId/.test(quizView) &&
      /requireMaterialQuiz/.test(quizView),
  },
];

const failed = checks.filter((check) => !check.ok);

if (failed.length) {
  console.error('Quiz generation contract check failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`Quiz generation contract check OK: ${checks.length} contracts checked.`);
