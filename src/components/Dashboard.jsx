import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { isMockMode } from '../lib/apiClient';
import { cellularRespirationCards, cellularRespirationQuestions, seedExams } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import useIsMobile from '../lib/useIsMobile';
import StudyTimer from './StudyTimer';
import PracticeConfigModal from './PracticeConfigModal';
import { DashboardRoutes, PlannerOverlay } from './DashboardRoutes';
import { BottomNav, DashboardCard, DashboardHeader, shellS } from './DashboardShell';
import { calendarKeyFromDate, durToMins, initCalEvents, initialWeekData, studyPlanItemToCalendarEvent } from './calendarData';
import { createStudySession, listStudySessions, sessionsToWeekData } from '../services/analytics';
import { listExams } from '../services/exams';
import { listFlashcardReviews, listFlashcards } from '../services/flashcards';
import { listQuizAttempts } from '../services/quiz';
import { listStudyPlanItems, listStudyPlans, updateStudyPlanItem } from '../services/studyPlans';
import { listCalendarEvents, listUserCalendarActivities, updateCalendarActivity } from '../services/calendar';

/* ===================== DASHBOARD SHELL ===================== */
const CALENDAR_EVENTS_STORAGE_PREFIX = 'lockeen.calendarEvents.v1';

function resetHorizontalViewport() {
  if (typeof window === 'undefined') return;
  document.documentElement.scrollLeft = 0;
  document.body.scrollLeft = 0;
  if (window.scrollX !== 0) window.scrollTo(0, window.scrollY);
}

function syncMobileViewportWidth() {
  if (typeof window === 'undefined') return;
  const width = Math.floor(window.innerWidth || document.documentElement.clientWidth || 0);
  if (width > 0) document.documentElement.style.setProperty('--lockeen-vvw', `${width}px`);
}

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
      .map(([key, value]) => [key, (value || []).filter((event) => event.source !== 'exam-service' && event.source !== 'study-plan-service' && event.source !== 'calendar-activity-service')])
      .filter(([, value]) => value.length > 0),
  );
}

function isStudyLikeCalendarEvent(event = {}) {
  if (!event || event.source === 'exam-service' || event.type === 'exam') return false;
  if (String(event.name || '').startsWith('📝 Exam:')) return false;
  if (event.source === 'study-plan-service') return true;
  const category = String(event.cat || event.category || '').toLowerCase();
  if (category === 'study') return true;
  const type = String(event.type || event.studyType || '').toLowerCase();
  if (['study', 'review', 'quiz', 'flashcards', 'mock_exam'].includes(type)) return true;
  if (!event.source && !category && !type) return true;
  return false;
}

function calendarKeyToIsoDate(key) {
  const [year, month, day] = String(key || '').split('-').map(Number);
  if (!year || !month || !day) return new Date().toISOString().slice(0, 10);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function doneStudySessionsFromEvents(events = {}) {
  return Object.entries(events || {}).flatMap(([dateKey, dayEvents]) =>
    (dayEvents || [])
      .filter((event) => event.completed && isStudyLikeCalendarEvent(event))
      .map((event) => {
        const source = event.source === 'study-plan-service' ? 'study-plan' : 'calendar-activity';
        const id = event.source === 'study-plan-service'
          ? `planner-${event.serviceId}`
          : `calendar-activity-${event.serviceId || `${dateKey}-${event.time || '12:00'}-${event.name || 'activity'}`}`;
        return {
          id,
          minutes: Math.max(1, durToMins(event.dur || '30m') || 30),
          studiedAt: `${calendarKeyToIsoDate(dateKey)}T${event.time || '12:00'}:00`,
          source,
        };
      }),
  );
}

function mergeCalendarDoneStudySessions(sessions = [], events = {}) {
  const calendarStudy = doneStudySessionsFromEvents(events);
  const calendarKeys = new Set(calendarStudy.map((session) => `${session.source}:${session.id}`));
  const base = (sessions || []).filter((session) => !calendarKeys.has(`${session.source}:${session.id}`));
  const seen = new Set();
  return [...calendarStudy, ...base].filter((session) => {
    const key = `${session.source}:${session.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dashboardExamEventToCalendarEvent(event) {
  return {
    type: event.type,
    source: 'exam-service',
    serviceId: event.id,
    examId: event.examId,
    name: `📝 Exam: ${event.title}`,
    time: event.time || '09:00',
    dur: event.durationMin ? `${Math.max(1, Number(event.durationMin))}m` : '2h',
    cat: 'study',
    noteId: event.examId,
  };
}

function dashboardActivityToCalendarEvent(activity = {}) {
  return {
    source: 'calendar-activity-service',
    serviceId: activity.id,
    name: activity.title || 'Activity',
    time: activity.activityTime || '09:00',
    dur: activity.durationMin ? `${Math.max(1, Number(activity.durationMin))}m` : '1h',
    cat: activity.category || 'study',
    noteId: activity.noteId || null,
    noteColor: activity.noteColor || null,
    noteBg: activity.noteBg || null,
    noteText: activity.noteText || null,
    noteSubject: activity.noteSubject || null,
    notes: activity.notes || '',
    materials: activity.materials || [],
    files: activity.files || [],
    completed: Boolean(activity.completed),
  };
}

function isDashboardServiceEvent(event = {}) {
  return (
    event.source === 'exam-service' ||
    event.source === 'study-plan-service' ||
    event.source === 'calendar-activity-service' ||
    (event.cat === 'study' && String(event.name || '').startsWith('📝 Exam:'))
  );
}

function Dashboard({ user, onLogout, darkMode = false, lang = 'en', onLangChange }) {
  const { signOut } = useAuth();
  const [tab, setTab] = useState(() => {
    if (typeof window === 'undefined') return 'dashboard';
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (params.has('checkout') || view === 'account') return 'account';
    if (view === 'earn' || view === 'ambassador') return 'earn';
    return 'dashboard';
  });
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

  useLayoutEffect(() => {
    if (!isMobile) return undefined;
    syncMobileViewportWidth();
    resetHorizontalViewport();
    const firstFrame = window.requestAnimationFrame(resetHorizontalViewport);
    const secondFrame = window.requestAnimationFrame(() => {
      syncMobileViewportWidth();
      window.requestAnimationFrame(resetHorizontalViewport);
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [isMobile, tab, user?.id, user?.email]);

  useEffect(() => {
    if (!isMobile) return undefined;
    syncMobileViewportWidth();
    const viewport = window.visualViewport;
    const sync = () => {
      syncMobileViewportWidth();
      resetHorizontalViewport();
    };
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    viewport?.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      viewport?.removeEventListener('resize', sync);
      document.documentElement.style.removeProperty('--lockeen-vvw');
    };
  }, [isMobile]);

  const mobileShellStyle = isMobile
    ? {
        width: 'var(--lockeen-vvw, 100vw)',
        maxWidth: 'var(--lockeen-vvw, 100vw)',
        minWidth: 'var(--lockeen-vvw, 100vw)',
        padding: '12px 0 80px',
      }
    : {
        padding: '24px clamp(18px, 2.4vw, 40px) 40px',
        overflowX: 'hidden',
      };

  useEffect(() => {
    function onDashboardView(event) {
      const view = event.detail?.view;
      if (view === 'earn' || view === 'ambassador') setTab('earn');
      if (view === 'account') setTab('account');
    }
    window.addEventListener('lockeen-dashboard-view', onDashboardView);
    return () => window.removeEventListener('lockeen-dashboard-view', onDashboardView);
  }, []);

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
      const reviewCards = (review.answers || [])
        .map((answer) => ({
          id: answer.flashcardId || null,
          front: answer.front || '',
          back: answer.back || '',
          q: answer.front || '',
          a: answer.back || '',
        }))
        .filter((card) => card.front && card.back);
      nextDecks.push({
        noteId: review.chapterId || review.noteId || review.examId,
        subject: exam?.subject || 'Study',
        title: chapter?.title || exam?.name || 'Flashcards',
        cards: reviewCards,
        answers: review.answers || [],
        rawScore: review.rawScore,
        total: review.total,
        knownCount: review.knownCount,
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

  async function refreshStudySessions(optimisticEvents = null) {
    if (optimisticEvents) {
      setStudySessions((current) => {
        const next = mergeCalendarDoneStudySessions(current, optimisticEvents);
        setWeekData(sessionsToWeekData(next));
        return next;
      });
    }
    const result = await listStudySessions({ days: 30 });
    if (result.error) return;
    const sessions = optimisticEvents
      ? mergeCalendarDoneStudySessions(result.data || [], optimisticEvents)
      : (result.data || []);
    setStudySessions(sessions);
    if (realMode || sessions.length > 0) setWeekData(sessionsToWeekData(sessions));
  }

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
    addNotification(`Logging study session: ${mins} min`, 'timer');
    const result = await createStudySession({ minutes: mins, studiedAt, source: 'timer' });
    if (!result.error && result.data) {
      setStudySessions(prev => {
        const next = [result.data, ...prev.filter((session) => session.id !== localSession.id)];
        setWeekData(sessionsToWeekData(next));
        return next;
      });
      addNotification(`Study session logged: ${mins} min`, 'timer');
      return;
    }

    setStudySessions(prev => {
      const next = prev.filter((session) => session.id !== localSession.id);
      setWeekData(sessionsToWeekData(next));
      return next;
    });
    addNotification(result.error?.message || 'Could not save study session.', 'error');
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

  useEffect(() => {
    if (!realMode) return undefined;
    let cancelled = false;
    async function hydrateCalendarReadModel() {
      const [examResult, planListResult, activityResult] = await Promise.all([
        listCalendarEvents(),
        listStudyPlans({ status: 'active' }),
        listUserCalendarActivities(),
      ]);
      if (cancelled || examResult.error) return;

      const activePlans = planListResult.error ? [] : [...(planListResult.data || [])].sort((a, b) => {
        const bt = new Date(b.createdAt || 0).getTime();
        const at = new Date(a.createdAt || 0).getTime();
        return bt - at;
      });
      const latestPlan = activePlans[0] || null;
      const planResult = latestPlan ? await listStudyPlanItems({ planId: latestPlan.id }) : { data: [] };
      if (cancelled) return;

      const grouped = {};
      (examResult.data || []).forEach((event) => {
        const key = calendarKeyFromDate(event.date);
        if (!key) return;
        grouped[key] = [...(grouped[key] || []), dashboardExamEventToCalendarEvent(event)];
      });
      (planResult.error ? [] : (planResult.data || []))
        .filter((item) => item.status !== 'rescheduled' && item.status !== 'missed' && item.status !== 'skipped')
        .forEach((item) => {
          const key = calendarKeyFromDate(item.plannedDate);
          if (!key) return;
          const examIndex = exams.findIndex((entry) => String(entry.id) === String(item.examId));
          const exam = exams[examIndex];
          grouped[key] = [...(grouped[key] || []), studyPlanItemToCalendarEvent(item, exam, examIndex)];
        });
      (activityResult.error ? [] : (activityResult.data || [])).forEach((activity) => {
        const key = calendarKeyFromDate(activity.activityDate);
        if (!key) return;
        grouped[key] = [...(grouped[key] || []), dashboardActivityToCalendarEvent(activity)];
      });

      setCalEvents((prev) => {
        const next = { ...(prev || {}) };
        Object.keys(next).forEach((key) => {
          const kept = (next[key] || []).filter((event) => !isDashboardServiceEvent(event));
          if (kept.length) next[key] = kept;
          else delete next[key];
        });
        Object.entries(grouped).forEach(([key, value]) => {
          next[key] = [...(next[key] || []), ...value];
        });
        return next;
      });
    }
    hydrateCalendarReadModel();
    return () => { cancelled = true; };
  }, [exams, realMode]);

  useEffect(() => {
    setStudySessions((current) => {
      if (!realMode && doneStudySessionsFromEvents(calEvents).length === 0) return current;
      const next = mergeCalendarDoneStudySessions(current, calEvents);
      setWeekData(sessionsToWeekData(next));
      return next;
    });
  }, [calEvents, realMode]);

  function onStartTimer(mins) { setTimerTrigger({ mins, ts: Date.now() }); }
  async function onMarkEventDone(dk, evIdx, evName, completed = true, eventRef = null) {
    const dayEvents = calEvents[dk] || [];
    const resolvedIndex = (() => {
      const byShape = dayEvents.findIndex((event, index) => (
        index === evIdx &&
        String(event.time || '') === String(eventRef?.time || '') &&
        String(event.name || '') === String(eventRef?.name || '')
      ));
      if (byShape >= 0) return byShape;
      const byTimeName = dayEvents.findIndex((event) => (
        String(event.time || '') === String(eventRef?.time || '') &&
        String(event.name || '') === String(eventRef?.name || '') &&
        String(event.dur || '') === String(eventRef?.dur || '')
      ));
      if (byTimeName >= 0) return byTimeName;
      const refServiceId = eventRef?.serviceId ? String(eventRef.serviceId) : null;
      if (refServiceId) {
        const byServiceId = dayEvents.findIndex((event) => String(event.serviceId || '') === refServiceId);
        if (byServiceId >= 0) return byServiceId;
      }
      return evIdx;
    })();
    const targetEvent = dayEvents[resolvedIndex] || null;
    if (!targetEvent) return;

    if (targetEvent?.source === 'study-plan-service' && targetEvent.serviceId) {
      const result = await updateStudyPlanItem(targetEvent.serviceId, {
        status: completed ? 'done' : 'planned',
        completedAt: completed ? new Date().toISOString() : null,
      });
      if (result.error) {
        addNotification(`Could not update: ${evName || targetEvent.name || 'study session'}`, 'error');
        return;
      }
    }
    if (targetEvent?.source === 'calendar-activity-service' && targetEvent.serviceId) {
      const result = await updateCalendarActivity(targetEvent.serviceId, { completed });
      if (result.error) {
        addNotification(`Could not update: ${evName || targetEvent.name || 'study activity'}`, 'error');
        return;
      }
    }

    const arr = [...dayEvents];
    if (!arr[resolvedIndex]) return;
    arr[resolvedIndex] = { ...arr[resolvedIndex], completed };
    const updatedEvents = { ...calEvents, [dk]: arr };
    setCalEvents(updatedEvents);
    void refreshStudySessions(updatedEvents);
    if (evName) addNotification(`${completed ? 'Completed' : 'Reopened'}: ${evName}`, completed ? 'done' : 'info');
  }

  function handlePlanAdded(evArr) {
    setCalEvents(prev => {
      const next = { ...prev };
      Object.keys(next).forEach((dateKey) => {
        const kept = (next[dateKey] || []).filter((event) => event.source !== 'study-plan-service');
        if (kept.length) next[dateKey] = kept;
        else delete next[dateKey];
      });
      evArr.forEach(({ dateKey, event }) => { next[dateKey] = [...(next[dateKey] || []), event]; });
      return next;
    });
    if (evArr.length > 0) {
      addNotification(`Study plan added: ${evArr.length} session${evArr.length > 1 ? 's' : ''} scheduled`, 'plan');
      const firstDateKey = evArr.find((entry) => entry.dateKey)?.dateKey;
      if (firstDateKey) {
        window.dispatchEvent(new CustomEvent('lockeen:calendar-focus', { detail: { dateKey: firstDateKey } }));
      }
    }
  }

  function handlePlanCleared() {
    setCalEvents(prev => {
      const next = { ...prev };
      Object.keys(next).forEach((dateKey) => {
        const kept = (next[dateKey] || []).filter((event) => event.source !== 'study-plan-service');
        if (kept.length) next[dateKey] = kept;
        else delete next[dateKey];
      });
      return next;
    });
    void refreshStudySessions();
    addNotification('Study plan deleted', 'info');
  }

  function handleExamAdded(dateKey) {
    window.dispatchEvent(new CustomEvent('lockeen:calendar-focus', { detail: { dateKey } }));
  }

  const openExam = (id) => {
    setActiveExamId(id);
    setTab('notes');
  };

  const analyticsStudySessions = useMemo(
    () => mergeCalendarDoneStudySessions(studySessions, calEvents),
    [studySessions, calEvents],
  );
  const analyticsWeekData = useMemo(
    () => sessionsToWeekData(analyticsStudySessions),
    [analyticsStudySessions],
  );

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
    if ((exam.chapters || []).length === 0) {
      setActiveExamId(exam.id);
      setTab('notes');
      return;
    }
    setPracticeConfig({
      exam,
      mode: 'quiz',
      scopeId: 'all',
      difficulty: 'medium',
      difficulties: ['easy', 'medium', 'hard'],
      count: 10,
      timerOn: true,
      timerSecs: 30,
    });
  };

  const startQuickQuizForExam = (examId) => {
    const exam = exams.find((item) => String(item.id) === String(examId));
    if (!exam) return;
    if ((exam.chapters || []).length === 0) {
      setActiveExamId(exam.id);
      setTab('notes');
      return;
    }
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
        autoStart: false,
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
      difficulties: config.difficulties || [config.difficulty || 'medium'],
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
        _examId: exam.id,
        _examColor: exam.color || null,
        _examDot: exam.dot || null,
        _meta: practicePayload,
        _practiceConfig: { ...practicePayload, autoStart: false },
      });
      setFlashLanding(true);
      setTab('flashcards');
      return;
    }

    setQuizDeck({
      _examId: exam.id,
      _examColor: exam.color || null,
      _examDot: exam.dot || null,
      _practiceConfig: { ...practicePayload, autoStart: false },
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
    if (!result.error) {
      onLogout && onLogout();
      window.location.replace(`/?signed_out=1&v=${Date.now()}`);
    }
  };

  return (
    <div className="lockeen-app-shell" style={{ ...shellS.wrap, ...mobileShellStyle }}>
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
        <DashboardRoutes
          activeExamId={activeExamId}
          calEvents={calEvents}
          darkMode={darkMode}
          exams={exams}
          flashHistory={flashHistory}
          flashLanding={flashLanding}
          flashcardDeck={flashcardDeck}
          handleExamAdded={handleExamAdded}
          handleLogout={handleLogout}
          lang={lang}
          onFlashComplete={onFlashComplete}
          onLangChange={onLangChange}
          onMarkEventDone={onMarkEventDone}
          onQuizComplete={onQuizComplete}
          onStartTimer={onStartTimer}
          onStudySessionsChanged={refreshStudySessions}
          openExam={openExam}
          openFlashcards={openFlashcards}
          openQuiz={openQuiz}
          openQuizForExam={openQuizForExam}
          quizDeck={quizDeck}
          quizHistory={quizHistory}
          quizRuns={quizRuns}
          realMode={realMode}
          recentFlashDecks={recentFlashDecks}
          setActiveExamId={setActiveExamId}
          setCalEvents={setCalEvents}
          setExams={setExams}
          setFlashLanding={setFlashLanding}
          setPlannerNoteId={setPlannerNoteId}
          setPlannerOpen={setPlannerOpen}
          setTab={setTab}
          startQuickQuizForExam={startQuickQuizForExam}
          studySessions={analyticsStudySessions}
          tab={tab}
          user={user}
          weekData={analyticsWeekData}
        />
      </DashboardCard>
      {!isMobile && tab !== 'tutor' && <StudyTimer onSessionSaved={handleSessionSaved} startTrigger={timerTrigger} />}
      <PlannerOverlay plannerOpen={plannerOpen} setPlannerOpen={setPlannerOpen} setPlannerNoteId={setPlannerNoteId} handlePlanAdded={handlePlanAdded} handlePlanCleared={handlePlanCleared} calEvents={calEvents} exams={exams} quizRuns={quizRuns} lang={lang} />
      {practiceConfig && (
        <PracticeConfigModal
          config={practiceConfig}
          lang={lang}
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
