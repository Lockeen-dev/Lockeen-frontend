import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260625170000_tutor_folders.sql', 'utf8');
const service = fs.readFileSync('src/services/tutorSessions.js', 'utf8');
const tutorView = fs.readFileSync('src/components/TutorView.jsx', 'utf8');
const aiApi = fs.readFileSync('api/ai-study-assist.js', 'utf8');
const aiService = fs.readFileSync('src/services/ai.js', 'utf8');
const dashboardShell = fs.readFileSync('src/components/DashboardShell.jsx', 'utf8');
const dashboard = fs.readFileSync('src/components/Dashboard.jsx', 'utf8');

const checks = [
  {
    label: 'tutor_folders table exists',
    ok: /create table if not exists public\.tutor_folders/i.test(migration),
  },
  {
    label: 'tutor_folders has RLS enabled',
    ok: /alter table public\.tutor_folders enable row level security/i.test(migration),
  },
  {
    label: 'tutor_folders grants authenticated CRUD',
    ok: /grant select, insert, update, delete on public\.tutor_folders to authenticated/i.test(migration),
  },
  {
    label: 'tutor_folders are scoped by owner policies',
    ok: ['select', 'insert', 'update', 'delete'].every((action) => migration.includes(`tutor_folders ${action} own`)),
  },
  {
    label: 'folder names are unique per user',
    ok: /tutor_folders_user_name_unique_idx[\s\S]+user_id,\s*lower\(trim\(name\)\)/i.test(migration),
  },
  {
    label: 'sessions cannot link folders from another user',
    ok: /foreign key \(folder_id,\s*user_id\)[\s\S]+references public\.tutor_folders\(id,\s*user_id\)/i.test(migration),
  },
  {
    label: 'folder delete keeps session owner intact',
    ok: /on delete set null \(folder_id\)/i.test(migration),
  },
  {
    label: 'tutor service exposes folder CRUD',
    ok: [
      'listTutorFolders',
      'createTutorFolder',
      'updateTutorFolder',
      'deleteTutorFolder',
    ].every((name) => service.includes(`export async function ${name}`)),
  },
  {
    label: 'mock folders reject duplicate names',
    ok: /DUPLICATE_FOLDER/.test(service),
  },
  {
    label: 'folder names are normalized and blank names are rejected',
    ok: /function normalizeFolderName/.test(service) &&
      /trim\(\)/.test(service) &&
      /Folder name is required\./.test(service) &&
      /VALIDATION_ERROR/.test(service),
  },
  {
    label: 'AI request receives tutor style',
    ok: /tutorStyle/.test(aiApi) && /getTutorStyleInstruction/.test(aiApi),
  },
  {
    label: 'AI request receives real study context',
    ok: /studyContext/.test(aiApi) && /instead of inventing facts/.test(aiApi),
  },
  {
    label: 'Tutor UI binds generation to originating session',
    ok: /activeIdRef/.test(tutorView) && /typingSessionId/.test(tutorView) && /history:\s*userMsgs\.slice\(-8\)/.test(tutorView),
  },
  {
    label: 'Tutor language changes do not reload chat sessions',
    ok: /\}, \[user\?\.id,\s*user\?\.email\]\);/.test(tutorView) &&
      /localizedWelcome/.test(tutorView),
  },
  {
    label: 'Tutor UI supports folders and duplicate-folder feedback',
    ok: /moveActiveSessionToFolder/.test(tutorView) && /isDuplicateFolderError/.test(tutorView),
  },
  {
    label: 'Tutor sessions are sorted immediately after updates',
    ok: /function sortTutorSessions/.test(tutorView) &&
      /sortTutorSessions\(prev\.map/.test(tutorView) &&
      /Boolean\(a\?\.pinned\)/.test(tutorView),
  },
  {
    label: 'Tutor UI supports copy, stop, pin, rename and delete',
    ok: ['copyMessage', 'stopGeneration', 'togglePinned', 'confirmRenameSession', 'confirmDeleteSession'].every((name) => tutorView.includes(name)),
  },
  {
    label: 'Tutor stop aborts the active AI request',
    ok: /generationAbortRef/.test(tutorView) && /signal:\s*abortController\.signal/.test(tutorView) && /externalSignal/.test(aiService),
  },
  {
    label: 'Tutor can stop a response running in another chat',
    ok: /typing && !activeTyping/.test(tutorView) &&
      /backgroundTypingNotice/.test(tutorView) &&
      /\{typing \? \(/.test(tutorView),
  },
  {
    label: 'Tutor labels local fallback responses',
    ok: /fallbackBadge/.test(tutorView) && /Risposta demo locale/.test(tutorView) && /Local demo response/.test(tutorView),
  },
  {
    label: 'Tutor composer and folder controls are accessible',
    ok: /aria-label=\{tt\(lang, 'askAnything'\)\}/.test(tutorView) &&
      /aria-label=\{lang === 'it' \? 'Cerca nelle chat' : 'Search chats'\}/.test(tutorView) &&
      /aria-label=\{lang === 'it' \? 'Cartella della chat' : 'Chat folder'\}/.test(tutorView) &&
      /role="alert"/.test(tutorView),
  },
  {
    label: 'Tutor supports keyboard dismiss for panels and modals',
    ok: /event\.key !== 'Escape'/.test(tutorView) &&
      /setRenameTarget\(null\)/.test(tutorView) &&
      /setFolderRenameTarget\(null\)/.test(tutorView) &&
      /setHistoryOpen\(false\)/.test(tutorView),
  },
  {
    label: 'Tutor returns focus to composer after navigation',
    ok: /const focusComposer/.test(tutorView) &&
      /inputRef\.current\?\.focus\(\)/.test(tutorView) &&
      /focusComposer\(\);/.test(tutorView),
  },
  {
    label: 'Tutor composer uses real touch-sized controls',
    ok: (/style=\{tutorS\.attachBtn\}/.test(tutorView) || /style=\{isHero \? tutorS\.heroAttachBtn : tutorS\.attachBtn\}/.test(tutorView)) &&
      /attachBtn:[\s\S]+width:\s*44[\s\S]+height:\s*44/.test(tutorView) &&
      /sendBtn:[\s\S]+width:\s*46[\s\S]+height:\s*46/.test(tutorView) &&
      /heroAttachBtn:[\s\S]+width:\s*4[04][\s\S]+height:\s*4[04]/.test(tutorView) &&
      /heroSendBtn:[\s\S]+width:\s*4[04][\s\S]+height:\s*4[04]/.test(tutorView),
  },
  {
    label: 'Tutor secondary controls are touch-friendly',
    ok: /removeAttachmentBtn:[\s\S]+width:\s*36[\s\S]+height:\s*36/.test(tutorView) &&
      /historyIconBtn:[\s\S]+width:\s*36[\s\S]+height:\s*36/.test(tutorView) &&
      /folderAddBtn:[\s\S]+width:\s*44[\s\S]+height:\s*44/.test(tutorView) &&
      /folderActionBtn:[\s\S]+width:\s*44[\s\S]+height:\s*44/.test(tutorView) &&
      /messageActionBtn:[\s\S]+minHeight:\s*36/.test(tutorView) &&
      /mobileHistoryBtn:[\s\S]+minHeight:\s*44/.test(tutorView) &&
      /modalGhostBtn:[\s\S]+height:\s*44/.test(tutorView) &&
      /modalPrimaryBtn:[\s\S]+height:\s*44/.test(tutorView),
  },
  {
    label: 'Tutor behaves as a fixed chat surface',
    ok: /const tutorLocked = tab === 'tutor'/.test(dashboardShell) &&
      /calc\(100dvh - 150px\)/.test(dashboardShell) &&
      /overflow:\s*'hidden'/.test(dashboardShell) &&
      /tab !== 'tutor' && <StudyTimer/.test(dashboard) &&
      /thread:[\s\S]+overflowY:\s*'auto'/.test(tutorView) &&
      /composerDock:[\s\S]+flexShrink:\s*0/.test(tutorView),
  },
  {
    label: 'Tutor exposes stable QA anchors',
    ok: [
      'tutor-root',
      'tutor-history',
      'tutor-folders',
      'tutor-chat-pane',
      'tutor-chat-header',
      'tutor-thread',
      'tutor-composer-dock',
      'tutor-composer',
    ].every((testId) => tutorView.includes(`data-testid="${testId}"`)),
  },
  {
    label: 'Tutor mobile history has a visible close control',
    ok: /mobileHistoryHead/.test(tutorView) &&
      /mobileHistoryCloseBtn/.test(tutorView) &&
      /aria-label=\{lang === 'it' \? 'Chiudi cronologia chat' : 'Close chat history'\}/.test(tutorView),
  },
];

const failed = checks.filter((check) => !check.ok);

if (failed.length) {
  console.error('Tutor contract check failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`Tutor contract check OK: ${checks.length} contracts checked.`);
