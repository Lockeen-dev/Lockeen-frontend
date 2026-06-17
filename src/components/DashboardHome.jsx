import React, { useEffect, useMemo, useState } from 'react';

import useIsMobile from '../lib/useIsMobile';
import { getDashboardSummary } from '../services/dashboard';
import { applyExamPaletteToEvent, dayKey } from './calendarData';
import {
  AssistantPanel,
  DashboardHero,
  QuickActionsPanel,
  RecentActivity,
  RecommendationsPanel,
  TodaySchedule,
} from './DashboardHomeSections';

function formatDashboardError(error) {
  if (!error) return 'Unable to load dashboard data.';
  if (error.code === 'AUTH_REQUIRED') return 'Real mode requires an authenticated Supabase session.';
  if (error.code === 'SUPABASE_CONFIG_MISSING') return 'Supabase config missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
  return error.message || 'Unable to load dashboard data.';
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value, lang = 'en') {
  const date = parseDate(value);
  if (!date) return 'No date';
  return date.toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(value) {
  const date = parseDate(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function relativeTime(value) {
  const date = parseDate(value);
  if (!date) return 'Recent';
  const diff = Date.now() - date.getTime();
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} d ago`;
}

function scoreFromActivity(activity) {
  const score = Number(activity?.metadata?.score);
  const total = Number(activity?.metadata?.total);
  if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) return null;
  return Math.round((score / total) * 100);
}

function activityCopy(activity) {
  if (activity.type === 'quiz_attempt') return 'Quiz completed';
  if (activity.type === 'flashcard_review') return 'Flashcards reviewed';
  if (activity.type === 'material') return 'Material uploaded';
  if (activity.type === 'note') return 'Note updated';
  if (activity.type === 'flashcard') return 'Flashcard created';
  return 'Activity';
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function DashboardHome({
  user,
  lang = 'en',
  setTab,
  exams = [],
  onOpenExam,
  onOpenQuizForExam,
  onStartQuickQuizForExam,
  onOpenPlanner,
  calEvents,
  onMarkEventDone,
  onStartTimer,
}) {
  const isMobile = useIsMobile();
  const todayKey = dayKey(new Date());
  const todayEvents = useMemo(
    () => ((calEvents && calEvents[todayKey]) || []).map((event) => applyExamPaletteToEvent(event, exams)),
    [calEvents, exams, todayKey]
  );
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localDone, setLocalDone] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const result = await getDashboardSummary();
      if (cancelled) return;
      if (result.error) {
        setError(formatDashboardError(result.error));
        setSummary(null);
      } else {
        setSummary(result.data || null);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const allExams = useMemo(() => {
    const source = exams.length ? exams : (summary?.upcomingExams || []);
    return [...source].sort((a, b) => {
      const ad = parseDate(a.date)?.getTime() || Number.MAX_SAFE_INTEGER;
      const bd = parseDate(b.date)?.getTime() || Number.MAX_SAFE_INTEGER;
      return ad - bd;
    });
  }, [exams, summary]);

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allExams.filter((exam) => {
      const date = parseDate(exam.date);
      if (!date) return false;
      date.setHours(0, 0, 0, 0);
      return date >= today;
    });
  }, [allExams]);

  const nextExam = summary?.nextExam || upcoming[0] || null;
  const eventDoneKey = (event, index) => `${todayKey}:${index}:${event.time || ''}:${event.name || ''}`;
  const isEventDone = (event, index) => {
    const key = eventDoneKey(event, index);
    return Object.prototype.hasOwnProperty.call(localDone, key) ? localDone[key] : !!event.completed;
  };
  const completedToday = todayEvents.filter((event, index) => isEventDone(event, index)).length;
  const totalToday = todayEvents.length || 0;
  const nextEvent = todayEvents.find((event, index) => !isEventDone(event, index));
  const nextExamDays = daysUntil(nextExam?.date);
  const latestActivity = (summary?.latestActivity || []).filter((activity) => (
    activity.type === 'quiz_attempt' || activity.type === 'flashcard_review'
  ));
  const totalExams = Number(summary?.totalExams ?? allExams.length) || 0;
  const heroProgress = totalToday ? Math.round((completedToday / totalToday) * 100) : 0;
  const heroProgressText = totalToday ? `${completedToday}/${totalToday}` : '0/0';
  const todayStudyRecommendations = todayEvents
    .filter((event) => event.cat === 'study' || event.noteSubject || event.noteId)
    .map((event) => {
      const eventText = normalizeText([event.name, event.noteSubject].filter(Boolean).join(' '));
      const matchedExam = allExams.find((exam) => {
        const examName = normalizeText(exam.name);
        const examSubject = normalizeText(exam.subject);
        return (examSubject && eventText.includes(examSubject)) || (examName && eventText.includes(examName)) || (examSubject && normalizeText(event.noteSubject).includes(examSubject));
      });
      return matchedExam ? { exam: matchedExam, source: 'today', event } : null;
    })
    .filter(Boolean);
  const upcomingRecommendations = upcoming
    .filter((exam) => !todayStudyRecommendations.some((item) => String(item.exam.id) === String(exam.id)))
    .map((exam) => ({ exam, source: 'upcoming', event: null }));
  const recommendations = [...todayStudyRecommendations, ...upcomingRecommendations].slice(0, 2);
  const heroDate = new Date().toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();

  function toggleEventDone(event, index) {
    const key = eventDoneKey(event, index);
    const nextDone = !isEventDone(event, index);
    setLocalDone((prev) => ({ ...prev, [key]: nextDone }));
    onMarkEventDone && onMarkEventDone(todayKey, index, event.name, nextDone);
  }

  function startExamQuiz(exam) {
    if (onStartQuickQuizForExam && exam?.id) onStartQuickQuizForExam(exam.id);
    else if (onOpenQuizForExam && exam?.id) onOpenQuizForExam(exam.id);
    else if (onOpenExam && exam?.id) onOpenExam(exam.id);
    else setTab('quiz');
  }

  return (
    <div style={s.wrap}>
      <DashboardHero
        s={s}
        isMobile={isMobile}
        heroDate={heroDate}
        user={user}
        totalToday={totalToday}
        completedToday={completedToday}
        nextEvent={nextEvent}
        nextExam={nextExam}
        nextExamDays={nextExamDays}
        startExamQuiz={startExamQuiz}
        setTab={setTab}
        onOpenExam={onOpenExam}
        heroProgress={heroProgress}
        heroProgressText={heroProgressText}
      />

      {error && <div style={s.error}>{error}</div>}

      <div style={{ ...s.grid, gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.45fr) minmax(320px, .9fr)' }}>
        <div style={s.stack}>
          <TodaySchedule
            s={s}
            todayEvents={todayEvents}
            completedToday={completedToday}
            totalToday={totalToday}
            isEventDone={isEventDone}
            toggleEventDone={toggleEventDone}
          />
          <RecentActivity
            s={s}
            loading={loading}
            latestActivity={latestActivity}
            setTab={setTab}
            scoreFromActivity={scoreFromActivity}
            activityCopy={activityCopy}
            relativeTime={relativeTime}
          />
        </div>

        <aside style={s.stack}>
          <QuickActionsPanel s={s} nextExam={nextExam} startExamQuiz={startExamQuiz} setTab={setTab} onStartTimer={onStartTimer} />
          <RecommendationsPanel
            s={s}
            recommendations={recommendations}
            totalExams={totalExams}
            daysUntil={daysUntil}
            formatDate={formatDate}
            lang={lang}
            startExamQuiz={startExamQuiz}
            onOpenExam={onOpenExam}
            setTab={setTab}
          />
          <AssistantPanel s={s} setTab={setTab} />
        </aside>
      </div>
    </div>
  );
}

const s = {
  wrap: { width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'hidden' },
  hero: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, marginBottom: 22, borderRadius: 22, background: 'linear-gradient(135deg,#352FE5 0%,#7C5CF3 100%)', color: '#fff', boxShadow: '0 20px 50px -28px rgba(55,48,232,.7)' },
  heroText: { minWidth: 0, flex: 1 },
  kicker: { fontSize: 12, fontWeight: 800, letterSpacing: '.08em', color: 'rgba(255,255,255,.72)', marginBottom: 8 },
  heroTitle: { margin: 0, fontSize: 'clamp(28px, 3vw, 36px)', lineHeight: 1.05, letterSpacing: 0, fontWeight: 850 },
  heroSub: { margin: '12px 0 0', color: 'rgba(255,255,255,.86)', fontSize: 16, lineHeight: 1.45, maxWidth: 720 },
  heroActions: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 20 },
  heroButton: { border: 'none', borderRadius: 12, background: '#fff', color: '#3730E8', padding: '12px 18px', fontWeight: 850, cursor: 'pointer', boxShadow: '0 10px 24px -18px rgba(0,0,0,.45)' },
  heroPill: { display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,.24)', borderRadius: 999, color: '#fff', background: 'rgba(255,255,255,.12)', padding: '10px 14px', fontWeight: 750, cursor: 'pointer', maxWidth: '100%' },
  progressRing: { position: 'relative', width: 108, height: 108, flex: '0 0 auto', display: 'grid', placeItems: 'center', borderRadius: 999 },
  progressArc: { position: 'absolute', inset: 0, borderRadius: 999, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.18)' },
  progressInner: { position: 'relative', zIndex: 1, width: 76, height: 76, borderRadius: 999, background: 'rgba(69,55,225,.48)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 0 0 10px rgba(124,92,243,.36)' },
  progressValue: { color: '#fff', fontSize: 22, fontWeight: 900, lineHeight: 1 },
  progressLabel: { marginTop: 4, color: 'rgba(255,255,255,.82)', fontSize: 10, fontWeight: 900, letterSpacing: '.06em' },
  grid: { display: 'grid', gap: 22, alignItems: 'start' },
  stack: { display: 'grid', gap: 22, minWidth: 0 },
  panel: { background: '#fff', border: '1px solid #E7E9F2', borderRadius: 20, padding: 22, boxShadow: '0 18px 44px -36px rgba(15,16,53,.32)', minWidth: 0 },
  panelHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  panelTitle: { margin: 0, color: '#171733', fontSize: 18, fontWeight: 850, letterSpacing: 0 },
  countBadge: { borderRadius: 999, background: '#EEF2FF', color: '#3730E8', padding: '6px 10px', fontSize: 12, fontWeight: 850, whiteSpace: 'nowrap' },
  scheduleList: { display: 'grid', gap: 10 },
  scheduleItem: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', border: 'none', borderRadius: 14, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', minWidth: 0 },
  itemAccent: { alignSelf: 'stretch', width: 4, borderRadius: 999, flex: '0 0 auto' },
  itemTime: { width: 54, color: '#8B90A3', fontSize: 13, fontWeight: 800, flex: '0 0 auto' },
  itemMain: { flex: 1, minWidth: 0, color: '#171733', display: 'grid', gap: 4, alignContent: 'center' },
  itemTitle: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, lineHeight: 1.25 },
  itemMeta: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#8B90A3', fontSize: 12, lineHeight: 1.2, fontWeight: 700 },
  checkBox: { width: 24, height: 24, borderRadius: 8, border: '2px solid #DDE1EF', display: 'grid', placeItems: 'center', flex: '0 0 auto' },
  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 16 },
  quickAction: { minHeight: 100, border: '1px solid #E7E9F2', borderRadius: 14, background: '#fff', padding: 16, display: 'grid', justifyItems: 'start', alignContent: 'space-between', color: '#171733', cursor: 'pointer', textAlign: 'left' },
  iconTile: { width: 42, height: 42, borderRadius: 13, display: 'inline-grid', placeItems: 'center', flex: '0 0 auto' },
  activityList: { display: 'grid', gap: 10 },
  activityItem: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, padding: '5px 0' },
  activityIcon: { width: 38, height: 38, borderRadius: 12, display: 'inline-grid', placeItems: 'center', flex: '0 0 auto' },
  activityText: { flex: 1, minWidth: 0, display: 'grid', gap: 2, color: '#171733' },
  activityTitle: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, lineHeight: 1.3, fontWeight: 850 },
  activityMeta: { color: '#777C90', fontSize: 12, lineHeight: 1.2, fontWeight: 650 },
  scoreBadge: { borderRadius: 999, padding: '4px 9px', fontSize: 12, fontWeight: 850, flex: '0 0 auto' },
  recoList: { display: 'grid', gap: 14 },
  recoCard: { border: '1px solid #D8DCFF', borderRadius: 16, padding: 18 },
  recoTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  recoTag: { border: '1px solid #D8DCFF', borderRadius: 999, background: '#fff', color: '#3730E8', padding: '5px 10px', fontSize: 12, fontWeight: 850 },
  recoEyebrow: { margin: '0 0 6px', color: '#6D5DF6', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.05em' },
  recoTitle: { margin: 0, color: '#171733', fontSize: 18, fontWeight: 850, lineHeight: 1.2 },
  recoMeta: { margin: '7px 0 16px', color: '#777C90', fontSize: 14 },
  recoEmpty: { display: 'grid', gap: 10, color: '#777C90', background: '#FAFBFF', borderRadius: 14, padding: 18, lineHeight: 1.35 },
  primaryButton: { border: 'none', borderRadius: 12, background: '#3730E8', color: '#fff', padding: '12px 16px', fontWeight: 850, cursor: 'pointer', width: '100%' },
  outlineButton: { border: '1px solid #D8DCFF', borderRadius: 12, background: '#fff', color: '#6D5DF6', padding: '12px 16px', fontWeight: 850, cursor: 'pointer', width: '100%' },
  softButton: { border: '1px solid #E7E9F2', borderRadius: 12, background: '#F8F9FF', color: '#777C90', padding: '12px 16px', fontWeight: 800, cursor: 'pointer', width: '100%', marginTop: 8 },
  linkButton: { border: 'none', background: 'transparent', color: '#3730E8', fontWeight: 850, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  assistant: { background: '#FBFFFD', border: '1px solid #DDF4E8', borderRadius: 20, padding: 22, display: 'grid', gap: 12 },
  assistantText: { margin: 0, color: '#777C90', fontSize: 14, lineHeight: 1.45 },
  empty: { minHeight: 116, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 6, textAlign: 'center', color: '#777C90', background: '#FAFBFF', borderRadius: 14, padding: 18 },
  error: { marginBottom: 18, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#991B1B', borderRadius: 14, padding: '12px 14px', fontWeight: 800, fontSize: 13 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.42)', zIndex: 2000, display: 'grid', placeItems: 'center', padding: 16 },
  modal: { width: 'min(340px, 100%)', background: '#fff', border: '1px solid #E7E9F2', borderRadius: 20, padding: 24, display: 'grid', justifyItems: 'center', gap: 10, boxShadow: '0 24px 60px rgba(15,16,53,.22)' },
  modalTitle: { margin: 0, color: '#171733', fontSize: 18, fontWeight: 850 },
  modalText: { margin: '0 0 8px', color: '#777C90', fontSize: 14, textAlign: 'center' },
};

export default DashboardHome;
