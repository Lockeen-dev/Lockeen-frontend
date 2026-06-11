import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { BarChart3, Bell, BookOpen, Layers, LogOut, Pencil, Sparkles, XMark, ZapSolid } from '../lib/icons';
import { tt } from '../lib/i18n';
import { isMockMode } from '../lib/apiClient';
import { cellularRespirationCards, cellularRespirationQuestions, seedExams } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import useIsMobile from '../lib/useIsMobile';
import LanguageSelect from './LanguageSelect';
import Sidebar from './Sidebar';
import StudyTimer from './StudyTimer';
import TutorView from './TutorView';
import { FlashcardLanding, FlashcardViewer } from './Flashcards';
import { QuizTab } from './Quiz';
import { NotesView } from './NotesView';
import { AnalyticsView, initialWeekData } from './AnalyticsView';
import { AccountView, EarnView } from './AccountViews';
import { CalendarView, initCalEvents } from './CalendarView';
import AIStudyPlanner from './AIStudyPlanner';
import DashboardHome from './DashboardHome';
import { createStudySession, listStudySessions, sessionsToWeekData } from '../services/analytics';
import { listExams } from '../services/exams';
import { listFlashcardReviews, listFlashcards } from '../services/flashcards';
import { listQuizAttempts } from '../services/quiz';

/* ===================== DASHBOARD SHELL ===================== */
const CALENDAR_EVENTS_STORAGE_PREFIX = 'lockeen.calendarEvents.v1';

function calendarStorageKey(user) {
  return `${CALENDAR_EVENTS_STORAGE_PREFIX}:${user?.id || user?.email || 'local'}`;
}

function readStoredCalendarEvents(user, fallback) {
  try {
    const raw = window.localStorage.getItem(calendarStorageKey(user));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch (_) {
    return fallback;
  }
}

function persistableCalendarEvents(events = {}) {
  return Object.fromEntries(
    Object.entries(events)
      .map(([key, value]) => [key, (value || []).filter((event) => event.source !== 'exam-service')])
      .filter(([, value]) => value.length > 0),
  );
}

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

function Dashboard({ user, onLogout, darkMode = false, lang = 'en', onLangChange }) {
  const { signOut } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const realMode = !isMockMode();
  const [notifications, setNotifications] = useState(() => realMode ? [] : [
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
  const [exams, setExams] = useState(() => realMode ? [] : seedExams);
  const [activeExamId, setActiveExamId] = useState(null);
  const [flashcardDeck, setFlashcardDeck] = useState(() => realMode ? null : {
    noteId: 1,
    subject: 'Biology',
    title: 'Cellular Respiration',
    cards: cellularRespirationCards,
  });
  const [quizDeck, setQuizDeck] = useState(() => realMode ? null : {
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
  const [practiceConfig, setPracticeConfig] = useState(null);
  const [weekData, setWeekData] = useState(() => realMode ? initialWeekData.map((day) => ({ ...day, mins: 0 })) : initialWeekData);
  const [studySessions, setStudySessions] = useState([]);

  function applyQuizAttempts(attempts = []) {
    setQuizRuns(attempts);
    const nextHistory = {};
    attempts.forEach((attempt) => {
      const historyKey = attempt.chapterId && attempt.chapterId !== 'all'
        ? attempt.chapterId
        : (attempt.examId || attempt.noteId);
      if (!historyKey) return;
      nextHistory[historyKey] = [...(nextHistory[historyKey] || []), attempt.weightedScore ?? attempt.score];
    });
    setQuizHistory(nextHistory);
  }

  function applyFlashcardReviews(reviews = [], examsSource = exams) {
    const nextHistory = {};
    const nextDecks = [];
    reviews.forEach((review) => {
      const historyKey = review.chapterId || review.noteId || review.examId;
      if (!historyKey) return;
      nextHistory[historyKey] = [...(nextHistory[historyKey] || []), review.score];
      const exam = examsSource.find((item) => String(item.id) === String(review.examId));
      const chapter = exam?.chapters?.find((item) => String(item.id) === String(review.chapterId));
      nextDecks.push({
        noteId: review.chapterId || review.noteId || review.examId,
        subject: exam?.subject || 'Study',
        title: chapter?.title || exam?.name || 'Flashcards',
        cards: [],
        _meta: {
          examId: review.examId,
          chapterId: review.chapterId,
          noteId: review.noteId,
          sourceMaterialId: review.sourceMaterialId,
        },
        lastScore: review.score,
        ts: review.completedAt ? new Date(review.completedAt).getTime() : Date.now(),
      });
    });
    setFlashHistory(nextHistory);
    setRecentFlashDecks(nextDecks.slice(0, 12));
  }

  useEffect(() => {
    let cancelled = false;
    async function loadExams() {
      const result = await listExams();
      if (cancelled || result.error) return;
      setExams(result.data || []);
    }
    loadExams();
    return () => { cancelled = true; };
  }, []);

  async function refreshFlashcardReviews(examsSource = exams) {
    const result = await listFlashcardReviews({ limit: 50 });
    if (result.error) return;
    applyFlashcardReviews(result.data || [], examsSource);
  }

  useEffect(() => {
    let cancelled = false;
    async function loadFlashcardReviews() {
      const result = await listFlashcardReviews({ limit: 50 });
      if (cancelled || result.error) return;
      applyFlashcardReviews(result.data || [], exams);
    }
    loadFlashcardReviews();
    return () => { cancelled = true; };
  }, [exams]);

  useEffect(() => {
    let cancelled = false;
    async function loadStudySessions() {
      const result = await listStudySessions({ days: 30 });
      if (cancelled || result.error) return;
      const sessions = result.data || [];
      setStudySessions(sessions);
      if (realMode || sessions.length > 0) setWeekData(sessionsToWeekData(sessions));
    }
    loadStudySessions();
    return () => { cancelled = true; };
  }, []);

  async function refreshQuizAttempts() {
    const result = await listQuizAttempts({ limit: 50 });
    if (result.error) return;
    applyQuizAttempts(result.data || []);
  }

  useEffect(() => {
    let cancelled = false;
    async function loadQuizAttempts() {
      const result = await listQuizAttempts({ limit: 50 });
      if (cancelled || result.error) return;
      applyQuizAttempts(result.data || []);
    }
    loadQuizAttempts();
    return () => { cancelled = true; };
  }, []);

  async function handleSessionSaved(mins) {
    const studiedAt = new Date().toISOString();
    const localSession = { id: `pending-study-session-${Date.now()}`, minutes: mins, studiedAt, source: 'timer' };
    setStudySessions(prev => {
      const next = [localSession, ...prev];
      setWeekData(sessionsToWeekData(next));
      return next;
    });
    addNotification(`Study session logged: ${mins} min`, 'timer');
    const result = await createStudySession({ minutes: mins, studiedAt, source: 'timer' });
    if (!result.error && result.data) {
      setStudySessions(prev => {
        const next = [result.data, ...prev.filter((session) => session.id !== localSession.id)];
        setWeekData(sessionsToWeekData(next));
        return next;
      });
    }
  }

  const [plannerOpen, setPlannerOpen]       = useState(false);
  const [plannerNoteId, setPlannerNoteId]     = useState(null);
  const [calEvents, setCalEvents]             = useState(() => readStoredCalendarEvents(user, realMode ? {} : initCalEvents()));
  const [timerTrigger, setTimerTrigger]       = useState(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(calendarStorageKey(user), JSON.stringify(persistableCalendarEvents(calEvents)));
    } catch (_) {}
  }, [calEvents, user]);

  function onStartTimer(mins) { setTimerTrigger({ mins, ts: Date.now() }); }
  function onMarkEventDone(dk, evIdx, evName, completed = true) {
    setCalEvents(prev => {
      const next = { ...prev };
      const arr = [...(next[dk] || [])];
      arr[evIdx] = { ...arr[evIdx], completed };
      next[dk] = arr;
      return next;
    });
    if (evName) addNotification(`${completed ? 'Completed' : 'Reopened'}: ${evName}`, completed ? 'done' : 'info');
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
    if (runMeta) {
      setQuizRuns(prev => [{ id: `local-${Date.now()}`, score: scorePct, date: new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }), ...runMeta }, ...prev].slice(0, 50));
      addNotification(`Quiz complete: ${runMeta.subject || 'Quiz'} · ${scorePct}%`, 'quiz');
      refreshQuizAttempts();
    }
  }

  function onFlashComplete(noteId, scorePct, runMeta) {
    if (!noteId) return;
    setFlashHistory(prev => ({ ...prev, [noteId]: [...(prev[noteId] || []), scorePct] }));
    addNotification(`Flashcards done: ${flashcardDeck.subject} · ${scorePct}%`, 'flash');
    setRecentFlashDecks(prev => {
      const next = prev.filter(d => d.title !== flashcardDeck.title);
      return [{ ...flashcardDeck, ...(runMeta || {}), lastScore: scorePct, ts: Date.now() }, ...next].slice(0, 12);
    });
    refreshFlashcardReviews();
  }

  const openFlashcards = (deck) => {
    setFlashcardDeck(deck);
    setActiveExamId(null);
    setFlashLanding(!deck?.cards?.length);
    setTab('flashcards');
  };

  const openQuiz = (deck) => {
    setQuizDeck(deck);
    setActiveExamId(null);
    setTab('quiz');
  };

  const openQuizForExam = (examId) => {
    const exam = exams.find((item) => String(item.id) === String(examId));
    if (!exam) return;
    setPracticeConfig({
      exam,
      mode: 'quiz',
      scopeId: 'all',
      difficulty: 'medium',
      count: 10,
      timerOn: true,
      timerSecs: 30,
    });
  };

  const startQuickQuizForExam = (examId) => {
    const exam = exams.find((item) => String(item.id) === String(examId));
    if (!exam) return;
    setQuizDeck({
      _examId: exam.id,
      _examColor: exam.color || null,
      _examDot: exam.dot || null,
      _practiceConfig: {
        source: 'dashboard-recommended',
        mode: 'quiz',
        examId: exam.id,
        examName: exam.name,
        examColor: exam.color || null,
        examDot: exam.dot || null,
        chapterId: 'all',
        chapterName: 'Intero esame',
        difficulty: 'medium',
        count: 10,
        timerOn: true,
        timerSecs: 30,
        autoStart: true,
      },
      questions: [],
    });
    setActiveExamId(null);
    setTab('quiz');
  };

  const startConfiguredPractice = async (config) => {
    const exam = config.exam;
    const chapter = config.scopeId === 'all' ? null : (exam.chapters || []).find((item) => String(item.id) === String(config.scopeId));
    const chapterId = chapter?.id || 'all';
    const scopeTitle = chapter ? chapter.title || chapter.name : 'Whole exam';
    const practicePayload = {
      source: 'analytics-grade-predictor',
      mode: config.mode,
      examId: exam.id,
      examName: exam.name,
      examColor: exam.color || null,
      examDot: exam.dot || null,
      chapterId,
      chapterName: scopeTitle,
      difficulty: config.difficulty,
      count: config.count,
      timerOn: config.timerOn !== false,
      timerSecs: config.timerSecs,
      requestedAt: new Date().toISOString(),
    };

    setPracticeConfig(null);
    setActiveExamId(null);

    if (config.mode === 'flashcards') {
      const localCards = chapter
        ? (chapter.cards || [])
        : (exam.chapters || []).flatMap((item) => item.cards || []);
      const filters = chapter ? { examId: exam.id, chapterId: chapter.id } : { examId: exam.id };
      const result = await listFlashcards(filters);
      const serviceCards = result.error ? [] : (result.data || []).map((card) => ({
        ...card,
        q: card.q ?? card.front ?? '',
        a: card.a ?? card.back ?? '',
        front: card.front ?? card.q ?? '',
        back: card.back ?? card.a ?? '',
      }));
      const cards = serviceCards.length ? serviceCards : localCards;
      setFlashcardDeck({
        noteId: chapter ? chapter.id : exam.id,
        subject: exam.subject,
        title: chapter ? chapter.title || chapter.name : exam.name,
        cards: cards.slice(0, config.count),
        _examColor: exam.color || null,
        _examDot: exam.dot || null,
        _meta: practicePayload,
      });
      setFlashLanding(false);
      setTab('flashcards');
      return;
    }

    setQuizDeck({
      _examId: exam.id,
      _examColor: exam.color || null,
      _examDot: exam.dot || null,
      _practiceConfig: { ...practicePayload, autoStart: true },
      questions: [],
    });
    setTab('quiz');
  };

  const handleSetTab = (t) => {
    if (t !== 'notes') setActiveExamId(null);
    if (t === 'quiz') setQuizDeck(null);
    if (t === 'tutor') setSidebarCollapsed(true);
    setTab(t);
  };

  const handleLogout = async () => {
    const result = await signOut();
    if (!result.error) onLogout && onLogout();
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
                  <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>
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
          background: '#fff',
          boxShadow: '0 30px 60px -30px rgba(55,48,232,.25)',
          borderRadius: isMobile ? 0 : 24,
          border: isMobile ? 'none' : '2px solid var(--indigo)',
        }}
      >
        <div style={{ ...shellS.grid, gridTemplateColumns: isMobile ? '1fr' : sidebarCollapsed ? '64px 1fr' : '220px 1fr', transition: 'grid-template-columns .2s ease' }}>
          {!isMobile && <Sidebar tab={tab} setTab={handleSetTab} lang={lang} collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed(v => !v)} />}
          <div style={{ ...shellS.main, padding: isMobile ? '16px 14px' : '32px clamp(28px, 3vw, 56px)', overflow: 'hidden' }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                style={{ height: '100%' }}
              >
                {tab === 'dashboard' && <DashboardHome user={user} lang={lang} setTab={setTab} exams={exams} onOpenExam={openExam} onOpenQuizForExam={openQuizForExam} onStartQuickQuizForExam={startQuickQuizForExam} onOpenPlanner={() => setPlannerOpen(true)} darkMode={darkMode} calEvents={calEvents} onMarkEventDone={onMarkEventDone} onStartTimer={onStartTimer} realMode={realMode} />}
                {tab === 'notes'     && <NotesView exams={exams} lang={lang} setExams={setExams} activeId={activeExamId} setActiveId={setActiveExamId} onOpenFlashcards={openFlashcards} onOpenQuiz={openQuiz} onOpenQuizForExam={openQuizForExam} darkMode={darkMode} onOpenPlanner={(nid) => { setPlannerNoteId(nid); setPlannerOpen(true); }} onExamAdded={handleExamAdded} quizHistory={quizHistory} flashHistory={flashHistory} quizRuns={quizRuns} recentFlashDecks={recentFlashDecks} />}
                {tab === 'flashcards' && (flashLanding
                  ? <FlashcardLanding deck={flashcardDeck} recentDecks={recentFlashDecks} onOpenDeck={openFlashcards} setTab={setTab} darkMode={darkMode} exams={exams} />
                  : <FlashcardViewer {...flashcardDeck} setTab={setTab} darkMode={darkMode} onFlashComplete={onFlashComplete} onBackToLanding={() => setFlashLanding(true)} />
                )}
                {tab === 'quiz' && <QuizTab deck={quizDeck} exams={exams} quizRuns={quizRuns} onQuizComplete={onQuizComplete} setTab={setTab} darkMode={darkMode} />}
                {tab === 'tutor'     && <TutorView />}
                {tab === 'analytics' && <AnalyticsView weekData={weekData} studySessions={studySessions} notes={exams} quizHistory={quizHistory} flashHistory={flashHistory} setTab={setTab} openQuizForExam={openQuizForExam} />}
                {tab === 'calendar'  && <CalendarView events={calEvents} setEvents={setCalEvents} setTab={setTab} onOpenPlanner={() => setPlannerOpen(true)} />}
                {tab === 'earn'      && <EarnView />}
                {tab === 'account'   && <AccountView user={user} lang={lang} onLangChange={onLangChange} onLogout={handleLogout} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
      {!isMobile && <StudyTimer onSessionSaved={handleSessionSaved} startTrigger={timerTrigger} />}
      {plannerOpen && <AIStudyPlanner onClose={() => { setPlannerOpen(false); setPlannerNoteId(null); }} onPlanAdded={handlePlanAdded} initialNoteId={plannerNoteId} existingEvents={calEvents} />}
      {practiceConfig && (
        <PracticeConfigModal
          config={practiceConfig}
          onChange={setPracticeConfig}
          onClose={() => setPracticeConfig(null)}
          onStart={startConfiguredPractice}
        />
      )}
      {isMobile && <BottomNav tab={tab} setTab={handleSetTab} lang={lang} />}
    </div>
  );
}

function PracticeConfigModal({ config, onChange, onClose, onStart }) {
  const { exam, mode, scopeId, difficulty, count, timerOn = true, timerSecs = 30 } = config;
  const chapters = exam.chapters || [];
  const setField = (key, value) => onChange({ ...config, [key]: value });
  const scopeOptions = [
    { id: 'all', label: 'Whole exam', count: Math.max(12, chapters.reduce((sum, chapter) => sum + (chapter.questions?.length || chapter.cards?.length || 0), 0) || 12) },
    ...chapters.map((chapter) => ({
      id: chapter.id,
      label: chapter.title || chapter.name || 'Chapter',
      count: Math.max(1, chapter.questions?.length || chapter.cards?.length || 6),
    })),
  ];
  const modes = [
    { id: 'quiz', title: 'Quiz', sub: 'Questions + Timer', Icon: Sparkles },
    { id: 'flashcards', title: 'Flashcards', sub: 'Review practice', Icon: Layers },
  ];
  const difficulties = [
    { id: 'easy', title: 'Easy', sub: 'Warm-up' },
    { id: 'medium', title: 'Medium', sub: 'Balanced' },
    { id: 'hard', title: 'Hard', sub: 'Exam mode' },
    { id: 'extreme', title: 'Extreme', sub: 'Deep reasoning' },
  ];
  const counts = [10, 20, 30, 50];
  const timerOptions = [15, 30, 60, 90];

  return (
    <div style={practiceS.overlay} role="dialog" aria-modal="true" aria-label="Configure practice">
      <div style={practiceS.modal}>
        <button type="button" onClick={onClose} style={practiceS.close} aria-label="Close"><XMark size={24} /></button>
        <div style={practiceS.kicker}>CONFIGURE PRACTICE</div>
        <h2 style={practiceS.title}>{exam.name}</h2>
        <p style={practiceS.subtitle}>Prediction based on quiz, flashcards, and target grade</p>

        <div style={practiceS.modeGrid}>
          {modes.map(({ id, title, sub, Icon: ModeIcon }) => {
            const active = mode === id;
            return (
              <button key={id} type="button" onClick={() => setField('mode', id)} style={{ ...practiceS.modeCard, ...(active ? practiceS.modeCardActive : null) }}>
                <span style={{ ...practiceS.modeIcon, color: 'var(--indigo)', background: '#EEF2FF' }}><ModeIcon size={26} /></span>
                <span style={practiceS.modeTitle}>{title}</span>
                <span style={practiceS.modeSub}>{sub}</span>
              </button>
            );
          })}
        </div>

        <div style={practiceS.divider} />
        <SectionLabel>Scope</SectionLabel>
        <div style={practiceS.scopeRow}>
          {scopeOptions.map((option) => {
            const active = String(scopeId) === String(option.id);
            return (
              <button key={option.id} type="button" onClick={() => setField('scopeId', option.id)} style={{ ...practiceS.scopePill, ...(active ? practiceS.scopePillActive : null) }}>
                <span>{option.label}</span>
                <span style={{ ...practiceS.countBadge, ...(active ? practiceS.countBadgeActive : null) }}>{option.count}</span>
              </button>
            );
          })}
        </div>

        <div style={practiceS.divider} />
        <SectionLabel>Difficulty</SectionLabel>
        <div style={practiceS.difficultyGrid}>
          {difficulties.map((option) => {
            const active = difficulty === option.id;
            return (
              <button key={option.id} type="button" onClick={() => setField('difficulty', option.id)} style={{ ...practiceS.difficultyCard, ...(active ? practiceS.difficultyCardActive : null) }}>
                <span style={practiceS.diffTitle}>{option.title}</span>
                <span style={practiceS.diffSub}>{option.sub}</span>
              </button>
            );
          })}
        </div>

        <div style={practiceS.divider} />
        <SectionLabel>{mode === 'flashcards' ? 'Cards' : 'Questions'}</SectionLabel>
        <div style={practiceS.countGrid}>
          {counts.map((value) => {
            const active = count === value;
            return (
              <button key={value} type="button" onClick={() => setField('count', value)} style={{ ...practiceS.countButton, ...(active ? practiceS.countButtonActive : null) }}>
                {value}
              </button>
            );
          })}
        </div>

        {mode === 'quiz' && (
          <>
            <div style={practiceS.divider} />
            <div style={practiceS.timerHead}>
              <div>
                <SectionLabel compact>Timer</SectionLabel>
                <div style={practiceS.timerSub}>Seconds per question</div>
              </div>
              <button type="button" onClick={() => setField('timerOn', !timerOn)} style={{ ...practiceS.timerSwitch, ...(timerOn ? practiceS.timerSwitchOn : null) }} aria-pressed={timerOn}>
                <span style={{ ...practiceS.timerKnob, transform: timerOn ? 'translateX(34px)' : 'translateX(0)' }} />
              </button>
            </div>
            {timerOn && (
              <div style={practiceS.timerGrid}>
                {timerOptions.map((value) => {
                  const active = Number(timerSecs) === value;
                  return (
                    <button key={value} type="button" onClick={() => setField('timerSecs', value)} style={{ ...practiceS.countButton, ...(active ? practiceS.countButtonActive : null) }}>
                      {value}s
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        <div style={practiceS.actions}>
          <button type="button" onClick={onClose} style={practiceS.cancelBtn}>Cancel</button>
          <button type="button" onClick={() => onStart(config)} style={practiceS.startBtn}>Start practice</button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children, compact = false }) {
  return <div style={{ ...practiceS.sectionLabel, ...(compact ? { marginBottom: 0 } : null) }}>{children}</div>;
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

const practiceS = {
  overlay: { position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(15,16,53,.42)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', padding: 18 },
  modal: { position: 'relative', width: 'min(660px, 96vw)', maxHeight: '90vh', overflowY: 'auto', background: '#fff', border: '1px solid #DDE1EA', borderRadius: 24, boxShadow: '0 28px 80px rgba(15,16,53,.28)', padding: '26px 26px 24px', boxSizing: 'border-box' },
  close: { position: 'absolute', top: 18, right: 18, width: 38, height: 38, borderRadius: 999, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', display: 'grid', placeItems: 'center', cursor: 'pointer' },
  kicker: { color: 'var(--indigo)', fontSize: 12, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 14 },
  title: { margin: 0, color: 'var(--ink)', fontSize: 25, lineHeight: 1, fontWeight: 900, letterSpacing: '-0.04em' },
  subtitle: { margin: '16px 0 20px', color: '#6B7280', fontSize: 15, lineHeight: 1.35, fontWeight: 600 },
  modeGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 },
  modeCard: { minHeight: 122, border: '1.5px solid #E5E7EB', borderRadius: 18, background: '#fff', padding: 18, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 9 },
  modeCardActive: { border: '2px solid var(--indigo)', background: '#EEF2FF' },
  modeIcon: { width: 44, height: 44, borderRadius: 14, display: 'grid', placeItems: 'center' },
  modeTitle: { color: 'var(--ink)', fontSize: 19, fontWeight: 900, lineHeight: 1 },
  modeSub: { color: '#6B7280', fontSize: 13, fontWeight: 800 },
  divider: { height: 1, background: '#E5E7EB', margin: '18px 0 15px' },
  sectionLabel: { color: '#6B7280', fontSize: 12, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 },
  scopeRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  scopePill: { minHeight: 40, borderRadius: 999, border: '1.5px solid #E5E7EB', background: '#fff', padding: '0 13px', color: '#6B7280', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 900, cursor: 'pointer' },
  scopePillActive: { border: '2px solid var(--indigo)', background: '#EEF2FF', color: 'var(--indigo)' },
  countBadge: { minWidth: 24, height: 24, borderRadius: 999, background: '#F1F5F9', color: '#6B7280', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900, padding: '0 7px' },
  countBadgeActive: { background: 'var(--indigo)', color: '#fff' },
  difficultyGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 9 },
  difficultyCard: { minHeight: 68, borderRadius: 16, border: '1.5px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', gap: 5, padding: 12 },
  difficultyCardActive: { border: '2px solid var(--indigo)', background: '#EEF2FF', color: 'var(--indigo)' },
  diffTitle: { color: 'inherit', fontSize: 17, fontWeight: 900, lineHeight: 1 },
  diffSub: { color: 'inherit', fontSize: 12, fontWeight: 900, opacity: .86 },
  countGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 9 },
  timerGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 9 },
  timerHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  timerSub: { marginTop: 8, color: '#6B7280', fontSize: 14, fontWeight: 900 },
  timerSwitch: { position: 'relative', width: 64, height: 34, borderRadius: 999, border: '1px solid #D1D5DB', background: '#E5E7EB', padding: 2, cursor: 'pointer', transition: 'background .15s, border-color .15s', flexShrink: 0 },
  timerSwitchOn: { background: 'var(--indigo)', borderColor: 'var(--indigo)' },
  timerKnob: { position: 'absolute', left: 3, top: 3, width: 26, height: 26, borderRadius: 999, background: '#fff', boxShadow: '0 1px 4px rgba(15,23,42,.2)', transition: 'transform .15s ease' },
  countButton: { height: 46, borderRadius: 14, border: '1.5px solid #E5E7EB', background: '#fff', color: '#A1A6B5', fontSize: 17, fontWeight: 900, cursor: 'pointer' },
  countButtonActive: { border: '2px solid var(--indigo)', background: '#EEF2FF', color: 'var(--indigo)', boxShadow: 'none' },
  actions: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 18 },
  cancelBtn: { height: 50, borderRadius: 16, border: '1px solid #E5E7EB', background: '#F8FAFC', color: '#6B7280', fontSize: 15, fontWeight: 900, cursor: 'pointer' },
  startBtn: { height: 50, borderRadius: 16, border: 'none', background: 'var(--indigo)', color: '#fff', fontSize: 15, fontWeight: 900, cursor: 'pointer' },
};

/* ===================== ANALYTICS ===================== */
/* ===================== CALENDAR ===================== */
/* ===================== AI STUDY PLANNER ===================== */


export default Dashboard;
