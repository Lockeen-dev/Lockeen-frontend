import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  ArrowRight, BarChart3, Bell, BookOpen, Brain, CalendarIcon, Check, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Coins, Eye, EyeOff, FileText, Flame, Google, GripDots, Icon, Layers, LockeenLogo, LogOut, Moon, MsgCircle, Paperclip, Pause, Pencil, Play, Plus, RefreshCw, Search, Send, SidebarPanel, Sparkles, Stop, Sun, Trash, Trash2, Trend, Trophy, XMark, ZapSolid,
} from './lib/icons';
import { tt } from './lib/i18n';
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
import LanguageSelect from './components/LanguageSelect';
import { AccountView, EarnView } from './components/AccountViews';
import { CalendarView, LIFE_CATS, dayKey, initCalEvents } from './components/CalendarView';
import AIStudyPlanner from './components/AIStudyPlanner';

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
/* ===================== AI STUDY PLANNER ===================== */
