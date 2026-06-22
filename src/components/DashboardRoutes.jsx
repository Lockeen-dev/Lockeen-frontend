import React, { Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import DashboardHome from './DashboardHome';
import { tt } from '../lib/i18n';

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

function ViewFallback({ lang = 'en' }) {
  return <div style={{ padding: 24, color: 'var(--gray)', fontWeight: 800 }}>{tt(lang, 'loading')}</div>;
}

export function DashboardRoutes({
  activeExamId,
  calEvents,
  darkMode,
  exams,
  flashHistory,
  flashLanding,
  flashcardDeck,
  handleExamAdded,
  handleLogout,
  lang,
  onFlashComplete,
  onLangChange,
  onMarkEventDone,
  onQuizComplete,
  onStartTimer,
  onStudySessionsChanged,
  openExam,
  openFlashcards,
  openQuiz,
  openQuizForExam,
  quizDeck,
  quizHistory,
  quizRuns,
  realMode,
  recentFlashDecks,
  setActiveExamId,
  setCalEvents,
  setExams,
  setFlashLanding,
  setPlannerOpen,
  setPlannerNoteId,
  setTab,
  startQuickQuizForExam,
  studySessions,
  tab,
  user,
  weekData,
}) {
  return (
    <Suspense fallback={<ViewFallback lang={lang} />}>
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
          {tab === 'notes'     && <NotesView user={user} exams={exams} lang={lang} setExams={setExams} activeId={activeExamId} setActiveId={setActiveExamId} onOpenFlashcards={openFlashcards} onOpenQuiz={openQuiz} onOpenQuizForExam={openQuizForExam} darkMode={darkMode} onOpenPlanner={(nid) => { setPlannerNoteId(nid); setPlannerOpen(true); }} onExamAdded={handleExamAdded} quizHistory={quizHistory} flashHistory={flashHistory} quizRuns={quizRuns} recentFlashDecks={recentFlashDecks} />}
          {tab === 'flashcards' && (flashLanding
            ? <FlashcardLanding deck={flashcardDeck} recentDecks={recentFlashDecks} onOpenDeck={openFlashcards} setTab={setTab} darkMode={darkMode} exams={exams} lang={lang} />
            : <FlashcardViewer {...flashcardDeck} setTab={setTab} darkMode={darkMode} exams={exams} onFlashComplete={onFlashComplete} onBackToLanding={() => setFlashLanding(true)} lang={lang} />
          )}
          {tab === 'quiz' && <QuizTab deck={quizDeck} exams={exams} quizRuns={quizRuns} onQuizComplete={onQuizComplete} setTab={setTab} darkMode={darkMode} lang={lang} />}
          {tab === 'tutor'     && <TutorView user={user} lang={lang} />}
          {tab === 'analytics' && <AnalyticsView weekData={weekData} studySessions={studySessions} calEvents={calEvents} notes={exams} quizHistory={quizHistory} flashHistory={flashHistory} setTab={setTab} openQuizForExam={openQuizForExam} lang={lang} />}
          {tab === 'calendar'  && <CalendarView events={calEvents} setEvents={setCalEvents} setTab={setTab} onOpenPlanner={() => setPlannerOpen(true)} exams={exams} onStudySessionsChanged={onStudySessionsChanged} lang={lang} />}
          {tab === 'earn'      && <EarnView lang={lang} />}
          {tab === 'account'   && <AccountView user={user} lang={lang} onLangChange={onLangChange} onLogout={handleLogout} />}
        </motion.div>
      </AnimatePresence>
    </Suspense>
  );
}

export function PlannerOverlay({ plannerOpen, setPlannerOpen, setPlannerNoteId, handlePlanAdded, handlePlanCleared, calEvents, exams, quizRuns, lang = 'en' }) {
  if (!plannerOpen) return null;

  return (
    <Suspense fallback={<ViewFallback lang={lang} />}>
      <AIStudyPlanner onClose={() => { setPlannerOpen(false); setPlannerNoteId(null); }} onPlanAdded={handlePlanAdded} onPlanCleared={handlePlanCleared} exams={exams} quizRuns={quizRuns} calEvents={calEvents} lang={lang} />
    </Suspense>
  );
}
