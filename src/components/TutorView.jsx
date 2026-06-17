import { useEffect, useRef, useState } from 'react';
import { Brain, MsgCircle, Paperclip, Plus, Send } from '../lib/icons';
import useIsMobile from '../lib/useIsMobile';
import { askTutor } from '../services/ai';
import { extractTextFromFile } from '../services/materials';
import { createTutorSession, listTutorSessions, updateTutorSession } from '../services/tutorSessions';

/* ===================== AI TUTOR ===================== */
const INITIAL_MSGS = [
  { who: 'ai', text: "Hi! I'm your AI tutor. What would you like to study today?" },
];

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

async function prepareTutorAttachments(files) {
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
          note: 'Image is too large to read inline in AI Tutor.',
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
          note: 'PDF is too large to read inline in AI Tutor.',
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
          note: result.error?.message || result.data?.extractionError || 'PDF has no selectable text. OCR is not available in AI Tutor yet.',
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
      note: 'Unsupported file type for direct AI Tutor reading.',
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

export default function TutorView() {
  const isMobile = useIsMobile();
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [msgs, setMsgs] = useState(INITIAL_MSGS);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [aiError, setAiError] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const fileRef = useRef(null);
  const endRef = useRef(null);

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
        setMsgs(INITIAL_MSGS);
        setLoadingSessions(false);
        return;
      }

      if ((result.data || []).length > 0) {
        const first = result.data[0];
        setSessions(result.data);
        setActiveId(first.id);
        setMsgs(first.msgs?.length ? first.msgs : INITIAL_MSGS);
        setLoadingSessions(false);
        return;
      }

      const createResult = await createTutorSession({ title: 'New conversation', msgs: INITIAL_MSGS });
      if (cancelled) return;
      if (createResult.error) {
        setAiError(formatAiError(createResult.error));
        setSessions([]);
        setMsgs(INITIAL_MSGS);
      } else {
        setSessions([createResult.data]);
        setActiveId(createResult.data.id);
        setMsgs(createResult.data.msgs?.length ? createResult.data.msgs : INITIAL_MSGS);
      }
      setLoadingSessions(false);
    }

    loadSessions();
    return () => { cancelled = true; };
  }, []);

  const formatAiError = (error) => {
    if (!error) return 'AI request failed.';
    if (error.code === 'AI_QUOTA_EXCEEDED') return 'Daily AI quota reached. Try again tomorrow.';
    if (error.code === 'AI_PROVIDER_UNAVAILABLE') return 'AI provider is not configured. Showing fallback when available.';
    return error.message || 'AI request failed.';
  };

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
    const nextTitle = activeSession?.title === 'New conversation' && text
      ? text.slice(0, 42)
      : null;
    let preparedAttachments = [];
    try {
      preparedAttachments = await prepareTutorAttachments(files);
    } catch {
      setAiError('Could not read the selected file. Try another image or text file.');
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
          currentSubject: activeSession?.title && activeSession.title !== 'New conversation' ? activeSession.title : null,
          preferredDepth: /quick|brief|short/i.test(text) ? 'quick' : /deep|detail|well/i.test(text) ? 'deep' : 'standard',
          weakTopics: [],
          examGoals: [],
          history: msgs.slice(-8),
          attachments: preparedAttachments,
        },
      });
      const reply = result.data?.text || 'No answer returned.';
      if (result.error) setAiError(formatAiError(result.error));
      setMsgs(m => {
        const next = [...m, { who: 'ai', text: result.error ? formatAiError(result.error) : reply }];
        setSessions(prev => prev.map(s => s.id === activeId ? { ...s, msgs: next } : s));
        persistSession(sessionId, next, nextTitle);
        return next;
      });
    } catch {
      const message = 'AI provider unavailable. Try again later.';
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
    const init = [{ who: 'ai', text: "Hi! I'm your AI tutor. What would you like to explore today?" }];
    const result = await createTutorSession({ title: 'New conversation', msgs: init });
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

  const suggestions = ['Explain a concept', 'Make a study plan', 'Quiz me on my notes', 'Create a quick recap'];

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
          <Plus size={13} /> New chat
        </button>
        <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'var(--gray-2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Recent</p>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {loadingSessions && <div style={{ fontSize: 12, color: 'var(--gray)', padding: '8px 10px' }}>Loading...</div>}
          {!loadingSessions && sessions.map(s => (
            <button key={s.id} onClick={() => switchSession(s)} style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 8, background: s.id === activeId ? 'var(--lavender)' : 'transparent', border: `1px solid ${s.id === activeId ? 'rgba(55,48,232,.18)' : 'transparent'}`, cursor: 'pointer', width: '100%' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: s.id === activeId ? 'var(--indigo)' : 'var(--ink)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginBottom: 2 }}>{s.title}</div>
              <div style={{ fontSize: 11, color: 'var(--gray)' }}>{s.date}</div>
            </button>
          ))}
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
                <span style={tutorS.onlineDot} /> Online • Powered by Lockeen AI
              </p>
            </div>
          </div>
          {isMobile && (
            <button onClick={() => setHistoryOpen(p => !p)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 999, border: '1px solid var(--border)', background: historyOpen ? 'var(--lavender)' : 'var(--surface)', color: historyOpen ? 'var(--indigo)' : 'var(--ink)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <MsgCircle size={14} /> History
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
                    aria-label={`Remove ${file.name}`}
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
                  setAiError(`You can attach up to ${MAX_TUTOR_FILES} files.`);
                } else {
                  setAiError('');
                }
                return next;
              });
              e.target.value = '';
            }}
          />
          <button type="button" onClick={() => fileRef.current.click()} title="Attach file" style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)', display: 'grid', placeItems: 'center' }}>
            <Paperclip size={16} />
          </button>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything…" style={tutorS.composerInput} />
          <button type="submit" disabled={typing} style={{ ...tutorS.sendBtn, opacity: typing ? .6 : 1, cursor: typing ? 'not-allowed' : 'pointer' }} aria-label="Send"><Send size={16} /></button>
          </div>
        </form>
      </div>

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
};
