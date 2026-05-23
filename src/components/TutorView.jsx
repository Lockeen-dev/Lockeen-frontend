import { useEffect, useRef, useState } from 'react';
import { Brain, MsgCircle, Paperclip, Plus, Send } from '../lib/icons';
import useIsMobile from '../lib/useIsMobile';
import { askTutor } from '../services/ai';

/* ===================== AI TUTOR ===================== */
const SEED_MSGS = [
  { who: 'ai', text: "Hi Alex! I'm your AI tutor. What subject would you like to explore today?" },
  { who: 'user', text: "Can you help me understand derivatives in calculus?" },
  { who: 'ai', text: "Absolutely — derivatives measure how a function changes as its input changes. They're the foundation of calculus and incredibly useful in physics, economics, and engineering." },
];

export default function TutorView() {
  const isMobile = useIsMobile();
  const [sessions, setSessions] = useState([
    { id: 1, title: 'Calculus — Derivatives', date: 'Today', msgs: SEED_MSGS },
    { id: 2, title: 'Photosynthesis overview', date: 'Yesterday', msgs: [
      { who: 'ai', text: "Hello! What would you like to study today?" },
      { who: 'user', text: "Summarize photosynthesis for me" },
      { who: 'ai', text: "Photosynthesis converts light energy into chemical energy stored as glucose. Plants absorb CO₂ and water, then use sunlight (captured by chlorophyll) to produce glucose and oxygen via the Calvin cycle." },
    ]},
    { id: 3, title: 'WWII key events', date: '2 days ago', msgs: [
      { who: 'ai', text: "Hello! What would you like to study today?" },
      { who: 'user', text: "Quiz me on WWII" },
      { who: 'ai', text: "Great! First question: In what year did World War II begin, and which country's invasion triggered it?" },
    ]},
  ]);
  const [activeId, setActiveId] = useState(1);
  const [msgs, setMsgs] = useState(SEED_MSGS);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [aiError, setAiError] = useState('');
  const [files, setFiles] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const fileRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollTo({ top: endRef.current.scrollHeight, behavior: 'smooth' }); }, [msgs, typing]);
  useEffect(() => { if (!isMobile) setHistoryOpen(true); else setHistoryOpen(false); }, [isMobile]);

  const formatAiError = (error) => {
    if (!error) return 'AI request failed.';
    if (error.code === 'AI_QUOTA_EXCEEDED') return 'Daily AI quota reached. Try again tomorrow.';
    if (error.code === 'AI_PROVIDER_UNAVAILABLE') return 'AI provider is not configured. Showing fallback when available.';
    return error.message || 'AI request failed.';
  };

  const send = async () => {
    const text = input.trim();
    if (!text && files.length === 0) return;
    const fileNote = files.length > 0 ? ` [Attached: ${files.map(f => f.name).join(', ')}]` : '';
    const fullText = text + fileNote;
    setMsgs(m => {
      const next = [...m, { who: 'user', text: fullText }];
      setSessions(prev => prev.map(s => s.id === activeId ? { ...s, msgs: next } : s));
      return next;
    });
    setInput('');
    setFiles([]);
    setAiError('');
    setTyping(true);
    try {
      const result = await askTutor({
        prompt: fullText,
        context: {
          history: msgs.slice(-8),
          attachments: files.map(f => ({ name: f.name, type: f.type, size: f.size })),
        },
      });
      const reply = result.data?.text || 'No answer returned.';
      if (result.error) setAiError(formatAiError(result.error));
      setMsgs(m => {
        const next = [...m, { who: 'ai', text: result.error ? formatAiError(result.error) : reply }];
        setSessions(prev => prev.map(s => s.id === activeId ? { ...s, msgs: next } : s));
        return next;
      });
    } catch {
      const message = 'AI provider unavailable. Try again later.';
      setAiError(message);
      setMsgs(m => {
        const next = [...m, { who: 'ai', text: message }];
        setSessions(prev => prev.map(s => s.id === activeId ? { ...s, msgs: next } : s));
        return next;
      });
    } finally {
      setTyping(false);
    }
  };

  const newChat = () => {
    const id = Date.now();
    const init = [{ who: 'ai', text: "Hi! I'm your AI tutor. What would you like to explore today?" }];
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    setSessions(prev => [{ id, title: 'New conversation', date: dateStr, msgs: init }, ...prev]);
    setActiveId(id);
    setMsgs(init);
    if (isMobile) setHistoryOpen(false);
  };

  const switchSession = (s) => {
    setActiveId(s.id);
    setMsgs(s.msgs);
    setFiles([]);
    if (isMobile) setHistoryOpen(false);
  };

  const suggestions = ['Explain Newton\'s laws', 'Help me with quadratic equations', 'Summarize photosynthesis', 'Quiz me on WWII'];

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
          {sessions.map(s => (
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
                <div style={m.who === 'user' ? tutorS.bubbleUser : tutorS.bubbleAI}>{m.text}</div>
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

        <div style={tutorS.suggestRow}>
          {suggestions.map(s => (
            <button key={s} onClick={() => setInput(s)} style={tutorS.suggestChip}>{s}</button>
          ))}
        </div>
        {aiError && <div style={tutorS.errorBox}>{aiError}</div>}

        {files.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            {files.map((f, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: 'var(--lavender)', border: '1px solid rgba(55,48,232,.2)', fontSize: 11, fontWeight: 600, color: 'var(--indigo)' }}>
                <Paperclip size={10} />{f.name}
                <button type="button" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 2px', color: 'var(--gray)', fontSize: 14, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); send(); }} style={tutorS.composer}>
          <input type="file" multiple ref={fileRef} style={{ display: 'none' }} onChange={e => { setFiles(prev => [...prev, ...Array.from(e.target.files)].slice(0, 5)); e.target.value = ''; }} />
          <button type="button" onClick={() => fileRef.current.click()} title="Attach file" style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)', display: 'grid', placeItems: 'center' }}>
            <Paperclip size={16} />
          </button>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything…" style={tutorS.composerInput} />
          <button type="submit" disabled={typing} style={{ ...tutorS.sendBtn, opacity: typing ? .6 : 1, cursor: typing ? 'not-allowed' : 'pointer' }} aria-label="Send"><Send size={16} /></button>
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
  bubbleAI:   { maxWidth: '78%', background: 'var(--bubble-ai-bg)', color: 'var(--ink)', padding: '12px 16px', borderRadius: 18, borderTopLeftRadius: 6, fontSize: 14, lineHeight: 1.5 },
  bubbleUser: { maxWidth: '78%', background: 'var(--indigo)', color: '#fff', padding: '12px 16px', borderRadius: 18, borderTopRightRadius: 6, fontSize: 14, lineHeight: 1.5 },
  typingDot: { width: 8, height: 8, borderRadius: 999, background: 'var(--gray-2)', animation: 'tdot 1s infinite ease-in-out' },
  suggestRow: { display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' },
  suggestChip: { padding: '8px 12px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)', fontWeight: 500, fontSize: 12 },
  errorBox: { marginBottom: 8, padding: '10px 12px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: 13, fontWeight: 600 },
  composer: { display: 'flex', alignItems: 'center', gap: 10, padding: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 },
  composerInput: { flex: 1, border: 'none', outline: 'none', padding: '10px 12px', fontSize: 14, background: 'transparent', color: 'var(--ink)' },
  sendBtn: { width: 40, height: 40, borderRadius: 12, background: 'var(--indigo)', color: '#fff', display: 'grid', placeItems: 'center' },
};
