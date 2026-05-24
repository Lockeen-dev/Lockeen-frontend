import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { BarChart3, Bell, BookOpen, Layers, LogOut, Pencil, Sparkles, ZapSolid } from '../lib/icons';
import { tt } from '../lib/i18n';
import { cellularRespirationCards, cellularRespirationQuestions, chemistryCards, mockDashboard, seedExams } from '../data/mockData';
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
import { AccountView } from './AccountViews';
import { CalendarView, initCalEvents } from './CalendarView';
import AIStudyPlanner from './AIStudyPlanner';
import DashboardHome from './DashboardHome';

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

function Dashboard({ user, onLogout, lang = 'en', onLangChange }) {
  const { signOut } = useAuth();
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

  const handleLogout = async () => {
    const result = await signOut();
    if (!result.error) onLogout && onLogout();
  };

  return (
    <div style={{ ...shellS.wrap, padding: isMobile ? '12px 0 80px' : '24px clamp(18px, 2.4vw, 40px) 40px' }}>
      {/* Header bar */}
      <header style={{ ...shellS.header, padding: isMobile ? '0 12px 12px' : 0 }}>
        <div style={shellS.headerInner}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            title="Refresh Lockeen"
            style={{ display: 'flex', alignItems: 'center', gap: 10, border: 0, background: 'transparent', padding: 0, cursor: 'pointer' }}
          >
            <div style={{ width: 36, height: 36, background: '#3730E8', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/Lockeen-2.png" alt="Lockeen logo" style={{ width: 58, height: 58, maxWidth: 'none' }} />
            </div>
            <span style={shellS.brand}>Lockeen</span>
          </button>
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
                    <Pencil size={15} /> {tt(lang, 'accountSettings')}
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
                {tab === 'dashboard' && <DashboardHome user={user} lang={lang} setTab={setTab} openQuiz={() => openQuiz({ noteId: 1, subject: 'Biology', title: 'Cellular Respiration', questions: cellularRespirationQuestions, _meta: { source: 'dashboardRecommended', subject: 'Biology', title: 'Biology Quiz' } })} openFlashcards={() => openFlashcards({ noteId: 201, subject: 'Chemistry', title: 'Chemistry Flash', cards: chemistryCards, _meta: { source: 'dashboardRecommended', subject: 'Chemistry', title: 'Chemistry Flash' } })} recommendedQuizDone={recommendedQuizDone} recommendedFlashDone={recommendedFlashDone} onOpenPlanner={() => setPlannerOpen(true)} calEvents={calEvents} onMarkEventDone={onMarkEventDone} onStartTimer={onStartTimer} />}
                {tab === 'notes'     && <NotesView exams={exams} lang={lang} setExams={setExams} activeId={activeExamId} setActiveId={setActiveExamId} onOpenFlashcards={openFlashcards} onOpenQuiz={openQuiz} onOpenQuizForExam={openQuizForExam} darkMode={false} onOpenPlanner={(nid) => { setPlannerNoteId(nid); setPlannerOpen(true); }} onExamAdded={handleExamAdded} quizHistory={quizHistory} flashHistory={flashHistory} quizRuns={quizRuns} recentFlashDecks={recentFlashDecks} />}
                {tab === 'flashcards' && (flashLanding
                  ? <FlashcardLanding recentDecks={recentFlashDecks} onOpenDeck={openFlashcards} setTab={setTab} darkMode={false} exams={exams} lang={lang} />
                  : <FlashcardViewer {...flashcardDeck} setTab={setTab} darkMode={false} onFlashComplete={onFlashComplete} onBackToLanding={() => setFlashLanding(true)} lang={lang} />
                )}
                {tab === 'quiz' && <QuizTab deck={quizDeck} exams={exams} quizRuns={quizRuns} onQuizComplete={onQuizComplete} setTab={setTab} darkMode={false} lang={lang} />}
                {tab === 'tutor'     && <TutorView />}
                {tab === 'analytics' && <AnalyticsView weekData={weekData} notes={exams} quizHistory={quizHistory} flashHistory={flashHistory} setTab={setTab} openQuiz={openQuiz} openFlashcards={openFlashcards} lang={lang} />}
                {tab === 'calendar'  && <CalendarView events={calEvents} setEvents={setCalEvents} setTab={setTab} onOpenPlanner={() => setPlannerOpen(true)} lang={lang} />}
                {tab === 'account'   && <AccountView user={user} lang={lang} onLangChange={onLangChange} onLogout={handleLogout} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
      {!isMobile && <StudyTimer onSessionSaved={handleSessionSaved} startTrigger={timerTrigger} lang={lang} />}
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
  avatar: { width: 38, height: 38, borderRadius: 999, background: 'linear-gradient(135deg, var(--indigo), var(--purple))', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 },
  outerCard: { width: '100%', maxWidth: '100%', border: '2px solid var(--indigo)', borderRadius: 24, background: 'var(--surface)', overflow: 'hidden', boxShadow: '0 30px 60px -30px rgba(55,48,232,.25)' },
  grid: { display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 'calc(100vh - 132px)', width: '100%', minWidth: 0 },
  main: { padding: '32px clamp(28px, 3vw, 56px)', width: '100%', minWidth: 0, maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' },
};

/* ===================== ANALYTICS ===================== */
/* ===================== CALENDAR ===================== */
/* ===================== AI STUDY PLANNER ===================== */


export default Dashboard;
