import React, { Suspense, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { isMockMode } from '../lib/apiClient';
import { cellularRespirationCards, cellularRespirationQuestions, seedExams } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import useIsMobile from '../lib/useIsMobile';
import StudyTimer from './StudyTimer';
import DashboardHome from './DashboardHome';
import PracticeConfigModal from './PracticeConfigModal';
import { BottomNav, DashboardCard, DashboardHeader, shellS } from './DashboardShell';
import { initCalEvents, initialWeekData } from './calendarData';
import { createStudySession, listStudySessions, sessionsToWeekData } from '../services/analytics';
import { listExams } from '../services/exams';
import { listFlashcardReviews, listFlashcards } from '../services/flashcards';
import { listQuizAttempts } from '../services/quiz';

const TutorView = React.lazy(() => import('./TutorView'));
const FlashcardLanding = React.lazy(() => import('./Flashcards').then((module) => ({ default: module.FlashcardLanding })));
const FlashcardViewer = React.lazy(() => import('./Flashcards').then((module) => ({ default: module.FlashcardViewer })));
const QuizTab = React.lazy(() => import('./Quiz').then((module) => ({ default: module.QuizTab })));
const NotesView = React.lazy(() => import('./NotesView').then((module) => ({ default: module.NotesView })));
const AnalyticsView = React.lazy(() => import('./AnalyticsView').then((module) => ({ default: module.AnalyticsView })));
const AccountView = React.lazy(() => import('./AccountViews').then((module) => ({ default: module.AccountView })));
const EarnView = React.lazy(() => import('./AccountViews').then((module) => ({ default: module.EarnView })));
const CalendarView = React.lazy(() => import('./CalendarView').then((module) => ({ default: module.CalendarView })));
const AIStudyPlanner = React.lazy(() => import('./AIStudyPlanner'));

function ViewFallback() {
  return <div style={{ padding: 24, color: 'var(--gray)', fontWeight: 800 }}>Loading...</div>;
}

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
      <DashboardHeader
        user={user}
        lang={lang}
        onLangChange={onLangChange}
        isMobile={isMobile}
        notifRef={notifRef}
        profileRef={profileRef}
        notifications={notifications}
        unreadCount={unreadCount}
        showNotifPanel={showNotifPanel}
        showProfileMenu={showProfileMenu}
        setShowNotifPanel={setShowNotifPanel}
        setShowProfileMenu={setShowProfileMenu}
        markAllRead={markAllRead}
        clearAll={clearAll}
        handleLogout={handleLogout}
        setTab={setTab}
      />

      <DashboardCard
        isMobile={isMobile}
        sidebarCollapsed={sidebarCollapsed}
        tab={tab}
        setTab={handleSetTab}
        lang={lang}
        onToggleCollapsed={() => setSidebarCollapsed(v => !v)}
      >
        <Suspense fallback={<ViewFallback />}>
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
        </Suspense>
      </DashboardCard>
      {!isMobile && <StudyTimer onSessionSaved={handleSessionSaved} startTrigger={timerTrigger} />}
      {plannerOpen && (
        <Suspense fallback={<ViewFallback />}>
          <AIStudyPlanner onClose={() => { setPlannerOpen(false); setPlannerNoteId(null); }} onPlanAdded={handlePlanAdded} initialNoteId={plannerNoteId} existingEvents={calEvents} />
        </Suspense>
      )}
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

export default Dashboard;
