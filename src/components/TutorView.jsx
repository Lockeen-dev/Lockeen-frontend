import { useEffect, useRef, useState } from 'react';
import { Brain, MsgCircle, Paperclip, Pencil, Pin, Plus, Send, Trash2 } from '../lib/icons';
import useIsMobile from '../lib/useIsMobile';
import { askTutor } from '../services/ai';
import { extractTextFromFile } from '../services/materials';
import { createTutorSession, deleteTutorSession, listTutorSessions, updateTutorSession } from '../services/tutorSessions';
import { tt } from '../lib/i18n';

/* ===================== AI TUTOR ===================== */
const UNTITLED_SESSION_TITLES = new Set(['New conversation', 'Nuova conversazione']);

function initialTutorMsgs(lang = 'en') {
  return [{ who: 'ai', text: tt(lang, 'tutorWelcome') }];
}

function isUntitledSessionTitle(title) {
  return !title || UNTITLED_SESSION_TITLES.has(String(title).trim());
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

export default function TutorView({ lang = 'en' }) {
  const isMobile = useIsMobile();
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [msgs, setMsgs] = useState(() => initialTutorMsgs(lang));
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [aiError, setAiError] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const fileRef = useRef(null);
  const endRef = useRef(null);

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

  useEffect(() => { endRef.current?.scrollTo({ top: endRef.current.scrollHeight, behavior: 'smooth' }); }, [msgs, typing]);
  useEffect(() => { if (!isMobile) setHistoryOpen(true); else setHistoryOpen(false); }, [isMobile]);
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
        const first = result.data[0];
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
  }, [lang]);

  const persistSession = async (sessionId, nextMsgs, nextTitle) => {
    if (!sessionId) return;
    const patch = { msgs: nextMsgs };
    if (nextTitle) patch.title = nextTitle;
    const result = await updateTutorSession(sessionId, patch);
    if (result.error) setAiError(formatAiError(result.error));
    else setSessions(prev => prev.map(s => String(s.id) === String(sessionId) ? result.data : s));
  };

  const send = async () => {
    const text = input.trim();
    if (!text && files.length === 0) return;
    const fileNote = files.length > 0 ? ` [Attached: ${files.map(f => f.name).join(', ')}]` : '';
    const fullText = text + fileNote;
    const sessionId = activeId;
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

    let userMsgs = [];
    setMsgs(m => {
      const next = [...m, { who: 'user', text: fullText }];
      userMsgs = next;
      setSessions(prev => prev.map(s => s.id === activeId ? { ...s, msgs: next } : s));
      return next;
    });
    setInput('');
    setFiles([]);
    setAiError('');
    setTyping(true);
    await persistSession(sessionId, userMsgs, nextTitle);
    try {
      const result = await askTutor({
        prompt: fullText,
        context: {
          currentSubject: !isUntitledSessionTitle(activeSession?.title) ? activeSession.title : null,
          preferredDepth: /quick|brief|short/i.test(text) ? 'quick' : /deep|detail|well/i.test(text) ? 'deep' : 'standard',
          weakTopics: [],
          examGoals: [],
          history: msgs.slice(-8),
          attachments: preparedAttachments,
        },
      });
      const reply = result.data?.text || tt(lang, 'noAnswerReturned');
      if (result.error) setAiError(formatAiError(result.error));
      setMsgs(m => {
        const next = [...m, { who: 'ai', text: result.error ? formatAiError(result.error) : reply }];
        setSessions(prev => prev.map(s => s.id === activeId ? { ...s, msgs: next } : s));
        persistSession(sessionId, next, nextTitle);
        return next;
      });
    } catch {
      const message = tt(lang, 'aiUnavailableLater');
      setAiError(message);
      setMsgs(m => {
        const next = [...m, { who: 'ai', text: message }];
        setSessions(prev => prev.map(s => s.id === activeId ? { ...s, msgs: next } : s));
        persistSession(sessionId, next, nextTitle);
        return next;
      });
    } finally {
      setTyping(false);
    }
  };

  const newChat = async () => {
    const init = initialTutorMsgs(lang);
    const result = await createTutorSession({ title: tt(lang, 'newConversation'), msgs: init });
    if (result.error) {
      setAiError(formatAiError(result.error));
      return;
    }
    setSessions(prev => [result.data, ...prev]);
    setActiveId(result.data.id);
    setMsgs(init);
    if (isMobile) setHistoryOpen(false);
  };

  const switchSession = (s) => {
    setActiveId(s.id);
    setMsgs(s.msgs);
    setFiles([]);
    if (isMobile) setHistoryOpen(false);
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
    setSessions(prev => prev.map(s => String(s.id) === String(renameTarget.id) ? result.data : s));
    setRenameTarget(null);
    setRenameDraft('');
  };

  const togglePinned = async (session) => {
    const result = await updateTutorSession(session.id, { pinned: !session.pinned });
    if (result.error) {
      setAiError(formatAiError(result.error));
      return;
    }
    setSessions(prev => prev
      .map(s => String(s.id) === String(session.id) ? result.data : s)
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
        return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
      }));
  };

  const confirmDeleteSession = async () => {
    if (!deleteTarget) return;

    const result = await deleteTutorSession(deleteTarget.id);
    if (result.error) {
      setAiError(formatAiError(result.error));
      return;
    }

    setSessions(prev => {
      const remaining = prev.filter(s => String(s.id) !== String(deleteTarget.id));
      if (String(activeId) === String(deleteTarget.id)) {
        const next = remaining[0];
        setActiveId(next?.id || null);
        setMsgs(next?.msgs?.length ? next.msgs : initialTutorMsgs(lang));
      }
      return remaining;
    });
    setFiles([]);
    setDeleteTarget(null);
  };

  const pinnedSessions = sessions.filter(s => s.pinned);
  const recentSessions = sessions.filter(s => !s.pinned);
  const suggestions = [
    tt(lang, 'explainConcept'),
    tt(lang, 'makeStudyPlan'),
    tt(lang, 'quizMe'),
    tt(lang, 'createRecap'),
  ];

  const renderSessionItem = (s) => {
    const isActive = s.id === activeId;
    return (
      <div key={s.id} style={{ ...tutorS.historyItem, ...(isActive ? tutorS.historyItemActive : {}) }}>
        <button type="button" onClick={() => switchSession(s)} style={{ ...tutorS.historyMain, paddingRight: isActive ? 82 : 10 }}>
          <div style={{ ...tutorS.historyTitle, color: isActive ? 'var(--indigo)' : 'var(--ink)' }}>{s.title}</div>
          <div style={tutorS.historyDate}>{s.date}</div>
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

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 0, minHeight: isMobile ? 'calc(100vh - 190px)' : 560 }}>
      {/* Chat history sidebar */}
      {(!isMobile || historyOpen) && <div style={{
        width: isMobile ? '100%' : 176,
        flexShrink: 0,
        borderRight: isMobile ? 'none' : '1px solid var(--border)',
        borderBottom: isMobile ? '1px solid var(--border)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        paddingRight: isMobile ? 0 : 12,
        paddingBottom: isMobile ? 12 : 0,
        marginBottom: isMobile ? 14 : 0,
        maxHeight: isMobile ? 220 : 'none',
      }}>
        <button onClick={newChat} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '9px 12px', borderRadius: 10, background: 'var(--indigo)', color: '#fff', fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer', marginBottom: 12 }}>
          <Plus size={13} /> {tt(lang, 'newChat')}
        </button>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {loadingSessions && <div style={{ fontSize: 12, color: 'var(--gray)', padding: '8px 10px' }}>{tt(lang, 'loading')}</div>}
          {!loadingSessions && pinnedSessions.length > 0 && (
            <>
              <p style={tutorS.historyLabel}>{tt(lang, 'pinned')}</p>
              {pinnedSessions.map(renderSessionItem)}
            </>
          )}
          {!loadingSessions && (
            <>
              <p style={tutorS.historyLabel}>{tt(lang, 'recent')}</p>
              {recentSessions.map(renderSessionItem)}
              {sessions.length === 0 && <div style={{ fontSize: 12, color: 'var(--gray)', padding: '8px 10px' }}>{tt(lang, 'noChatsYet')}</div>}
            </>
          )}
        </div>
      </div>}

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingLeft: isMobile ? 0 : 20, minWidth: 0 }}>
        <div style={tutorS.head}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={tutorS.avatar}><Brain size={18} /></div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>AI Tutor</h2>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--gray)' }}>
                <span style={tutorS.onlineDot} /> {tt(lang, 'tutorOnline')}
              </p>
            </div>
          </div>
          {isMobile && (
            <button onClick={() => setHistoryOpen(p => !p)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 999, border: '1px solid var(--border)', background: historyOpen ? 'var(--lavender)' : 'var(--surface)', color: historyOpen ? 'var(--indigo)' : 'var(--ink)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <MsgCircle size={14} /> {tt(lang, 'history')}
            </button>
          )}
        </div>

        <div ref={endRef} style={tutorS.thread}>
          {msgs.map((m, i) => {
            const isNew = i >= msgs.length - 1;
            return (
              <div key={i} style={{ display: 'flex', justifyContent: m.who === 'user' ? 'flex-end' : 'flex-start', animation: isNew ? (m.who === 'user' ? 'msgSlideRight .22s cubic-bezier(.22,1,.36,1)' : 'msgSlideLeft .22s cubic-bezier(.22,1,.36,1)') : 'none' }}>
                <div style={m.who === 'user' ? tutorS.bubbleUser : tutorS.bubbleAI}>
                  {m.who === 'ai' ? <MarkdownMessage text={m.text} /> : m.text}
                </div>
              </div>
            );
          })}
          {typing && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', animation: 'msgSlideLeft .22s cubic-bezier(.22,1,.36,1)' }}>
              <div style={{ ...tutorS.bubbleAI, display: 'flex', gap: 6, padding: '14px 18px' }}>
                <span style={tutorS.typingDot} /><span style={{ ...tutorS.typingDot, animationDelay: '.15s' }} /><span style={{ ...tutorS.typingDot, animationDelay: '.3s' }} />
              </div>
            </div>
          )}
        </div>

        {files.length === 0 && (
          <div style={tutorS.suggestRow}>
            {suggestions.map(s => (
              <button key={s} onClick={() => setInput(s)} style={tutorS.suggestChip}>{s}</button>
            ))}
          </div>
        )}
        {aiError && <div style={tutorS.errorBox}>{aiError}</div>}

        <form onSubmit={(e) => { e.preventDefault(); send(); }} style={tutorS.composer}>
          {filePreviews.length > 0 && (
            <div style={tutorS.attachmentTray}>
              {filePreviews.map((file, i) => (
                <div key={`${file.name}-${i}`} style={file.url ? tutorS.imageAttachment : tutorS.fileAttachment}>
                  {file.url ? (
                    <img src={file.url} alt={file.name} style={tutorS.attachmentImage} />
                  ) : (
                    <div style={tutorS.fileAttachmentBody}>
                      <Paperclip size={15} />
                      <div style={{ minWidth: 0 }}>
                        <div style={tutorS.fileAttachmentName}>{file.name}</div>
                        <div style={tutorS.fileAttachmentMeta}>{file.kind.toUpperCase()}{file.size ? ` · ${file.size}` : ''}</div>
                      </div>
                    </div>
                  )}
                  {file.url && (
                    <div style={tutorS.imageAttachmentMeta}>
                      <span style={tutorS.imageAttachmentName}>{file.name}</span>
                      {file.size && <span>{file.size}</span>}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                    aria-label={tt(lang, 'removeFile', { name: file.name })}
                    style={tutorS.removeAttachmentBtn}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={tutorS.composerRow}>
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
          <button type="button" onClick={() => fileRef.current.click()} title={tt(lang, 'attachFile')} aria-label={tt(lang, 'attachFile')} style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)', display: 'grid', placeItems: 'center' }}>
            <Paperclip size={16} />
          </button>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={tt(lang, 'askAnything')} style={tutorS.composerInput} />
          <button type="submit" disabled={typing} style={{ ...tutorS.sendBtn, opacity: typing ? .6 : 1, cursor: typing ? 'not-allowed' : 'pointer' }} aria-label={tt(lang, 'send')}><Send size={16} /></button>
          </div>
        </form>
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
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' },
  avatar: { width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, var(--indigo), var(--purple))', color: '#fff', display: 'grid', placeItems: 'center' },
  onlineDot: { display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: '#10B981', marginRight: 6, verticalAlign: 'middle' },
  historyLabel: { margin: '10px 0 8px', fontSize: 10, fontWeight: 800, color: 'var(--gray-2)', textTransform: 'uppercase', letterSpacing: '.06em' },
  historyItem: { position: 'relative', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', padding: 0, boxShadow: '0 6px 18px rgba(15,23,42,.035)' },
  historyItemActive: { background: 'var(--lavender)', borderColor: 'rgba(55,48,232,.22)', boxShadow: '0 8px 24px rgba(55,48,232,.08)' },
  historyMain: { textAlign: 'left', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', width: '100%' },
  historyTitle: { fontSize: 12, fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginBottom: 2 },
  historyDate: { fontSize: 11, color: 'var(--gray)' },
  historyIconActions: { position: 'absolute', top: 7, right: 7, display: 'flex', alignItems: 'center', gap: 3 },
  historyIconBtn: { width: 22, height: 22, borderRadius: 999, border: '1px solid rgba(55,48,232,.16)', background: '#fff', color: 'var(--indigo)', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0, boxShadow: '0 4px 10px rgba(15,23,42,.06)' },
  historyPinnedIconBtn: { borderColor: 'var(--indigo)', background: 'var(--indigo)', color: '#fff', boxShadow: '0 8px 18px rgba(55,48,232,.2)' },
  historyDangerIconBtn: { borderColor: 'rgba(239,68,68,.22)', background: '#FFF7F7', color: '#B91C1C' },
  thread: { flex: 1, display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 4px', maxHeight: 420, overflowY: 'auto' },
  bubbleAI:   { maxWidth: '82%', background: 'var(--bubble-ai-bg)', color: 'var(--ink)', padding: '14px 16px', borderRadius: 18, borderTopLeftRadius: 6, fontSize: 14, lineHeight: 1.5 },
  bubbleUser: { maxWidth: '78%', background: 'var(--indigo)', color: '#fff', padding: '12px 16px', borderRadius: 18, borderTopRightRadius: 6, fontSize: 14, lineHeight: 1.5 },
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
  suggestRow: { display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' },
  suggestChip: { padding: '8px 12px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)', fontWeight: 500, fontSize: 12 },
  errorBox: { marginBottom: 8, padding: '10px 12px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: 13, fontWeight: 600 },
  composer: { display: 'flex', flexDirection: 'column', gap: 10, padding: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 },
  composerRow: { display: 'flex', alignItems: 'center', gap: 10, width: '100%' },
  composerInput: { flex: 1, border: 'none', outline: 'none', padding: '10px 12px', fontSize: 14, background: 'transparent', color: 'var(--ink)' },
  sendBtn: { width: 40, height: 40, borderRadius: 12, background: 'var(--indigo)', color: '#fff', display: 'grid', placeItems: 'center' },
  attachmentTray: { width: '100%', display: 'flex', alignItems: 'stretch', gap: 10, flexWrap: 'wrap', padding: '4px 4px 0' },
  imageAttachment: { position: 'relative', width: 108, minHeight: 136, borderRadius: 16, border: '1px solid var(--border)', background: '#fff', boxShadow: '0 12px 28px rgba(15,23,42,.1)', overflow: 'hidden' },
  attachmentImage: { display: 'block', width: '100%', height: 96, objectFit: 'cover', background: 'var(--lavender)' },
  imageAttachmentMeta: { display: 'flex', flexDirection: 'column', gap: 2, padding: '7px 8px 8px', fontSize: 10, lineHeight: 1.1, color: 'var(--gray)', fontWeight: 700 },
  imageAttachmentName: { color: 'var(--ink)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  fileAttachment: { position: 'relative', minWidth: 220, maxWidth: 280, minHeight: 82, borderRadius: 16, border: '1px solid var(--border)', background: '#fff', boxShadow: '0 12px 28px rgba(15,23,42,.1)', padding: '14px 44px 14px 14px', display: 'flex', alignItems: 'center' },
  fileAttachmentBody: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, color: 'var(--indigo)' },
  fileAttachmentName: { overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: 13, fontWeight: 800, color: 'var(--ink)' },
  fileAttachmentMeta: { marginTop: 3, fontSize: 11, fontWeight: 700, color: 'var(--gray)' },
  removeAttachmentBtn: { position: 'absolute', top: 7, right: 7, width: 28, height: 28, borderRadius: 999, border: '1px solid rgba(255,255,255,.4)', background: 'rgba(15,23,42,.92)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 20, lineHeight: 1, boxShadow: '0 6px 16px rgba(15,23,42,.22)' },
  modalOverlay: { position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center', padding: 18, background: 'rgba(15,23,42,.34)', backdropFilter: 'blur(6px)' },
  modalCard: { width: 'min(430px, 100%)', borderRadius: 20, border: '1px solid rgba(226,232,240,.95)', background: '#fff', boxShadow: '0 28px 80px rgba(15,23,42,.22)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 },
  modalTitle: { margin: 0, fontSize: 18, lineHeight: 1.2, fontWeight: 800, color: 'var(--ink)' },
  modalCopy: { margin: '6px 0 0', fontSize: 13, lineHeight: 1.45, color: 'var(--gray)' },
  modalInput: { width: '100%', boxSizing: 'border-box', borderRadius: 12, border: '1px solid rgba(55,48,232,.24)', background: 'var(--surface)', color: 'var(--ink)', padding: '12px 13px', outline: 'none', fontSize: 14, fontWeight: 700 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' },
  modalGhostBtn: { height: 38, padding: '0 15px', borderRadius: 999, border: '1px solid var(--border)', background: '#fff', color: 'var(--ink)', fontSize: 13, fontWeight: 800, cursor: 'pointer' },
  modalPrimaryBtn: { height: 38, padding: '0 17px', borderRadius: 999, border: 'none', background: 'var(--indigo)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 24px rgba(55,48,232,.22)' },
  modalDangerBtn: { background: '#DC2626', boxShadow: '0 10px 24px rgba(220,38,38,.2)' },
};
