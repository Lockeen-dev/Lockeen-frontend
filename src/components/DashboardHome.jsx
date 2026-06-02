import React, { useEffect, useMemo, useState } from 'react';

import { Check, Clock, FileText, Layers, Paperclip, Sparkles } from '../lib/icons';
import { tt } from '../lib/i18n';
import { mockDashboard } from '../data/mockData';
import { getDashboardSummary } from '../services/dashboard';
import useIsMobile from '../lib/useIsMobile';
import { LIFE_CATS, dayKey, resolveEventPalette } from './CalendarView';

function formatDashboardError(error) {
  if (!error) return 'Unable to load dashboard data.';
  if (error.code === 'AUTH_REQUIRED') return 'Real mode requires an authenticated Supabase session.';
  if (error.code === 'SUPABASE_CONFIG_MISSING') return 'Supabase config is missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
  return error.message || 'Unable to load dashboard data.';
}

function formatDateLabel(date = new Date()) {
  return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
}

function formatRelativeTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'ora';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 60) return `${Math.max(1, mins)} min fa`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.round(hours / 24);
  return `${days} gg fa`;
}

function activityMeta(activity = {}) {
  const type = activity.type || '';
  if (type.includes('quiz')) return { icon: Sparkles, color: '#3730E8', bg: '#EEF2FF', score: activity.metadata?.total ? Math.round((Number(activity.metadata.score || 0) / Number(activity.metadata.total || 1)) * 100) : null };
  if (type.includes('flashcard')) return { icon: Layers, color: '#8B5CF6', bg: '#F5F3FF', score: activity.metadata?.total ? Math.round((Number(activity.metadata.score || activity.metadata.known_count || 0) / Number(activity.metadata.total || 1)) * 100) : null };
  if (type.includes('material')) return { icon: Paperclip, color: '#06B6D4', bg: '#ECFEFF', score: null };
  return { icon: FileText, color: '#3730E8', bg: '#EEF2FF', score: null };
}

function DashboardHome({ user, lang = 'en', setTab, openQuiz, openFlashcards, recommendedQuizDone = false, recommendedFlashDone = false, calEvents, onMarkEventDone, onStartTimer, realMode = false }) {
  const isMobile = useIsMobile();
  const todayKey = dayKey(new Date());
  const todayEvents = (calEvents && calEvents[todayKey]) || [];
  const [summary, setSummary] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);
  const [checked, setChecked] = useState({});
  const doneCount = Object.values(checked).filter(Boolean).length;

  useEffect(() => {
    let cancelled = false;
    async function loadReadModels() {
      setDashboardLoading(true);
      setDashboardError(null);
      const summaryResult = await getDashboardSummary();
      if (cancelled) return;
      if (summaryResult.error) {
        setDashboardError(formatDashboardError(summaryResult.error));
        setSummary(null);
      } else {
        setSummary(summaryResult.data || null);
      }
      setDashboardLoading(false);
    }
    loadReadModels();
    return () => { cancelled = true; };
  }, []);

  const scheduleItems = useMemo(() => {
    if (todayEvents.length) return todayEvents.slice(0, 4);
    return [
      { time: '09:00', name: summary?.nextExam?.name || 'Study session', dur: '60 min', cat: 'study', noteSubject: 'Studio' },
      { time: '11:30', name: 'Quiz practice', dur: '20 min', cat: 'quiz', noteSubject: 'Quiz' },
      { time: '14:00', name: 'Review notes', dur: '45 min', cat: 'study', noteSubject: 'Studio' },
      { time: '17:30', name: 'Flashcards', dur: '15 min', cat: 'flashcards', noteSubject: 'Flash' },
    ];
  }, [summary?.nextExam?.name, todayEvents]);

  const completionTotal = scheduleItems.length || 1;
  const completionCount = Math.min(completionTotal, doneCount);
  const nextTask = scheduleItems.find((_, idx) => !checked[idx]) || scheduleItems[0];
  const latestActivity = summary?.latestActivity || [];
  const recommendedDoneCount = (recommendedQuizDone ? 1 : 0) + (recommendedFlashDone ? 1 : 0);

  const quickActions = [
    { label: 'Nuovo quiz', Icon: Sparkles, bg: '#EEF2FF', color: '#3730E8', onClick: openQuiz },
    { label: 'Carica note', Icon: Paperclip, bg: '#F5F3FF', color: '#8B5CF6', onClick: () => setTab('notes') },
    { label: 'Nuova flashcard', Icon: Layers, bg: '#ECFEFF', color: '#06B6D4', onClick: openFlashcards },
    { label: 'Avvia timer', Icon: Clock, bg: '#ECFDF5', color: '#10B981', onClick: () => onStartTimer && onStartTimer(25) },
  ];

  return (
    <div style={s.wrap}>
      <section style={{ ...s.hero, padding: isMobile ? 24 : '32px 40px' }}>
        <div>
          <div style={s.heroDate}>{formatDateLabel(new Date())}</div>
          <h1 style={s.heroTitle}>{tt(lang, 'goodMorning')}, {user?.name || 'Alex'}</h1>
          <p style={s.heroSub}>
            Hai <strong>{Math.max(0, completionTotal - completionCount)} attività</strong> rimaste oggi
            {nextTask?.time ? <> · prossima alle <strong>{nextTask.time}</strong></> : null}.
          </p>
          <div style={s.heroActions}>
            <button type="button" onClick={openQuiz} style={s.heroBtn}>Inizia il quiz</button>
            <button type="button" onClick={() => setTab('calendar')} style={s.heroPill}>
              <Clock size={15} /> {summary?.nextExam?.name || 'Study plan'} tra 1 giorno
            </button>
          </div>
        </div>
        <div style={s.progressRing} aria-label={`${completionCount} of ${completionTotal} tasks complete`}>
          <div style={s.progressRingInner}>
            <strong>{completionCount}/{completionTotal}</strong>
            <span>OGGI</span>
          </div>
        </div>
      </section>

      <div style={{ ...s.grid, gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.65fr) minmax(320px, .95fr)' }}>
        <main style={s.column}>
          <section style={s.card}>
            <div style={s.cardHead}>
              <h2 style={s.cardTitle}>📅 Programma di oggi</h2>
              <span style={s.softBadge}>{completionCount}/{completionTotal} completate</span>
            </div>
            <div style={s.scheduleList}>
              {scheduleItems.map((ev, idx) => {
                const cat = LIFE_CATS.find((item) => item.id === ev.cat);
                const eventPalette = resolveEventPalette(ev);
                const accentColor = eventPalette.color || cat?.color || '#3730E8';
                const catBg = eventPalette.bg || cat?.bg || '#EEF2FF';
                const catText = eventPalette.text || cat?.text || '#3730E8';
                const done = !!checked[idx];
                return (
                  <button
                    type="button"
                    key={`${ev.time}-${ev.name}-${idx}`}
                    onClick={() => {
                      setChecked((prev) => ({ ...prev, [idx]: !prev[idx] }));
                      if (!done) onMarkEventDone && onMarkEventDone(todayKey, idx, ev.name);
                    }}
                    style={{ ...s.scheduleItem, opacity: done ? 0.48 : 1 }}
                  >
                    <span style={{ ...s.scheduleAccent, background: accentColor }} />
                    <span style={s.scheduleTime}>{ev.time || '--:--'}</span>
                    <span style={{ ...s.scheduleIcon, color: accentColor, background: catBg }}>{cat?.emoji || '📘'}</span>
                    <span style={s.scheduleBody}>
                      <strong style={{ textDecoration: done ? 'line-through' : 'none' }}>{ev.name}</strong>
                      <span><span style={{ ...s.tinyTag, background: catBg, color: catText }}>{ev.noteSubject || cat?.label || 'Task'}</span>{ev.dur ? <> · {ev.dur}</> : null}</span>
                    </span>
                    <span style={{ ...s.checkBox, ...(done ? s.checkBoxDone : null) }}>{done ? <Check size={14} /> : null}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section style={s.card}>
            <h2 style={s.cardTitle}>🕘 Attività recente</h2>
            {dashboardLoading && <div style={s.empty}>Caricamento attività...</div>}
            {!dashboardLoading && dashboardError && <div style={s.error}>{dashboardError}</div>}
            {!dashboardLoading && !dashboardError && latestActivity.length === 0 && <div style={s.empty}>Nessuna attività recente.</div>}
            {!dashboardLoading && !dashboardError && latestActivity.slice(0, 5).map((activity) => {
              const meta = activityMeta(activity);
              const Icon = meta.icon;
              return (
                <div key={`${activity.type}-${activity.entityId}-${activity.at}`} style={s.activityRow}>
                  <span style={{ ...s.activityIcon, background: meta.bg, color: meta.color }}><Icon size={17} /></span>
                  <span style={s.activityMain}>
                    <strong>{activity.title}</strong>
                    <span>{formatRelativeTime(activity.at)}</span>
                  </span>
                  {Number.isFinite(meta.score) && <span style={{ ...s.scoreBadge, color: meta.score >= 70 ? '#16A34A' : '#EF4444', background: meta.score >= 70 ? '#DCFCE7' : '#FEE2E2' }}>{meta.score}%</span>}
                </div>
              );
            })}
          </section>
        </main>

        <aside style={s.column}>
          <section style={s.card}>
            <h2 style={s.cardTitle}>⚡ Azioni rapide</h2>
            <div style={s.quickGrid}>
              {quickActions.map(({ label, Icon, bg, color, onClick }) => (
                <button type="button" key={label} onClick={onClick} style={s.quickAction}>
                  <span style={{ ...s.quickIcon, background: bg, color }}><Icon size={21} /></span>
                  <strong>{label}</strong>
                </button>
              ))}
            </div>
          </section>

          <section style={s.card}>
            <div style={s.cardHead}>
              <h2 style={s.cardTitle}>⭐ Consigliati oggi</h2>
              <span style={s.softBadge}>{recommendedDoneCount}/2</span>
            </div>
            <div style={{ ...s.recoCard, background: '#F4F6FF', borderColor: '#C7D2FE' }}>
              <div style={s.recoTop}>
                <span style={{ ...s.recoIcon, background: '#3730E8' }}><Sparkles size={18} /></span>
                <span style={s.softBadge}>{recommendedQuizDone ? 'Completato' : mockDashboard.recommendedQuiz.difficulty}</span>
              </div>
              <h3 style={s.recoTitle}>{mockDashboard.recommendedQuiz.title}</h3>
              <p style={s.recoMeta}>{mockDashboard.recommendedQuiz.questionCount} domande · {mockDashboard.recommendedQuiz.estimatedMinutes} min</p>
              <button type="button" disabled={recommendedQuizDone} onClick={openQuiz} style={recommendedQuizDone ? s.disabledBtn : s.primaryBtn}>
                {recommendedQuizDone ? 'Completato' : 'Inizia quiz'}
              </button>
            </div>

            <div style={{ ...s.recoCard, background: '#FFF7FB', borderColor: '#E9D5FF' }}>
              <div style={s.recoTop}>
                <span style={{ ...s.recoIcon, background: '#8B5CF6' }}><Layers size={18} /></span>
                <span style={s.softBadge}>{recommendedFlashDone ? 'Completato' : 'Ripasso'}</span>
              </div>
              <h3 style={s.recoTitle}>{mockDashboard.recommendedFlashcards.title}</h3>
              <p style={s.recoMeta}>{mockDashboard.recommendedFlashcards.cardCount} carte · Practice</p>
              <button type="button" disabled={recommendedFlashDone} onClick={openFlashcards} style={recommendedFlashDone ? s.disabledBtn : s.outlineBtn}>
                {recommendedFlashDone ? 'Completato' : 'Ripassa carte'}
              </button>
            </div>
          </section>

        </aside>
      </div>
    </div>
  );
}

const s = {
  wrap: { width: '100%', maxWidth: 1480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 },
  hero: { minHeight: 190, borderRadius: 24, background: 'linear-gradient(135deg,#3730E8 0%,#5B4DF1 55%,#7C5EF6 100%)', color: '#fff', boxShadow: '0 22px 56px -34px rgba(55,48,232,.72)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 },
  heroDate: { fontSize: 12, fontWeight: 900, letterSpacing: '.1em', color: 'rgba(255,255,255,.62)', marginBottom: 8 },
  heroTitle: { margin: 0, fontSize: 'clamp(28px,4vw,42px)', lineHeight: 1.05, letterSpacing: 0, fontWeight: 900 },
  heroSub: { margin: '10px 0 24px', fontSize: 17, color: 'rgba(255,255,255,.82)' },
  heroActions: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  heroBtn: { height: 42, borderRadius: 12, border: 'none', background: '#fff', color: '#3730E8', padding: '0 24px', fontSize: 15, fontWeight: 900, cursor: 'pointer' },
  heroPill: { height: 40, borderRadius: 999, border: '1px solid rgba(255,255,255,.22)', background: 'rgba(255,255,255,.12)', color: '#fff', padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' },
  progressRing: { width: 108, height: 108, borderRadius: 999, background: 'conic-gradient(#fff 0 25%, rgba(255,255,255,.24) 25% 100%)', display: 'grid', placeItems: 'center', flexShrink: 0 },
  progressRingInner: { width: 80, height: 80, borderRadius: 999, background: 'rgba(255,255,255,.12)', display: 'grid', placeItems: 'center', textAlign: 'center' },
  grid: { display: 'grid', gap: 24, alignItems: 'start' },
  column: { display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 },
  card: { border: '1px solid #E5E7EB', background: '#fff', borderRadius: 24, padding: 24, boxShadow: '0 18px 48px -42px rgba(15,16,53,.28)' },
  cardHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  cardTitle: { margin: 0, fontSize: 19, lineHeight: 1.2, letterSpacing: 0, color: '#070B2D', fontWeight: 900 },
  softBadge: { borderRadius: 999, background: '#EEF2FF', color: '#3730E8', padding: '6px 11px', fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap' },
  scheduleList: { display: 'flex', flexDirection: 'column', gap: 10 },
  scheduleItem: { width: '100%', display: 'grid', gridTemplateColumns: '4px 62px 46px minmax(0,1fr) 28px', alignItems: 'center', gap: 12, border: 'none', background: '#F7F8FC', borderRadius: 14, padding: '12px 14px', textAlign: 'left', cursor: 'pointer' },
  scheduleAccent: { width: 4, alignSelf: 'stretch', borderRadius: 999 },
  scheduleTime: { color: '#8A91A3', fontSize: 13, fontWeight: 900 },
  scheduleIcon: { width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', border: '1px solid rgba(55,48,232,.12)', fontSize: 18 },
  scheduleBody: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, color: '#070B2D', fontSize: 15 },
  tinyTag: { borderRadius: 999, padding: '3px 8px', fontSize: 12, fontWeight: 900 },
  checkBox: { width: 24, height: 24, borderRadius: 8, border: '2px solid #E5E7EB', display: 'grid', placeItems: 'center', color: '#fff' },
  checkBoxDone: { borderColor: '#A5B4FC', background: '#A5B4FC' },
  activityRow: { display: 'grid', gridTemplateColumns: '42px minmax(0,1fr) auto', alignItems: 'center', gap: 14, padding: '10px 6px' },
  activityIcon: { width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center' },
  activityMain: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3, color: '#070B2D', fontSize: 14 },
  scoreBadge: { padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 900 },
  quickGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  quickAction: { minHeight: 104, border: '1px solid #E5E7EB', background: '#fff', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 14, cursor: 'pointer', color: '#070B2D', fontSize: 15 },
  quickIcon: { width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center' },
  recoCard: { border: '1px solid', borderRadius: 16, padding: 18, marginTop: 14 },
  recoTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  recoIcon: { width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', color: '#fff' },
  recoTitle: { margin: '0 0 6px', color: '#070B2D', fontSize: 18, fontWeight: 900 },
  recoMeta: { margin: '0 0 16px', color: '#6B7280', fontSize: 14 },
  primaryBtn: { width: '100%', height: 44, borderRadius: 10, border: 'none', background: '#3730E8', color: '#fff', fontSize: 15, fontWeight: 900, cursor: 'pointer' },
  outlineBtn: { width: '100%', height: 44, borderRadius: 10, border: '1.5px solid #C7D2FE', background: '#fff', color: '#6D5DF6', fontSize: 15, fontWeight: 900, cursor: 'pointer' },
  disabledBtn: { width: '100%', height: 44, borderRadius: 10, border: '1px solid #BBF7D0', background: '#ECFDF5', color: '#16A34A', fontSize: 15, fontWeight: 900 },
  empty: { color: '#6B7280', fontSize: 14, padding: '18px 0' },
  error: { color: '#991B1B', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 800 },
};

export default DashboardHome;
