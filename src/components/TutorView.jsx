import { useEffect, useRef, useState } from 'react';
import { Brain, CheckCircle, Copy, FileText, MsgCircle, Paperclip, Pencil, Pin, Plus, Search, Send, SidebarPanel, Sparkles, Stop, Trash2, XMark } from '../lib/icons';
import useIsMobile from '../lib/useIsMobile';
import { askTutor, getAiTutorUsage } from '../services/ai';
import { listExams } from '../services/exams';
import { extractTextFromFile, listMaterials } from '../services/materials';
import { listNotes } from '../services/notes';
import {
  createTutorFolder,
  createTutorSession,
  deleteTutorFolder,
  deleteTutorSession,
  listTutorFolders,
  listTutorSessions,
  updateTutorFolder,
  updateTutorSession,
} from '../services/tutorSessions';
import { tt } from '../lib/i18n';
import { formatLimit, getPlanLimits, isFreePlan } from '../lib/planLimits';

/* ===================== AI TUTOR ===================== */
const UNTITLED_SESSION_TITLES = new Set(['New conversation', 'Nuova conversazione']);
const TUTOR_STYLES = [
  {
    id: 'expert',
    label: { en: 'Prof. Marco', it: 'Prof. Marco' },
    short: { en: 'Expert', it: 'Esperto' },
    subtitle: { en: 'Rigorous explanations', it: 'Spiegazioni rigorose' },
  },
  {
    id: 'socratic',
    label: { en: 'Sofia', it: 'Sofia' },
    short: { en: 'Socratic', it: 'Socratica' },
    subtitle: { en: 'Hints and questions', it: 'Indizi e domande' },
  },
  {
    id: 'exam',
    label: { en: 'Exam Coach', it: 'Coach esami' },
    short: { en: 'Exam', it: 'Esame' },
    subtitle: { en: 'Points-first answers', it: 'Risposte da voto' },
  },
];

function initialTutorMsgs(lang = 'en') {
  return [{ who: 'ai', text: tt(lang, 'tutorWelcome') }];
}

function isTutorWelcomeText(text) {
  const normalized = String(text || '').trim();
  return normalized === tt('en', 'tutorWelcome') || normalized === tt('it', 'tutorWelcome');
}

function isUntitledSessionTitle(title) {
  return !title || UNTITLED_SESSION_TITLES.has(String(title).trim());
}

function sortTutorSessions(sessions = []) {
  return [...sessions].sort((a, b) => {
    if (Boolean(a?.pinned) !== Boolean(b?.pinned)) return a?.pinned ? -1 : 1;
    const aDate = String(a?.updatedAt || a?.createdAt || '');
    const bDate = String(b?.updatedAt || b?.createdAt || '');
    return bDate.localeCompare(aDate);
  });
}

function getFirstName(user) {
  const raw = String(user?.name || user?.email?.split('@')?.[0] || '').trim();
  if (!raw) return 'Alex';
  return raw.split(/\s+/)[0] || raw;
}

function getTutorFolderStorageKey(user) {
  return `lockeen:tutor-folders:${user?.id || user?.email || 'guest'}`;
}

function getTutorStyleStorageKey(user) {
  return `lockeen:tutor-style:${user?.id || user?.email || 'guest'}`;
}

function getTutorLastSessionStorageKey(user) {
  return `lockeen:tutor-last-session:${user?.id || user?.email || 'guest'}`;
}

function clipTutorContext(text = '', max = 900) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function buildTutorStudyContext({ exams = [], materials = [], notes = [] } = {}) {
  const activeExams = (exams || []).filter(exam => exam?.status !== 'archived');
  const readyMaterials = (materials || []).filter(material => material?.status !== 'archived');
  const activeNotes = (notes || []).filter(note => note?.status !== 'archived');

  return {
    totals: {
      exams: activeExams.length,
      chapters: activeExams.reduce((sum, exam) => sum + (exam.chapters?.length || 0), 0),
      materials: readyMaterials.length,
      notes: activeNotes.length,
    },
    exams: activeExams.slice(0, 8).map(exam => ({
      id: exam.id,
      name: exam.name,
      subject: exam.subject || null,
      date: exam.date || null,
      targetGrade: exam.targetGrade || null,
      chapters: (exam.chapters || []).slice(0, 10).map(chapter => ({
        id: chapter.id,
        title: chapter.title,
        description: clipTutorContext(chapter.description, 220) || null,
      })),
    })),
    materials: readyMaterials
      .slice()
      .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
      .slice(0, 8)
      .map(material => ({
        id: material.id,
        title: material.title,
        examId: material.examId || null,
        chapterId: material.chapterId || null,
        processingStatus: material.processingStatus || material.status || null,
        textSnippet: clipTutorContext(material.extractedText, 1100) || null,
      })),
    notes: activeNotes
      .slice(0, 8)
      .map(note => ({
        id: note.id,
        title: note.title,
        examId: note.examId || null,
        chapterId: note.chapterId || null,
        bodySnippet: clipTutorContext(note.body, 800) || null,
      })),
  };
}

function safeParseTutorFolders(raw) {
  try {
    const parsed = JSON.parse(raw || '{}');
    return {
      folders: Array.isArray(parsed.folders) ? parsed.folders.filter(folder => folder?.id && folder?.name) : [],
      assignments: parsed.assignments && typeof parsed.assignments === 'object' ? parsed.assignments : {},
    };
  } catch {
    return { folders: [], assignments: {} };
  }
}

function readTutorFolderStore(key) {
  try {
    return window.localStorage?.getItem(key) || '';
  } catch {
    return '';
  }
}

function writeTutorFolderStore(key, value) {
  try {
    window.localStorage?.setItem(key, value);
  } catch {
    // Folder organization is a convenience layer; chat data remains persisted by tutor_sessions.
  }
}

function isDuplicateFolderError(error) {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  return code === 'DUPLICATE_FOLDER' || code === '23505' || message.includes('duplicate') || message.includes('unique');
}

const MAX_TUTOR_FILES = 5;
const MAX_INLINE_IMAGE_BYTES = 2.5 * 1024 * 1024;
const MAX_INLINE_PDF_BYTES = 10 * 1024 * 1024;
const MAX_INLINE_TEXT_CHARS = 12000;
const TUTOR_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const TUTOR_TEXT_TYPES = new Set(['text/plain', 'text/markdown']);

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Unable to read file.'));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Unable to read file.'));
    reader.readAsText(file);
  });
}

function attachmentKind(file) {
  if (TUTOR_IMAGE_TYPES.has(file.type)) return 'image';
  if (TUTOR_TEXT_TYPES.has(file.type) || /\.(txt|md)$/i.test(file.name)) return 'text';
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf';
  return 'metadata';
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAttachmentKind(kind = '') {
  if (kind === 'pdf') return 'PDF';
  if (kind === 'image') return 'Image';
  if (kind === 'text') return 'Text';
  return 'File';
}

function getDisplayAttachments(attachments = []) {
  return attachments.map((attachment) => ({
    name: attachment.name || 'Attachment',
    kind: attachment.kind || 'metadata',
    size: formatFileSize(Number(attachment.size || 0)),
    previewUrl: attachment.kind === 'image' && attachment.dataUrl ? attachment.dataUrl : '',
  }));
}

async function prepareTutorAttachments(files, lang = 'en') {
  const attachments = [];

  for (const file of files.slice(0, MAX_TUTOR_FILES)) {
    const kind = attachmentKind(file);
    const base = {
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      kind,
    };

    if (kind === 'image') {
      if (file.size > MAX_INLINE_IMAGE_BYTES) {
        attachments.push({
          ...base,
          status: 'metadata_only',
          note: tt(lang, 'imageTooLargeTutor'),
        });
        continue;
      }

      attachments.push({
        ...base,
        status: 'read',
        dataUrl: await readFileAsDataUrl(file),
      });
      continue;
    }

    if (kind === 'text') {
      const text = await readFileAsText(file);
      attachments.push({
        ...base,
        status: 'read',
        text: text.slice(0, MAX_INLINE_TEXT_CHARS),
        truncated: text.length > MAX_INLINE_TEXT_CHARS,
      });
      continue;
    }

    if (kind === 'pdf') {
      if (file.size > MAX_INLINE_PDF_BYTES) {
        attachments.push({
          ...base,
          status: 'metadata_only',
          note: tt(lang, 'pdfTooLargeTutor'),
        });
        continue;
      }

      const result = await extractTextFromFile(file);
      const extractedText = result.data?.extractedText || '';
      if (result.error || !extractedText.trim()) {
        attachments.push({
          ...base,
          status: 'metadata_only',
          pageCount: result.data?.pageCount || null,
          note: result.error?.message || result.data?.extractionError || tt(lang, 'pdfNoTextTutor'),
        });
        continue;
      }

      attachments.push({
        ...base,
        status: 'read',
        text: extractedText.slice(0, MAX_INLINE_TEXT_CHARS),
        truncated: extractedText.length > MAX_INLINE_TEXT_CHARS,
        pageCount: result.data?.pageCount || null,
      });
      continue;
    }

    attachments.push({
      ...base,
      status: 'metadata_only',
      note: tt(lang, 'unsupportedTutorFile'),
    });
  }

  return attachments;
}

function inlineMarkdown(text) {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function isTableRow(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|', 1);
}

function parseTable(lines, startIndex) {
  const rows = [];
  let index = startIndex;

  while (index < lines.length && isTableRow(lines[index])) {
    const cells = lines[index].trim().slice(1, -1).split('|').map((cell) => cell.trim());
    rows.push(cells);
    index += 1;
  }

  const filteredRows = rows.filter((row) => !row.every((cell) => /^:?-{3,}:?$/.test(cell)));
  return { rows: filteredRows, nextIndex: index };
}

function TutorAttachmentStack({ attachments = [], compact = false, onRemove = null, lang = 'en' }) {
  if (!attachments.length) return null;

  return (
    <div style={compact ? tutorS.attachmentTray : tutorS.messageAttachmentStack}>
      {attachments.map((file, i) => {
        const isImage = Boolean(file.previewUrl || file.url);
        const imageUrl = file.previewUrl || file.url || '';
        const label = formatAttachmentKind(file.kind);

        return (
          <div key={`${file.name}-${i}`} style={compact ? (isImage ? tutorS.composerImageAttachment : tutorS.composerFileAttachment) : (isImage ? tutorS.sentImageAttachment : tutorS.sentFileAttachment)}>
            {isImage ? (
              <img src={imageUrl} alt={file.name} style={compact ? tutorS.composerAttachmentImage : tutorS.sentAttachmentImage} />
            ) : (
              <div style={compact ? tutorS.composerFileAttachmentBody : tutorS.sentFileAttachmentBody}>
                <div style={compact ? tutorS.composerFileIcon : tutorS.sentFileIcon}><FileText size={compact ? 14 : 18} /></div>
                <div style={{ minWidth: 0 }}>
                  <div style={compact ? tutorS.composerFileAttachmentName : tutorS.sentFileAttachmentName}>{file.name}</div>
                  <div style={compact ? tutorS.composerFileAttachmentMeta : tutorS.sentFileAttachmentMeta}>{label}{file.size ? ` · ${file.size}` : ''}</div>
                </div>
              </div>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={tt(lang, 'removeFile', { name: file.name })}
                style={tutorS.removeAttachmentBtn}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function calloutTone(text) {
  const lower = text.toLowerCase();
  if (lower.startsWith('exam tip')) return '#EEF2FF';
  if (lower.startsWith('common mistake')) return '#FEF2F2';
  if (lower.startsWith('example')) return '#ECFDF5';
  return 'var(--lavender)';
}

function MarkdownMessage({ text }) {
  const lines = String(text || '').split('\n');
  const blocks = [];
  let paragraph = [];
  let list = [];
  let ordered = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: 'p', text: paragraph.join(' ') });
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    blocks.push({ type: ordered ? 'ol' : 'ul', items: list });
    list = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (isTableRow(line)) {
      flushParagraph();
      flushList();
      const table = parseTable(lines, i);
      blocks.push({ type: 'table', rows: table.rows });
      i = table.nextIndex - 1;
      continue;
    }

    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: `h${heading[1].length}`, text: heading[2] });
      continue;
    }

    if (line.startsWith('>')) {
      flushParagraph();
      flushList();
      let body = line.replace(/^>\s?/, '');
      const nextLine = lines[i + 1]?.trim();
      const nextIsBlock = !nextLine ||
        nextLine.startsWith('>') ||
        isTableRow(nextLine) ||
        /^(#{2,4})\s+/.test(nextLine) ||
        /^[-*]\s+/.test(nextLine) ||
        /^\d+\.\s+/.test(nextLine);
      if (body.endsWith(':') && !nextIsBlock) {
        body = `${body} ${nextLine}`;
        i += 1;
      }
      blocks.push({ type: 'callout', text: body, bg: calloutTone(body) });
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      if (ordered) flushList();
      ordered = false;
      list.push(unordered[1]);
      continue;
    }

    const numbered = line.match(/^\d+\.\s+(.+)$/);
    if (numbered) {
      flushParagraph();
      if (!ordered) flushList();
      ordered = true;
      list.push(numbered[1]);
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return (
    <div style={tutorS.markdown}>
      {blocks.map((block, index) => {
        if (block.type === 'h2') return <h2 key={index} style={tutorS.mdH2}>{inlineMarkdown(block.text)}</h2>;
        if (block.type === 'h3') return <h3 key={index} style={tutorS.mdH3}>{inlineMarkdown(block.text)}</h3>;
        if (block.type === 'h4') return <h4 key={index} style={tutorS.mdH4}>{inlineMarkdown(block.text)}</h4>;
        if (block.type === 'p') return <p key={index} style={tutorS.mdP}>{inlineMarkdown(block.text)}</p>;
        if (block.type === 'callout') return <div key={index} style={{ ...tutorS.callout, background: block.bg }}>{inlineMarkdown(block.text)}</div>;
        if (block.type === 'ul') {
          return <ul key={index} style={tutorS.mdList}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{inlineMarkdown(item)}</li>)}</ul>;
        }
        if (block.type === 'ol') {
          return <ol key={index} style={tutorS.mdList}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{inlineMarkdown(item)}</li>)}</ol>;
        }
        if (block.type === 'table') {
          const [head = [], ...body] = block.rows;
          return (
            <div key={index} style={tutorS.tableWrap}>
              <table style={tutorS.table}>
                {head.length > 0 && (
                  <thead>
                    <tr>{head.map((cell, cellIndex) => <th key={cellIndex} style={tutorS.th}>{inlineMarkdown(cell)}</th>)}</tr>
                  </thead>
                )}
                <tbody>
                  {body.map((row, rowIndex) => (
                    <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} style={tutorS.td}>{inlineMarkdown(cell)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

export default function TutorView({ user, lang = 'en' }) {
  const isMobile = useIsMobile();
  const planLimits = getPlanLimits(user);
  const freePlan = isFreePlan(user);
  const monthlyTutorLimit = formatLimit(planLimits.aiTutorMessagesPerMonth, tt(lang, 'unlimited'));
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [msgs, setMsgs] = useState(() => initialTutorMsgs(lang));
  const [input, setInput] = useState('');
  const [typingSessionId, setTypingSessionId] = useState(null);
  const [aiError, setAiError] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [tutorUsage, setTutorUsage] = useState(null);
  const [sessionSearch, setSessionSearch] = useState('');
  const [folders, setFolders] = useState([]);
  const [sessionFolders, setSessionFolders] = useState({});
  const [folderDraft, setFolderDraft] = useState('');
  const [folderError, setFolderError] = useState('');
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState('all');
  const [folderDeleteTarget, setFolderDeleteTarget] = useState(null);
  const [folderRenameTarget, setFolderRenameTarget] = useState(null);
  const [folderRenameDraft, setFolderRenameDraft] = useState('');
  const [folderStoreReady, setFolderStoreReady] = useState(false);
  const [folderPersistence, setFolderPersistence] = useState('local');
  const [tutorStyle, setTutorStyle] = useState('expert');
  const [studyContext, setStudyContext] = useState(() => buildTutorStudyContext());
  const [studyContextLoading, setStudyContextLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const fileRef = useRef(null);
  const inputRef = useRef(null);
  const endRef = useRef(null);
  const generationRef = useRef(0);
  const generationAbortRef = useRef(null);
  const activeIdRef = useRef(null);
  const typing = typingSessionId != null;
  const activeTyping = typingSessionId != null && String(typingSessionId) === String(activeId);
  const folderStorageKey = getTutorFolderStorageKey(user);
  const tutorStyleStorageKey = getTutorStyleStorageKey(user);
  const tutorLastSessionStorageKey = getTutorLastSessionStorageKey(user);
  const tutorUsageQuota = Number.isFinite(Number(tutorUsage?.quota)) ? Number(tutorUsage.quota) : planLimits.aiTutorMessagesPerMonth;
  const tutorUsageRemaining = Number.isFinite(Number(tutorUsage?.remaining)) ? Number(tutorUsage.remaining) : null;
  const tutorUsageUsed = Number.isFinite(Number(tutorUsage?.used))
    ? Number(tutorUsage.used)
    : (tutorUsageRemaining == null || !Number.isFinite(tutorUsageQuota) ? null : Math.max(0, tutorUsageQuota - tutorUsageRemaining));
  const tutorUsageProgress = Number.isFinite(tutorUsageQuota) && tutorUsageUsed != null
    ? Math.min(100, Math.max(0, (tutorUsageUsed / tutorUsageQuota) * 100))
    : 0;
  const tutorUsagePillLabel = tutorUsageRemaining == null
    ? tt(lang, 'freeAiTutorPillLimit', { count: monthlyTutorLimit })
    : tt(lang, 'freeAiTutorPillKnown', { remaining: tutorUsageRemaining, count: tutorUsageQuota });

  const formatAiError = (error) => {
    if (!error) return tt(lang, 'aiRequestFailed');
    if (error.code === 'AI_QUOTA_EXCEEDED') return tt(lang, 'aiQuotaReached');
    if (
      error.code === 'AI_PROVIDER_UNAVAILABLE' ||
      error.code === 'AI_PROVIDER_ERROR' ||
      error.code === 'AI_PROVIDER_EMPTY_RESPONSE' ||
      error.code === 'AI_PROVIDER_QUOTA_EXCEEDED' ||
      error.code === 'AI_PROVIDER_TIMEOUT'
    ) return tt(lang, 'aiProviderUnavailable');
    return error.message || tt(lang, 'aiRequestFailed');
  };

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);
  useEffect(() => {
    if (!activeId) return;
    try {
      window.localStorage?.setItem(tutorLastSessionStorageKey, String(activeId));
    } catch {
      // Preference-only persistence; tutor sessions remain the source of truth.
    }
  }, [activeId, tutorLastSessionStorageKey]);
  useEffect(() => () => {
    generationAbortRef.current?.abort?.();
  }, []);
  useEffect(() => { endRef.current?.scrollTo({ top: endRef.current.scrollHeight, behavior: 'smooth' }); }, [msgs, activeTyping]);
  useEffect(() => { setHistoryOpen(false); }, [isMobile]);
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (renameTarget) {
        setRenameTarget(null);
        setRenameDraft('');
        return;
      }
      if (deleteTarget) {
        setDeleteTarget(null);
        return;
      }
      if (folderRenameTarget) {
        setFolderRenameTarget(null);
        setFolderRenameDraft('');
        return;
      }
      if (folderDeleteTarget) {
        setFolderDeleteTarget(null);
        return;
      }
      if (isMobile && historyOpen) setHistoryOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteTarget, folderDeleteTarget, folderRenameTarget, historyOpen, isMobile, renameTarget]);
  useEffect(() => {
    let cancelled = false;

    async function loadFolders() {
      const stored = safeParseTutorFolders(readTutorFolderStore(folderStorageKey));
      if (!cancelled) {
        setFolders(stored.folders);
        setSessionFolders(stored.assignments);
        setActiveFolderId('all');
        setFolderPersistence('local');
        setFolderStoreReady(true);
      }

      const result = await listTutorFolders();
      if (cancelled) return;
      if (result.data) {
        setFolders(result.data);
        setSessionFolders({});
        setFolderPersistence('database');
        setActiveFolderId('all');
      }
    }

    loadFolders();
    return () => { cancelled = true; };
  }, [folderStorageKey]);
  useEffect(() => {
    if (!folderStoreReady || folderPersistence !== 'local') return;
    writeTutorFolderStore(folderStorageKey, JSON.stringify({ folders, assignments: sessionFolders }));
  }, [folderPersistence, folderStoreReady, folderStorageKey, folders, sessionFolders]);
  useEffect(() => {
    try {
      const stored = window.localStorage?.getItem(tutorStyleStorageKey);
      if (TUTOR_STYLES.some(style => style.id === stored)) setTutorStyle(stored);
      else setTutorStyle('expert');
    } catch {
      setTutorStyle('expert');
    }
  }, [tutorStyleStorageKey]);
  useEffect(() => {
    try {
      window.localStorage?.setItem(tutorStyleStorageKey, tutorStyle);
    } catch {
      // Preference-only persistence; chat data stays in tutor_sessions.
    }
  }, [tutorStyleStorageKey, tutorStyle]);
  useEffect(() => {
    let cancelled = false;

    async function loadStudyContext() {
      setStudyContextLoading(true);
      const [examsResult, materialsResult, notesResult] = await Promise.all([
        listExams(),
        listMaterials(),
        listNotes(),
      ]);
      if (cancelled) return;

      setStudyContext(buildTutorStudyContext({
        exams: examsResult.data || [],
        materials: materialsResult.data || [],
        notes: notesResult.data || [],
      }));
      setStudyContextLoading(false);
    }

    loadStudyContext().catch(() => {
      if (!cancelled) {
        setStudyContext(buildTutorStudyContext());
        setStudyContextLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [user?.id, user?.email]);
  useEffect(() => {
    let cancelled = false;
    async function loadTutorUsage() {
      if (!freePlan) {
        setTutorUsage(null);
        return;
      }
      const result = await getAiTutorUsage();
      if (!cancelled && result.data) setTutorUsage(result.data);
    }
    loadTutorUsage();
    return () => { cancelled = true; };
  }, [freePlan, user?.id, user?.planTier]);
  useEffect(() => {
    const previews = files.map((file) => ({
      name: file.name,
      kind: attachmentKind(file),
      size: formatFileSize(file.size),
      url: TUTOR_IMAGE_TYPES.has(file.type) ? URL.createObjectURL(file) : '',
    }));

    setFilePreviews(previews);
    return () => previews.forEach((preview) => {
      if (preview.url) URL.revokeObjectURL(preview.url);
    });
  }, [files]);

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      setLoadingSessions(true);
      const result = await listTutorSessions();
      if (cancelled) return;

      if (result.error) {
        setAiError(formatAiError(result.error));
        setSessions([]);
        setMsgs(initialTutorMsgs(lang));
        setLoadingSessions(false);
        return;
      }

      if ((result.data || []).length > 0) {
        let storedActiveId = '';
        try {
          storedActiveId = window.localStorage?.getItem(tutorLastSessionStorageKey) || '';
        } catch {
          storedActiveId = '';
        }
        const first = result.data.find(session => String(session.id) === String(storedActiveId)) || result.data[0];
        setSessions(result.data);
        setActiveId(first.id);
        setMsgs(first.msgs?.length ? first.msgs : initialTutorMsgs(lang));
        setLoadingSessions(false);
        return;
      }

      const initMsgs = initialTutorMsgs(lang);
      const createResult = await createTutorSession({ title: tt(lang, 'newConversation'), msgs: initMsgs });
      if (cancelled) return;
      if (createResult.error) {
        setAiError(formatAiError(createResult.error));
        setSessions([]);
        setMsgs(initMsgs);
      } else {
        setSessions([createResult.data]);
        setActiveId(createResult.data.id);
        setMsgs(createResult.data.msgs?.length ? createResult.data.msgs : initMsgs);
      }
      setLoadingSessions(false);
    }

    loadSessions();
    return () => { cancelled = true; };
  }, [tutorLastSessionStorageKey, user?.id, user?.email]);

  useEffect(() => {
    if (!activeId) return;
    const currentMsgs = Array.isArray(msgs) ? msgs : [];
    const isEmptyConversation =
      currentMsgs.length === 1 &&
      currentMsgs[0]?.who === 'ai' &&
      isTutorWelcomeText(currentMsgs[0]?.text);
    if (!isEmptyConversation) return;

    const localizedWelcome = initialTutorMsgs(lang);
    if (currentMsgs[0]?.text === localizedWelcome[0]?.text) return;

    setMsgs(localizedWelcome);
    setSessions(prev => prev.map(session => (
      String(session.id) === String(activeId)
        ? { ...session, msgs: localizedWelcome }
        : session
    )));
    updateTutorSession(activeId, { msgs: localizedWelcome }).then((result) => {
      if (result.error) setAiError(formatAiError(result.error));
    });
  }, [activeId, lang, msgs]);

  const persistSession = async (sessionId, nextMsgs, nextTitle) => {
    if (!sessionId) return;
    const patch = { msgs: nextMsgs };
    if (nextTitle) patch.title = nextTitle;
    const result = await updateTutorSession(sessionId, patch);
    if (result.error) setAiError(formatAiError(result.error));
    else setSessions(prev => sortTutorSessions(prev.map(s => String(s.id) === String(sessionId) ? result.data : s)));
  };

  const send = async () => {
    if (typing) return;
    const text = input.trim();
    if (!text && files.length === 0) return;
    const generationId = generationRef.current + 1;
    generationRef.current = generationId;
    generationAbortRef.current?.abort?.();
    const abortController = new AbortController();
    generationAbortRef.current = abortController;
    const visibleText = text || tt(lang, 'reviewAttachedFile');
    const promptText = text || tt(lang, 'reviewAttachedFile');
    const sessionId = activeId;
    if (!sessionId) return;
    const activeSession = sessions.find(s => String(s.id) === String(sessionId));
    const nextTitle = isUntitledSessionTitle(activeSession?.title) && text
      ? text.slice(0, 42)
      : null;
    let preparedAttachments = [];
    try {
      preparedAttachments = await prepareTutorAttachments(files, lang);
    } catch {
      setAiError(tt(lang, 'couldNotReadFile'));
      return;
    }
    const displayAttachments = getDisplayAttachments(preparedAttachments);

    const baseMsgs = Array.isArray(msgs) && msgs.length ? msgs : initialTutorMsgs(lang);
    const userMsgs = [...baseMsgs, { who: 'user', text: visibleText, attachments: displayAttachments }];
    setMsgs(userMsgs);
    const optimisticUpdatedAt = new Date().toISOString();
    setSessions(prev => sortTutorSessions(prev.map(s => String(s.id) === String(sessionId) ? { ...s, msgs: userMsgs, updatedAt: optimisticUpdatedAt } : s)));
    setInput('');
    setFiles([]);
    window.requestAnimationFrame?.(() => {
      if (inputRef.current) inputRef.current.style.height = 'auto';
    });
    setAiError('');
    setTypingSessionId(sessionId);
    await persistSession(sessionId, userMsgs, nextTitle);
    try {
      const selectedTutorStyle = TUTOR_STYLES.find(style => style.id === tutorStyle) || TUTOR_STYLES[0];
      const result = await askTutor({
        prompt: promptText,
        signal: abortController.signal,
        context: {
          language: lang,
          tutorStyle,
          tutorStyleLabel: selectedTutorStyle.label[lang] || selectedTutorStyle.label.en,
          tutorStyleInstruction: selectedTutorStyle.subtitle[lang] || selectedTutorStyle.subtitle.en,
          currentSubject: !isUntitledSessionTitle(activeSession?.title) ? activeSession.title : null,
          sessionTitle: activeSession?.title || null,
          studyContext,
          preferredDepth: /quick|brief|short/i.test(text) ? 'quick' : /deep|detail|well/i.test(text) ? 'deep' : 'standard',
          weakTopics: [],
          examGoals: [],
          history: userMsgs.slice(-8),
          attachments: preparedAttachments,
        },
      });
      if (result.data?.quota) setTutorUsage(result.data.quota);
      if (generationRef.current !== generationId) return;
      const reply = result.data?.text || tt(lang, 'noAnswerReturned');
      if (result.error) {
        setAiError(formatAiError(result.error));
        if (result.error.code === 'AI_QUOTA_EXCEEDED') {
          getAiTutorUsage().then((usageResult) => {
            if (usageResult.data) setTutorUsage(usageResult.data);
          });
        }
      }
      const responseMeta = result.data?.fallback || result.data?.provider === 'mock'
        ? { fallback: true, provider: result.data?.provider || 'mock' }
        : null;
      const next = [...userMsgs, { who: 'ai', text: result.error ? formatAiError(result.error) : reply, ...(responseMeta ? { meta: responseMeta } : {}) }];
      setSessions(prev => sortTutorSessions(prev.map(s => String(s.id) === String(sessionId) ? { ...s, msgs: next, updatedAt: new Date().toISOString() } : s)));
      if (String(activeIdRef.current) === String(sessionId)) setMsgs(next);
      persistSession(sessionId, next, nextTitle);
    } catch {
      if (generationRef.current !== generationId) return;
      const message = tt(lang, 'aiUnavailableLater');
      setAiError(message);
      const next = [...userMsgs, { who: 'ai', text: message }];
      setSessions(prev => sortTutorSessions(prev.map(s => String(s.id) === String(sessionId) ? { ...s, msgs: next, updatedAt: new Date().toISOString() } : s)));
      if (String(activeIdRef.current) === String(sessionId)) setMsgs(next);
      persistSession(sessionId, next, nextTitle);
    } finally {
      if (generationRef.current === generationId) {
        setTypingSessionId(null);
        generationAbortRef.current = null;
      }
    }
  };

  const stopGeneration = () => {
    generationRef.current += 1;
    generationAbortRef.current?.abort?.();
    generationAbortRef.current = null;
    setTypingSessionId(null);
    setAiError('');
  };

  const copyMessage = async (message, messageId) => {
    const text = String(message?.text || '').trim();
    if (!text) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedMessageId(messageId);
      window.setTimeout(() => {
        setCopiedMessageId(current => current === messageId ? null : current);
      }, 1800);
    } catch {
      setAiError(lang === 'it' ? 'Non sono riuscito a copiare il messaggio.' : 'Could not copy the message.');
    }
  };

  const reuseMessage = (message) => {
    const text = String(message?.text || '').trim();
    if (!text) return;
    fillPrompt(text);
  };

  const focusComposer = () => {
    window.requestAnimationFrame?.(() => {
      inputRef.current?.focus();
    });
  };

  const newChat = async () => {
    const init = initialTutorMsgs(lang);
    const targetFolderId = activeFolderId !== 'all' && activeFolderId !== 'unfiled' ? activeFolderId : null;
    const createInput = { title: tt(lang, 'newConversation'), msgs: init };
    if (folderPersistence === 'database' && targetFolderId) createInput.folderId = targetFolderId;
    const result = await createTutorSession(createInput);
    if (result.error) {
      setAiError(formatAiError(result.error));
      return;
    }
    setSessions(prev => [result.data, ...prev]);
    setActiveId(result.data.id);
    setMsgs(init);
    if (folderPersistence === 'local' && targetFolderId) {
      setSessionFolders(prev => ({ ...prev, [result.data.id]: activeFolderId }));
    }
    setHistoryOpen(false);
    focusComposer();
  };

  const switchSession = (s) => {
    setActiveId(s.id);
    setMsgs(s.msgs?.length ? s.msgs : initialTutorMsgs(lang));
    setFiles([]);
    setHistoryOpen(false);
    focusComposer();
  };

  const openRenameSession = (session) => {
    setRenameTarget(session);
    setRenameDraft(session.title || tt(lang, 'newConversation'));
  };

  const confirmRenameSession = async () => {
    if (!renameTarget) return;
    const cleanTitle = renameDraft.trim();
    if (!cleanTitle || cleanTitle === renameTarget.title) {
      setRenameTarget(null);
      setRenameDraft('');
      return;
    }

    const result = await updateTutorSession(renameTarget.id, { title: cleanTitle });
    if (result.error) {
      setAiError(formatAiError(result.error));
      return;
    }
    setSessions(prev => sortTutorSessions(prev.map(s => String(s.id) === String(renameTarget.id) ? result.data : s)));
    setRenameTarget(null);
    setRenameDraft('');
  };

  const togglePinned = async (session) => {
    const result = await updateTutorSession(session.id, { pinned: !session.pinned });
    if (result.error) {
      setAiError(formatAiError(result.error));
      return;
    }
    setSessions(prev => sortTutorSessions(prev.map(s => String(s.id) === String(session.id) ? result.data : s)));
  };

  const confirmDeleteSession = async () => {
    if (!deleteTarget) return;

    const result = await deleteTutorSession(deleteTarget.id);
    if (result.error) {
      setAiError(formatAiError(result.error));
      return;
    }

    const remaining = sessions.filter(s => String(s.id) !== String(deleteTarget.id));
    const deletedActive = String(activeId) === String(deleteTarget.id);

    setSessionFolders(prev => {
      const next = { ...prev };
      delete next[deleteTarget.id];
      return next;
    });

    if (deletedActive && remaining.length === 0) {
      const initMsgs = initialTutorMsgs(lang);
      const createResult = await createTutorSession({ title: tt(lang, 'newConversation'), msgs: initMsgs });
      if (createResult.error) {
        setAiError(formatAiError(createResult.error));
        setSessions([]);
        setActiveId(null);
        setMsgs(initMsgs);
      } else {
        setSessions([createResult.data]);
        setActiveId(createResult.data.id);
        setMsgs(createResult.data.msgs?.length ? createResult.data.msgs : initMsgs);
      }
    } else {
      setSessions(remaining);
      if (deletedActive) {
        const next = remaining[0];
        setActiveId(next?.id || null);
        setMsgs(next?.msgs?.length ? next.msgs : initialTutorMsgs(lang));
      }
    }

    setFiles([]);
    setDeleteTarget(null);
  };

  const createFolder = async () => {
    const name = folderDraft.trim();
    if (!name) return;
    const exists = folders.some(folder => folder.name.trim().toLowerCase() === name.toLowerCase());
    if (exists) {
      setFolderError(lang === 'it' ? 'Esiste già una cartella con questo nome.' : 'A folder with this name already exists.');
      return;
    }
    setFolderError('');

    if (folderPersistence === 'database') {
      const result = await createTutorFolder({ name });
      if (result.error) {
        if (isDuplicateFolderError(result.error)) {
          setFolderError(lang === 'it' ? 'Esiste già una cartella con questo nome.' : 'A folder with this name already exists.');
          return;
        }
        setAiError(formatAiError(result.error));
        return;
      }
      setFolders(prev => [result.data, ...prev]);
      setFolderDraft('');
      setShowFolderForm(false);
      setActiveFolderId(result.data.id);
      return;
    }

    const folder = { id: `folder-${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`, name };
    setFolders(prev => [...prev, folder]);
    setFolderDraft('');
    setShowFolderForm(false);
    setActiveFolderId(folder.id);
  };

  const openRenameFolder = (folder) => {
    setFolderRenameTarget(folder);
    setFolderRenameDraft(folder.name || '');
    setFolderError('');
  };

  const renameFolder = async () => {
    if (!folderRenameTarget) return;
    const name = folderRenameDraft.trim();
    if (!name) return;
    const exists = folders.some(folder => (
      String(folder.id) !== String(folderRenameTarget.id) &&
      folder.name.trim().toLowerCase() === name.toLowerCase()
    ));
    if (exists) {
      setFolderError(lang === 'it' ? 'Esiste già una cartella con questo nome.' : 'A folder with this name already exists.');
      return;
    }

    if (folderPersistence === 'database') {
      const result = await updateTutorFolder(folderRenameTarget.id, { name });
      if (result.error) {
        if (isDuplicateFolderError(result.error)) {
          setFolderError(lang === 'it' ? 'Esiste già una cartella con questo nome.' : 'A folder with this name already exists.');
          return;
        }
        setAiError(formatAiError(result.error));
        return;
      }
      setFolders(prev => prev.map(folder => String(folder.id) === String(folderRenameTarget.id) ? result.data : folder));
      setFolderRenameTarget(null);
      setFolderRenameDraft('');
      setFolderError('');
      return;
    }

    setFolders(prev => prev.map(folder => (
      String(folder.id) === String(folderRenameTarget.id)
        ? { ...folder, name, updatedAt: new Date().toISOString() }
        : folder
    )));
    setFolderRenameTarget(null);
    setFolderRenameDraft('');
    setFolderError('');
  };

  const deleteFolder = async (folderId) => {
    if (folderPersistence === 'database') {
      const result = await deleteTutorFolder(folderId);
      if (result.error) {
        setAiError(formatAiError(result.error));
        return;
      }
      setSessions(prev => prev.map(session => session.folderId === folderId ? { ...session, folderId: null } : session));
    }

    setFolders(prev => prev.filter(folder => folder.id !== folderId));
    setSessionFolders(prev => {
      const next = { ...prev };
      Object.keys(next).forEach((sessionId) => {
        if (next[sessionId] === folderId) delete next[sessionId];
      });
      return next;
    });
    if (activeFolderId === folderId) setActiveFolderId('all');
    setFolderDeleteTarget(null);
  };

  const fillPrompt = (prompt) => {
    setInput(prompt);
    window.requestAnimationFrame?.(() => {
      if (!inputRef.current) return;
      inputRef.current.focus();
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 118)}px`;
    });
  };

  const moveActiveSessionToFolder = async (folderId) => {
    if (!activeId) return;
    const nextFolderId = !folderId || folderId === 'unfiled' ? null : folderId;
    if (folderPersistence === 'database') {
      const result = await updateTutorSession(activeId, { folderId: nextFolderId });
      if (result.error) {
        setAiError(formatAiError(result.error));
        return;
      }
      setSessions(prev => prev.map(session => String(session.id) === String(activeId) ? result.data : session));
      return;
    }

    setSessionFolders(prev => {
      const next = { ...prev };
      if (!nextFolderId) delete next[activeId];
      else next[activeId] = nextFolderId;
      return next;
    });
  };

  const cleanSessionSearch = sessionSearch.trim().toLowerCase();
  const getSessionFolderId = (session) => (
    folderPersistence === 'database'
      ? (session?.folderId || 'unfiled')
      : (sessionFolders[session?.id] || 'unfiled')
  );
  const folderFilteredSessions = sessions.filter((session) => {
    const folderId = getSessionFolderId(session);
    if (activeFolderId === 'all') return true;
    if (activeFolderId === 'unfiled') return folderId === 'unfiled';
    return folderId === activeFolderId;
  });
  const getSessionSearchText = (session) => [
    session.title || '',
    ...(session.msgs || []).map(message => message?.text || ''),
  ].join(' ').toLowerCase();
  const getSessionSearchPreview = (session) => {
    if (!cleanSessionSearch) return '';
    const messageMatch = (session.msgs || []).find((message) => (
      String(message?.text || '').toLowerCase().includes(cleanSessionSearch)
    ));
    const raw = String(messageMatch?.text || '').replace(/\s+/g, ' ').trim();
    if (!raw) return '';
    const index = raw.toLowerCase().indexOf(cleanSessionSearch);
    const start = Math.max(0, index - 34);
    const end = Math.min(raw.length, index + cleanSessionSearch.length + 54);
    return `${start > 0 ? '...' : ''}${raw.slice(start, end)}${end < raw.length ? '...' : ''}`;
  };
  const visibleSessions = cleanSessionSearch
    ? folderFilteredSessions.filter(s => getSessionSearchText(s).includes(cleanSessionSearch))
    : folderFilteredSessions;
  const pinnedSessions = visibleSessions.filter(s => s.pinned);
  const recentSessions = visibleSessions.filter(s => !s.pinned);
  const hasOnlyWelcome = msgs.length === 1 && msgs[0]?.who === 'ai' && isTutorWelcomeText(msgs[0]?.text);
  const firstName = getFirstName(user);
  const activeSession = sessions.find(s => String(s.id) === String(activeId));
  const activeSessionFolderId = activeSession ? getSessionFolderId(activeSession) : 'unfiled';
  const activeTutorStyle = TUTOR_STYLES.find(style => style.id === tutorStyle) || TUTOR_STYLES[0];
  const activeFolderLabel = activeSessionFolderId === 'unfiled'
    ? (lang === 'it' ? 'Senza cartella' : 'Unfiled')
    : (folders.find(folder => String(folder.id) === String(activeSessionFolderId))?.name || (lang === 'it' ? 'Cartella' : 'Folder'));
  const getSessionFolderLabel = (session) => {
    const folderId = getSessionFolderId(session);
    if (folderId === 'unfiled') return lang === 'it' ? 'Senza cartella' : 'Unfiled';
    return folders.find(folder => String(folder.id) === String(folderId))?.name || (lang === 'it' ? 'Cartella' : 'Folder');
  };
  const studyContextLabel = studyContextLoading
    ? (lang === 'it' ? 'Contesto in caricamento' : 'Loading context')
    : (studyContext.totals.exams || studyContext.totals.materials || studyContext.totals.notes)
      ? (lang === 'it'
        ? `${studyContext.totals.exams} esami · ${studyContext.totals.materials} materiali`
        : `${studyContext.totals.exams} exams · ${studyContext.totals.materials} materials`)
      : (lang === 'it' ? 'Nessun contesto collegato' : 'No linked context');
  const hasStudyContext = Boolean(studyContext.totals.exams || studyContext.totals.materials || studyContext.totals.notes);
  const emptyContextCopy = studyContextLoading
    ? (lang === 'it' ? 'Sto preparando il contesto dei tuoi esami.' : 'Preparing your study context.')
    : hasStudyContext
      ? (lang === 'it'
        ? `Userò ${studyContext.totals.exams} esami, ${studyContext.totals.materials} materiali e ${studyContext.totals.notes} note quando sono rilevanti.`
        : `I will use ${studyContext.totals.exams} exams, ${studyContext.totals.materials} materials, and ${studyContext.totals.notes} notes when relevant.`)
      : (lang === 'it'
        ? 'Carica appunti o crea un esame per farmi rispondere sul tuo materiale reale.'
        : 'Upload notes or create an exam so I can answer from your real material.');
  const folderCounts = folders.reduce((acc, folder) => {
    acc[folder.id] = sessions.filter(session => getSessionFolderId(session) === folder.id).length;
    return acc;
  }, {});
  const unfiledCount = sessions.filter(session => getSessionFolderId(session) === 'unfiled').length;
  const suggestions = [
    {
      title: lang === 'it' ? 'Risolvi un esercizio' : 'Solve an exercise',
      body: lang === 'it' ? 'Guidami senza saltare i passaggi importanti.' : 'Walk me through it without skipping key steps.',
      prompt: lang === 'it' ? 'Risolvi passo-passo questo esercizio: ' : 'Solve this step by step: ',
      icon: CheckCircle,
      tone: 'green',
    },
    {
      title: lang === 'it' ? 'Spiegami un argomento' : 'Explain a topic',
      body: lang === 'it' ? 'Spiegami un concetto difficile con parole semplici.' : 'Explain a hard concept in simple words.',
      prompt: lang === 'it' ? 'Spiegami questo argomento: ' : 'Explain this topic: ',
      icon: Sparkles,
      tone: 'amber',
    },
    {
      title: lang === 'it' ? 'Aiutami a pianificare lo studio' : 'Help me plan study',
      body: lang === 'it' ? 'Organizza il prossimo blocco di studio.' : 'Plan the next study block.',
      prompt: lang === 'it' ? 'Aiutami a pianificare lo studio per: ' : 'Help me plan my study for: ',
      icon: Brain,
      tone: 'violet',
    },
  ];

  const renderSessionItem = (s) => {
    const isActive = s.id === activeId;
    const searchPreview = getSessionSearchPreview(s);
    const messageCount = (s.msgs || []).filter(message => message?.text && !isTutorWelcomeText(message.text)).length;
    const folderLabel = getSessionFolderLabel(s);
    return (
      <div key={s.id} style={{ ...tutorS.historyItem, ...(isActive ? tutorS.historyItemActive : {}) }}>
        <button type="button" onClick={() => switchSession(s)} style={{ ...tutorS.historyMain, paddingRight: isActive ? 146 : 10 }}>
          <div style={{ ...tutorS.historyTitle, color: isActive ? 'var(--indigo)' : 'var(--ink)' }}>{s.title}</div>
          <div style={tutorS.historyMetaRow}>
            <span>{s.date}</span>
            <span style={tutorS.historyMetaDot} />
            <span>{messageCount} {messageCount === 1 ? (lang === 'it' ? 'messaggio' : 'message') : (lang === 'it' ? 'messaggi' : 'messages')}</span>
          </div>
          <div style={tutorS.historyFolderPill}>{folderLabel}</div>
          {searchPreview && <div style={tutorS.historySnippet}>{searchPreview}</div>}
        </button>
        {isActive && (
          <div style={tutorS.historyIconActions}>
            <button type="button" onClick={() => togglePinned(s)} title={s.pinned ? tt(lang, 'unpinChat') : tt(lang, 'pinChat')} aria-label={s.pinned ? tt(lang, 'unpinChat') : tt(lang, 'pinChat')} style={{ ...tutorS.historyIconBtn, ...(s.pinned ? tutorS.historyPinnedIconBtn : {}) }}>
              <Pin size={12} />
            </button>
            <button type="button" onClick={() => openRenameSession(s)} title={tt(lang, 'renameChat')} aria-label={tt(lang, 'renameChat')} style={tutorS.historyIconBtn}>
              <Pencil size={12} />
            </button>
            <button type="button" onClick={() => setDeleteTarget(s)} title={tt(lang, 'deleteChat')} aria-label={tt(lang, 'deleteChat')} style={{ ...tutorS.historyIconBtn, ...tutorS.historyDangerIconBtn }}>
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderComposer = (variant = 'dock') => {
    const isHero = variant === 'hero';
    return (
      <>
        {typing && !activeTyping && (
          <div role="status" style={tutorS.backgroundTypingNotice}>
            <span>{lang === 'it' ? 'Una risposta sta arrivando in un’altra chat.' : 'A response is still running in another chat.'}</span>
            <button type="button" onClick={stopGeneration} style={tutorS.backgroundTypingStop}>
              {lang === 'it' ? 'Ferma' : 'Stop'}
            </button>
          </div>
        )}
        {aiError && <div role="alert" style={tutorS.errorBox}>{aiError}</div>}

        <form
          data-testid="tutor-composer"
          onSubmit={(e) => { e.preventDefault(); send(); }}
          style={isHero ? tutorS.heroComposer : tutorS.composer}
        >
          {filePreviews.length > 0 && (
            <TutorAttachmentStack
              attachments={filePreviews}
              compact
              lang={lang}
              onRemove={(index) => setFiles(prev => prev.filter((_, j) => j !== index))}
            />
          )}
          <div style={isHero ? tutorS.heroComposerRow : tutorS.composerRow}>
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif,text/plain,text/markdown,.txt,.md,.pdf"
              ref={fileRef}
              style={{ display: 'none' }}
              onChange={e => {
                const selected = Array.from(e.target.files);
                setFiles(prev => {
                  const next = [...prev, ...selected].slice(0, MAX_TUTOR_FILES);
                  if (prev.length + selected.length > MAX_TUTOR_FILES) {
                    setAiError(tt(lang, 'fileLimit', { count: MAX_TUTOR_FILES }));
                  } else {
                    setAiError('');
                  }
                  return next;
                });
                e.target.value = '';
              }}
            />
            <button type="button" onClick={() => fileRef.current.click()} title={tt(lang, 'attachFile')} aria-label={tt(lang, 'attachFile')} style={isHero ? tutorS.heroAttachBtn : tutorS.attachBtn}>
              <Paperclip size={16} />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onInput={(e) => {
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, isHero ? 132 : 118)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={lang === 'it' ? 'Fai una domanda al tuo tutor...' : 'Ask your tutor anything...'}
              aria-label={tt(lang, 'askAnything')}
              rows={isHero ? 3 : 1}
              style={isHero ? tutorS.heroComposerInput : tutorS.composerInput}
            />
            {typing ? (
              <button
                type="button"
                onClick={stopGeneration}
                style={isHero ? tutorS.heroStopBtn : tutorS.stopBtn}
                aria-label={lang === 'it' ? 'Ferma risposta' : 'Stop response'}
                title={lang === 'it' ? 'Ferma risposta' : 'Stop response'}
              >
                <Stop size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={(!input.trim() && files.length === 0) || typing}
                style={{
                  ...(isHero ? tutorS.heroSendBtn : tutorS.sendBtn),
                  opacity: ((!input.trim() && files.length === 0) || typing) ? .48 : 1,
                  cursor: ((!input.trim() && files.length === 0) || typing) ? 'not-allowed' : 'pointer'
                }}
                aria-label={tt(lang, 'send')}
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </form>
      </>
    );
  };

  const tutorHeight = '100%';

  return (
    <div data-testid="tutor-root" style={{ ...tutorS.shell, flexDirection: isMobile ? 'column' : 'row', height: tutorHeight, maxHeight: tutorHeight }}>
      {/* Chat history sidebar */}
      {isMobile && historyOpen && (
        <button
          type="button"
          aria-label={lang === 'it' ? 'Chiudi cronologia chat' : 'Close chat history'}
          onClick={() => setHistoryOpen(false)}
          style={tutorS.historyScrim}
        />
      )}
      {historyOpen && <div data-testid="tutor-history" style={{
        ...tutorS.historyPane,
        order: isMobile ? undefined : 2,
        width: isMobile ? '100%' : 320,
        maxHeight: isMobile ? 'min(74dvh, 560px)' : 'none',
        padding: isMobile ? 16 : '0 18px 0 0',
        border: isMobile ? '1px solid #E1E5EF' : 'none',
        borderRight: isMobile ? '1px solid #E1E5EF' : 'none',
        borderLeft: isMobile ? 'none' : tutorS.historyPane.borderRight,
        borderBottom: isMobile ? '1px solid #E8EBF4' : 'none',
        marginBottom: isMobile ? 0 : 0,
        ...(isMobile ? tutorS.mobileHistoryPane : {}),
      }}>
        {isMobile && (
          <div style={tutorS.mobileHistoryHead}>
            <span>{tt(lang, 'history')}</span>
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              style={tutorS.mobileHistoryCloseBtn}
              aria-label={lang === 'it' ? 'Chiudi cronologia chat' : 'Close chat history'}
            >
              <XMark size={16} />
            </button>
          </div>
        )}
        {!hasOnlyWelcome && <button type="button" onClick={newChat} style={tutorS.newChatBtn} aria-label={tt(lang, 'newChat')}>
          <Plus size={18} /> {tt(lang, 'newChat')}
        </button>}
        {!hasOnlyWelcome && <label style={tutorS.searchBox}>
          <Search size={16} />
          <input
            value={sessionSearch}
            onChange={(e) => setSessionSearch(e.target.value)}
            placeholder={lang === 'it' ? 'Cerca nelle chat...' : 'Search chats...'}
            aria-label={lang === 'it' ? 'Cerca nelle chat' : 'Search chats'}
            style={tutorS.searchInput}
          />
          {sessionSearch && (
            <button
              type="button"
              onClick={() => setSessionSearch('')}
              style={tutorS.searchClearBtn}
              aria-label={lang === 'it' ? 'Cancella ricerca' : 'Clear search'}
            >
              <XMark size={13} />
            </button>
          )}
        </label>}
        <div data-testid="tutor-folders" style={{ ...tutorS.folderPanel, ...(hasOnlyWelcome ? tutorS.hiddenFolders : {}) }}>
          <div style={tutorS.folderPanelHead}>
            <span>{lang === 'it' ? 'Cartelle' : 'Folders'}</span>
            <button type="button" onClick={() => {
              setFolderError('');
              setShowFolderForm(prev => !prev);
            }} style={tutorS.folderAddBtn} aria-label={lang === 'it' ? 'Nuova cartella' : 'New folder'}>
              <Plus size={13} />
            </button>
          </div>
          {folderError && <div role="alert" style={tutorS.folderError}>{folderError}</div>}
          {showFolderForm && (
            <div style={tutorS.folderForm}>
              <input
                autoFocus
                value={folderDraft}
                onChange={(e) => setFolderDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createFolder();
                  if (e.key === 'Escape') {
                    setShowFolderForm(false);
                    setFolderDraft('');
                    setFolderError('');
                  }
                }}
                placeholder={lang === 'it' ? 'Nome cartella' : 'Folder name'}
                aria-label={lang === 'it' ? 'Nome cartella' : 'Folder name'}
                style={tutorS.folderInput}
              />
              <button type="button" onClick={createFolder} style={tutorS.folderCreateBtn}>{lang === 'it' ? 'Crea' : 'Create'}</button>
            </div>
          )}
          <div style={tutorS.folderHelp}>
            {lang === 'it' ? 'Organizza le chat per esame, corso o argomento.' : 'Organize chats by exam, course, or topic.'}
          </div>
          <button type="button" onClick={() => setActiveFolderId('all')} style={{ ...tutorS.folderRow, ...(activeFolderId === 'all' ? tutorS.folderRowActive : {}) }} aria-label={lang === 'it' ? 'Mostra tutte le chat' : 'Show all chats'}>
            <span>{lang === 'it' ? 'Tutte le chat' : 'All chats'}</span>
            <b>{sessions.length}</b>
          </button>
          <button type="button" onClick={() => setActiveFolderId('unfiled')} style={{ ...tutorS.folderRow, ...(activeFolderId === 'unfiled' ? tutorS.folderRowActive : {}) }} aria-label={lang === 'it' ? 'Mostra chat senza cartella' : 'Show unfiled chats'}>
            <span>{lang === 'it' ? 'Senza cartella' : 'Unfiled'}</span>
            <b>{unfiledCount}</b>
          </button>
          {folders.map(folder => (
            <div key={folder.id} style={{ ...tutorS.folderRowWrap, ...(activeFolderId === folder.id ? tutorS.folderRowWrapActive : {}) }}>
              <button type="button" onClick={() => setActiveFolderId(folder.id)} style={{ ...tutorS.folderRowMain, ...(activeFolderId === folder.id ? tutorS.folderRowMainActive : {}) }}>
                <span style={tutorS.folderName}>{folder.name}</span>
                <b>{folderCounts[folder.id] || 0}</b>
              </button>
              <button type="button" onClick={() => openRenameFolder(folder)} style={tutorS.folderActionBtn} aria-label={lang === 'it' ? `Rinomina ${folder.name}` : `Rename ${folder.name}`}>
                <Pencil size={11} />
              </button>
              <button type="button" onClick={() => setFolderDeleteTarget(folder)} style={{ ...tutorS.folderActionBtn, ...tutorS.folderDangerActionBtn }} aria-label={lang === 'it' ? `Elimina ${folder.name}` : `Delete ${folder.name}`}>
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
        <div style={{ ...tutorS.historyScroll, ...(hasOnlyWelcome ? tutorS.simpleHistoryScroll : {}) }}>
          {loadingSessions && <div style={{ fontSize: 12, color: 'var(--gray)', padding: '8px 10px' }}>{tt(lang, 'loading')}</div>}
          {!loadingSessions && hasOnlyWelcome && (
            <>
              <p style={tutorS.simpleHistoryTitle}>{tt(lang, 'history')}</p>
              {visibleSessions.map(renderSessionItem)}
              {visibleSessions.length === 0 && <div style={tutorS.noHistory}>{tt(lang, 'noChatsYet')}</div>}
            </>
          )}
          {!loadingSessions && !hasOnlyWelcome && pinnedSessions.length > 0 && (
            <>
              <p style={tutorS.historyLabel}>{tt(lang, 'pinned')} <span>{pinnedSessions.length}</span></p>
              {pinnedSessions.map(renderSessionItem)}
            </>
          )}
          {!loadingSessions && !hasOnlyWelcome && (
            <>
              <p style={tutorS.historyLabel}>{tt(lang, 'recent')} <span>{recentSessions.length}</span></p>
              {recentSessions.map(renderSessionItem)}
              {visibleSessions.length === 0 && (
                <div style={tutorS.noHistory}>
                  {cleanSessionSearch
                    ? (lang === 'it' ? 'Nessuna chat trovata.' : 'No matching chats.')
                    : tt(lang, 'noChatsYet')}
                </div>
              )}
            </>
          )}
        </div>
      </div>}

      {/* Chat area */}
      <div data-testid="tutor-chat-pane" style={{ ...tutorS.chatPane, order: isMobile ? undefined : 1, paddingLeft: 0, paddingRight: isMobile ? 0 : (historyOpen ? 28 : 0) }}>
        <div data-testid="tutor-chat-header" style={{ ...tutorS.head, ...(hasOnlyWelcome ? tutorS.headEmpty : {}) }}>
          {!hasOnlyWelcome ? (
            <div style={tutorS.headIdentity}>
              <div style={tutorS.headText}>
                <div style={tutorS.headTitleRow}>
                  <span style={tutorS.chatStatusDot} />
                  <h2 style={tutorS.headTitle}>{activeSession?.title || 'AI Tutor'}</h2>
                  <span style={tutorS.headPersonaPill}>{activeTutorStyle.label[lang] || activeTutorStyle.label.en}</span>
                </div>
                <div style={tutorS.headMeta}>
                  <span style={tutorS.metaText}>{activeFolderLabel}</span>
                  <span style={tutorS.metaDot} />
                  <span style={tutorS.metaText}>{studyContextLabel}</span>
                  {freePlan && (
                    <span style={tutorS.usagePill} title={tt(lang, 'freeAiTutorRemainingCopy')}>
                      <span>{tutorUsagePillLabel}</span>
                      <span style={tutorS.usagePillTrack}>
                        <span style={{ ...tutorS.usagePillFill, width: `${tutorUsageProgress}%` }} />
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={tutorS.headSpacer} />
          )}
          {!isMobile && (
            <div style={{ ...tutorS.headTools, ...(hasOnlyWelcome ? tutorS.headToolsEmpty : {}) }}>
              {hasOnlyWelcome ? (
                <>
                  <button type="button" onClick={newChat} style={tutorS.emptyNewChatBtn} aria-label={tt(lang, 'newChat')}>
                    <Plus size={17} /> {tt(lang, 'newChat')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(p => !p)}
                    style={{ ...tutorS.emptyHistoryBtn, ...(historyOpen ? tutorS.emptyHistoryBtnActive : {}) }}
                    title={historyOpen ? (lang === 'it' ? 'Nascondi cronologia chat' : 'Hide chat history') : (lang === 'it' ? 'Mostra cronologia chat' : 'Show chat history')}
                    aria-label={historyOpen ? (lang === 'it' ? 'Nascondi cronologia chat' : 'Hide chat history') : (lang === 'it' ? 'Mostra cronologia chat' : 'Show chat history')}
                  >
                    <MsgCircle size={18} />
                  </button>
                </>
              ) : (
                <>
                  <label style={tutorS.tutorStyleSelectLabel}>
                    <span>{activeTutorStyle.label[lang] || activeTutorStyle.label.en}</span>
                    <select
                      value={tutorStyle}
                      onChange={(e) => setTutorStyle(e.target.value)}
                      style={tutorS.tutorStyleSelect}
                      aria-label={lang === 'it' ? 'Stile del tutor' : 'Tutor style'}
                    >
                      {TUTOR_STYLES.map(style => (
                        <option key={style.id} value={style.id}>
                          {style.short[lang] || style.short.en}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={tutorS.folderSelectLabel}>
                    <span>{lang === 'it' ? 'Cartella' : 'Folder'}</span>
                    <select
                      value={activeSessionFolderId}
                      onChange={(e) => moveActiveSessionToFolder(e.target.value)}
                      style={tutorS.folderSelect}
                      aria-label={lang === 'it' ? 'Cartella della chat' : 'Chat folder'}
                    >
                      <option value="unfiled">{lang === 'it' ? 'Senza cartella' : 'Unfiled'}</option>
                      {folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(p => !p)}
                    style={{ ...tutorS.historyToggleBtn, ...(historyOpen ? tutorS.historyToggleBtnActive : {}) }}
                    title={historyOpen ? (lang === 'it' ? 'Nascondi cronologia chat' : 'Hide chat history') : (lang === 'it' ? 'Mostra cronologia chat' : 'Show chat history')}
                    aria-label={historyOpen ? (lang === 'it' ? 'Nascondi cronologia chat' : 'Hide chat history') : (lang === 'it' ? 'Mostra cronologia chat' : 'Show chat history')}
                  >
                    <SidebarPanel size={16} />
                  </button>
                </>
              )}
            </div>
          )}
          {isMobile && (
            <button type="button" onClick={() => setHistoryOpen(p => !p)} style={tutorS.mobileHistoryBtn}>
              <MsgCircle size={14} /> {tt(lang, 'history')}
            </button>
          )}
        </div>
        {isMobile && !hasOnlyWelcome && (
          <div style={tutorS.mobileTools}>
            <label style={{ ...tutorS.tutorStyleSelectLabel, flex: 1, maxWidth: 'none', justifyContent: 'space-between' }}>
              <span>{activeTutorStyle.label[lang] || activeTutorStyle.label.en}</span>
              <select
                value={tutorStyle}
                onChange={(e) => setTutorStyle(e.target.value)}
                style={tutorS.tutorStyleSelect}
                aria-label={lang === 'it' ? 'Stile del tutor' : 'Tutor style'}
              >
                {TUTOR_STYLES.map(style => (
                  <option key={style.id} value={style.id}>
                    {style.short[lang] || style.short.en}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ ...tutorS.folderSelectLabel, flex: 1, maxWidth: 'none', justifyContent: 'space-between' }}>
              <span>{lang === 'it' ? 'Cartella' : 'Folder'}</span>
              <select
                value={activeSessionFolderId}
                onChange={(e) => moveActiveSessionToFolder(e.target.value)}
                style={tutorS.folderSelect}
                aria-label={lang === 'it' ? 'Cartella della chat' : 'Chat folder'}
              >
                <option value="unfiled">{lang === 'it' ? 'Senza cartella' : 'Unfiled'}</option>
                {folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
              </select>
            </label>
          </div>
        )}

        <div data-testid="tutor-thread" ref={endRef} style={tutorS.thread}>
          {hasOnlyWelcome ? (
            <div style={tutorS.emptyState}>
              <div style={tutorS.emptyMascot} aria-hidden="true">
                <div style={tutorS.emptyMascotHead}>
                  <span style={tutorS.emptyMascotEye} />
                  <span style={tutorS.emptyMascotEye} />
                </div>
              </div>
              <h1 style={tutorS.emptyTitle}>
                {lang === 'it' ? 'Come posso aiutarti?' : 'How can I help?'}
              </h1>
              <div style={tutorS.emptyComposerWrap}>
                {renderComposer('hero')}
              </div>
              <div style={{ ...tutorS.emptyPromptGrid, ...(isMobile ? tutorS.emptyPromptGridMobile : {}) }}>
                {suggestions.map(({ title, body, prompt, icon: IconCmp, tone }) => (
                  <button key={title} type="button" onClick={() => fillPrompt(prompt)} style={tutorS.emptyPromptCard}>
                    <span style={{ ...tutorS.promptIcon, ...(tutorS[`${tone}PromptIcon`] || {}) }}><IconCmp size={18} /></span>
                    <span style={{ minWidth: 0 }}>
                      <strong style={tutorS.promptTitle}>{title}</strong>
                      <span style={tutorS.promptBody}>{body}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            msgs.map((m, i) => {
              const isNew = i >= msgs.length - 1;
              const messageId = `${activeId || 'session'}-${i}`;
              const copied = copiedMessageId === messageId;
              return (
                <div key={i} style={{ display: 'flex', justifyContent: m.who === 'user' ? 'flex-end' : 'flex-start', animation: isNew ? (m.who === 'user' ? 'msgSlideRight .22s cubic-bezier(.22,1,.36,1)' : 'msgSlideLeft .22s cubic-bezier(.22,1,.36,1)') : 'none' }}>
                  <div style={m.who === 'user' ? tutorS.userMessageGroup : tutorS.aiMessageGroup}>
                    {m.who === 'user' && <TutorAttachmentStack attachments={m.attachments || []} />}
                    <div style={m.who === 'user' ? tutorS.bubbleUser : tutorS.bubbleAI}>
                      {m.who === 'ai' ? <MarkdownMessage text={m.text} /> : m.text}
                    </div>
                    {m.who === 'ai' && m.meta?.fallback && (
                      <div style={tutorS.fallbackBadge}>
                        {lang === 'it' ? 'Risposta demo locale' : 'Local demo response'}
                      </div>
                    )}
                    <div style={m.who === 'user' ? tutorS.messageActionsUser : tutorS.messageActions}>
                      <button
                        type="button"
                        onClick={() => copyMessage(m, messageId)}
                        style={{ ...tutorS.messageActionBtn, ...(copied ? tutorS.messageActionBtnCopied : {}) }}
                        aria-label={copied ? (lang === 'it' ? 'Copiato' : 'Copied') : (lang === 'it' ? 'Copia messaggio' : 'Copy message')}
                      >
                        <Copy size={12} />
                        {copied ? (lang === 'it' ? 'Copiato' : 'Copied') : (lang === 'it' ? 'Copia' : 'Copy')}
                      </button>
                      {m.who === 'user' && (
                        <button
                          type="button"
                          onClick={() => reuseMessage(m)}
                          style={tutorS.messageActionBtn}
                          aria-label={lang === 'it' ? 'Usa di nuovo questo prompt' : 'Use this prompt again'}
                        >
                          <Pencil size={12} />
                          {lang === 'it' ? 'Usa di nuovo' : 'Use again'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {activeTyping && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', animation: 'msgSlideLeft .22s cubic-bezier(.22,1,.36,1)' }}>
              <div style={{ ...tutorS.bubbleAI, display: 'flex', gap: 6, padding: '14px 18px' }}>
                <span style={tutorS.typingDot} /><span style={{ ...tutorS.typingDot, animationDelay: '.15s' }} /><span style={{ ...tutorS.typingDot, animationDelay: '.3s' }} />
              </div>
            </div>
          )}
        </div>

        {!hasOnlyWelcome && (
          <div data-testid="tutor-composer-dock" style={tutorS.composerDock}>
            {renderComposer('dock')}
          </div>
        )}
      </div>

      {renameTarget && (
        <div style={tutorS.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="rename-chat-title">
          <div style={tutorS.modalCard}>
            <div>
              <h3 id="rename-chat-title" style={tutorS.modalTitle}>{tt(lang, 'renameChat')}</h3>
              <p style={tutorS.modalCopy}>{tt(lang, 'renameChatCopy')}</p>
            </div>
            <input
              autoFocus
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRenameSession();
                if (e.key === 'Escape') {
                  setRenameTarget(null);
                  setRenameDraft('');
                }
              }}
              aria-label={tt(lang, 'renameChat')}
              style={tutorS.modalInput}
            />
            <div style={tutorS.modalActions}>
              <button type="button" onClick={() => { setRenameTarget(null); setRenameDraft(''); }} style={tutorS.modalGhostBtn}>{tt(lang, 'cancel')}</button>
              <button type="button" onClick={confirmRenameSession} style={tutorS.modalPrimaryBtn}>{tt(lang, 'save')}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div style={tutorS.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="delete-chat-title">
          <div style={tutorS.modalCard}>
            <div>
              <h3 id="delete-chat-title" style={tutorS.modalTitle}>{tt(lang, 'deleteChatQuestion')}</h3>
              <p style={tutorS.modalCopy}>
                {tt(lang, 'deleteChatCopy', { title: deleteTarget.title || tt(lang, 'newConversation') })}
              </p>
            </div>
            <div style={tutorS.modalActions}>
              <button type="button" onClick={() => setDeleteTarget(null)} style={tutorS.modalGhostBtn}>{tt(lang, 'cancel')}</button>
              <button type="button" onClick={confirmDeleteSession} style={{ ...tutorS.modalPrimaryBtn, ...tutorS.modalDangerBtn }}>{tt(lang, 'delete')}</button>
            </div>
          </div>
        </div>
      )}

      {folderDeleteTarget && (
        <div style={tutorS.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="delete-folder-title">
          <div style={tutorS.modalCard}>
            <div>
              <h3 id="delete-folder-title" style={tutorS.modalTitle}>{lang === 'it' ? 'Eliminare la cartella?' : 'Delete folder?'}</h3>
              <p style={tutorS.modalCopy}>
                {lang === 'it'
                  ? `Le chat in "${folderDeleteTarget.name}" resteranno salvate e torneranno in Senza cartella.`
                  : `Chats in "${folderDeleteTarget.name}" will stay saved and move back to Unfiled.`}
              </p>
            </div>
            <div style={tutorS.modalActions}>
              <button type="button" onClick={() => setFolderDeleteTarget(null)} style={tutorS.modalGhostBtn}>{tt(lang, 'cancel')}</button>
              <button type="button" onClick={() => deleteFolder(folderDeleteTarget.id)} style={{ ...tutorS.modalPrimaryBtn, ...tutorS.modalDangerBtn }}>{tt(lang, 'delete')}</button>
            </div>
          </div>
        </div>
      )}

      {folderRenameTarget && (
        <div style={tutorS.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="rename-folder-title">
          <div style={tutorS.modalCard}>
            <div>
              <h3 id="rename-folder-title" style={tutorS.modalTitle}>{lang === 'it' ? 'Rinomina cartella' : 'Rename folder'}</h3>
              <p style={tutorS.modalCopy}>
                {lang === 'it' ? 'Aggiorna il nome della cartella senza spostare le chat salvate.' : 'Update the folder name without moving saved chats.'}
              </p>
            </div>
            <input
              autoFocus
              value={folderRenameDraft}
              onChange={(e) => setFolderRenameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') renameFolder();
                if (e.key === 'Escape') {
                  setFolderRenameTarget(null);
                  setFolderRenameDraft('');
                  setFolderError('');
                }
              }}
              aria-label={lang === 'it' ? 'Nome cartella' : 'Folder name'}
              style={tutorS.modalInput}
            />
            {folderError && <div role="alert" style={tutorS.modalError}>{folderError}</div>}
            <div style={tutorS.modalActions}>
              <button type="button" onClick={() => {
                setFolderRenameTarget(null);
                setFolderRenameDraft('');
                setFolderError('');
              }} style={tutorS.modalGhostBtn}>{tt(lang, 'cancel')}</button>
              <button type="button" onClick={renameFolder} style={tutorS.modalPrimaryBtn}>{lang === 'it' ? 'Salva' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
    @keyframes tdot { 0%,80%,100% { transform: translateY(0); opacity:.4 } 40% { transform: translateY(-4px); opacity:1 } }
    @keyframes msgSlideLeft  { from { opacity:0; transform:translateX(-12px); } to { opacity:1; transform:translateX(0); } }
    @keyframes msgSlideRight { from { opacity:0; transform:translateX(12px);  } to { opacity:1; transform:translateX(0); } }
  `}</style>
    </div>
  );
}

const tutorS = {
  wrap: { display: 'flex', flexDirection: 'column', minHeight: 560 },
  shell: { position: 'relative', display: 'flex', gap: 0, overflow: 'hidden', overscrollBehavior: 'contain', background: '#fff' },
  historyPane: { flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '0 18px 0 0', borderRight: '1px solid #EEF1F6', minHeight: 0, overflow: 'hidden', background: '#fff' },
  historyScrim: { position: 'absolute', inset: 0, zIndex: 24, border: 'none', padding: 0, background: 'rgba(15,23,42,.18)', backdropFilter: 'blur(2px)', cursor: 'pointer' },
  mobileHistoryPane: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 25, background: '#fff', borderRadius: 22, boxShadow: '0 26px 80px rgba(15,23,42,.22)', overflow: 'hidden' },
  mobileHistoryHead: { minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, color: 'var(--ink)', fontSize: 15, fontWeight: 950 },
  mobileHistoryCloseBtn: { width: 44, height: 44, borderRadius: 14, border: '1px solid #E1E5EF', background: '#fff', color: 'var(--gray)', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 },
  newChatBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', minHeight: 52, padding: '0 16px', borderRadius: 15, background: 'var(--indigo)', color: '#fff', fontWeight: 900, fontSize: 14, border: 'none', cursor: 'pointer', marginBottom: 14, boxShadow: '0 14px 28px rgba(55,48,232,.16)' },
  hiddenFolders: { display: 'none' },
  searchBox: { minHeight: 46, display: 'flex', alignItems: 'center', gap: 10, padding: '0 13px', borderRadius: 15, border: '1px solid #E3E7EF', background: '#fff', color: 'var(--gray)', marginBottom: 12 },
  searchInput: { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 14, fontWeight: 650 },
  searchClearBtn: { width: 36, height: 36, borderRadius: 12, border: 'none', background: '#F1F5F9', color: 'var(--gray-2)', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 },
  folderPanel: { marginBottom: 12, padding: 9, borderRadius: 16, background: '#fff', border: '1px solid #E8ECF3', display: 'flex', flexDirection: 'column', gap: 5 },
  folderPanelHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 2px 6px', color: 'var(--gray-2)', fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '.08em' },
  folderAddBtn: { width: 44, height: 44, borderRadius: 13, border: '1px solid rgba(55,48,232,.18)', background: '#fff', color: 'var(--indigo)', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 },
  folderError: { padding: '7px 9px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 11, fontWeight: 800, lineHeight: 1.25 },
  folderForm: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, marginBottom: 5 },
  folderInput: { minWidth: 0, height: 42, borderRadius: 12, border: '1px solid #DDE2ED', background: '#fff', color: 'var(--ink)', padding: '0 12px', fontSize: 13, fontWeight: 750, outline: 'none' },
  folderCreateBtn: { height: 42, padding: '0 14px', borderRadius: 12, border: 'none', background: 'var(--indigo)', color: '#fff', fontSize: 13, fontWeight: 850, cursor: 'pointer' },
  folderHelp: { display: 'none' },
  folderRow: { minHeight: 44, width: '100%', border: '1px solid transparent', borderRadius: 13, background: 'transparent', color: 'var(--gray)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0 12px', cursor: 'pointer', fontSize: 12, fontWeight: 850, textAlign: 'left' },
  folderRowActive: { background: '#fff', borderColor: 'rgba(55,48,232,.18)', color: 'var(--indigo)', boxShadow: '0 8px 18px rgba(15,23,42,.045)' },
  folderRowWrap: { minHeight: 46, border: '1px solid transparent', borderRadius: 13, display: 'grid', gridTemplateColumns: '1fr 44px 44px', alignItems: 'center', background: 'transparent' },
  folderRowWrapActive: { background: '#fff', borderColor: 'rgba(55,48,232,.18)', boxShadow: '0 8px 18px rgba(15,23,42,.045)' },
  folderRowMain: { minWidth: 0, height: 44, border: 'none', borderRadius: 13, background: 'transparent', color: 'var(--gray)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0 4px 0 12px', cursor: 'pointer', fontSize: 12, fontWeight: 850, textAlign: 'left' },
  folderRowMainActive: { color: 'var(--indigo)' },
  folderName: { minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  folderActionBtn: { width: 44, height: 44, borderRadius: 13, border: 'none', background: 'transparent', color: 'var(--gray-2)', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 },
  folderDangerActionBtn: { color: '#EF4444' },
  historyScroll: { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 2 },
  simpleHistoryScroll: { padding: '14px 0 0 22px', gap: 12 },
  simpleHistoryTitle: { margin: '0 0 18px', color: '#09090B', fontSize: 22, lineHeight: 1.15, fontWeight: 850, letterSpacing: 0 },
  noHistory: { fontSize: 12, color: 'var(--gray)', padding: '10px 12px', borderRadius: 12, background: '#fff', border: '1px dashed #E1E5EF' },
  chatPane: { flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', paddingLeft: 28, background: '#fff' },
  head: { flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 42, marginBottom: 0, padding: '0 2px 7px', borderBottom: '1px solid rgba(226,232,240,.72)' },
  headEmpty: { minHeight: 48, padding: '0 2px', borderBottom: 'none' },
  headSpacer: { flex: '1 1 auto', minWidth: 0 },
  headIdentity: { flex: '1 1 auto', display: 'flex', alignItems: 'center', minWidth: 0 },
  headText: { minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 },
  headTitleRow: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 },
  headTitle: { margin: 0, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 15, lineHeight: 1.1, fontWeight: 950, color: 'var(--ink)', letterSpacing: 0 },
  headMeta: { minWidth: 0, maxWidth: 'min(680px, 58vw)', display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden', whiteSpace: 'nowrap' },
  metaText: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--gray)', fontSize: 11, lineHeight: 1.15, fontWeight: 760 },
  metaDot: { width: 3, height: 3, borderRadius: 999, background: '#CBD5E1', flexShrink: 0 },
  chatStatusDot: { width: 8, height: 8, borderRadius: 999, background: '#10B981', flexShrink: 0, boxShadow: '0 0 0 4px rgba(16,185,129,.12)' },
  headPersonaPill: { display: 'inline-flex', alignItems: 'center', minHeight: 22, padding: '0 8px', borderRadius: 999, background: '#F8FAFF', border: '1px solid rgba(55,48,232,.12)', color: 'var(--indigo)', fontSize: 11, lineHeight: 1, fontWeight: 900, whiteSpace: 'nowrap' },
  avatar: { width: 24, height: 24, borderRadius: 8, background: 'linear-gradient(135deg, var(--indigo), var(--purple))', color: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 8px 18px rgba(55,48,232,.14)', flexShrink: 0 },
  headTools: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  headToolsEmpty: { position: 'absolute', top: 0, right: 0, zIndex: 3 },
  emptyNewChatBtn: { minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 15px', borderRadius: 10, border: '1px solid #E4E4E7', background: '#fff', color: '#09090B', fontSize: 15, fontWeight: 820, cursor: 'pointer', boxShadow: '0 1px 0 rgba(15,23,42,.02)' },
  emptyHistoryBtn: { width: 44, height: 44, borderRadius: 10, border: 'none', background: '#F1F1F5', color: '#09090B', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 },
  emptyHistoryBtnActive: { background: '#D8D8DE' },
  historyToggleBtn: { width: 42, height: 42, borderRadius: 14, border: '1px solid #E1E5EF', background: '#fff', color: 'var(--gray)', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0, boxShadow: '0 8px 20px rgba(15,23,42,.035)', transition: 'background .16s ease, color .16s ease, border-color .16s ease, box-shadow .16s ease' },
  historyToggleBtnActive: { borderColor: 'rgba(55,48,232,.18)', background: '#F1F3FF', color: 'var(--indigo)', boxShadow: '0 10px 24px rgba(55,48,232,.08)' },
  tutorStyleSelectLabel: { display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40, padding: '0 9px 0 12px', borderRadius: 999, border: '1px solid rgba(55,48,232,.14)', background: '#fff', color: 'var(--indigo)', fontSize: 10, fontWeight: 900, maxWidth: 210, boxShadow: '0 8px 20px rgba(15,23,42,.03)' },
  tutorStyleSelect: { maxWidth: 92, height: 22, border: 'none', outline: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 11, fontWeight: 850, fontFamily: 'inherit' },
  folderSelectLabel: { display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40, padding: '0 9px 0 12px', borderRadius: 999, border: '1px solid #E1E5EF', background: '#fff', color: 'var(--gray)', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.05em', boxShadow: '0 8px 20px rgba(15,23,42,.035)' },
  folderSelect: { maxWidth: 140, height: 22, border: 'none', outline: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 11, fontWeight: 850, fontFamily: 'inherit' },
  mobileTools: { flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '0 0 8px' },
  mobileHistoryBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44, padding: '0 14px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 12, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 20px rgba(15,23,42,.035)' },
  onlineDot: { display: 'inline-block', width: 7, height: 7, borderRadius: 999, background: '#10B981', marginRight: 5, verticalAlign: 'middle' },
  compactStatus: { display: 'inline-flex', alignItems: 'center', minHeight: 18, color: '#047857', fontSize: 11, lineHeight: 1, fontWeight: 850, flexShrink: 0 },
  statusLine: { marginTop: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--gray)', lineHeight: 1.2 },
  usagePill: { display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 22, padding: '3px 8px', borderRadius: 999, background: '#F8FAFF', border: '1px solid #E7E9F4', color: 'var(--gray)', fontSize: 11, fontWeight: 800, lineHeight: 1 },
  usagePillTrack: { width: 34, height: 4, borderRadius: 999, background: '#E5E7FF', overflow: 'hidden' },
  usagePillFill: { display: 'block', height: '100%', borderRadius: 999, background: 'var(--indigo)', transition: 'width .2s ease' },
  historyLabel: { margin: '10px 0 8px', fontSize: 11, fontWeight: 900, color: 'var(--gray-2)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  historyItem: { position: 'relative', borderRadius: 13, border: '1px solid transparent', background: 'transparent', padding: 0 },
  historyItemActive: { background: '#F7F7FB', borderColor: '#ECECF2', boxShadow: 'none' },
  historyMain: { textAlign: 'left', padding: '11px 12px', borderRadius: 12, background: 'transparent', border: 'none', cursor: 'pointer', width: '100%' },
  historyTitle: { fontSize: 13, fontWeight: 850, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginBottom: 3 },
  historyDate: { fontSize: 11, fontWeight: 700, color: 'var(--gray)' },
  historyMetaRow: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', color: 'var(--gray)', fontSize: 11, fontWeight: 700 },
  historyMetaDot: { width: 3, height: 3, borderRadius: 999, background: '#CBD5E1', flexShrink: 0 },
  historyFolderPill: { display: 'none' },
  historySnippet: { marginTop: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: 'var(--gray-2)', fontSize: 11, lineHeight: 1.28, fontWeight: 650 },
  historyIconActions: { position: 'absolute', top: 47, right: 10, display: 'flex', alignItems: 'center', gap: 5 },
  historyIconBtn: { width: 36, height: 36, borderRadius: 999, border: '1px solid rgba(55,48,232,.16)', background: '#fff', color: 'var(--indigo)', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0, boxShadow: '0 4px 10px rgba(15,23,42,.06)' },
  historyPinnedIconBtn: { borderColor: 'var(--indigo)', background: 'var(--indigo)', color: '#fff', boxShadow: '0 8px 18px rgba(55,48,232,.2)' },
  historyDangerIconBtn: { borderColor: 'rgba(239,68,68,.22)', background: '#FFF7F7', color: '#B91C1C' },
  thread: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 4px 8px', overflowY: 'auto' },
  emptyState: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 18px 30px', textAlign: 'center' },
  emptyIcon: { width: 66, height: 66, borderRadius: 18, display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(135deg, var(--indigo), var(--purple))', boxShadow: '0 20px 42px rgba(55,48,232,.18)' },
  emptyMascot: { width: 80, height: 80, borderRadius: 14, background: '#4B63F4', display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden' },
  emptyMascotHead: { width: 52, height: 36, borderRadius: '46% 46% 38% 38%', background: '#171721', border: '5px solid #FF6B2C', transform: 'rotate(-8deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, boxShadow: '0 0 0 2px rgba(23,23,33,.08)' },
  emptyMascotEye: { width: 9, height: 6, borderRadius: '50% 50% 45% 45%', background: '#fff', display: 'block' },
  emptyTitle: { margin: '18px 0 18px', color: '#09090B', fontSize: 28, lineHeight: 1.08, fontWeight: 850, letterSpacing: 0 },
  emptyCopy: { margin: 0, maxWidth: 600, color: 'var(--gray)', fontSize: 15, lineHeight: 1.45, fontWeight: 650 },
  emptyContextCopy: { margin: '14px 0 0', maxWidth: 620, color: 'var(--gray-2)', fontSize: 12, lineHeight: 1.35, fontWeight: 700 },
  emptyComposerWrap: { width: 'min(840px, 100%)', marginTop: 0 },
  emptyPromptGrid: { width: 'min(760px, 100%)', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginTop: 20 },
  emptyPromptGridMobile: { flexDirection: 'column', alignItems: 'stretch' },
  emptyPromptCard: { minHeight: 40, display: 'inline-flex', alignItems: 'center', gap: 8, textAlign: 'left', padding: '7px 14px 7px 10px', borderRadius: 999, border: '1px solid #DADAE3', background: '#fff', color: '#09090B', cursor: 'pointer', boxShadow: 'none', transition: 'transform .18s ease, border-color .18s ease, box-shadow .18s ease' },
  promptIcon: { width: 22, height: 22, borderRadius: 999, display: 'grid', placeItems: 'center', flexShrink: 0, background: '#EEF2FF', border: '1px solid #D8DEFF', color: 'var(--indigo)' },
  indigoPromptIcon: { background: '#EEF2FF', borderColor: '#D8DEFF', color: 'var(--indigo)' },
  cyanPromptIcon: { background: '#ECFEFF', borderColor: '#BAE6FD', color: '#0891B2' },
  amberPromptIcon: { background: '#FFF7ED', borderColor: '#FED7AA', color: '#EA580C' },
  bluePromptIcon: { background: '#EFF6FF', borderColor: '#BFDBFE', color: '#2563EB' },
  greenPromptIcon: { background: '#F0FDF4', borderColor: '#BBF7D0', color: '#22C55E' },
  violetPromptIcon: { background: '#FAF5FF', borderColor: '#E9D5FF', color: '#8B5CF6' },
  promptTitle: { display: 'block', color: '#09090B', fontSize: 14, lineHeight: 1.2, fontWeight: 650, marginBottom: 0 },
  promptBody: { display: 'none' },
  userMessageGroup: { maxWidth: '82%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 },
  aiMessageGroup: { maxWidth: '82%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 },
  bubbleAI:   { maxWidth: '100%', background: 'var(--bubble-ai-bg)', color: 'var(--ink)', padding: '14px 16px', borderRadius: 18, borderTopLeftRadius: 6, fontSize: 14, lineHeight: 1.5 },
  bubbleUser: { maxWidth: '100%', background: 'var(--indigo)', color: '#fff', padding: '12px 16px', borderRadius: 18, borderTopRightRadius: 6, fontSize: 14, lineHeight: 1.5 },
  messageActions: { display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 2, marginTop: -3, flexWrap: 'wrap' },
  messageActionsUser: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, paddingRight: 2, marginTop: -3, flexWrap: 'wrap' },
  messageActionBtn: { minHeight: 36, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 12px', borderRadius: 999, border: '1px solid #E1E5EF', background: '#fff', color: 'var(--gray)', cursor: 'pointer', fontSize: 11, fontWeight: 800, boxShadow: '0 6px 16px rgba(15,23,42,.04)' },
  messageActionBtnCopied: { borderColor: '#BBF7D0', background: '#F0FDF4', color: '#047857' },
  fallbackBadge: { marginTop: -2, display: 'inline-flex', alignItems: 'center', minHeight: 24, padding: '0 9px', borderRadius: 999, border: '1px solid #FDE68A', background: '#FFFBEB', color: '#92400E', fontSize: 11, lineHeight: 1, fontWeight: 850 },
  markdown: { display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 },
  mdH2: { margin: '0 0 2px', fontSize: 18, lineHeight: 1.25, fontWeight: 800, color: 'var(--ink)', letterSpacing: 0 },
  mdH3: { margin: '8px 0 0', fontSize: 14, lineHeight: 1.3, fontWeight: 800, color: 'var(--ink)', letterSpacing: 0 },
  mdH4: { margin: '6px 0 0', fontSize: 13, lineHeight: 1.3, fontWeight: 800, color: 'var(--ink)', letterSpacing: 0 },
  mdP: { margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--ink)' },
  mdList: { margin: '0 0 0 18px', padding: 0, display: 'flex', flexDirection: 'column', gap: 4, lineHeight: 1.5 },
  callout: { marginTop: 2, padding: '9px 11px', borderRadius: 10, border: '1px solid var(--border)', color: 'var(--ink)', fontSize: 13, lineHeight: 1.45 },
  tableWrap: { maxWidth: '100%', overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12, lineHeight: 1.4 },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border)', fontWeight: 800, color: 'var(--ink)', background: 'var(--sidebar-bg)' },
  td: { padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--ink)', verticalAlign: 'top' },
  typingDot: { width: 8, height: 8, borderRadius: 999, background: 'var(--gray-2)', animation: 'tdot 1s infinite ease-in-out' },
  composerDock: { flexShrink: 0, marginTop: 'auto', padding: '12px 0 0', borderTop: '1px solid #EEF1F7', background: 'linear-gradient(180deg, rgba(255,255,255,0), #fff 22%)', boxSizing: 'border-box' },
  suggestRow: { display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 10px' },
  suggestChip: { minHeight: 38, padding: '8px 13px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)', fontWeight: 500, fontSize: 12, cursor: 'pointer' },
  backgroundTypingNotice: { width: 'min(860px, 100%)', margin: '0 auto 8px', minHeight: 36, padding: '8px 10px 8px 13px', borderRadius: 13, border: '1px solid rgba(55,48,232,.16)', background: '#F8FAFF', color: 'var(--gray)', fontSize: 12, fontWeight: 750, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  backgroundTypingStop: { minHeight: 36, padding: '0 12px', borderRadius: 999, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#B91C1C', fontSize: 11, fontWeight: 900, cursor: 'pointer', flexShrink: 0 },
  errorBox: { marginBottom: 8, padding: '10px 12px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: 13, fontWeight: 600 },
  composer: { width: 'min(860px, 100%)', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10, padding: 9, background: '#fff', border: '1px solid #DDE2ED', borderRadius: 20, boxShadow: '0 18px 50px rgba(15,23,42,.08)' },
  heroComposer: { width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10, padding: 8, background: '#fff', border: '2px solid #E4E4EA', borderRadius: 16, boxShadow: 'none' },
  composerRow: { display: 'flex', alignItems: 'flex-end', gap: 8, width: '100%' },
  heroComposerRow: { minHeight: 168, display: 'grid', gridTemplateColumns: '44px 1fr 44px', alignItems: 'end', gap: 8, width: '100%' },
  attachBtn: { flexShrink: 0, width: 44, height: 44, borderRadius: 14, background: '#F8FAFF', border: '1px solid #E7E9F4', cursor: 'pointer', color: 'var(--gray)', display: 'grid', placeItems: 'center' },
  heroAttachBtn: { alignSelf: 'end', width: 44, height: 44, borderRadius: 10, background: '#fff', border: '1px solid #E4E4EA', cursor: 'pointer', color: '#09090B', display: 'grid', placeItems: 'center' },
  composerInput: { flex: 1, minWidth: 0, minHeight: 46, maxHeight: 118, border: 'none', outline: 'none', padding: '13px 8px', fontSize: 16, lineHeight: 1.35, background: 'transparent', color: 'var(--ink)', resize: 'none', overflowY: 'auto', fontFamily: 'inherit' },
  heroComposerInput: { alignSelf: 'stretch', width: '100%', minWidth: 0, minHeight: 150, maxHeight: 168, border: 'none', outline: 'none', padding: '12px 4px', fontSize: 17, lineHeight: 1.4, background: 'transparent', color: 'var(--ink)', resize: 'none', overflowY: 'auto', fontFamily: 'inherit' },
  sendBtn: { width: 46, height: 46, borderRadius: 15, border: 'none', background: 'var(--indigo)', color: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 14px 28px rgba(55,48,232,.18)' },
  heroSendBtn: { alignSelf: 'end', width: 44, height: 44, borderRadius: 10, border: 'none', background: '#EFEFF4', color: '#7A7A86', display: 'grid', placeItems: 'center', boxShadow: 'none' },
  stopBtn: { width: 46, height: 46, borderRadius: 15, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#B91C1C', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 14px 28px rgba(220,38,38,.12)' },
  heroStopBtn: { alignSelf: 'end', width: 44, height: 44, borderRadius: 12, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#B91C1C', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 10px 22px rgba(220,38,38,.1)' },
  attachmentTray: { width: '100%', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '4px 4px 0' },
  composerImageAttachment: { position: 'relative', width: 64, height: 64, borderRadius: 14, border: '1px solid var(--border)', background: '#fff', boxShadow: '0 8px 20px rgba(15,23,42,.1)', overflow: 'visible' },
  composerAttachmentImage: { display: 'block', width: '100%', height: '100%', borderRadius: 13, objectFit: 'cover', background: 'var(--lavender)' },
  composerFileAttachment: { position: 'relative', width: 168, height: 58, borderRadius: 14, border: '1px solid var(--border)', background: '#fff', boxShadow: '0 8px 20px rgba(15,23,42,.08)', padding: '9px 36px 9px 10px', display: 'flex', alignItems: 'center' },
  composerFileAttachmentBody: { display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, color: 'var(--indigo)' },
  composerFileIcon: { width: 30, height: 30, borderRadius: 9, background: 'var(--lavender)', display: 'grid', placeItems: 'center', flexShrink: 0 },
  composerFileAttachmentName: { overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: 11, fontWeight: 800, color: 'var(--ink)' },
  composerFileAttachmentMeta: { marginTop: 1, fontSize: 10, fontWeight: 700, color: 'var(--gray)' },
  messageAttachmentStack: { display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', maxWidth: '100%' },
  sentImageAttachment: { width: 112, height: 112, borderRadius: 16, border: '1px solid var(--border)', background: '#fff', overflow: 'hidden', boxShadow: '0 10px 26px rgba(15,23,42,.08)' },
  sentAttachmentImage: { display: 'block', width: '100%', height: '100%', objectFit: 'cover', background: 'var(--lavender)' },
  sentFileAttachment: { minWidth: 230, maxWidth: 320, minHeight: 64, borderRadius: 16, border: '1px solid var(--border)', background: '#fff', boxShadow: '0 10px 26px rgba(15,23,42,.08)', padding: '10px 14px', display: 'flex', alignItems: 'center' },
  sentFileAttachmentBody: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, color: 'var(--indigo)' },
  sentFileIcon: { width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, var(--indigo), var(--purple))', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 },
  sentFileAttachmentName: { overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: 13, fontWeight: 800, color: 'var(--ink)' },
  sentFileAttachmentMeta: { marginTop: 2, fontSize: 11, fontWeight: 700, color: 'var(--gray)' },
  removeAttachmentBtn: { position: 'absolute', top: -8, right: -8, width: 36, height: 36, borderRadius: 999, border: '1px solid rgba(255,255,255,.7)', background: 'rgba(15,23,42,.94)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 20, lineHeight: 1, boxShadow: '0 8px 18px rgba(15,23,42,.24)' },
  modalOverlay: { position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center', padding: 18, background: 'rgba(15,23,42,.34)', backdropFilter: 'blur(6px)' },
  modalCard: { width: 'min(430px, 100%)', borderRadius: 20, border: '1px solid rgba(226,232,240,.95)', background: '#fff', boxShadow: '0 28px 80px rgba(15,23,42,.22)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 },
  modalTitle: { margin: 0, fontSize: 18, lineHeight: 1.2, fontWeight: 800, color: 'var(--ink)' },
  modalCopy: { margin: '6px 0 0', fontSize: 13, lineHeight: 1.45, color: 'var(--gray)' },
  modalInput: { width: '100%', boxSizing: 'border-box', borderRadius: 12, border: '1px solid rgba(55,48,232,.24)', background: 'var(--surface)', color: 'var(--ink)', padding: '12px 13px', outline: 'none', fontSize: 14, fontWeight: 700 },
  modalError: { marginTop: -4, padding: '9px 11px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12, fontWeight: 800 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' },
  modalGhostBtn: { height: 44, padding: '0 18px', borderRadius: 999, border: '1px solid var(--border)', background: '#fff', color: 'var(--ink)', fontSize: 13, fontWeight: 800, cursor: 'pointer' },
  modalPrimaryBtn: { height: 44, padding: '0 20px', borderRadius: 999, border: 'none', background: 'var(--indigo)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 24px rgba(55,48,232,.22)' },
  modalDangerBtn: { background: '#DC2626', boxShadow: '0 10px 24px rgba(220,38,38,.2)' },
};
