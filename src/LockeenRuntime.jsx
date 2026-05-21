import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  ArrowRight, BarChart3, Bell, BookOpen, Brain, CalendarIcon, Check, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Coins, Eye, EyeOff, FileText, Flame, Google, GripDots, Icon, Layers, LockeenLogo, LogOut, Moon, MsgCircle, Paperclip, Pause, Pencil, Play, Plus, RefreshCw, Search, Send, SidebarPanel, Sparkles, Stop, Sun, Trash, Trash2, Trend, Trophy, XMark, ZapSolid,
} from './lib/icons';
import { LANG_OPTIONS, tt } from './lib/i18n';
import {
  EXTRA_SUBJECT_COLORS, SUBJECT_COLORS, cellularRespirationCards, cellularRespirationQuestions, chemistryCards, daysLeft, formatExamDate, getSubjectPalette, inferSubjectFromName, makeSampleChapter, mockDashboard, seedExams, seedNotes,
} from './data/mockData';
import AuthModal from './components/AuthModal';
import Sidebar from './components/Sidebar';
import StudyTimer from './components/StudyTimer';
import TutorView from './components/TutorView';
import { FlashcardLanding, FlashcardViewer } from './components/Flashcards';
import { QuizTab } from './components/Quiz';
import useIsMobile from './lib/useIsMobile';
import { SUBJECT_EMOJI, getExamEmoji } from './lib/examUi';
import { NotesView } from './components/NotesView';
import { AnalyticsView, initialWeekData } from './components/AnalyticsView';
import { homeS } from './styles/dashboardStyles';

function LanguageSelect({ lang, onChange, compact = false }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const current = LANG_OPTIONS.find(l => l.value === lang) || LANG_OPTIONS[0];

  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} translate="no" style={{ position:'relative', display:'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        translate="no"
        style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 12px', borderRadius:12, border:'1.5px solid var(--border)', background:'var(--surface)', cursor:'pointer', fontSize:13, fontWeight:600, color:'var(--ink)', whiteSpace:'nowrap', userSelect:'none' }}
      >
        <span translate="no">{current.flag} {current.label}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div translate="no" style={{ position:'absolute', top:'calc(100% + 6px)', right:0, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,.12)', zIndex:9999, minWidth:80, overflow:'hidden' }}>
          {LANG_OPTIONS.map(l => (
            <button key={l.value} type="button" translate="no"
              onClick={() => { onChange(l.value); setOpen(false); }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:7, padding:'9px 14px', background: l.value === lang ? 'var(--lavender)' : 'transparent', color: l.value === lang ? 'var(--indigo)' : 'var(--ink)', fontWeight: l.value === lang ? 700 : 500, fontSize:13, cursor:'pointer', border:'none', textAlign:'left', whiteSpace:'nowrap' }}>
              <span translate="no">{l.flag} {l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== ROOT APP ===================== */
export default function LockeenRuntime() {
  const [authed, setAuthed] = useState(() => localStorage.getItem('lockeen-authed') === '1');
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lockeen-user')) || { name: 'Alex', email: 'alex@lockeen.com' }; }
    catch { return { name: 'Alex', email: 'alex@lockeen.com' }; }
  });
  const [modal, setModal] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem('lockeen-lang') || 'en');
  const [pageAppEl, setPageAppEl] = useState(null);

  useEffect(() => {
    setPageAppEl(document.getElementById('page-app'));
    const saved = localStorage.getItem('lockeen-theme');
    if (saved === 'dark') {
      setDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    // Restore session: if user was logged in, skip landing page
    if (localStorage.getItem('lockeen-authed') === '1') {
      if (window.showPage) window.showPage('page-app');
    }
  }, []);

  useEffect(() => {
    window.openAuth = (m) => setModal(m === 'signup' ? 'signup' : 'signin');
    window.closeAuth = () => setModal(null);
    window.signOut = () => {
      setAuthed(false);
      setModal(null);
      localStorage.removeItem('lockeen-authed');
      localStorage.removeItem('lockeen-user');
      if (window.showPage) window.showPage('page-landing');
    };
    return () => {
      window.openAuth = undefined;
      window.closeAuth = undefined;
      window.signOut = undefined;
    };
  }, []);

  useEffect(() => {
    function onLang(e) {
      const next = e.detail?.lang || localStorage.getItem('lockeen-lang') || 'en';
      setLang(next);
    }
    window.addEventListener('lockeen-language', onLang);
    return () => window.removeEventListener('lockeen-language', onLang);
  }, []);

  function changeLang(next) {
    setLang(next);
    if (window.setLockeenLanguage) window.setLockeenLanguage(next);
    else localStorage.setItem('lockeen-lang', next);
  }

  const handleAuth = (u) => {
    setUser(u);
    setAuthed(true);
    setModal(null);
    localStorage.setItem('lockeen-authed', '1');
    localStorage.setItem('lockeen-user', JSON.stringify(u));
    if (window.showPage) window.showPage('page-app');
  };

  const handleLogout = () => {
    setAuthed(false);
    setModal(null);
    localStorage.removeItem('lockeen-authed');
    localStorage.removeItem('lockeen-user');
    if (window.showPage) window.showPage('page-landing');
  };

  function toggleDark() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('lockeen-theme', next ? 'dark' : 'light');
  }

  return (
    <React.Fragment>
      {modal && (
        <AuthModal
          initialMode={modal}
          onAuth={handleAuth}
          onClose={() => setModal(null)}
          darkMode={darkMode}
        />
      )}
      {authed && pageAppEl && createPortal(
        <Dashboard user={user} onLogout={handleLogout} darkMode={darkMode} toggleDark={toggleDark} lang={lang} onLangChange={changeLang} />,
        pageAppEl
      )}
    </React.Fragment>
  );
}

/* ===================== DASHBOARD SHELL ===================== */
function BottomNav({ tab, setTab, lang = 'en' }) {
  const items = [
    { id: 'dashboard',  label: tt(lang, 'home'),  Icon: ZapSolid },
    { id: 'notes',      label: tt(lang, 'exams'), Icon: BookOpen },
    { id: 'flashcards', label: tt(lang, 'flash'), Icon: Layers },
    { id: 'quiz',       label: tt(lang, 'quiz'),  Icon: Sparkles },
    { id: 'analytics',  label: tt(lang, 'stats'), Icon: BarChart3 },
  ];
  return (
    <nav style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:1000, background:'var(--surface)', borderTop:'1px solid var(--border)', display:'flex', paddingBottom:'env(safe-area-inset-bottom, 0px)' }}>
      {items.map(({ id, label, Icon: I }) => {
        const active = id === tab;
        return (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, border:'none', background:'none', padding:'8px 0 6px', color: active ? 'var(--indigo)' : 'var(--gray)', cursor:'pointer', minHeight:56 }}>
            <I size={20} />
            <span style={{ fontSize:10, fontWeight:600, lineHeight:1 }}>{label}</span>
            {active && <span style={{ position:'absolute', bottom:0, width:24, height:3, borderRadius:999, background:'var(--indigo)', marginTop:2 }} />}
          </button>
        );
      })}
    </nav>
  );
}

function Dashboard({ user, onLogout, darkMode, toggleDark, lang = 'en', onLangChange }) {
  const [tab, setTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Welcome to Lockeen! Bell shows your activity here.', ts: Date.now() - 60000, read: false, type: 'info' },
    { id: 2, text: 'Tip: complete a quiz to see your score logged here.', ts: Date.now() - 1800000, read: false, type: 'quiz' },
    { id: 3, text: 'Tip: use the Study Planner in Calendar to schedule sessions.', ts: Date.now() - 3600000, read: false, type: 'plan' },
  ]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    function closePanel(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifPanel(false);
    }
    if (showNotifPanel) {
      document.addEventListener('mousedown', closePanel);
      return () => document.removeEventListener('mousedown', closePanel);
    }
  }, [showNotifPanel]);

  useEffect(() => {
    function closeProfile(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false);
    }
    if (showProfileMenu) {
      document.addEventListener('mousedown', closeProfile);
      return () => document.removeEventListener('mousedown', closeProfile);
    }
  }, [showProfileMenu]);

  function addNotification(text, type) {
    setNotifications(prev => [{ id: Date.now() + Math.random(), text, ts: Date.now(), read: false, type: type || 'info' }, ...prev].slice(0, 40));
  }

  const unreadCount = notifications.filter(n => !n.read).length;
  function markAllRead() { setNotifications(prev => prev.map(n => ({ ...n, read: true }))); }
  function clearAll() { setNotifications([]); setShowNotifPanel(false); }
  const [exams, setExams] = useState(seedExams);
  const [activeExamId, setActiveExamId] = useState(null);
  const [themeSpin, setThemeSpin] = useState(0);
  const [flashcardDeck, setFlashcardDeck] = useState({
    noteId: 1,
    subject: 'Biology',
    title: 'Cellular Respiration',
    cards: cellularRespirationCards,
  });
  const [quizDeck, setQuizDeck] = useState({
    noteId: 1,
    subject: 'Biology',
    title: 'Cellular Respiration',
    questions: cellularRespirationQuestions,
  });
  const [quizHistory, setQuizHistory] = useState({});
  const [quizRuns, setQuizRuns] = useState([]);
  const [flashHistory, setFlashHistory] = useState({});
  const [recentFlashDecks, setRecentFlashDecks] = useState([]);
  const [flashLanding, setFlashLanding] = useState(true);
  const [weekData, setWeekData] = useState(initialWeekData);
  const [recommendedQuizDone, setRecommendedQuizDone] = useState(false);
  const [recommendedFlashDone, setRecommendedFlashDone] = useState(false);

  function handleSessionSaved(mins) {
    const labels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const today = labels[new Date().getDay()];
    setWeekData(prev => prev.map(d => d.day === today ? { ...d, mins: d.mins + mins } : d));
    addNotification(`Study session logged: ${mins} min`, 'timer');
  }

  const [plannerOpen, setPlannerOpen]       = useState(false);
  const [plannerNoteId, setPlannerNoteId]     = useState(null);
  const [calEvents, setCalEvents]             = useState(initCalEvents);
  const [timerTrigger, setTimerTrigger]       = useState(null);

  function onStartTimer(mins) { setTimerTrigger({ mins, ts: Date.now() }); }
  function onMarkEventDone(dk, evIdx, evName) {
    setCalEvents(prev => {
      const next = { ...prev };
      const arr = [...(next[dk] || [])];
      arr[evIdx] = { ...arr[evIdx], completed: true };
      next[dk] = arr;
      return next;
    });
    if (evName) addNotification(`Completed: ${evName}`, 'done');
  }

  function handlePlanAdded(evArr) {
    setCalEvents(prev => {
      const next = { ...prev };
      evArr.forEach(({ dateKey, event }) => { next[dateKey] = [...(next[dateKey] || []), event]; });
      return next;
    });
    if (evArr.length > 0) addNotification(`Study plan added: ${evArr.length} session${evArr.length > 1 ? 's' : ''} scheduled`, 'plan');
  }

  function handleExamAdded(dateKey, examEvent) {
    setCalEvents(prev => ({ ...prev, [dateKey]: [...(prev[dateKey] || []), examEvent] }));
  }

  const openExam = (id) => {
    setActiveExamId(id);
    setTab('notes');
  };

  function onQuizComplete(noteId, scorePct, runMeta) {
    if (!noteId) return;
    setQuizHistory(prev => ({
      ...prev,
      [noteId]: [...(prev[noteId] || []), scorePct]
    }));
    if (runMeta?.source === 'dashboardRecommended' || runMeta?.title === mockDashboard.recommendedQuiz.title || runMeta?.subject === 'Biology') {
      setRecommendedQuizDone(true);
    }
    if (runMeta) {
      setQuizRuns(prev => [{ id: Date.now(), score: scorePct, date: new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }), ...runMeta }, ...prev]);
      addNotification(`Quiz complete: ${runMeta.subject || 'Quiz'} · ${scorePct}%`, 'quiz');
    }
  }

  function onFlashComplete(noteId, scorePct) {
    if (!noteId) return;
    setFlashHistory(prev => ({ ...prev, [noteId]: [...(prev[noteId] || []), scorePct] }));
    if (flashcardDeck?._meta?.source === 'dashboardRecommended' || flashcardDeck?.title === mockDashboard.recommendedFlashcards.title || flashcardDeck?.subject === 'Chemistry') {
      setRecommendedFlashDone(true);
    }
    addNotification(`Flashcards done: ${flashcardDeck.subject} · ${scorePct}%`, 'flash');
    setRecentFlashDecks(prev => {
      const next = prev.filter(d => d.title !== flashcardDeck.title);
      return [{ ...flashcardDeck, lastScore: scorePct, ts: Date.now() }, ...next].slice(0, 12);
    });
  }

  const openFlashcards = (deck) => {
    const { noteId, subject, title, cards } = deck;
    setFlashcardDeck({ noteId, subject, title, cards, _meta: deck._meta });
    setActiveExamId(null);
    setFlashLanding(false);
    setTab('flashcards');
  };

  const openQuiz = (deck) => {
    const { noteId, subject, title, questions } = deck;
    setQuizDeck({ noteId, subject, title, questions, _meta: deck._meta });
    setActiveExamId(null);
    setTab('quiz');
  };

  const openQuizForExam = (examId) => {
    setQuizDeck({ _examId: examId, questions: [] });
    setActiveExamId(null);
    setTab('quiz');
  };

  const handleSetTab = (t) => {
    if (t !== 'notes') setActiveExamId(null);
    if (t === 'quiz') setQuizDeck(null);
    if (t === 'tutor') setSidebarCollapsed(true);
    setTab(t);
  };

  return (
    <div style={{ ...shellS.wrap, padding: isMobile ? '12px 0 80px' : '24px clamp(18px, 2.4vw, 40px) 40px' }}>
      {/* Header bar */}
      <header style={{ ...shellS.header, padding: isMobile ? '0 12px 12px' : 0 }}>
        <div style={shellS.headerInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: '#3730E8', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/Lockeen-2.png" alt="Lockeen logo" style={{ width: 58, height: 58, maxWidth: 'none' }} />
            </div>
            <span style={shellS.brand}>Lockeen</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LanguageSelect lang={lang} onChange={onLangChange} compact />
            {/* Notification bell */}
            {!isMobile && <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                type="button"
                style={{ ...shellS.iconBtn, position: 'relative', cursor: 'pointer' }}
                aria-label="Notifications"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotifPanel(p => {
                    const next = !p;
                    if (next) setTimeout(() => markAllRead(), 1200);
                    return next;
                  });
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)', boxSizing: 'border-box' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifPanel && (
                <div style={{ position: 'absolute', top: 46, right: 0, width: 340, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 16px 40px -8px rgba(15,16,53,.25)', zIndex: 9999, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Notifications</span>
                    {notifications.length > 0 && (
                      <button onClick={clearAll} style={{ fontSize: 11, color: 'var(--gray)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Clear all</button>
                    )}
                  </div>
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--gray)', fontSize: 13 }}>No notifications yet</div>
                    ) : notifications.map(n => {
                      const icons = { quiz: '🎯', flash: '🃏', timer: '⏱️', plan: '📅', done: '✅', info: '💡' };
                      const ago = (() => {
                        const s = Math.floor((Date.now() - n.ts) / 1000);
                        if (s < 60) return 'just now';
                        if (s < 3600) return `${Math.floor(s/60)}m ago`;
                        if (s < 86400) return `${Math.floor(s/3600)}h ago`;
                        return `${Math.floor(s/86400)}d ago`;
                      })();
                      return (
                        <div key={n.id} style={{ display: 'flex', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: n.read ? 'transparent' : 'var(--lavender)' }}>
                          <span style={{ fontSize: 16, flexShrink: 0, lineHeight: '20px' }}>{icons[n.type] || '💡'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.4 }}>{n.text}</div>
                            <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>{ago}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>}
            <button
              onClick={() => { setThemeSpin((n) => n + 1); toggleDark(); }}
              style={{ ...shellS.themeBtn, background: darkMode ? '#1e293b' : '#fff' }}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span key={themeSpin} style={{ ...shellS.themeIcon, animation: themeSpin ? 'spin-once .4s ease' : 'none' }}>
                {darkMode ? <Moon size={18} /> : <Sun size={18} />}
              </span>
            </button>
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileMenu(p => !p);
                }}
                style={{ ...shellS.avatar, border: 'none', cursor: 'pointer' }}
                aria-label="Profile menu"
              >
                {user.name?.[0]?.toUpperCase() || 'A'}
              </button>
              {showProfileMenu && (
                <div style={{ position: 'absolute', top: 48, right: 0, minWidth: 210, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 16px 40px -12px rgba(15,16,53,.25)', padding: 8, zIndex: 9999 }}>
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{user.name || 'Alex'}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>{user.email || 'alex@lockeen.com'}</div>
                  </div>
                  <button onClick={() => { setTab('account'); setShowProfileMenu(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>
                    <Pencil size={15} /> Account settings
                  </button>
                  <button onClick={onLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>
                    <LogOut size={15} /> {tt(lang, 'signOut')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Outer dashboard card with indigo border */}
      <div
        className="outerCard"
        style={{
          ...shellS.outerCard,
          background: darkMode ? '#1e293b' : '#fff',
          boxShadow: darkMode ? '0 30px 60px -30px rgba(0,0,0,.5)' : '0 30px 60px -30px rgba(55,48,232,.25)',
          borderRadius: isMobile ? 0 : 24,
          border: isMobile ? 'none' : '2px solid var(--indigo)',
        }}
      >
        <div style={{ ...shellS.grid, gridTemplateColumns: isMobile ? '1fr' : sidebarCollapsed ? '64px 1fr' : '220px 1fr', transition: 'grid-template-columns .2s ease' }}>
          {!isMobile && <Sidebar tab={tab} setTab={handleSetTab} lang={lang} collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed(v => !v)} />}
          <div style={{ ...shellS.main, padding: isMobile ? '16px 14px' : '32px clamp(28px, 3vw, 56px)' }}>
            {tab === 'dashboard' && <DashboardHome user={user} lang={lang} setTab={setTab} openQuiz={() => openQuiz({ noteId: 1, subject: 'Biology', title: 'Cellular Respiration', questions: cellularRespirationQuestions, _meta: { source: 'dashboardRecommended', subject: 'Biology', title: 'Biology Quiz' } })} openFlashcards={() => openFlashcards({ noteId: 201, subject: 'Chemistry', title: 'Chemistry Flash', cards: chemistryCards, _meta: { source: 'dashboardRecommended', subject: 'Chemistry', title: 'Chemistry Flash' } })} recommendedQuizDone={recommendedQuizDone} recommendedFlashDone={recommendedFlashDone} onOpenPlanner={() => setPlannerOpen(true)} darkMode={darkMode} calEvents={calEvents} onMarkEventDone={onMarkEventDone} onStartTimer={onStartTimer} />}
            {tab === 'notes'     && <NotesView exams={exams} lang={lang} setExams={setExams} activeId={activeExamId} setActiveId={setActiveExamId} onOpenFlashcards={openFlashcards} onOpenQuiz={openQuiz} onOpenQuizForExam={openQuizForExam} darkMode={darkMode} onOpenPlanner={(nid) => { setPlannerNoteId(nid); setPlannerOpen(true); }} onExamAdded={handleExamAdded} quizHistory={quizHistory} flashHistory={flashHistory} quizRuns={quizRuns} recentFlashDecks={recentFlashDecks} />}
            {tab === 'flashcards' && (flashLanding
              ? <FlashcardLanding recentDecks={recentFlashDecks} onOpenDeck={openFlashcards} setTab={setTab} darkMode={darkMode} exams={exams} />
              : <FlashcardViewer {...flashcardDeck} setTab={setTab} darkMode={darkMode} onFlashComplete={onFlashComplete} onBackToLanding={() => setFlashLanding(true)} />
            )}
            {tab === 'quiz' && <QuizTab deck={quizDeck} exams={exams} quizRuns={quizRuns} onQuizComplete={onQuizComplete} setTab={setTab} darkMode={darkMode} />}
            {tab === 'tutor'     && <TutorView />}
            {tab === 'analytics' && <AnalyticsView weekData={weekData} notes={exams} quizHistory={quizHistory} flashHistory={flashHistory} setTab={setTab} openQuiz={openQuiz} />}
            {tab === 'calendar'  && <CalendarView events={calEvents} setEvents={setCalEvents} setTab={setTab} onOpenPlanner={() => setPlannerOpen(true)} />}
            {tab === 'earn'      && <EarnView />}
            {tab === 'account'   && <AccountView user={user} lang={lang} onLangChange={onLangChange} onLogout={onLogout} />}
          </div>
        </div>
      </div>
      {!isMobile && <StudyTimer onSessionSaved={handleSessionSaved} startTrigger={timerTrigger} />}
      {plannerOpen && <AIStudyPlanner onClose={() => { setPlannerOpen(false); setPlannerNoteId(null); }} onPlanAdded={handlePlanAdded} initialNoteId={plannerNoteId} existingEvents={calEvents} />}
      {isMobile && <BottomNav tab={tab} setTab={handleSetTab} lang={lang} />}
    </div>
  );
}

const shellS = {
  wrap: { minHeight: '100vh', width: '100%', margin: '0 auto', padding: '24px clamp(18px, 2.4vw, 40px) 40px', boxSizing: 'border-box', overflowX: 'hidden' },
  header: { marginBottom: 20 },
  headerInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logoBox: { width: 36, height: 36, borderRadius: 12, background: 'var(--indigo)', color: '#fff', display: 'grid', placeItems: 'center' },
  brand: { fontSize: 18, fontWeight: 800, color: 'var(--indigo)' },
  iconBtn: { width: 38, height: 38, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)', display: 'grid', placeItems: 'center' },
  themeBtn: { width: 38, height: 38, borderRadius: 10, border: '1px solid var(--border)', color: 'var(--ink)', display: 'grid', placeItems: 'center', transition: 'background .2s, color .2s' },
  themeIcon: { display: 'grid', placeItems: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 999, background: 'linear-gradient(135deg, var(--indigo), var(--purple))', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 },
  outerCard: { width: '100%', maxWidth: '100%', border: '2px solid var(--indigo)', borderRadius: 24, background: 'var(--surface)', overflow: 'hidden', boxShadow: '0 30px 60px -30px rgba(55,48,232,.25)' },
  grid: { display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 'calc(100vh - 132px)', width: '100%', minWidth: 0 },
  main: { padding: '32px clamp(28px, 3vw, 56px)', width: '100%', minWidth: 0, maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' },
};

function DashboardHome({ user, lang = 'en', setTab, openQuiz, openFlashcards, recommendedQuizDone = false, recommendedFlashDone = false, onOpenPlanner, darkMode, calEvents, onMarkEventDone, onStartTimer }) {
  const isMobile = useIsMobile();
  const todayKey = dayKey(new Date());
  const todayEvents = (calEvents && calEvents[todayKey]) || [];
  const [checked, setChecked] = React.useState({});
  const [confirmModal, setConfirmModal] = React.useState(null);
  const toggleCheck = (idx) => setChecked(prev => ({ ...prev, [idx]: !prev[idx] }));
  const doneCount = Object.values(checked).filter(Boolean).length;
  const recommendedDoneCount = (recommendedQuizDone ? 1 : 0) + (recommendedFlashDone ? 1 : 0);
  const fmtDur = (mins) => mins >= 60 ? (mins % 60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${Math.floor(mins/60)}h`) : `${mins}m`;

  return (
    <div style={homeS.wrap}>
      {confirmModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:2000, display:'grid', placeItems:'center' }} onClick={() => setConfirmModal(null)}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:20, padding:'28px 24px', width:320, boxShadow:'0 24px 64px rgba(0,0,0,.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:'var(--lavender)', display:'grid', placeItems:'center', margin:'0 auto 16px' }}>
              <CheckCircle size={22} color="var(--indigo)" />
            </div>
            <h3 style={{ margin:'0 0 8px', fontSize:17, fontWeight:700, color:'var(--ink)', textAlign:'center' }}>Attività completata?</h3>
            <p style={{ margin:'0 0 22px', fontSize:13, color:'var(--gray)', textAlign:'center', lineHeight:1.5 }}>
              Hai completato <strong style={{ color:'var(--ink)' }}>{confirmModal.ev.name}</strong>?
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button onClick={() => { toggleCheck(confirmModal.idx); onMarkEventDone && onMarkEventDone(todayKey, confirmModal.idx, confirmModal.ev.name); setConfirmModal(null); }}
                style={{ padding:'12px 16px', borderRadius:12, background:'var(--indigo)', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', width:'100%' }}>
                Sì, completata!
              </button>
              <button onClick={() => setConfirmModal(null)}
                style={{ padding:'12px 16px', borderRadius:12, background:'var(--sidebar-bg)', border:'1px solid var(--border)', color:'var(--gray)', fontWeight:600, fontSize:14, cursor:'pointer', width:'100%' }}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ marginBottom: 24 }}>
        <h2 style={homeS.h1}>{tt(lang, 'goodMorning')}, {user.name}</h2>
        <p style={homeS.sub}>{tt(lang, 'ready')}</p>
      </div>

      {/* HERO — Today's Schedule (full-width) */}
      <div style={{ ...homeS.scheduleCard, padding: isMobile ? '16px 14px' : '22px 24px' }}>
        <div style={homeS.scheduleHead}>
          <CalendarIcon size={18} color="var(--indigo)" />
          <h3 style={homeS.scheduleTitle}>
            {tt(lang, 'todaySchedule')}
            {todayEvents.length > 0 && <span style={{ marginLeft:8, fontSize:12, fontWeight:600, color:'var(--gray)' }}>{doneCount}/{todayEvents.length} completati</span>}
          </h3>
        </div>

        {todayEvents.length === 0 ? (
          <div style={{ textAlign:'center', padding:'24px 0', color:'var(--gray)', fontSize:14 }}>
            Nessun impegno oggi — aggiungine uno dal Calendario!
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:2, marginBottom:18 }}>
            {todayEvents.map((ev, idx) => {
              const cat = LIFE_CATS.find(c => c.id === ev.cat);
              const accentColor = ev.noteColor || cat?.color || 'var(--indigo)';
              const catBg = ev.noteBg || cat?.bg || 'var(--lavender)';
              const catText = ev.noteText || cat?.text || 'var(--indigo)';
              const done = !!checked[idx];
              return (
                <div key={idx} onClick={() => { if (!done) setConfirmModal({ idx, ev }); else toggleCheck(idx); }} style={{ display:'flex', alignItems:'center', gap: isMobile ? 8 : 14, padding: isMobile ? '10px 10px' : '12px 14px', borderRadius:12, cursor:'pointer', transition:'background .12s', background: done ? 'transparent' : 'var(--sidebar-bg)', opacity: done ? 0.45 : 1, width:'100%', minWidth:0, maxWidth:'100%', boxSizing:'border-box' }}>
                  <div style={{ width:3, alignSelf:'stretch', borderRadius:999, background:accentColor, flexShrink:0 }} />
                  <div style={{ minWidth: isMobile ? 44 : 52, fontSize:12, fontWeight:700, color:'var(--gray)', flexShrink:0 }}>{ev.time}</div>
                  <div style={{ flex:1, minWidth:0, fontSize:14, fontWeight:600, color:'var(--ink)', textDecoration:done?'line-through':'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.name}</div>
                  {ev.dur && !isMobile && <span style={{ fontSize:11, color:'var(--gray)', flexShrink:0 }}>⏱ {ev.dur}</span>}
                  <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:999, background:catBg, color:catText, flexShrink:0, whiteSpace:'nowrap', maxWidth: isMobile ? 80 : 'none', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {ev.noteSubject || cat?.label || 'Task'}
                  </span>
                  <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${done?'var(--indigo)':'var(--border)'}`, background:done?'var(--indigo)':'transparent', display:'grid', placeItems:'center', flexShrink:0, transition:'all .15s' }}>
                    {done && <Check size={12} color="#fff" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => setTab('calendar')} style={{ width:'100%', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px 16px', borderRadius:12, background:'var(--sidebar-bg)', border:'1px solid var(--border)', color:'var(--ink)', fontWeight:600, fontSize:13, cursor:'pointer' }}>
          <CalendarIcon size={14} /> {tt(lang, 'openCalendar')}
        </button>
      </div>

      {/* Task del giorno */}
      <div style={{ marginBottom: 8 }}><h3 style={homeS.sectionLabel}>📅 {tt(lang, 'dailyTasks')}</h3></div>
      <div style={{ ...homeS.cardsRow, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', marginBottom: 24 }}>
        {mockDashboard.todayTasks.map(task => (
          <div key={task.id} style={{ ...homeS.bigCard, background:'var(--surface)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
              <div style={{ width:9, height:9, borderRadius:999, background:task.accentColor, flexShrink:0 }} />
              <span style={{ fontSize:11, fontWeight:700, color:'var(--gray)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{task.subject}</span>
            </div>
            <div style={{ borderLeft:`3px solid ${task.accentColor}`, paddingLeft:12, marginBottom:14 }}>
              <h3 style={{ margin:0, fontSize:17, fontWeight:700, color:'var(--ink)', lineHeight:1.3 }}>{task.topic}</h3>
              <div style={{ display:'flex', alignItems:'center', gap:14, marginTop:6, color:'var(--gray)', fontSize:12 }}>
                <span>🕐 {task.time}</span>
                <span>⏱ {fmtDur(task.durationMinutes)}</span>
              </div>
            </div>
            <button style={{ ...homeS.primaryBtn, marginTop:0, background:task.accentColor }} onClick={() => onStartTimer && onStartTimer(task.durationMinutes)}>Inizia ora</button>
          </div>
        ))}
      </div>

      {/* Consigliati oggi */}
      <div style={{ marginBottom: 8, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
        <h3 style={homeS.sectionLabel}>⭐ {tt(lang, 'recommended')}</h3>
        <span style={{ fontSize:12, fontWeight:800, color: recommendedDoneCount === 2 ? '#166534' : 'var(--gray)', background: recommendedDoneCount === 2 ? '#DCFCE7' : 'var(--sidebar-bg)', border:'1px solid var(--border)', borderRadius:999, padding:'5px 10px' }}>
          {recommendedDoneCount}/2 completati oggi
        </span>
      </div>
      <div style={{ ...homeS.cardsRow, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', marginBottom: 24 }}>
        <div style={{ ...homeS.bigCard, ...(recommendedQuizDone ? homeS.recoDoneCard : { background: 'var(--bigcard-bio)' }) }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <div style={{ ...homeS.dot, ...(recommendedQuizDone ? homeS.doneDot : { background: 'var(--indigo)' }) }}>
              {recommendedQuizDone && <Check size={14} color="#fff" />}
            </div>
            <span style={{ ...(recommendedQuizDone ? homeS.doneBadge : homeS.recoBadge), background: recommendedQuizDone ? '#DCFCE7' : 'var(--lavender)', color: recommendedQuizDone ? '#166534' : 'var(--indigo)' }}>
              {recommendedQuizDone ? 'Completato' : mockDashboard.recommendedQuiz.difficulty}
            </span>
          </div>
          <h3 style={homeS.cardTitle}>{mockDashboard.recommendedQuiz.title}</h3>
          <p style={homeS.cardMeta}>
            {recommendedQuizDone
              ? 'Quiz completato oggi'
              : `${mockDashboard.recommendedQuiz.questionCount} questions • ${mockDashboard.recommendedQuiz.estimatedMinutes} min`}
          </p>
          <button
            style={{
              ...(recommendedQuizDone ? homeS.doneBtn : homeS.primaryBtn),
              cursor: recommendedQuizDone ? 'default' : 'pointer',
            }}
            onClick={recommendedQuizDone ? undefined : openQuiz}
            disabled={recommendedQuizDone}
          >
            {recommendedQuizDone ? '✓ Completed' : 'Start Quiz'}
          </button>
        </div>
        <div style={{ ...homeS.bigCard, ...(recommendedFlashDone ? homeS.recoDoneCard : { background: 'var(--bigcard-chem)' }) }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <div style={{ ...homeS.dot, ...(recommendedFlashDone ? homeS.doneDot : { background: 'var(--purple)' }) }}>
              {recommendedFlashDone && <Check size={14} color="#fff" />}
            </div>
            <span style={{ ...(recommendedFlashDone ? homeS.doneBadge : homeS.recoBadge), background: recommendedFlashDone ? '#DCFCE7' : '#F5F3FF', color: recommendedFlashDone ? '#166534' : 'var(--purple)' }}>
              {recommendedFlashDone ? 'Completato' : mockDashboard.recommendedFlashcards.mode}
            </span>
          </div>
          <h3 style={homeS.cardTitle}>{mockDashboard.recommendedFlashcards.title}</h3>
          <p style={homeS.cardMeta}>
            {recommendedFlashDone
              ? 'Flashcards completate oggi'
              : `${mockDashboard.recommendedFlashcards.cardCount} cards • ${mockDashboard.recommendedFlashcards.mode}`}
          </p>
          {!recommendedFlashDone && <p style={{ ...homeS.cardMeta, fontSize:11, marginTop:2 }}>Ultima sessione: {mockDashboard.recommendedFlashcards.lastSessionDaysAgo} gg fa</p>}
          <button
            style={{
              ...(recommendedFlashDone ? homeS.doneBtn : homeS.outlineBtn),
              cursor: recommendedFlashDone ? 'default' : 'pointer',
            }}
            onClick={recommendedFlashDone ? undefined : openFlashcards}
            disabled={recommendedFlashDone}
          >
            {recommendedFlashDone ? '✓ Completed' : 'Review Cards'}
          </button>
        </div>
      </div>

      {/* AI Study Assistant — no Study Plan button */}
      <div style={homeS.assistant}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={homeS.assistantIcon}><MsgCircle size={18} /></div>
          <div>
            <h4 style={homeS.assistantTitle}>AI Study Assistant</h4>
            <p style={homeS.assistantSub}>Ask me anything</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={homeS.msgUser}>Explain photosynthesis in simple terms</div>
          <div style={homeS.msgAI}>Photosynthesis is how plants make their own food using sunlight…</div>
        </div>
        <button onClick={() => setTab('tutor')} style={{ ...homeS.outlineBtn, marginTop: 16, width: 'auto', alignSelf: 'flex-start', padding: '10px 18px' }}>
          Open AI Tutor <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ===================== ANALYTICS ===================== */
/* ===================== CALENDAR ===================== */
const LIFE_CATS = [
  { id:'study',   label:'Study',   color:'#3730E8', bg:'#EEF2FF', text:'#3730E8' },
  { id:'fitness', label:'Fitness', color:'#10B981', bg:'#DCFCE7', text:'#065F46' },
  { id:'social',  label:'Social',  color:'#F59E0B', bg:'#FEF3C7', text:'#92400E' },
  { id:'rest',    label:'Rest',    color:'#8B5CF6', bg:'#F5F3FF', text:'#5B21B6' },
  { id:'other',   label:'Other',   color:'#6B7280', bg:'#F3F4F6', text:'#374151' },
];

/* ===================== CALENDAR HELPERS ===================== */
const CAL_MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CAL_MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const getMonday  = (d) => { const r = new Date(d); const day = r.getDay(); r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day)); r.setHours(0,0,0,0); return r; };
const calAddDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const dayKey     = (d) => `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
const durToMins  = (s) => { let m=0; const h=s.match(/(\d+)h/); const mn=s.match(/(\d+)m/); if(h) m+=parseInt(h[1])*60; if(mn) m+=parseInt(mn[1]); return m||0; };
const CAL_HOUR_H = 42;
const CAL_START_H = 0;

const SUBJECT_NOTE_MAP = {
  Biology:    { noteId:1, bg:'#EEF2FF', color:'#3730E8', text:'#3730E8' },
  Chemistry:  { noteId:2, bg:'#FDF2F8', color:'#8B5CF6', text:'#8B5CF6' },
  History:    { noteId:3, bg:'#FEF3C7', color:'#F59E0B', text:'#92400E' },
  Math:       { noteId:4, bg:'#ECFEFF', color:'#06B6D4', text:'#0E7490' },
  Economics:  { noteId:5, bg:'#DCFCE7', color:'#10B981', text:'#065F46' },
  Literature: { noteId:6, bg:'#FEE2E2', color:'#EF4444', text:'#991B1B' },
};

const calSeedNotes = [
  { id:1, title:'Cellular Respiration' }, { id:2, title:'Organic Chemistry Reactions' },
  { id:3, title:'World War II Timeline' }, { id:4, title:'Calculus — Derivatives' },
  { id:5, title:'Macroeconomics Notes' }, { id:6, title:'Shakespeare — Hamlet' },
];

const initCalEvents = () => {
  const t = new Date(); t.setHours(0,0,0,0);
  const ev = {};
  const set = (d, arr) => { ev[dayKey(d)] = arr; };
  set(t, [
    { name:'Biology — Cellular Respiration', time:'09:00', dur:'1h30m', cat:'study', noteId:1, noteColor:'#3730E8', noteBg:'#EEF2FF', noteText:'#3730E8', noteSubject:'Biology' },
    { name:'Gym', time:'17:00', dur:'1h', cat:'fitness', noteId:null, noteColor:null, noteBg:null, noteText:null, noteSubject:null },
  ]);
  set(calAddDays(t,1), [
    { name:'Chemistry — Organic Chemistry', time:'10:00', dur:'1h', cat:'study', noteId:2, noteColor:'#8B5CF6', noteBg:'#FDF2F8', noteText:'#8B5CF6', noteSubject:'Chemistry' },
    { name:'Coffee with Sara', time:'15:00', dur:'1h30m', cat:'social', noteId:null, noteColor:null, noteBg:null, noteText:null, noteSubject:null },
  ]);
  set(calAddDays(t,2), [
    { name:'Math — Calculus Derivatives', time:'08:00', dur:'45m', cat:'study', noteId:4, noteColor:'#06B6D4', noteBg:'#ECFEFF', noteText:'#0E7490', noteSubject:'Math' },
    { name:'Rest & recover', time:'20:00', dur:'30m', cat:'rest', noteId:null, noteColor:null, noteBg:null, noteText:null, noteSubject:null },
  ]);
  set(calAddDays(t,3), [
    { name:'History — WWII Timeline', time:'11:00', dur:'2h', cat:'study', noteId:3, noteColor:'#F59E0B', noteBg:'#FEF3C7', noteText:'#92400E', noteSubject:'History' },
  ]);
  set(calAddDays(t,-1), [
    { name:'Physics revision', time:'14:00', dur:'1h', cat:'study', noteId:null, noteColor:null, noteBg:null, noteText:null, noteSubject:null },
    { name:'Morning run', time:'07:00', dur:'40m', cat:'fitness', noteId:null, noteColor:null, noteBg:null, noteText:null, noteSubject:null },
  ]);
  return ev;
};

function AccountView({ user, lang, onLangChange, onLogout }) {
  const isMobile = useIsMobile();
  const email = user.email || 'alex@lockeen.com';
  const initial = user.name?.[0]?.toUpperCase() || 'A';
  const accountLang = LANG_OPTIONS.find(l => l.value === lang) || LANG_OPTIONS[0];

  const Row = ({ icon, title, sub, action, danger }) => (
    <div style={accountS.row}>
      <div style={accountS.rowIcon}>{icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={accountS.rowTitle}>{title}</div>
        {sub && <div style={accountS.rowSub}>{sub}</div>}
      </div>
      {action && <div style={{ flexShrink:0 }}>{action}</div>}
    </div>
  );

  return (
    <div style={accountS.wrap}>
      <div style={{ ...accountS.hero, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center' }}>
        <div style={accountS.bigAvatar}>{initial}</div>
        <div style={{ flex:1 }}>
          <h2 style={accountS.title}>Account</h2>
          <p style={accountS.sub}>Gestisci piano, profilo, dispositivi e preferenze.</p>
        </div>
        <button onClick={onLogout} style={accountS.logoutTop}><LogOut size={15} /> Logout</button>
      </div>

      <section style={accountS.section}>
        <h3 style={accountS.sectionTitle}>Plan</h3>
        <div style={accountS.planCard}>
          <div>
            <div style={accountS.planBadge}>Free mode</div>
            <h4 style={accountS.planTitle}>Lockeen Free</h4>
            <p style={accountS.planText}>1 documento attivo, quiz limitati, flashcard base.</p>
          </div>
          <button style={accountS.primaryBtn}>Upgrade to Pro</button>
        </div>
        <div style={accountS.card}>
          <Row icon={<Trophy size={18} />} title="Last plan" sub="Pro Monthly · ended 6 Sep 2025" action={<button style={accountS.softBtn}>Reactivate</button>} />
        </div>
      </section>

      <section style={accountS.section}>
        <h3 style={accountS.sectionTitle}>Bills</h3>
        <div style={accountS.card}>
          <Row icon={<FileText size={18} />} title="Payments" sub="See payments and receipts" action={<ChevronDown size={18} color="var(--gray)" />} />
          <div style={accountS.divider} />
          <Row icon={<Coins size={18} />} title="Billing method" sub="No active payment method on Free plan" action={<button style={accountS.ghostBtn}>Manage</button>} />
        </div>
      </section>

      <section style={accountS.section}>
        <h3 style={accountS.sectionTitle}>Profile</h3>
        <div style={accountS.card}>
          <Row icon={<MsgCircle size={18} />} title="Email" sub={email} />
          <div style={accountS.divider} />
          <Row icon={<EyeOff size={18} />} title="Password" sub="Signed up with Google. Password edit disabled." action={<button style={accountS.disabledBtn}>Edit</button>} />
        </div>
      </section>

      <section style={accountS.section}>
        <h3 style={accountS.sectionTitle}>Active devices</h3>
        <div style={accountS.card}>
          <div style={{ marginBottom:12 }}>
            <div style={accountS.rowTitle}>Active devices: 2/2</div>
            <div style={accountS.rowSub}>Puoi usare Lockeen su massimo 2 dispositivi insieme.</div>
          </div>
          {['Mac, macOS, Safari', 'iPhone, iOS, Safari'].map((device, i) => (
            <React.Fragment key={device}>
              {i > 0 && <div style={accountS.divider} />}
              <Row
                icon={<span style={{ width:10, height:10, borderRadius:999, background:i === 0 ? '#10B981' : '#CBD5E1', display:'block' }} />}
                title={device}
                sub={i === 0 ? 'Last access: today · current device' : 'Last access: 17 May 2026'}
                action={<button style={i === 0 ? accountS.currentBtn : accountS.dangerBtn}>{i === 0 ? 'Current' : 'Log out'}</button>}
              />
            </React.Fragment>
          ))}
        </div>
      </section>

      <section style={accountS.section}>
        <h3 style={accountS.sectionTitle}>Language</h3>
        <div style={accountS.card}>
          <Row
            icon={<span style={{ fontSize:20 }}>{accountLang.flag}</span>}
            title={`${accountLang.flag} ${accountLang.label}`}
            sub="Questa impostazione cambia la lingua dell’interfaccia Lockeen."
            action={<LanguageSelect lang={lang} onChange={onLangChange} compact />}
          />
        </div>
      </section>
    </div>
  );
}

const accountS = {
  wrap: { display:'flex', flexDirection:'column', gap:22, maxWidth:980, margin:'0 auto' },
  hero: { display:'flex', gap:16, padding:20, borderRadius:20, background:'linear-gradient(135deg,#EEF2FF,#F5F3FF)', border:'1px solid var(--border)' },
  bigAvatar: { width:58, height:58, borderRadius:18, background:'linear-gradient(135deg,var(--indigo),var(--purple))', color:'#fff', display:'grid', placeItems:'center', fontSize:22, fontWeight:800, boxShadow:'0 14px 28px -18px rgba(55,48,232,.7)' },
  title: { margin:0, fontSize:26, fontWeight:800, color:'var(--ink)', letterSpacing:'-.03em' },
  sub: { margin:'4px 0 0', fontSize:14, color:'var(--gray)', lineHeight:1.5 },
  logoutTop: { display:'inline-flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:12, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontWeight:700, fontSize:13, cursor:'pointer' },
  section: { display:'flex', flexDirection:'column', gap:10 },
  sectionTitle: { margin:0, fontSize:18, fontWeight:800, color:'var(--ink)', letterSpacing:'-.02em' },
  card: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', boxShadow:'0 12px 30px -26px rgba(15,16,53,.35)' },
  planCard: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, padding:18, borderRadius:16, background:'var(--surface)', border:'1px solid var(--border)', boxShadow:'0 12px 30px -26px rgba(15,16,53,.35)', flexWrap:'wrap' },
  planBadge: { display:'inline-flex', padding:'5px 10px', borderRadius:999, background:'#ECFDF5', color:'#047857', fontSize:11, fontWeight:800, marginBottom:8 },
  planTitle: { margin:0, fontSize:18, fontWeight:800, color:'var(--ink)' },
  planText: { margin:'4px 0 0', color:'var(--gray)', fontSize:13 },
  row: { display:'flex', alignItems:'center', gap:12, padding:'15px 18px' },
  rowIcon: { width:34, height:34, borderRadius:12, background:'var(--sidebar-bg)', color:'var(--indigo)', display:'grid', placeItems:'center', flexShrink:0 },
  rowTitle: { fontSize:14, fontWeight:800, color:'var(--ink)' },
  rowSub: { fontSize:12, color:'var(--gray)', marginTop:2, lineHeight:1.45 },
  divider: { height:1, background:'var(--border)' },
  primaryBtn: { padding:'11px 16px', borderRadius:12, border:'none', background:'var(--indigo)', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer' },
  softBtn: { padding:'9px 13px', borderRadius:10, border:'none', background:'#FEF3C7', color:'#92400E', fontWeight:800, fontSize:12, cursor:'pointer' },
  ghostBtn: { padding:'9px 13px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontWeight:700, fontSize:12, cursor:'pointer' },
  disabledBtn: { padding:'9px 13px', borderRadius:10, border:'none', background:'#E5E7EB', color:'#9CA3AF', fontWeight:800, fontSize:12, cursor:'not-allowed' },
  dangerBtn: { padding:'9px 13px', borderRadius:10, border:'none', background:'#EF4444', color:'#fff', fontWeight:800, fontSize:12, cursor:'pointer' },
  currentBtn: { padding:'9px 13px', borderRadius:10, border:'none', background:'#DCFCE7', color:'#166534', fontWeight:800, fontSize:12 },
};

/* ============ EARN / AMBASSADOR VIEW ============ */
function EarnView() {
  const isMobile = useIsMobile();
  const [feed, setFeed] = React.useState([
    { name: 'Martia R.', time: 'ora',      amt: '+€2' },
    { name: 'Luca B.',   time: '2 min fa', amt: '+€2' },
    { name: 'Sara F.',   time: '5 min fa', amt: '+€2' },
  ]);
  const [showForm, setShowForm] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  const card = {
    background: 'var(--surface)',
    borderRadius: 20,
    border: '1px solid var(--border)',
    padding: '24px',
    boxShadow: '0 4px 24px rgba(55,48,232,.08)',
  };

  const steps = [
    { n: '01', title: 'Richiedi accesso', desc: 'Inserisci la tua email, ti inviamo un link personale tracciato. Ci vogliono 2 minuti.' },
    { n: '02', title: 'Condividi all\'università', desc: 'Gruppo WhatsApp del corso, chat universitaria, passaparola in biblioteca. Funziona tutto.' },
    { n: '03', title: 'Guadagna €2 per studente', desc: 'Per ogni studente che si iscrive con il tuo link ottieni €2 al mese. Ogni mese. Payout da €20.' },
  ];

  const strategies = [
    { emoji: '💬', range: '€80–200/mese', title: 'Un messaggio nel gruppo WhatsApp', desc: '"Sto usando Lockeen per prepararmi all\'esame — se vi iscrivete con il mio link ci andiamo entrambi avanti." Un messaggio in un gruppo da 200. Fine.', stat: '1 messaggio → 97 iscritti' },
    { emoji: '🎤', range: '€200–500/mese', title: 'L\'annuncio del rappresentante', desc: 'Hai 5 minuti prima della lezione. Dici che Lockeen ti ha salvato la sessione e condividi il link nella chat del corso. Chi ti conosce si fida. Conversione altissima.', stat: '3 corsi coperti → 248 iscritti' },
    { emoji: '📖', range: '€20–80/mese',  title: 'Passaparola in sala studio', desc: 'Stai studiando, un compagno ti chiede come fai a ricordare tutto. Gli mostri Lockeen sul telefono e gli mandi il link. Niente di più naturale.', stat: 'Solo passaparola → 42 iscritti' },
    { emoji: '📱', range: '€40–150/mese', title: 'Instagram stories', desc: 'Uno screenshot della tua streak, "questo mi sta salvando la sessione" in storia. Non ti servono 10k follower — bastano i tuoi compagni di corso.', stat: '2 storie → 73 iscritti' },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 32, alignItems: 'center', marginBottom: 56 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: '#ECFDF5', border: '1px solid #86EFAC', borderRadius: 999, marginBottom: 20 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#065F46' }}>Lockeen Ambassador Program</span>
          </div>
          <h1 style={{ fontSize: isMobile ? 26 : 34, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.15, marginBottom: 16 }}>
            Condividi Lockeen.<br />Guadagna <span style={{ color: 'var(--indigo)' }}>€2 per ogni studente.</span>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--gray)', lineHeight: 1.7, marginBottom: 28, maxWidth: 420 }}>
            Gli Ambassador sono studenti che portano Lockeen alla propria università e guadagnano €2 per ogni compagno che si iscrive. Per sempre. Una community che cresce insieme.
          </p>
          {!showForm && !submitted && (
            <button onClick={() => setShowForm(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: 'var(--indigo)', color: '#fff', borderRadius: 14, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}>
              Diventa Ambassador →
            </button>
          )}
          {showForm && !submitted && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="la.tua@email.com"
                style={{ flex: 1, minWidth: 200, padding: '13px 16px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--input-bg)', color: 'var(--ink)', fontSize: 14, outline: 'none' }}
              />
              <button type="submit" style={{ padding: '13px 24px', background: 'var(--indigo)', color: '#fff', borderRadius: 12, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
                Richiedi accesso
              </button>
            </form>
          )}
          {submitted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', background: '#ECFDF5', border: '1px solid #86EFAC', borderRadius: 14 }}>
              <span style={{ fontSize: 20 }}>🎉</span>
              <div>
                <div style={{ fontWeight: 700, color: '#065F46', fontSize: 14 }}>Richiesta inviata!</div>
                <div style={{ color: '#065F46', fontSize: 13, opacity: .8 }}>Ti mandiamo il link entro 24h.</div>
              </div>
            </div>
          )}
        </div>

        {/* Earnings card mockup */}
        <div style={{ ...card, position: 'relative' }}>
          <div style={{ position: 'absolute', top: -14, right: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'var(--ink)', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
            💸 €2 per studente, ogni mese
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 4 }}>I tuoi guadagni</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--ink)' }}>€1.150</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981', background: '#ECFDF5', padding: '2px 8px', borderRadius: 999 }}>+ €12 ora</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 20 }}>questo mese · 575 studenti attivi</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            {feed.map((f, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{f.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--gray)', marginLeft: 8 }}>{f.time}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>{f.amt}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--gray)' }}>altri 572 questo mese</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>+€1.144</span>
            </div>
          </div>
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--lavender)', borderRadius: 10, fontSize: 12, color: 'var(--indigo)', fontWeight: 500, textAlign: 'center' }}>
            🔄 Ricorrente finché restano iscritti
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ marginBottom: 52 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 8 }}>Come funziona</div>
          <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: 'var(--ink)' }}>Tre passi. Zero complicazioni.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 16 }}>
          {steps.map(s => (
            <div key={s.n} style={{ ...card, padding: '28px 24px' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--border)', marginBottom: 16, lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.65 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Real strategies */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 8 }}>Strategie reali</div>
          <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>Come gli Ambassador guadagnano migliaia di €</h2>
          <p style={{ fontSize: 14, color: 'var(--gray)' }}>Niente ads, follower o skill di marketing. Queste sono le strategie che funzionano davvero.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
          {strategies.map((s, i) => (
            <div key={i} style={{ ...card, padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 22 }}>{s.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', background: 'var(--lavender)', color: 'var(--indigo)', borderRadius: 999 }}>{s.range}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.65, marginBottom: 16 }}>{s.desc}</div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, fontSize: 12, color: 'var(--gray)', fontWeight: 500 }}>{s.stat}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA banner */}
      <div style={{ borderRadius: 24, background: 'linear-gradient(135deg, #070B2D 0%, #1a1060 60%, #2F2BFF 100%)', padding: isMobile ? '40px 24px' : '56px 64px', textAlign: 'center', position: 'relative', overflow: 'hidden', marginTop: 8 }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,120,255,.3), transparent)', transform: 'translate(30%,-30%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(47,43,255,.25), transparent)', transform: 'translate(-30%,30%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <h2 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 800, color: '#fff', marginBottom: 12, lineHeight: 1.25 }}>
            La tua università ha bisogno<br />di un Lockeen Ambassador.
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.65)', marginBottom: 32, maxWidth: 460, margin: '0 auto 32px' }}>
            Entra nella community, ottieni il tuo link e inizia a guadagnare portando Lockeen ai tuoi compagni.
          </p>
          <button
            onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '15px 32px', background: '#fff', color: '#2F2BFF', borderRadius: 14, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(47,43,255,.3)' }}
          >
            Diventa Ambassador →
          </button>
        </div>
      </div>
    </div>
  );
}

function CalendarView({ events, setEvents, setTab, onOpenPlanner }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [view, setView]           = useState('week');
  const [weekStart, setWeekStart] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [viewYear, setViewYear]   = useState(() => new Date().getFullYear());
  const [activeCats, setActiveCats] = useState(() => new Set(LIFE_CATS.map(c => c.id)));
  const [modalKey, setModalKey]     = useState(null);
  const [dayDetailKey, setDayDetailKey] = useState(null);
  const [selCat, setSelCat]         = useState('study');
  const [selNoteId, setSelNoteId]   = useState(null);
  const [modalName, setModalName]   = useState('');
  const [modalTime, setModalTime]   = useState('09:00');
  const [modalDur, setModalDur]     = useState('1h');
  const [customH, setCustomH]       = useState(0);
  const [customM, setCustomM]       = useState(30);
  const [drag, setDrag]             = useState(null);
  const [viewDropOpen, setViewDropOpen] = useState(false);
  const dragMeta   = useRef({});
  const monthDragMeta = useRef({});
  const [monthDrag, setMonthDrag] = useState(null);
  const gridBodyRef = useRef(null);

  useEffect(() => {
    if (view !== 'week' || !gridBodyRef.current) return;
    const now = new Date();
    const scrollTo = (now.getHours() + now.getMinutes() / 60) * CAL_HOUR_H - 120;
    gridBodyRef.current.scrollTop = Math.max(0, scrollTo);
  }, [view]);

  const startDrag = (e, ev, key, idx) => {
    e.preventDefault(); e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const cat   = LIFE_CATS.find(c => c.id === ev.cat);
    const color = ev.noteColor || (cat?.color || 'var(--indigo)');
    const bg    = ev.noteBg    || (cat?.bg    || 'var(--lavender)');
    const evH   = Math.max(CAL_HOUR_H * 0.45, durToMins(ev.dur || '30m') / 60 * CAL_HOUR_H) - 2;
    dragMeta.current = { active:true, ev, fromKey:key, fromIdx:idx, color, bg, evH,
      offsetY: e.clientY - rect.top, offsetX: e.clientX - rect.left,
      toKey:key, toTime:ev.time, wsRef: weekStart };
    setDrag({ ev, fromKey:key, fromIdx:idx, ghostX:rect.left, ghostY:rect.top,
      ghostW:rect.width, ghostH:evH, toKey:key, toTime:ev.time, color, bg });
  };

  useEffect(() => {
    const onMove = (e) => {
      const m = dragMeta.current;
      if (!m.active) return;
      const grid = gridBodyRef.current;
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      const colsLeft  = rect.left + 50;
      const colW      = (rect.width - 50) / 7;
      const dayIdx    = Math.max(0, Math.min(6, Math.floor((e.clientX - colsLeft) / colW)));
      const relY      = e.clientY - rect.top + grid.scrollTop - m.offsetY;
      const frac      = Math.max(0, relY / CAL_HOUR_H);
      let hour        = Math.floor(frac) + CAL_START_H;
      let mins        = Math.round((frac % 1) * 4) * 15;
      if (mins >= 60) { hour++; mins = 0; }
      hour = Math.max(0, Math.min(23, hour));
      const newTime   = `${String(hour).padStart(2,'0')}:${String(mins).padStart(2,'0')}`;
      const newKey    = dayKey(calAddDays(m.wsRef, dayIdx));
      m.toKey = newKey; m.toTime = newTime;
      setDrag(prev => prev ? { ...prev,
        ghostX: e.clientX - m.offsetX,
        ghostY: e.clientY - m.offsetY,
        toKey: newKey, toTime: newTime } : null);
    };
    const onUp = () => {
      const m = dragMeta.current;
      if (!m.active) return;
      m.active = false;
      if (m.toKey && m.toTime) {
        setEvents(prev => {
          const next = { ...prev };
          const arr  = [...(next[m.fromKey] || [])];
          arr.splice(m.fromIdx, 1);
          next[m.fromKey] = arr;
          next[m.toKey]   = [...(next[m.toKey] || []), { ...m.ev, time: m.toTime }];
          return next;
        });
      }
      setDrag(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const startMonthDrag = (e, ev, key, idx) => {
    e.preventDefault(); e.stopPropagation();
    monthDragMeta.current = { active:true, started:false, ev, fromKey:key, fromIdx:idx, toKey:key, startX:e.clientX, startY:e.clientY };
  };

  useEffect(() => {
    const onMove = (e) => {
      const m = monthDragMeta.current;
      if (!m.active) return;
      if (!m.started) {
        if (Math.abs(e.clientX - m.startX) < 4 && Math.abs(e.clientY - m.startY) < 4) return;
        m.started = true;
      }
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cell = el && el.closest && el.closest('[data-month-cell]');
      const toKey = cell ? cell.getAttribute('data-month-cell') : null;
      if (toKey) m.toKey = toKey;
      setMonthDrag({ ev:m.ev, fromKey:m.fromKey, toKey:m.toKey, ghostX:e.clientX, ghostY:e.clientY });
    };
    const onUp = () => {
      const m = monthDragMeta.current;
      if (!m.active) return;
      const wasStarted = m.started;
      m.active = false; m.started = false;
      if (wasStarted && m.toKey && m.toKey !== m.fromKey) {
        setEvents(prev => {
          const next = { ...prev };
          const arr = [...(next[m.fromKey] || [])];
          arr.splice(m.fromIdx, 1);
          next[m.fromKey] = arr;
          next[m.toKey] = [...(next[m.toKey] || []), m.ev];
          return next;
        });
      }
      setMonthDrag(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [setEvents]);

  const navPrev = () => {
    if (view === 'week') { setWeekStart(d => calAddDays(d, -7)); }
    else { setViewMonth(m => { if (m === 0) { setViewYear(y => y-1); return 11; } return m-1; }); }
  };
  const navNext = () => {
    if (view === 'week') { setWeekStart(d => calAddDays(d, 7)); }
    else { setViewMonth(m => { if (m === 11) { setViewYear(y => y+1); return 0; } return m+1; }); }
  };

  const openModal = (key, time = '09:00') => { setModalKey(key); setSelCat('study'); setSelNoteId(null); setModalName(''); setModalTime(time); setModalDur('1h'); setCustomH(0); setCustomM(30); };
  const closeModal = () => setModalKey(null);
  const openDayDetail = (key) => setDayDetailKey(key);
  const closeDayDetail = () => setDayDetailKey(null);
  const toggleCat = (id) => setActiveCats(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const deleteEvent = (key, idx) => setEvents(ev => ({ ...ev, [key]: ev[key].filter((_, i) => i !== idx) }));
  const reorderEvent = (key, fromIdx, toIdx) => setEvents(prev => {
    const arr = [...(prev[key] || [])];
    if (fromIdx < 0 || fromIdx >= arr.length || toIdx < 0 || toIdx >= arr.length || fromIdx === toIdx) return prev;
    const [m] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, m);
    return { ...prev, [key]: arr };
  });

  const selectSubject = (subject) => {
    const info = SUBJECT_NOTE_MAP[subject];
    if (selNoteId === info.noteId) { setSelNoteId(null); setModalName(''); }
    else {
      setSelNoteId(info.noteId);
      const note = calSeedNotes.find(n => n.id === info.noteId);
      setModalName(`${subject} — ${note?.title || subject}`);
    }
  };

  const addEvent = () => {
    if (!modalName.trim()) return;
    const noteSubject = selCat === 'study' && selNoteId
      ? Object.keys(SUBJECT_NOTE_MAP).find(s => SUBJECT_NOTE_MAP[s].noteId === selNoteId) || null : null;
    const noteInfo = noteSubject ? SUBJECT_NOTE_MAP[noteSubject] : null;
    const h = Math.max(0, Math.min(12, Number(customH) || 0));
    const m = Math.max(0, Math.min(59, Number(customM) || 0));
    const customDur = h && m ? `${h}h${m}m` : h ? `${h}h` : `${m}m`;
    const ev = { name: modalName, time: modalTime, dur: modalDur === 'Custom' ? customDur : modalDur, cat: selCat,
      noteId: selCat === 'study' ? selNoteId : null,
      noteColor: noteInfo?.color || null, noteBg: noteInfo?.bg || null,
      noteText: noteInfo?.text || null, noteSubject };
    setEvents(prev => ({ ...prev, [modalKey]: [...(prev[modalKey] || []), ev] }));
    closeModal();
  };

  const [editEv, setEditEv]     = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [fileDragOver, setFileDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const fileIdRef    = useRef(1);
  const [reorderDragIdx, setReorderDragIdx] = useState(null);
  const [reorderOverIdx, setReorderOverIdx] = useState(null);

  const openEditEvent = (key, idx) => {
    const ev = (events[key] || [])[idx];
    if (!ev) return;
    setEditForm({
      name: ev.name || '', time: ev.time || '09:00', dur: ev.dur || '1h',
      cat: ev.cat || 'study', noteId: ev.noteId || null,
      notes: ev.notes || '',
      materials: (ev.materials || []).map(m => typeof m === 'string' ? m : (m && m.url) || ''),
      files: (ev.files || []).map(f => ({ ...f })),
      completed: !!ev.completed,
    });
    setEditEv({ key, idx });
  };
  const closeEditEvent = () => { setEditEv(null); setEditForm(null); };

  const saveEditEvent = () => {
    if (!editEv || !editForm) return;
    const { key, idx } = editEv;
    const f = editForm;
    const noteSubject = f.cat === 'study' && f.noteId
      ? Object.keys(SUBJECT_NOTE_MAP).find(s => SUBJECT_NOTE_MAP[s].noteId === f.noteId) || null : null;
    const noteInfo = noteSubject ? SUBJECT_NOTE_MAP[noteSubject] : null;
    const updated = {
      name: f.name, time: f.time, dur: f.dur, cat: f.cat,
      noteId: f.cat === 'study' ? f.noteId : null,
      noteColor: noteInfo?.color || null, noteBg: noteInfo?.bg || null,
      noteText: noteInfo?.text || null, noteSubject,
      notes: f.notes,
      materials: (f.materials || []).filter(m => m && m.trim()),
      files: f.files || [],
      completed: f.completed,
    };
    setEvents(prev => ({ ...prev, [key]: (prev[key] || []).map((e, i) => i === idx ? updated : e) }));
    closeEditEvent();
  };

  const deleteEditEvent = () => {
    if (!editEv) return;
    deleteEvent(editEv.key, editEv.idx);
    closeEditEvent();
  };

  const addMaterial    = ()       => setEditForm(f => f ? ({ ...f, materials: [...(f.materials||[]), ''] }) : f);
  const updateMaterial = (i, url) => setEditForm(f => f ? ({ ...f, materials: (f.materials||[]).map((m, j) => j === i ? url : m) }) : f);
  const removeMaterial = (i)      => setEditForm(f => f ? ({ ...f, materials: (f.materials||[]).filter((_, j) => j !== i) }) : f);

  const addEditFiles = (list) => {
    const arr = Array.from(list || []);
    if (!arr.length) return;
    setEditForm(f => {
      if (!f) return f;
      const next = [...(f.files || [])];
      arr.forEach(file => next.push({ id: fileIdRef.current++, name: file.name, size: file.size }));
      return { ...f, files: next };
    });
  };
  const removeEditFile = (id) => setEditForm(f => f ? ({ ...f, files: (f.files||[]).filter(x => x.id !== id) }) : f);
  const onFileDrop = (e) => { e.preventDefault(); setFileDragOver(false); if (e.dataTransfer && e.dataTransfer.files) addEditFiles(e.dataTransfer.files); };
  const onFilePick = (e) => { addEditFiles(e.target.files); e.target.value = ''; };
  const browseFiles = () => fileInputRef.current && fileInputRef.current.click();
  const fmtFileSize = (b) => { if (!b) return ''; if (b < 1024) return b + ' B'; if (b < 1048576) return (b/1024).toFixed(1) + ' KB'; return (b/1048576).toFixed(1) + ' MB'; };

  const handleEvClick = (ev, key, idx) => { openEditEvent(key, idx); };

  const weekLabel = () => {
    const end = calAddDays(weekStart, 6);
    if (weekStart.getMonth() === end.getMonth())
      return `${CAL_MONTHS_S[weekStart.getMonth()]} ${weekStart.getDate()}–${end.getDate()}, ${weekStart.getFullYear()}`;
    return `${CAL_MONTHS_S[weekStart.getMonth()]} ${weekStart.getDate()} – ${CAL_MONTHS_S[end.getMonth()]} ${end.getDate()}`;
  };

  const rangeLabel = view === 'week' ? weekLabel() : `${CAL_MONTHS[viewMonth]} ${viewYear}`;
  const weekDays = useMemo(() => Array.from({length:7}, (_, i) => calAddDays(weekStart, i)), [weekStart]);
  const todayDow = today.getDay(); // 0=Sun,1=Mon,...,6=Sat
  const monthGrid = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const diff = (firstOfMonth.getDay() - todayDow + 7) % 7;
    const gridStart = calAddDays(firstOfMonth, -diff);
    return Array.from({length:42}, (_, i) => calAddDays(gridStart, i));
  }, [viewMonth, viewYear]);

  const lifeBalance = useMemo(() => {
    const totals = {}; LIFE_CATS.forEach(c => { totals[c.id] = 0; });
    Array.from({length:7}, (_, i) => calAddDays(weekStart, i)).forEach(d => {
      (events[dayKey(d)] || []).forEach(ev => { totals[ev.cat] = (totals[ev.cat]||0) + durToMins(ev.dur); });
    });
    const total = Object.values(totals).reduce((a,b) => a+b, 0);
    return LIFE_CATS.map(c => ({ ...c, mins: totals[c.id], pct: total > 0 ? Math.round(totals[c.id]/total*100) : 0 }));
  }, [events, weekStart]);

  const fmtModalDate = (key) => { if (!key) return ''; const [y,m,d] = key.split('-').map(Number); return `${CAL_MONTHS_S[m-1]} ${d}, ${y}`; };
  const DAY_NAMES_ALL = ['DOM','LUN','MAR','MER','GIO','VEN','SAB'];
  const _ALL_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const _rot = (today.getDay() + 6) % 7; // Mon=0..Sun=6
  const WEEK_LABELS = [..._ALL_LABELS.slice(_rot), ..._ALL_LABELS.slice(0, _rot)];

  const renderWeek = () => {
    const hours   = Array.from({ length: 24 }, (_, i) => i);
    const now     = new Date();
    const nowFrac = now.getHours() + now.getMinutes() / 60;
    const nowY    = nowFrac * CAL_HOUR_H;
    const showNow = true;

    const timeToY  = (t) => { const [h, m] = (t || '08:00').split(':').map(Number); return Math.max(0, (h + m / 60) * CAL_HOUR_H); };
    const durToH   = (d) => Math.max(CAL_HOUR_H * 0.45, durToMins(d || '30m') / 60 * CAL_HOUR_H);
    const slotTime = (h) => `${String(h).padStart(2, '0')}:00`;

    return (
      <div style={{ border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', background:'var(--surface)' }}>
        {/* Day header row */}
        <div style={{ display:'grid', gridTemplateColumns:'50px repeat(7, 1fr)', borderBottom:'1px solid var(--border)', background:'var(--sidebar-bg)' }}>
          <div style={{ borderRight:'1px solid var(--border)' }} />
          {weekDays.map((day, i) => {
            const isToday = dayKey(day) === dayKey(today);
            return (
              <div key={i} style={{ padding:'10px 4px', textAlign:'center', borderRight: i < 6 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--gray)', letterSpacing:'0.06em', marginBottom:5 }}>{DAY_NAMES_ALL[day.getDay()]}</div>
                <div style={{ width:28, height:28, borderRadius:'50%', background: isToday ? 'var(--indigo)' : 'transparent', color: isToday ? '#fff' : 'var(--ink)', fontSize:13, fontWeight:700, display:'grid', placeItems:'center', margin:'0 auto' }}>{day.getDate()}</div>
              </div>
            );
          })}
        </div>

        {/* Scrollable time body */}
        <div ref={gridBodyRef} style={{ display:'flex', maxHeight:480, overflowY:'auto' }}>
          {/* Hour labels */}
          <div style={{ width:50, flexShrink:0, borderRight:'1px solid var(--border)' }}>
            {hours.map(h => (
              <div key={h} style={{ height:CAL_HOUR_H, display:'flex', alignItems:'flex-start', justifyContent:'flex-end', paddingRight:7, paddingTop:5, fontSize:10, fontWeight:600, color:'var(--gray)', lineHeight:1, boxSizing:'border-box', borderBottom:'1px solid var(--border)' }}>
                {h}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div style={{ flex:1, display:'grid', gridTemplateColumns:'repeat(7, 1fr)' }}>
            {weekDays.map((day, i) => {
              const key    = dayKey(day);
              const dayEvs = (events[key] || []).filter(ev => activeCats.has(ev.cat));
              const isToday = dayKey(day) === dayKey(today);
              return (
                <div key={i} style={{ position:'relative', borderRight: i < 6 ? '1px solid var(--border)' : 'none' }}>
                  {/* Clickable hour slots */}
                  {hours.map(h => (
                    <div key={h} onClick={() => openModal(key, slotTime(h))}
                      style={{ height:CAL_HOUR_H, borderBottom:'1px solid var(--border)', cursor:'pointer', boxSizing:'border-box', background: isToday ? 'rgba(55,48,232,.02)' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--lavender)'}
                      onMouseLeave={e => e.currentTarget.style.background= isToday ? 'rgba(55,48,232,.02)' : 'transparent'}
                    />
                  ))}
                  {/* Absolute events */}
                  {dayEvs.map((ev, idx) => {
                    const cat   = LIFE_CATS.find(c => c.id === ev.cat);
                    const color = ev.noteColor || (cat?.color || 'var(--indigo)');
                    const bg    = ev.noteBg    || (cat?.bg    || 'var(--lavender)');
                    const top   = timeToY(ev.time);
                    const h     = durToH(ev.dur);
                    return (
                      <div key={idx}
                        onMouseDown={e => startDrag(e, ev, key, idx)}
                        onClick={e => { e.stopPropagation(); handleEvClick(ev, key, (events[key]||[]).indexOf(ev)); }}
                        style={{ position:'absolute', top, left:3, right:3, height: h - 2, borderRadius:7, background:bg, borderLeft:`3px solid ${color}`, padding:'4px 6px', cursor:'grab', overflow:'hidden', zIndex:1, boxSizing:'border-box', opacity: drag && drag.fromKey===key && drag.fromIdx===idx ? 0.25 : ev.completed ? 0.5 : 1, userSelect:'none' }}>
                        <div style={{ fontSize:11, fontWeight:700, color, lineHeight:1.2, overflow:'hidden', textDecoration: ev.completed ? 'line-through' : 'none' }}>{ev.name}</div>
                        {h > 32 && <div style={{ fontSize:10, color, opacity:.75, marginTop:2 }}>{ev.time}{ev.dur ? ` · ${ev.dur}` : ''}</div>}
                        <button onClick={e => { e.stopPropagation(); deleteEvent(key, (events[key]||[]).indexOf(ev)); }}
                          style={{ position:'absolute', bottom:2, right:2, background:'transparent', border:'none', cursor:'pointer', padding:2, opacity:.6, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Trash size={10} color={color} />
                        </button>
                      </div>
                    );
                  })}
                  {/* Current time indicator */}
                  {isToday && showNow && (
                    <div style={{ position:'absolute', top:nowY, left:0, right:0, zIndex:2, pointerEvents:'none' }}>
                      <div style={{ position:'absolute', left:0, top:-4, width:8, height:8, borderRadius:'50%', background:'#EF4444', flexShrink:0 }} />
                      <div style={{ height:2, background:'#EF4444', marginLeft:8 }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderMonth = () => (
    <div>
      <div style={calS.monthWeekHeader}>{WEEK_LABELS.map(d => <div key={d} style={calS.monthWeekLabel}>{d}</div>)}</div>
      <div style={calS.monthGrid}>
        {monthGrid.map((day, i) => {
          const key = dayKey(day);
          const isCurrentMonth = day.getMonth() === viewMonth;
          const isToday = dayKey(day) === dayKey(today);
          const dayEvs = (events[key] || []).filter(ev => activeCats.has(ev.cat));
          const isDropTarget = monthDrag && monthDrag.toKey === key && monthDrag.fromKey !== key;
          return (
            <div key={i}
              data-month-cell={isCurrentMonth ? key : undefined}
              style={{ ...calS.monthCell, ...(isToday?calS.monthCellToday:{}), ...(isDropTarget?{ background:'var(--lavender)', border:'1.5px dashed var(--indigo)' }:{}), opacity:isCurrentMonth?1:0.35, cursor:isCurrentMonth?'pointer':'default' }}
              onClick={() => { if (monthDragMeta.current.started) return; isCurrentMonth && openDayDetail(key); }}>
              <span style={{ ...calS.monthDayNum, ...(isToday?calS.monthDayToday:{}) }}>{day.getDate()}</span>
              <div style={{ display:'flex', flexDirection:'column', gap:2, marginTop:3 }}>
                {dayEvs.slice(0,2).map((ev, idx) => {
                  const cat = LIFE_CATS.find(c => c.id === ev.cat);
                  const origIdx = (events[key] || []).indexOf(ev);
                  const isDragging = monthDrag && monthDrag.fromKey === key && monthDrag.ev === ev;
                  return <div key={idx}
                    onMouseDown={e => startMonthDrag(e, ev, key, origIdx)}
                    style={{ ...calS.monthPill, background:ev.noteColor||cat?.color, opacity:isDragging?0.3:(ev.completed?0.5:1), textDecoration:ev.completed?'line-through':'none', cursor:'grab', userSelect:'none' }}>{ev.name}</div>;
                })}
                {dayEvs.length > 2 && <div style={calS.monthMore}>+{dayEvs.length-2} more</div>}
              </div>
            </div>
          );
        })}
      </div>
      {monthDrag && monthDrag.started !== false && (
        <div style={{ position:'fixed', left:monthDrag.ghostX+8, top:monthDrag.ghostY+8, pointerEvents:'none', zIndex:9999, background: monthDrag.ev.noteColor || (LIFE_CATS.find(c => c.id === monthDrag.ev.cat)?.color || 'var(--indigo)'), color:'#fff', fontSize:10, fontWeight:600, padding:'4px 8px', borderRadius:4, boxShadow:'0 4px 12px rgba(0,0,0,.2)' }}>
          {monthDrag.ev.name}
        </div>
      )}
    </div>
  );

  const renderModal = () => {
    const cat = LIFE_CATS.find(c => c.id === selCat);
    const noteInfo = selNoteId ? Object.values(SUBJECT_NOTE_MAP).find(v => v.noteId === selNoteId) : null;
    const saveBg = noteInfo ? noteInfo.color : cat?.color;
    return (
      <div style={calS.overlay} onClick={closeModal}>
        <div style={calS.modal} onClick={e => e.stopPropagation()}>
          <h3 style={calS.modalTitle}>Add activity · {fmtModalDate(modalKey)}</h3>
          <div style={calS.modalField}>
            <label style={calS.modalLabel}>What are you doing?</label>
            <input value={modalName} onChange={e => setModalName(e.target.value)} onKeyDown={e => e.key==='Enter' && addEvent()}
              placeholder="e.g. Study session, Gym, Coffee…" style={calS.modalInput} autoFocus />
          </div>
          <div style={{ display:'flex', gap:12, marginBottom:16 }}>
            <div style={{ flex:1 }}><label style={calS.modalLabel}>Start time</label><input type="time" value={modalTime} onChange={e => setModalTime(e.target.value)} style={calS.modalInput} /></div>
            <div style={{ flex:1 }}><label style={calS.modalLabel}>Duration</label>
              <select value={modalDur} onChange={e => setModalDur(e.target.value)} style={calS.modalInput}>
                {['15m','30m','45m','1h','1h30m','2h','3h','Custom'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {modalDur === 'Custom' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
                  <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--gray)', fontWeight:700 }}>
                    <input type="number" min="0" max="12" value={customH}
                      onChange={e => setCustomH(Math.max(0, Math.min(12, Number(e.target.value) || 0)))}
                      style={{ ...calS.modalInput, padding:'8px 10px', textAlign:'center' }} />h
                  </label>
                  <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--gray)', fontWeight:700 }}>
                    <input type="number" min="0" max="59" value={customM}
                      onChange={e => setCustomM(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                      style={{ ...calS.modalInput, padding:'8px 10px', textAlign:'center' }} />m
                  </label>
                </div>
              )}
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={calS.modalLabel}>Category</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
              {LIFE_CATS.map(c => (
                <button key={c.id} onClick={() => { setSelCat(c.id); if(c.id!=='study') setSelNoteId(null); }}
                  style={{ ...calS.catChip, background:selCat===c.id?c.color:c.bg, color:selCat===c.id?'#fff':c.text, border:`1.5px solid ${c.color}` }}>
                  <span style={{ ...calS.catDot, background:selCat===c.id?'#fff':c.color }} />{c.label}
                </button>
              ))}
            </div>
          </div>
          {selCat === 'study' && (
            <div style={{ marginBottom:16 }}>
              <label style={calS.modalLabel}>Which subject?</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
                {Object.entries(SUBJECT_NOTE_MAP).map(([subject, info]) => (
                  <button key={subject} onClick={() => selectSubject(subject)}
                    style={{ ...calS.catChip, background:selNoteId===info.noteId?info.color:info.bg, color:selNoteId===info.noteId?'#fff':info.text, border:`1.5px solid ${info.color}` }}>
                    {subject}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
            <button onClick={closeModal} style={calS.cancelBtn}>Cancel</button>
            <button onClick={addEvent} style={{ ...calS.saveBtn, background:saveBg }}>Add activity</button>
          </div>
        </div>
      </div>
    );
  };

  const renderEditModal = () => {
    const f = editForm;
    const cat = LIFE_CATS.find(c => c.id === f.cat);
    const noteInfo = f.noteId ? Object.values(SUBJECT_NOTE_MAP).find(v => v.noteId === f.noteId) : null;
    const saveBg = noteInfo ? noteInfo.color : cat?.color;
    const upd = (patch) => setEditForm(prev => prev ? ({ ...prev, ...patch }) : prev);
    return (
      <div style={calS.overlay} onClick={closeEditEvent}>
        <div style={{ ...calS.modal, maxHeight:'88vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
            <h3 style={{ ...calS.modalTitle, margin:0 }}>Modifica attività · {fmtModalDate(editEv.key)}</h3>
            <label style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:'var(--gray)', cursor:'pointer', userSelect:'none' }}>
              <input type="checkbox" checked={f.completed} onChange={e => upd({ completed: e.target.checked })} />
              Completata
            </label>
          </div>
          <div style={calS.modalField}>
            <label style={calS.modalLabel}>Cosa stai facendo?</label>
            <input value={f.name} onChange={e => upd({ name: e.target.value })} style={calS.modalInput} />
          </div>
          <div style={{ display:'flex', gap:12, marginBottom:16 }}>
            <div style={{ flex:1 }}><label style={calS.modalLabel}>Orario</label><input type="time" value={f.time} onChange={e => upd({ time: e.target.value })} style={calS.modalInput} /></div>
            <div style={{ flex:1 }}><label style={calS.modalLabel}>Durata</label>
              <select value={f.dur} onChange={e => upd({ dur: e.target.value })} style={calS.modalInput}>
                {['15m','30m','45m','1h','1h30m','2h','3h'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={calS.modalLabel}>Categoria</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
              {LIFE_CATS.map(c => (
                <button key={c.id} onClick={() => upd({ cat: c.id, noteId: c.id !== 'study' ? null : f.noteId })}
                  style={{ ...calS.catChip, background:f.cat===c.id?c.color:c.bg, color:f.cat===c.id?'#fff':c.text, border:`1.5px solid ${c.color}` }}>
                  <span style={{ ...calS.catDot, background:f.cat===c.id?'#fff':c.color }} />{c.label}
                </button>
              ))}
            </div>
          </div>
          {f.cat === 'study' && (
            <div style={{ marginBottom:16 }}>
              <label style={calS.modalLabel}>Quale materia?</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
                {Object.entries(SUBJECT_NOTE_MAP).map(([subject, info]) => (
                  <button key={subject} onClick={() => upd({ noteId: f.noteId === info.noteId ? null : info.noteId })}
                    style={{ ...calS.catChip, background:f.noteId===info.noteId?info.color:info.bg, color:f.noteId===info.noteId?'#fff':info.text, border:`1.5px solid ${info.color}` }}>
                    {subject}
                  </button>
                ))}
              </div>
              {f.noteId && (
                <button onClick={() => { closeEditEvent(); setTab('notes'); }}
                  style={{ marginTop:10, padding:'7px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  📖 Apri nota collegata
                </button>
              )}
            </div>
          )}
          <div style={calS.modalField}>
            <label style={calS.modalLabel}>Note / Info</label>
            <textarea value={f.notes} onChange={e => upd({ notes: e.target.value })}
              placeholder="Argomenti, obiettivi, capitoli da rivedere…"
              style={{ ...calS.modalInput, minHeight:70, resize:'vertical', fontFamily:'inherit' }} />
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={calS.modalLabel}>Materiali e link</label>
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
              {f.materials.map((m, i) => (
                <div key={i} style={{ display:'flex', gap:6 }}>
                  <input value={m} onChange={e => updateMaterial(i, e.target.value)}
                    placeholder="https://… oppure nome file / link" style={{ ...calS.modalInput, flex:1 }} />
                  <button onClick={() => removeMaterial(i)}
                    style={{ width:36, borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--gray)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Trash size={13} /></button>
                </div>
              ))}
              <button onClick={addMaterial}
                style={{ alignSelf:'flex-start', padding:'8px 12px', borderRadius:10, border:'1.5px dashed var(--border)', background:'transparent', color:'var(--gray)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                + Aggiungi materiale / link
              </button>
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={calS.modalLabel}>File allegati</label>
            <div
              onDragOver={e => { e.preventDefault(); setFileDragOver(true); }}
              onDragLeave={() => setFileDragOver(false)}
              onDrop={onFileDrop}
              style={{ marginTop:8, padding:'16px', border:`1.5px dashed ${fileDragOver ? 'var(--indigo)' : 'var(--border)'}`, borderRadius:12, background: fileDragOver ? 'var(--lavender)' : 'transparent', textAlign:'center', cursor:'pointer', transition:'background .15s, border-color .15s' }}
              onClick={browseFiles}>
              <div style={{ fontSize:22, marginBottom:4 }}>📤</div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', marginBottom:2 }}>Trascina i file qui</div>
              <div style={{ fontSize:11, color:'var(--gray)' }}>oppure clicca per selezionare</div>
              <input ref={fileInputRef} type="file" multiple onChange={onFilePick} style={{ display:'none' }} />
            </div>
            {f.files && f.files.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
                {f.files.map(file => (
                  <div key={file.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'var(--sidebar-bg)', border:'1px solid var(--border)', borderRadius:8 }}>
                    <span style={{ color:'var(--indigo)', display:'grid', placeItems:'center' }}><FileText size={14} /></span>
                    <div style={{ flex:1, minWidth:0, fontSize:12, fontWeight:600, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={file.name}>{file.name}</div>
                    <span style={{ fontSize:11, color:'var(--gray)', flexShrink:0 }}>{fmtFileSize(file.size)}</span>
                    <button onClick={() => removeEditFile(file.id)}
                      style={{ width:24, height:24, borderRadius:6, border:'none', background:'transparent', color:'var(--gray)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Trash size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'space-between', marginTop:20 }}>
            <button onClick={deleteEditEvent}
              style={{ padding:'10px 16px', borderRadius:999, border:'1px solid #EF4444', background:'transparent', color:'#EF4444', fontWeight:600, fontSize:13, cursor:'pointer' }}>
              Elimina
            </button>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={closeEditEvent} style={calS.cancelBtn}>Annulla</button>
              <button onClick={saveEditEvent} style={{ ...calS.saveBtn, background:saveBg }}>Salva</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={calS.wrap}>
      <div style={{ marginBottom:22 }}>
        <h2 style={homeS.h1}>Calendar</h2>
        <p style={homeS.sub}>Plan your week, track your life balance</p>
      </div>
      <div style={calS.header}>
        <div style={calS.navGroup}>
          <button onClick={navPrev} style={calS.navBtn}>‹</button>
          <span style={calS.rangeLabel}>{rangeLabel}</span>
          <button onClick={navNext} style={calS.navBtn}>›</button>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* View dropdown pill */}
          <div style={{ position:'relative' }}>
            <button onClick={() => setViewDropOpen(o => !o)}
              style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'8px 16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:999, fontSize:13, fontWeight:600, color:'var(--ink)', cursor:'pointer', userSelect:'none' }}>
              {view === 'week' ? 'Settimana' : 'Mese'}
              <ChevronDown size={14} color="var(--gray)" />
            </button>
            {viewDropOpen && (
              <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, boxShadow:'0 12px 32px rgba(0,0,0,.18)', zIndex:300, minWidth:160, overflow:'hidden' }}
                onMouseLeave={() => setViewDropOpen(false)}>
                {[{v:'week',label:'Settimana',key:'W'},{v:'month',label:'Mese',key:'M'}].map(({v, label, key}) => (
                  <button key={v} onClick={() => { setView(v); setViewDropOpen(false); }}
                    style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 18px', background: view===v ? 'var(--lavender)' : 'transparent', color: view===v ? 'var(--indigo)' : 'var(--ink)', fontSize:14, fontWeight: view===v ? 700 : 500, borderBottom:'1px solid var(--border)', cursor:'pointer', textAlign:'left' }}>
                    <span>{label}</span>
                    <span style={{ fontSize:11, color:'var(--gray)', fontWeight:700 }}>{key}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={onOpenPlanner} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'8px 16px', background:'var(--indigo)', color:'#fff', borderRadius:999, fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
            <Brain size={14} /> Studio AI
          </button>
        </div>
      </div>
      <div style={calS.catsRow}>
        {LIFE_CATS.map(c => (
          <button key={c.id} onClick={() => toggleCat(c.id)}
            style={{ ...calS.catChip, opacity:activeCats.has(c.id)?1:0.3, background:c.bg, color:c.text, border:`1.5px solid ${c.color}33` }}>
            <span style={{ ...calS.catDot, background:c.color }} />{c.label}
          </button>
        ))}
      </div>
      {view === 'week' ? renderWeek() : renderMonth()}
      <div style={calS.balanceSection}>
        <h4 style={calS.balanceTitle}>Life Balance — this week</h4>
        <div style={calS.balanceGrid}>
          {lifeBalance.map(b => (
            <div key={b.id} style={calS.balanceCard}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{ ...calS.catDot, background:b.color }} />
                <span style={{ fontSize:12, fontWeight:600, color:'var(--ink)' }}>{b.label}</span>
              </div>
              <div style={{ fontSize:22, fontWeight:800, color:b.color, letterSpacing:'-0.02em', marginBottom:6 }}>{b.pct}%</div>
              <div style={{ height:4, background:'#F4F5FF', borderRadius:999, overflow:'hidden', marginBottom:4 }}>
                <div style={{ width:`${b.pct}%`, height:'100%', background:b.color, borderRadius:999 }} />
              </div>
              <div style={{ fontSize:11, color:'var(--gray)' }}>{b.mins}m</div>
            </div>
          ))}
        </div>
      </div>
      {dayDetailKey && (() => {
        const key = dayDetailKey;
        const dayEvs = (events[key] || []).filter(ev => activeCats.has(ev.cat));
        const [yr, mo, dy] = key.split('-').map(Number);
        const d = new Date(yr, mo - 1, dy);
        const label = d.toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(15,16,53,.45)', display:'grid', placeItems:'center', zIndex:100 }}
            onClick={closeDayDetail}>
            <div style={{ width:'100%', maxWidth:460, maxHeight:'80vh', display:'flex', flexDirection:'column', background:'var(--surface)', borderRadius:20, border:'1px solid var(--border)', boxShadow:'0 30px 80px -20px rgba(15,16,53,.4)', overflow:'hidden' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ padding:'20px 22px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:'var(--ink)', textTransform:'capitalize' }}>{label}</div>
                  <div style={{ fontSize:12, color:'var(--gray)', marginTop:2 }}>{dayEvs.length} {dayEvs.length === 1 ? 'attività' : 'attività'}</div>
                </div>
                <button onClick={closeDayDetail} style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--gray)', fontSize:16, display:'grid', placeItems:'center', cursor:'pointer' }}>✕</button>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:'12px 22px' }}>
                {dayEvs.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'32px 0', color:'var(--gray)', fontSize:13 }}>Nessuna attività — aggiungine una!</div>
                ) : dayEvs.map((ev, idx) => {
                  const cat = LIFE_CATS.find(c => c.id === ev.cat);
                  const bg = ev.noteBg || cat?.bg;
                  const color = ev.noteColor || cat?.color;
                  const text = ev.noteText || cat?.text;
                  const origIdx = (events[key]||[]).indexOf(ev);
                  const isDragging = reorderDragIdx === origIdx;
                  const isDropTarget = reorderOverIdx === origIdx && reorderDragIdx !== null && reorderDragIdx !== origIdx;
                  const totalAttach = (ev.materials ? ev.materials.length : 0) + (ev.files ? ev.files.length : 0);
                  return (
                    <div key={idx}
                      draggable
                      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(origIdx)); setReorderDragIdx(origIdx); }}
                      onDragEnd={() => { setReorderDragIdx(null); setReorderOverIdx(null); }}
                      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (reorderOverIdx !== origIdx) setReorderOverIdx(origIdx); }}
                      onDrop={e => {
                        e.preventDefault();
                        const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
                        setReorderDragIdx(null); setReorderOverIdx(null);
                        if (!isNaN(from) && from !== origIdx) reorderEvent(key, from, origIdx);
                      }}
                      onClick={() => { if (reorderDragIdx !== null) return; closeDayDetail(); openEditEvent(key, origIdx); }}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:bg, border:isDropTarget ? `1.5px dashed ${color}` : `1px solid ${color}33`, marginBottom:8, opacity: isDragging ? 0.4 : (ev.completed ? 0.55 : 1), cursor:'pointer' }}>
                      <span style={{ color:text||'var(--gray)', opacity:.5, fontSize:14, lineHeight:1, cursor:'grab', userSelect:'none', flexShrink:0 }}>⋮⋮</span>
                      <div style={{ width:4, alignSelf:'stretch', borderRadius:999, background:color, flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:text||'var(--ink)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textDecoration: ev.completed ? 'line-through' : 'none' }}>{ev.name}</div>
                        <div style={{ fontSize:11, color:text||'var(--gray)', opacity:.7, display:'flex', gap:8 }}>
                          <span>🕐 {ev.time}</span><span>⏱ {ev.dur}</span>
                          {totalAttach > 0 && <span>📎 {totalAttach}</span>}
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteEvent(key, origIdx); }} style={{ color:'var(--gray-2)', padding:4, borderRadius:6, border:'none', background:'transparent', cursor:'pointer', opacity:.6, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}><Trash size={13} /></button>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)' }}>
                <button onClick={() => { closeDayDetail(); openModal(key); }} style={{ width:'100%', padding:'11px', borderRadius:12, background:'var(--indigo)', color:'#fff', fontWeight:600, fontSize:14, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  + Aggiungi attività
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {modalKey && renderModal()}
      {editEv && editForm && renderEditModal()}
      {drag && (
        <div style={{ position:'fixed', left:drag.ghostX, top:drag.ghostY, width:drag.ghostW, height:drag.ghostH,
          background:drag.bg, borderLeft:`3px solid ${drag.color}`, borderRadius:8, padding:'5px 8px',
          zIndex:9999, pointerEvents:'none', boxShadow:'0 12px 32px rgba(0,0,0,.22)',
          opacity:0.92, boxSizing:'border-box', overflow:'hidden' }}>
          <div style={{ fontSize:11, fontWeight:700, color:drag.color, lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{drag.ev.name}</div>
          <div style={{ fontSize:10, color:drag.color, opacity:.8, marginTop:3 }}>🕐 {drag.toTime}</div>
        </div>
      )}
    </div>
  );
}

const calS = {
  wrap: { display:'flex', flexDirection:'column', gap:18 },
  header: { display:'flex', alignItems:'center', justifyContent:'space-between' },
  navGroup: { display:'flex', alignItems:'center', gap:10 },
  navBtn: { width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontSize:18, display:'grid', placeItems:'center', cursor:'pointer' },
  rangeLabel: { fontSize:14, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.01em', padding:'6px 18px', border:'1px solid var(--border)', borderRadius:10, background:'var(--surface)', textAlign:'center', whiteSpace:'nowrap' },
  viewToggleGroup: { display:'flex', background:'var(--sidebar-bg)', border:'1.5px solid var(--border)', borderRadius:10, padding:3, gap:2 },
  toggleBtn: { padding:'6px 16px', borderRadius:8, fontSize:13, fontWeight:600, color:'var(--gray)', background:'transparent', border:'none', cursor:'pointer' },
  toggleBtnActive: { background:'var(--surface)', color:'var(--ink)', boxShadow:'0 1px 4px rgba(0,0,0,.15)', border:'0.5px solid var(--border)' },
  catsRow: { display:'flex', gap:8, flexWrap:'wrap' },
  catChip: { display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:999, fontSize:12, fontWeight:600, cursor:'pointer', transition:'opacity .15s' },
  catDot: { width:8, height:8, borderRadius:999, flexShrink:0 },
  weekGrid: { display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:8 },
  weekCol: { display:'flex', flexDirection:'column', gap:6 },
  weekColHeader: { display:'flex', flexDirection:'column', alignItems:'center', gap:2, padding:'10px 8px', background:'var(--sidebar-bg)', border:'1px solid var(--border)', borderRadius:10, marginBottom:2 },
  weekDayName: { fontSize:10, fontWeight:700, color:'var(--gray-2)', letterSpacing:'0.06em' },
  weekDayNum: { fontSize:22, fontWeight:700, color:'var(--ink)', lineHeight:1, width:36, height:36, display:'grid', placeItems:'center', borderRadius:999 },
  weekDayToday: { background:'var(--indigo)', color:'#fff' },
  weekEvs: { display:'flex', flexDirection:'column', gap:6 },
  evCard: { borderRadius:10, padding:'8px 10px', display:'flex', flexDirection:'column', gap:4 },
  evName: { fontSize:12, fontWeight:600, color:'var(--ink)', lineHeight:1.3 },
  evMeta: { display:'flex', alignItems:'center', gap:4, fontSize:10, color:'var(--gray)' },
  evTrash: { color:'var(--gray-2)', padding:2, borderRadius:4, flexShrink:0, opacity:0.6 },
  noteChip: { fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:999 },
  addSlot: { border:'1.5px dashed var(--border)', borderRadius:10, padding:'7px', fontSize:12, color:'var(--gray-2)', fontWeight:600, textAlign:'center', cursor:'pointer', background:'transparent' },
  monthWeekHeader: { display:'grid', gridTemplateColumns:'repeat(7, 1fr)', marginBottom:4 },
  monthWeekLabel: { textAlign:'center', fontSize:11, fontWeight:700, color:'var(--gray)', letterSpacing:'0.04em', padding:'4px 0' },
  monthGrid: { display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2 },
  monthCell: { height:90, padding:'6px 8px', borderRadius:8, border:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden' },
  monthCellToday: { border:'1.5px solid #3730E8' },
  monthDayNum: { fontSize:12, fontWeight:600, color:'var(--ink)' },
  monthDayToday: { background:'#3730E8', color:'#fff', width:20, height:20, borderRadius:999, display:'grid', placeItems:'center', fontSize:11 },
  monthPill: { fontSize:10, fontWeight:600, color:'#fff', padding:'2px 6px', borderRadius:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  monthMore: { fontSize:10, color:'var(--gray)', fontWeight:600 },
  balanceSection: { borderTop:'1px solid var(--border)', paddingTop:18 },
  balanceTitle: { margin:'0 0 12px', fontSize:14, fontWeight:700, color:'var(--ink)' },
  balanceGrid: { display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:10 },
  balanceCard: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:14 },
  overlay: { position:'fixed', inset:0, background:'rgba(15,16,53,.4)', display:'grid', placeItems:'center', zIndex:100 },
  modal: { background:'var(--surface)', borderRadius:20, padding:28, width:'100%', maxWidth:480, boxShadow:'0 20px 60px -10px rgba(15,16,53,.2)' },
  modalTitle: { margin:'0 0 20px', fontSize:16, fontWeight:700, color:'var(--ink)' },
  modalField: { marginBottom:16 },
  modalLabel: { display:'block', fontSize:12, fontWeight:700, color:'var(--ink)', marginBottom:8 },
  modalInput: { width:'100%', padding:'10px 12px', border:'1px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--ink)', background:'var(--surface)', outline:'none', boxSizing:'border-box' },
  cancelBtn: { padding:'10px 20px', borderRadius:999, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontWeight:600, fontSize:14, cursor:'pointer' },
  saveBtn: { padding:'10px 20px', borderRadius:999, border:'none', color:'#fff', fontWeight:600, fontSize:14, cursor:'pointer' },
};


/* ===================== AI STUDY PLANNER ===================== */
function AIStudyPlanner({ onClose, onPlanAdded, initialNoteId, existingEvents }) {
  const SUBJECTS_LIST = ['Biology','Chemistry','History','Math','Economics','Literature'];
  const TECH_PRESETS  = ['Pomodoro 25/5','Pomodoro 50/10','Blocchi 1h','Blocchi 2h','Blocchi 3h'];
  const TECH_DUR      = { 'Pomodoro 25/5':25, 'Pomodoro 50/10':50, 'Blocchi 1h':60, 'Blocchi 2h':120, 'Blocchi 3h':180 };
  const TIME_SLOTS    = {
    morning:   ['07:00','08:30','10:00','11:00'],
    afternoon: ['13:00','14:30','16:00','17:00'],
    evening:   ['19:00','20:30','21:30'],
    night:     ['22:00','23:30'],
  };
  const TIME_DEFS = [
    { id:'morning',   label:'Mattina',    emoji:'🌅' },
    { id:'afternoon', label:'Pomeriggio', emoji:'☀️' },
    { id:'evening',   label:'Sera',       emoji:'🌆' },
    { id:'night',     label:'Notte',      emoji:'🌙' },
  ];

  const durLabel = (m) => m >= 60 ? (m % 60 ? `${Math.floor(m/60)}h${m%60}m` : `${Math.floor(m/60)}h`) : `${m}m`;
  const hoursLabel = (v) => Number.isInteger(v) ? `${v}h` : `${v}h`;

  const [step, setStep]                   = useState('form');
  const [selSubjects, setSelSubjects]     = useState(new Set(['Biology','Math']));
  const [hoursVal, setHoursVal]           = useState(2);
  const [selTechniques, setSelTechniques] = useState(new Set(['Pomodoro 25/5']));
  const [customTech, setCustomTech]       = useState('');
  const [selTimes, setSelTimes]           = useState(new Set(['morning']));
  const [blockLimitNotice, setBlockLimitNotice] = useState(null);
  const [plan, setPlan]                   = useState(null);
  const [added, setAdded]                 = useState(false);
  const [errors, setErrors]               = useState({});

  const toggleSubject = (s) => {
    setSelSubjects(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
    setErrors(e => ({ ...e, subjects: null }));
  };
  const toggleTech = (t) => {
    setCustomTech('');
    setSelTechniques(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });
    setErrors(e => ({ ...e, tech: null }));
  };
  const toggleTime = (id) => {
    setSelTimes(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      if (n.size === 1 && hoursVal > 4) {
        const only = [...n][0];
        const label = TIME_DEFS.find(t => t.id === only)?.label || 'Fascia';
        setHoursVal(4);
        setBlockLimitNotice(`${label} max 4h`);
      } else if (n.size !== 1 || hoursVal < 4) {
        setBlockLimitNotice(null);
      }
      return n;
    });
    setErrors(e => ({ ...e, time: null }));
  };
  const onCustomChange = (v) => {
    setCustomTech(v);
    if (v) setSelTechniques(new Set());
    setErrors(e => ({ ...e, tech: null }));
  };

  const validate = () => {
    const errs = {};
    if (selSubjects.size === 0) errs.subjects = 'Seleziona almeno una materia';
    if (selTechniques.size === 0 && !customTech.trim()) errs.tech = 'Seleziona o scrivi una tecnica';
    if (selTimes.size === 0) errs.time = 'Seleziona almeno un orario';
    if (hoursVal >= 8 && selTimes.size < 2) errs.time = 'Per 8h+ seleziona almeno 2 fasce orarie';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPlan = () => {
    const subjects = [...selSubjects];
    const durM = customTech.trim() ? 90 : TECH_DUR[[...selTechniques][0]] || 90;
    const techName = customTech.trim() || [...selTechniques][0] || 'Sessione';
    const allSlots = [...selTimes].flatMap(t => TIME_SLOTS[t]).sort();
    const nSess = Math.min(Math.floor(hoursVal * 60 / durM), allSlots.length);

    // End date = closest examDate among selected subjects
    const examDates = subjects
      .map(s => { const n = seedNotes.find(nn => nn.subject === s); return n && n.examDate ? new Date(n.examDate) : null; })
      .filter(Boolean);
    const endDate = examDates.length > 0
      ? new Date(Math.min(...examDates.map(d => d.getTime())))
      : new Date(Date.now() + 21 * 86400000);
    endDate.setHours(0,0,0,0);

    const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate() + 1);
    const DAY_N = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
    const MON_N = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const timeToMins = (t) => { const [h,m] = (t||'00:00').split(':').map(Number); return h*60 + m; };
    const overlaps = (aS, aE, bS, bE) => aS < bE && aE > bS;

    const days = []; let sIdx = 0; const cur = new Date(start);
    while (cur < endDate) {
      const d = new Date(cur);
      const dayLabel = `${DAY_N[d.getDay()]} ${MON_N[d.getMonth()]} ${d.getDate()}`;
      const dateKey = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
      const existing = (existingEvents && existingEvents[dateKey]) || [];
      const existingBlocks = existing.map(ev => {
        const s = timeToMins(ev.time); return { s, e: s + (durToMins(ev.dur) || 30) };
      });
      const sessions = [];
      for (const slot of allSlots) {
        if (sessions.length >= nSess) break;
        const sMin = timeToMins(slot); const eMin = sMin + durM;
        const conflict =
          existingBlocks.some(b => overlaps(sMin, eMin, b.s, b.e)) ||
          sessions.some(s => { const a = timeToMins(s.time); return overlaps(sMin, eMin, a, a + durM); });
        if (conflict) continue;
        const subj = subjects[sIdx % subjects.length]; sIdx++;
        const col = SUBJECT_COLORS[subj] || EXTRA_SUBJECT_COLORS.Other;
        sessions.push({ time: slot, name: `${subj} — ${techName}`,
          dur: durLabel(durM), color: col.dot, bg: col.bg, text: col.text, subject: subj, dateKey });
      }
      const tm = sessions.length * durM;
      const total = (tm >= 60 ? Math.floor(tm/60)+'h ' : '') + (tm % 60 ? tm%60+'m' : '');
      days.push({ day: dayLabel, date: dateKey, sessions, total: total.trim() });
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  };

  const generate = () => {
    if (!validate()) return;
    setStep('loading');
    setTimeout(() => { setPlan(buildPlan()); setStep('result'); }, 1800);
  };

  const addToCalendar = () => {
    const eventsToAdd = [];
    plan.forEach(day => day.sessions.forEach(s => {
      const col = SUBJECT_COLORS[s.subject] || EXTRA_SUBJECT_COLORS.Other;
      const nm  = SUBJECT_NOTE_MAP[s.subject];
      eventsToAdd.push({ dateKey: s.dateKey, event: {
        name: s.name, time: s.time, dur: s.dur, cat:'study',
        noteId: nm ? nm.noteId : null,
        noteColor: (nm && nm.color) || col.dot,
        noteBg:    (nm && nm.bg)    || col.bg,
        noteText:  (nm && nm.text)  || col.text,
        noteSubject: s.subject,
      }});
    }));
    setAdded(true);
    onPlanAdded(eventsToAdd);
    setTimeout(() => onClose(), 1500);
  };

  const overlayClick = (e) => { if (e.target === e.currentTarget && step === 'form') onClose(); };
  const errMsg = { fontSize:11, color:'#DC2626', marginTop:4 };

  // Slider fill percentage
  const sliderPct = ((hoursVal - 1) / 7) * 100;

  const toggleStyle = (sel) => ({
    padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:600,
    cursor:'pointer', border:'1px solid', transition:'all .15s',
    background:  sel ? 'var(--lavender)' : 'var(--sidebar-bg)',
    borderColor: sel ? 'var(--indigo)'   : 'var(--border)',
    color:       sel ? 'var(--indigo)'   : 'var(--gray)',
  });

  return (
    <div style={plannerS.overlay} onClick={overlayClick}>
      <div style={plannerS.card}>

        {/* HEADER */}
        <div style={plannerS.header}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={plannerS.brainBox}><Brain size={20} style={{ color:'#fff' }} /></div>
            <div>
              <div style={plannerS.title}>AI Study Planner</div>
              <div style={plannerS.sub}>Genera un piano personalizzato</div>
            </div>
          </div>
          <button onClick={onClose} style={plannerS.closeBtn}><XMark size={16} /></button>
        </div>

        {/* BODY form */}
        {step !== 'result' && (
          <div style={plannerS.body}>

            {/* Campo 1 — Materie */}
            <div>
              <div style={plannerS.fieldLabel}>Materie da studiare</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8 }}>
                {SUBJECTS_LIST.map(s => {
                  const col = SUBJECT_COLORS[s]; const sel = selSubjects.has(s);
                  return (
                    <button key={s} onClick={() => toggleSubject(s)} style={{
                      padding:'6px 14px', borderRadius:999, fontSize:12, fontWeight:600,
                      cursor:'pointer', border:'1.5px solid', transition:'all .15s',
                      background: sel ? col.dot : col.bg,
                      color:      sel ? '#fff'  : col.text,
                      borderColor: sel ? col.dot : col.border,
                    }}>{s}</button>
                  );
                })}
              </div>
              {errors.subjects && <div style={errMsg}>{errors.subjects}</div>}
            </div>

            {/* Campo 2 — Ore slider */}
            <div>
              <div style={plannerS.fieldLabel}>Ore disponibili al giorno</div>
              <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:10 }}>
                <div style={{ textAlign:'center', minWidth:48 }}>
                  <div style={{ fontSize:22, fontWeight:700, color:'var(--indigo)', lineHeight:1 }}>{hoursLabel(hoursVal)}</div>
                  <div style={{ fontSize:11, color:'var(--gray)', marginTop:2 }}>al giorno</div>
                </div>
                <div style={{ flex:1 }}>
                  <input type="range" min="1" max="8" step="0.5" value={hoursVal}
                    onChange={e => {
                      let val = Number(e.target.value);
                      if (val > 4 && selTimes.size === 1) {
                        const only = [...selTimes][0];
                        const label = TIME_DEFS.find(t => t.id === only)?.label || 'Fascia';
                        val = 4;
                        setBlockLimitNotice(`${label} max 4h`);
                      } else if (val < 4 || selTimes.size !== 1) {
                        setBlockLimitNotice(null);
                      }
                      setHoursVal(val);
                    }}
                    style={{ width:'100%', height:4, borderRadius:999, cursor:'pointer', outline:'none', appearance:'none',
                      background:`linear-gradient(to right, var(--indigo) ${sliderPct}%, var(--border) ${sliderPct}%)` }} />
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <span key={n} style={{ fontSize:10, color:'var(--gray)' }}>{n}h</span>
                    ))}
                  </div>
                  {blockLimitNotice && (
                    <div style={{ marginTop:6, display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999, background:'#FEF3C7', border:'1px solid #F59E0B', fontSize:11, fontWeight:700, color:'#92400E' }}>
                      ⚠️ {blockLimitNotice}
                    </div>
                  )}
                </div>
              </div>
              <style>{`
                input[type=range]::-webkit-slider-thumb{appearance:none;width:20px;height:20px;border-radius:50%;background:var(--indigo);box-shadow:0 0 0 3px rgba(55,48,232,.2);cursor:pointer}
                input[type=range]::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:var(--indigo);border:none;box-shadow:0 0 0 3px rgba(55,48,232,.2);cursor:pointer}
              `}</style>
            </div>

            {/* Campo 3 — Tecnica */}
            <div>
              <div style={plannerS.fieldLabel}>Tecnica di studio</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
                {TECH_PRESETS.map(t => (
                  <button key={t} onClick={() => toggleTech(t)} style={toggleStyle(selTechniques.has(t))}>{t}</button>
                ))}
              </div>
              <input value={customTech} onChange={e => onCustomChange(e.target.value)}
                placeholder="Oppure scrivi la tua tecnica… es. Sessioni da 4h"
                style={{ marginTop:8, width:'100%', padding:'9px 12px', border:'1px solid var(--border)',
                  borderRadius:10, fontSize:13, color:'var(--ink)', background:'var(--surface)',
                  outline:'none', boxSizing:'border-box' }} />
              {errors.tech && <div style={errMsg}>{errors.tech}</div>}
            </div>

            {/* Campo 4 — Quando studi */}
            <div>
              <div style={plannerS.fieldLabel}>Quando studi?</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:8 }}>
                {TIME_DEFS.map(t => {
                  const sel = selTimes.has(t.id);
                  return (
                    <button key={t.id} onClick={() => toggleTime(t.id)} style={{
                      display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                      padding:'10px 6px', borderRadius:12, border:'1px solid',
                      cursor:'pointer', transition:'all .15s',
                      background:  sel ? 'var(--lavender)' : 'var(--sidebar-bg)',
                      borderColor: sel ? 'var(--indigo)'   : 'var(--border)',
                      color:       sel ? 'var(--indigo)'   : 'var(--gray)',
                    }}>
                      <span style={{ fontSize:20 }}>{t.emoji}</span>
                      <span style={{ fontSize:11, fontWeight:600 }}>{t.label}</span>
                    </button>
                  );
                })}
              </div>
              {errors.time && <div style={errMsg}>{errors.time}</div>}
            </div>
          </div>
        )}

        {/* BODY result */}
        {step === 'result' && plan && (
          <div style={plannerS.body}>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#DCFCE7', border:'1px solid #86efac', borderRadius:12 }}>
              <Check size={16} style={{ color:'#166534' }} />
              <span style={{ fontSize:13, fontWeight:600, color:'#166534' }}>Plan ready</span>
              <span style={{ fontSize:12, color:'#166534', marginLeft:'auto' }}>{selSubjects.size} subjects · {plan.length} days</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {plan.map((day, di) => (
                <div key={di} style={{ borderRadius:14, border:'1px solid var(--border)', overflow:'hidden' }}>
                  <div style={{ padding:'8px 14px', background:'var(--sidebar-bg)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>{day.day}</span>
                    <span style={{ fontSize:11, color:'var(--gray)' }}>{day.total} total</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6, padding:'10px 12px' }}>
                    {day.sessions.map((s, si) => (
                      <div key={si} style={{ borderLeft:`3px solid ${s.color}`, background:s.bg, borderRadius:8, padding:'7px 10px' }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)' }}>{s.name}</div>
                        <div style={{ fontSize:10, color:'var(--gray)', marginTop:2 }}>{s.time} · {s.dur}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {added && (
              <div style={{ padding:'12px 16px', background:'#DCFCE7', border:'1px solid #86efac', borderRadius:12, fontSize:13, fontWeight:600, color:'#166534', textAlign:'center' }}>
                Piano aggiunto al calendario! ✓
              </div>
            )}
          </div>
        )}

        {/* FOOTER */}
        <div style={plannerS.footer}>
          {step === 'form' && (
            <button onClick={generate} style={plannerS.generateBtn}>
              <Sparkles size={16} /> Generate Plan
            </button>
          )}
          {step === 'loading' && (
            <button disabled style={{ ...plannerS.generateBtn, background:'#6366f1', pointerEvents:'none', gap:6 }}>
              <span>Generating plan</span>
              <span style={{ animation:'bounce .8s infinite .0s',  display:'inline-block' }}>.</span>
              <span style={{ animation:'bounce .8s infinite .15s', display:'inline-block' }}>.</span>
              <span style={{ animation:'bounce .8s infinite .3s',  display:'inline-block' }}>.</span>
            </button>
          )}
          {step === 'result' && !added && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button onClick={addToCalendar} style={plannerS.addBtn}>Add all to Calendar</button>
              <button onClick={() => { setStep('form'); setPlan(null); setErrors({}); }} style={plannerS.regenBtn}>Regenerate</button>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
    </div>
  );
}

const plannerS = {
  overlay:    { position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:200, display:'grid', placeItems:'center', padding:16 },
  card:       { background:'#fff', borderRadius:24, border:'1px solid var(--border)', width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto', display:'flex', flexDirection:'column' },
  header:     { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', position:'sticky', top:0, background:'#fff', zIndex:1 },
  brainBox:   { width:44, height:44, borderRadius:14, background:'linear-gradient(135deg, #3730E8, #8B5CF6)', display:'grid', placeItems:'center', flexShrink:0 },
  title:      { fontSize:16, fontWeight:700, color:'var(--ink)' },
  sub:        { fontSize:12, color:'var(--gray)', marginTop:2 },
  closeBtn:   { width:32, height:32, borderRadius:999, background:'var(--sidebar-bg)', border:'1px solid var(--border)', color:'var(--gray)', display:'grid', placeItems:'center', cursor:'pointer' },
  body:       { padding:'20px 24px', display:'flex', flexDirection:'column', gap:16, flex:1, overflowY:'auto' },
  fieldLabel: { fontSize:12, fontWeight:700, color:'var(--ink)' },
  footer:     { padding:'16px 24px', borderTop:'1px solid var(--border)', position:'sticky', bottom:0, background:'#fff' },
  generateBtn:{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px', borderRadius:14, background:'var(--indigo)', color:'#fff', fontSize:14, fontWeight:600, border:'none', cursor:'pointer' },
  addBtn:     { width:'100%', padding:'11px', borderRadius:12, border:'1.5px solid var(--indigo)', background:'#fff', color:'var(--indigo)', fontSize:13, fontWeight:600, cursor:'pointer' },
  regenBtn:   { width:'100%', padding:'11px', borderRadius:12, border:'1px solid var(--border)', background:'var(--sidebar-bg)', color:'var(--gray)', fontSize:13, fontWeight:600, cursor:'pointer' },
};

/* ===================== MOUNT ===================== */
