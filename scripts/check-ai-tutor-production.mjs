import fs from 'node:fs';

const aiApi = fs.readFileSync('api/ai-study-assist.js', 'utf8');
const usageApi = fs.readFileSync('api/ai-usage-status.js', 'utf8');
const aiService = fs.readFileSync('src/services/ai.js', 'utf8');
const tutorView = fs.readFileSync('src/components/TutorView.jsx', 'utf8');
const envExample = fs.readFileSync('.env.example', 'utf8');

const browserOpenAIEnvPattern = new RegExp('VITE_' + 'OPENAI');
const serviceRoleEnvName = 'SUPABASE_' + 'SERVICE_' + 'ROLE_' + 'KEY';
const serviceRoleMissingCode = 'SUPABASE_' + 'SERVICE_' + 'ROLE_' + 'MISSING';

const checks = [
  {
    label: 'AI Tutor calls OpenAI only from the server route',
    ok: /https:\/\/api\.openai\.com\/v1\/responses/.test(aiApi) &&
      /process\.env\.OPENAI_API_KEY/.test(aiApi) &&
      !browserOpenAIEnvPattern.test(aiApi + aiService + tutorView),
  },
  {
    label: 'AI Tutor model is server-configurable with GPT-4.1 mini default',
    ok: /const DEFAULT_MODEL = 'gpt-4\.1-mini'/.test(aiApi) &&
      /model:\s*process\.env\.OPENAI_MODEL \|\| DEFAULT_MODEL/.test(aiApi) &&
      /OPENAI_MODEL=gpt-4\.1-mini/.test(envExample),
  },
  {
    label: 'real AI mode requires a logged-in Supabase session',
    ok: /const AI_MODE = import\.meta\.env\.VITE_AI_MODE \|\| \(import\.meta\.env\.PROD \? 'real' : 'mock'\)/.test(aiService) &&
      /supabase\.auth\.getSession\(\)/.test(aiService) &&
      /Authorization: `Bearer \$\{token\}`/.test(aiService) &&
      /AI requests require an authenticated Supabase session/.test(aiService),
  },
  {
    label: 'server route validates Supabase auth before provider call',
    ok: /async function requireAuthenticatedUser/.test(aiApi) &&
      /client\.auth\.getUser\(token\)/.test(aiApi) &&
      /AUTH_REQUIRED/.test(aiApi) &&
      /const authResult = await requireAuthenticatedUser\(req\)/.test(aiApi) &&
      /const result = await callOpenAI/.test(aiApi),
  },
  {
    label: 'preview and production require persistent quota storage',
    ok: /function requiresPersistentQuota/.test(aiApi) &&
      /\['production', 'preview'\]\.includes\(process\.env\.VERCEL_ENV \|\| ''\)/.test(aiApi) &&
      aiApi.includes(serviceRoleEnvName) &&
      /AI_QUOTA_UNAVAILABLE/.test(aiApi),
  },
  {
    label: 'AI usage endpoint is authenticated and reads persistent quota',
    ok: /requireAuthenticatedUser\(req, 'AI usage'\)/.test(usageApi) &&
      /getSupabaseAdmin/.test(usageApi) &&
      /\.from\('ai_usage'\)/.test(usageApi) &&
      usageApi.includes(serviceRoleMissingCode),
  },
  {
    label: 'Tutor request sends real study context and recent chat history',
    ok: /function buildTutorStudyContext/.test(tutorView) &&
      /textSnippet:\s*clipTutorContext\(material\.extractedText,\s*1100\)/.test(tutorView) &&
      /studyContext,/.test(tutorView) &&
      /history:\s*userMsgs\.slice\(-8\)/.test(tutorView) &&
      /askTutor\(\{/.test(tutorView),
  },
  {
    label: 'Tutor prompt is grounded and refuses to invent missing context',
    ok: [
      'studyContext contains the student’s real Lockeen exams, chapters, notes, and material snippets.',
      'Use it as the primary source when relevant.',
      'If studyContext is missing, empty, or insufficient, say what information you need instead of inventing facts.',
      'If an attachment is metadata_only, say you can use filename context only; do not pretend to read it.',
    ].every((text) => aiApi.includes(text)),
  },
  {
    label: 'Tutor personas affect both UI and backend prompt',
    ok: /const TUTOR_STYLES/.test(tutorView) &&
      /expert/.test(tutorView) &&
      /socratic/.test(tutorView) &&
      /exam/.test(tutorView) &&
      /tutorStyle,/.test(tutorView) &&
      /function getTutorStyleInstruction/.test(aiApi) &&
      /Socratic coach/.test(aiApi) &&
      /exam coach/.test(aiApi),
  },
  {
    label: 'attachments are bounded and image-aware',
    ok: /const MAX_ATTACHMENT_TEXT_CHARS = 12000/.test(aiApi) &&
      /const MAX_INLINE_IMAGES = 3/.test(aiApi) &&
      /normalizeTutorAttachments/.test(aiApi) &&
      /input_image/.test(aiApi) &&
      /metadata_only/.test(aiApi),
  },
  {
    label: 'real provider failures surface as user-visible errors',
    ok: /AI_PROVIDER_UNAVAILABLE/.test(aiApi) &&
      /AI_PROVIDER_QUOTA_EXCEEDED/.test(aiApi) &&
      /AI_PROVIDER_EMPTY_RESPONSE/.test(aiApi) &&
      /AI_PROVIDER_TIMEOUT/.test(aiService) &&
      /formatAiError/.test(tutorView) &&
      /aiProviderUnavailable/.test(tutorView),
  },
  {
    label: 'local mock responses are visibly labelled and never hidden',
    ok: /AI_MODE !== 'real'/.test(aiService) &&
      /provider: 'mock'/.test(aiService) &&
      /fallback: true/.test(aiService) &&
      /fallbackBadge/.test(tutorView) &&
      /Risposta demo locale/.test(tutorView),
  },
];

const failed = checks.filter((check) => !check.ok);

if (failed.length) {
  console.error('AI Tutor production check failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`AI Tutor production check OK: ${checks.length} contracts checked.`);
