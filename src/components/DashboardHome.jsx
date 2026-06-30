import React, { useEffect, useMemo, useState } from 'react';

import useIsMobile from '../lib/useIsMobile';
import { getDashboardSummary } from '../services/dashboard';
import { applyExamPaletteToEvent, dayKey } from './calendarData';
import {
  DashboardHero,
  QuickActionsPanel,
  RecentActivity,
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
  const [activityExpanded, setActivityExpanded] = useState(false);

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

  const nextExam = summary?.nextExam || upcoming[0] || allExams[0] || null;
  const isEventDone = (event) => !!event.completed;
  const completedToday = todayEvents.filter((event, index) => isEventDone(event, index)).length;
  const totalToday = todayEvents.length || 0;
  const nextEvent = todayEvents.find((event, index) => !isEventDone(event, index));
  const nextExamDays = daysUntil(nextExam?.date);
  const latestActivity = (summary?.latestActivity || []).filter((activity) => (
    activity.type === 'quiz_attempt' || activity.type === 'flashcard_review'
  ));
  const totalExams = Math.max(Number(summary?.totalExams) || 0, allExams.length || 0);
  const heroProgress = totalToday ? Math.round((completedToday / totalToday) * 100) : 0;
  const heroProgressText = totalToday ? `${completedToday}/${totalToday}` : '0/0';
  const heroDate = new Date().toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();

  function toggleEventDone(event, index) {
    const nextDone = !isEventDone(event, index);
    onMarkEventDone && onMarkEventDone(todayKey, index, event.name, nextDone, event);
  }

  function startExamQuiz(exam) {
    if (onStartQuickQuizForExam && exam?.id) onStartQuickQuizForExam(exam.id);
    else if (onOpenQuizForExam && exam?.id) onOpenQuizForExam(exam.id);
    else if (onOpenExam && exam?.id) onOpenExam(exam.id);
    else setTab('quiz');
  }

  return (
    <div style={s.wrap}>
      <div style={{ ...s.topRow, gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 2.25fr) minmax(340px, 1fr)' }}>
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
          setTab={setTab}
          heroProgress={heroProgress}
          heroProgressText={heroProgressText}
          lang={lang}
        />
        <QuickActionsPanel s={s} nextExam={nextExam} startExamQuiz={startExamQuiz} setTab={setTab} onStartTimer={onStartTimer} lang={lang} />
      </div>

      {error && <div style={s.error}>{error}</div>}

      <div style={{ ...s.stack, gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))' }}>
        <TodaySchedule
          s={s}
          todayEvents={todayEvents}
          completedToday={completedToday}
          totalToday={totalToday}
          isEventDone={isEventDone}
          toggleEventDone={toggleEventDone}
          setTab={setTab}
          lang={lang}
        />
        <RecentActivity
          s={s}
          loading={loading}
          latestActivity={latestActivity}
          totalExams={totalExams}
          setTab={setTab}
          scoreFromActivity={scoreFromActivity}
          activityCopy={activityCopy}
          relativeTime={relativeTime}
          lang={lang}
          expanded={activityExpanded}
          onToggleExpanded={() => setActivityExpanded((value) => !value)}
        />
      </div>
    </div>
  );
}

const s = {
  wrap: { width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'hidden' },
  topRow: { display: 'grid', gap: 16, alignItems: 'stretch', marginBottom: 18 },
  hero: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', overflow: 'hidden', borderRadius: 18, background: 'linear-gradient(135deg,#352FE5 0%,#7C5CF3 100%)', color: '#fff', boxShadow: '0 18px 46px -30px rgba(55,48,232,.72)' },
  heroText: { minWidth: 0, flex: 1 },
  kicker: { fontSize: 12, fontWeight: 800, letterSpacing: '.08em', color: 'rgba(255,255,255,.72)', marginBottom: 8 },
  heroTitle: { margin: 0, fontSize: 'clamp(28px, 3vw, 34px)', lineHeight: 1.05, letterSpacing: 0, fontWeight: 850, overflowWrap: 'anywhere' },
  heroSub: { margin: '8px 0 0', color: 'rgba(255,255,255,.9)', fontSize: 15, lineHeight: 1.45, maxWidth: 720, fontWeight: 650 },
  heroActions: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 18 },
  mobileHeroActions: { maxWidth: 'calc(100% - 96px)', gap: 8, marginTop: 16, alignItems: 'center' },
  heroButton: { border: 'none', borderRadius: 10, background: '#fff', color: '#3730E8', padding: '11px 17px', fontWeight: 850, cursor: 'pointer', boxShadow: '0 10px 24px -18px rgba(0,0,0,.45)' },
  mobileHeroButton: { minHeight: 44, padding: '9px 14px', fontSize: 14, borderRadius: 9 },
  heroPill: { display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0, border: '1px solid rgba(255,255,255,.24)', borderRadius: 999, color: '#fff', background: 'rgba(255,255,255,.12)', padding: '9px 13px', fontWeight: 750, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  mobileHeroPill: { maxWidth: 138, padding: '8px 10px', gap: 6, fontSize: 13 },
  heroPillText: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  progressRing: { position: 'relative', width: 94, height: 94, flex: '0 0 auto', display: 'grid', placeItems: 'center', borderRadius: 999 },
  mobileProgressRing: { position: 'absolute', right: 20, bottom: 26, alignSelf: 'auto', marginTop: 0 },
  progressSvg: { position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)', filter: 'drop-shadow(0 8px 18px rgba(15,16,53,.16))' },
  progressTrack: { fill: 'none', stroke: 'rgba(255,255,255,.22)', strokeWidth: 8 },
  progressArc: { fill: 'none', stroke: '#FFFFFF', strokeWidth: 8, strokeLinecap: 'round', transition: 'stroke-dashoffset .28s ease' },
  progressInner: { position: 'relative', zIndex: 1, width: 62, height: 62, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' },
  progressValue: { color: '#fff', fontSize: 20, fontWeight: 900, lineHeight: 1 },
  progressLabel: { marginTop: 4, color: 'rgba(255,255,255,.82)', fontSize: 10, fontWeight: 900, letterSpacing: '.06em' },
  grid: { display: 'grid', gap: 18, alignItems: 'start' },
  stack: { display: 'grid', gap: 18, minWidth: 0, alignItems: 'start' },
  panel: { background: '#fff', border: '1px solid #E7E9F2', borderRadius: 18, padding: 18, boxShadow: '0 16px 42px -36px rgba(15,16,53,.28)', minWidth: 0 },
  quickPanel: { height: '100%' },
  panelHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  panelActions: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' },
  panelTitle: { margin: 0, color: '#171733', fontSize: 16, fontWeight: 850, letterSpacing: 0 },
  countBadge: { borderRadius: 999, background: '#EEF2FF', color: '#3730E8', padding: '6px 10px', fontSize: 12, fontWeight: 850, whiteSpace: 'nowrap' },
  scheduleList: { display: 'grid', gap: 8 },
  scheduleItem: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', border: 'none', borderRadius: 12, padding: '10px 12px', cursor: 'pointer', textAlign: 'left', minWidth: 0 },
  itemAccent: { alignSelf: 'stretch', width: 4, borderRadius: 999, flex: '0 0 auto' },
  itemTime: { width: 54, color: '#8B90A3', fontSize: 13, fontWeight: 800, flex: '0 0 auto' },
  itemMain: { flex: 1, minWidth: 0, color: '#171733', display: 'grid', gap: 4, alignContent: 'center' },
  itemTitle: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, lineHeight: 1.25 },
  itemMeta: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#8B90A3', fontSize: 12, lineHeight: 1.2, fontWeight: 700 },
  checkBox: { width: 24, height: 24, borderRadius: 8, border: '2px solid #DDE1EF', display: 'grid', placeItems: 'center', flex: '0 0 auto' },
  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 9, marginTop: 12 },
  quickAction: { minHeight: 78, border: '1px solid #E7E9F2', borderRadius: 13, background: '#fff', padding: 12, display: 'grid', justifyItems: 'start', alignContent: 'space-between', color: '#171733', cursor: 'pointer', textAlign: 'left' },
  iconTile: { width: 34, height: 34, borderRadius: 11, display: 'inline-grid', placeItems: 'center', flex: '0 0 auto' },
  activityStack: { display: 'grid', gap: 12 },
  activityList: { display: 'grid', gap: 9 },
  activityItem: { display: 'flex', alignItems: 'center', gap: 11, minWidth: 0, padding: '4px 0' },
  activityIcon: { width: 36, height: 36, borderRadius: 11, display: 'inline-grid', placeItems: 'center', flex: '0 0 auto' },
  activityText: { flex: 1, minWidth: 0, display: 'grid', gap: 2, color: '#171733' },
  activityTitle: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, lineHeight: 1.3, fontWeight: 850 },
  activityMeta: { color: '#777C90', fontSize: 12, lineHeight: 1.2, fontWeight: 650 },
  scoreBadge: { borderRadius: 999, padding: '4px 9px', fontSize: 12, fontWeight: 850, flex: '0 0 auto' },
  activityMoreButton: { border: '1px solid #E1E5F2', borderRadius: 12, background: '#FAFBFF', color: '#3730E8', padding: '10px 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 850, cursor: 'pointer', width: '100%' },
  activityMoreChevron: { display: 'inline-block', fontSize: 17, lineHeight: 1, transition: 'transform .18s ease' },
  recoList: { display: 'grid', gap: 14 },
  recoCard: { border: '1px solid #D8DCFF', borderRadius: 16, padding: 16 },
  recoTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  recoTag: { border: '1px solid #D8DCFF', borderRadius: 999, background: '#fff', color: '#3730E8', padding: '5px 10px', fontSize: 12, fontWeight: 850 },
  recoEyebrow: { margin: '0 0 6px', color: '#6D5DF6', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.05em' },
  recoTitle: { margin: 0, color: '#171733', fontSize: 18, fontWeight: 850, lineHeight: 1.2 },
  recoMeta: { margin: '7px 0 16px', color: '#777C90', fontSize: 14 },
  recoEmpty: { display: 'grid', gap: 10, color: '#777C90', background: '#FAFBFF', borderRadius: 14, padding: 18, lineHeight: 1.35 },
  primaryButton: { border: 'none', borderRadius: 12, background: '#3730E8', color: '#fff', padding: '12px 16px', fontWeight: 850, cursor: 'pointer', width: '100%' },
  outlineButton: { border: '1px solid #D8DCFF', borderRadius: 12, background: '#fff', color: '#6D5DF6', padding: '12px 16px', fontWeight: 850, cursor: 'pointer', width: '100%' },
  softButton: { border: '1px solid #E7E9F2', borderRadius: 12, background: '#F8F9FF', color: '#777C90', padding: '12px 16px', fontWeight: 800, cursor: 'pointer', width: '100%', marginTop: 8 },
  linkButton: { border: 'none', background: 'transparent', color: '#3730E8', fontWeight: 800, fontSize: 13, lineHeight: 1.2, display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' },
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
