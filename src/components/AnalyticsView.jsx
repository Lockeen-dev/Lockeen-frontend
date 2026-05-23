import React, { useState, useEffect, useRef } from 'react';

import { Clock, Flame, Trend, Trophy } from '../lib/icons';
import { formatExamDate, getSubjectPalette, seedExams } from '../data/mockData';
import useIsMobile from '../lib/useIsMobile';
import { gradeS } from './common/ExamControls';
import { homeS } from '../styles/dashboardStyles';
import { getStudySummary, listRecentActivity } from '../services/analytics';

function useCountUp(target, duration = 1000, delay = 0) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const timeout = setTimeout(() => {
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);
  return value;
}

function useInView(rootMargin = '0px') {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { rootMargin });
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin]);
  return [ref, inView];
}

export const initialWeekData = [
  { day: 'Mon', mins: 45 },
  { day: 'Tue', mins: 80 },
  { day: 'Wed', mins: 60 },
  { day: 'Thu', mins: 110 },
  { day: 'Fri', mins: 90 },
  { day: 'Sat', mins: 140 },
  { day: 'Sun', mins: 75 },
];
const subjects = [
  { name: 'Biology',    progress: 84, color: 'var(--indigo)' },
  { name: 'Chemistry',  progress: 67, color: 'var(--purple)' },
  { name: 'Math',       progress: 92, color: '#06B6D4' },
  { name: 'History',    progress: 41, color: '#F59E0B' },
  { name: 'Literature', progress: 58, color: '#EF4444' },
];

function formatAnalyticsError(error) {
  if (!error) return 'Unable to load analytics data.';
  if (error.code === 'AUTH_REQUIRED') return 'Real mode requires lockeen_real_user_id in localStorage.';
  if (error.code === 'SUPABASE_CONFIG_MISSING') return 'Supabase config is missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
  return error.message || 'Unable to load analytics data.';
}

function formatActivityDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('it-IT', { day:'numeric', month:'short' });
}

function KpiStat({ label, rawValue, displayValue, Icon, tint, col, delay = 0 }) {
  const I = Icon;
  return (
    <div style={{ ...analS.kpiCard, background: tint }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ ...analS.statIcon, background: 'rgba(255,255,255,.6)', color: col }}><I size={18} /></div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: col, letterSpacing: '-0.02em', lineHeight: 1 }}>{displayValue}</div>
      <div style={{ fontSize: 12, color: col, opacity: 0.7, marginTop: 6, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function AnimatedBar({ mins, maxMin, day, animate }) {
  const targetH = Math.round((mins / maxMin) * 180);
  const [h, setH] = useState(0);
  useEffect(() => {
    if (!animate) return;
    let raf;
    const start = performance.now();
    const duration = 700;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setH(Math.round(eased * targetH));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, targetH]);
  return (
    <div style={analS.barCol}>
      <div style={analS.barLabel}>{mins}m</div>
      <div style={analS.barTrack}>
        <div style={{ ...analS.bar, height: h }} />
      </div>
      <div style={analS.dayLabel}>{day}</div>
    </div>
  );
}

function AnimatedProgress({ progress, color }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const duration = 800;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setW(eased * progress);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);
  return (
    <div style={analS.progTrack}>
      <div style={{ ...analS.progFill, width: `${w}%`, background: color }} />
    </div>
  );
}

function AnalyticsView({ weekData, notes, quizHistory, flashHistory, setTab, openQuiz }) {
  const isMobile = useIsMobile();
  const maxMin = Math.max(...weekData.map(d => d.mins), 1);
  const totalMin = weekData.reduce((a, b) => a + b.mins, 0);
  const trackedNotes = notes && notes.length ? notes : seedExams;
  const avgTarget = trackedNotes.length
    ? (trackedNotes.reduce((sum, n) => sum + (n.targetGrade || 27), 0) / trackedNotes.length).toFixed(1)
    : '27.0';

  const [chartRef, chartInView] = useInView('-40px');
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadAnalytics() {
      setAnalyticsLoading(true);
      setAnalyticsError('');
      const [summaryResult, activityResult] = await Promise.all([
        getStudySummary(),
        listRecentActivity({ limit: 8 }),
      ]);
      if (cancelled) return;
      const error = summaryResult.error || activityResult.error;
      if (error) {
        setAnalyticsError(formatAnalyticsError(error));
        setSummary(null);
        setActivity([]);
      } else {
        setSummary(summaryResult.data || null);
        setActivity(activityResult.data || summaryResult.data?.latestActivity || []);
      }
      setAnalyticsLoading(false);
    }
    loadAnalytics();
    return () => { cancelled = true; };
  }, []);

  const hasReadModelData = summary && [
    summary.totalExams,
    summary.notesCount,
    summary.materialsCount,
    summary.flashcardsCount,
    summary.quizzesCount,
    summary.quizAttemptsCount,
  ].some((value) => Number(value) > 0);

  // Count-up values
  const studyH = useCountUp(Math.floor(totalMin / 60), 900, 0);
  const studyM = useCountUp(totalMin % 60, 900, 0);
  const avgVal = useCountUp(Math.round(parseFloat(avgTarget) * 10), 900, 240);

  const kpiCards = summary ? [
    { label: 'Exams', displayValue: summary.totalExams ?? 0, Icon: Trophy, tint: '#FEF9C3', col: '#CA8A04' },
    { label: 'Notes', displayValue: summary.notesCount ?? 0, Icon: Clock, tint: 'var(--lavender)', col: 'var(--indigo)' },
    { label: 'Materials', displayValue: summary.materialsCount ?? 0, Icon: Flame, tint: '#FFF7ED', col: '#F97316' },
    { label: 'Flashcards', displayValue: summary.flashcardsCount ?? 0, Icon: Trend, tint: '#ECFDF5', col: '#10B981' },
    { label: 'Quizzes', displayValue: summary.quizzesCount ?? 0, Icon: Trend, tint: '#EEF2FF', col: 'var(--indigo)' },
    { label: 'Quiz attempts', displayValue: summary.quizAttemptsCount ?? 0, Icon: Trophy, tint: '#F5F3FF', col: 'var(--purple)' },
    ...(summary.averageQuizScore != null
      ? [{ label: 'Avg. quiz score', displayValue: `${summary.averageQuizScore}%`, Icon: Trend, tint: '#ECFDF5', col: '#10B981' }]
      : []),
  ] : [
    { label: 'Study time this week', displayValue: `${studyH}h ${studyM}m`, Icon: Clock,  tint: 'var(--lavender)', col: 'var(--indigo)' },
    { label: 'Voto medio target', displayValue: `${(avgVal/10).toFixed(1)}`, Icon: Trophy, tint: '#FEF9C3', col: '#CA8A04' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={homeS.h1}>Analytics</h2>
        <p style={homeS.sub}>Track your study habits and progress across subjects</p>
      </div>

      {analyticsLoading && (
        <div style={{ ...analS.noticeCard, marginBottom:22 }}>Loading analytics...</div>
      )}
      {!analyticsLoading && analyticsError && (
        <div style={{ ...analS.noticeCard, marginBottom:22, background:'#FEF2F2', borderColor:'#FCA5A5', color:'#991B1B', fontWeight:700 }}>{analyticsError}</div>
      )}
      {!analyticsLoading && !analyticsError && !hasReadModelData && (
        <div style={{ ...analS.noticeCard, marginBottom:22 }}>No analytics data yet. Add notes, materials, flashcards, or quiz attempts to populate this view.</div>
      )}

      {!analyticsLoading && !analyticsError && (
        <div style={{ ...analS.statsGrid, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
          {kpiCards.map(s => <KpiStat key={s.label} {...s} />)}
        </div>
      )}

      <div ref={chartRef} style={{ ...analS.row, gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr' }}>
        <div style={analS.chartCard}>
          <div style={analS.cardHeader}>
            <div>
              <h3 style={analS.cardTitle}>Weekly study time</h3>
              <p style={analS.cardSub}>Minutes spent studying per day</p>
            </div>
            <span style={analS.legend}><span style={{ ...analS.legendDot, background: 'var(--indigo)' }} /> mins</span>
          </div>
          <div style={analS.chart}>
            {weekData.map((d, i) => (
              <AnimatedBar key={d.day} mins={d.mins} maxMin={maxMin} day={d.day} animate={chartInView} />
            ))}
          </div>
        </div>

        <div style={analS.subjectCard}>
          <h3 style={{ ...analS.cardTitle, marginBottom: 4 }}>Latest activity</h3>
          <p style={{ ...analS.cardSub, marginBottom: 18 }}>Recent items from the read model</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activity.length === 0 ? (
              <p style={{ margin:0, color:'var(--gray)', fontSize:13 }}>No recent activity yet.</p>
            ) : activity.map(item => (
              <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ width:8, height:8, borderRadius:999, background:'var(--indigo)', flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title || item.type}</div>
                  <div style={{ fontSize:12, color:'var(--gray)', marginTop:2 }}>{item.type}{formatActivityDate(item.at) ? ` · ${formatActivityDate(item.at)}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={gradeS.section}>
        <div style={gradeS.sectionHead}>
          <h3 style={gradeS.sectionTitle}>Grade Predictor</h3>
          <p style={gradeS.sectionSub}>Previsione basata sui tuoi quiz e flashcard</p>
        </div>
        <div style={gradeS.grid}>
          {trackedNotes.map(note => (
            <GradePredictorCard
              key={note.id}
              note={note}
              quizHistory={quizHistory || {}}
              flashHistory={flashHistory || {}}
              setTab={setTab}
              openQuiz={openQuiz}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function GradePredictorCard({ note, quizHistory, flashHistory, setTab, openQuiz }) {
  const palette = getSubjectPalette(note.subject, note, false);
  const targetGrade = note.targetGrade || 27;
  const allScores = [
    ...(quizHistory[note.id] || []),
    ...(flashHistory[note.id] || [])
  ];
  const hasScores = allScores.length > 0;
  const avgScore = allScores.length > 0
    ? allScores.reduce((a,b)=>a+b,0) / allScores.length
    : 50;
  const predictedGrade = Math.round(18 + (avgScore / 100) * 12);
  const gap = targetGrade - predictedGrade;
  const predPct = hasScores ? Math.max(0, Math.min(100, ((predictedGrade - 18) / 12) * 100)) : 0;
  const targetPct = Math.max(0, Math.min(100, ((targetGrade - 18) / 12) * 100));
  const onTarget = hasScores && predictedGrade === targetGrade;
  const overlap = !onTarget && Math.abs(gap) < 2;
  const gradeText = (v) => v;

  let messageStyle = gradeS.msgEmpty;
  let message = 'Fai il primo quiz per vedere la previsione del voto.';
  if (allScores.length > 0 && gap > 4) {
    messageStyle = gradeS.msgWarn;
    message = `Sei a ${gap} punti dall'obiettivo. Fai più quiz per migliorare la previsione.`;
  } else if (allScores.length > 0 && gap > 0) {
    messageStyle = gradeS.msgAlmost;
    message = `Quasi lì. Ti mancano ${gap} punti. Continua così.`;
  } else if (allScores.length > 0 && gap <= 0) {
    messageStyle = gradeS.msgGood;
    message = 'Sei sulla strada giusta. Al ritmo attuale puoi raggiungere il tuo obiettivo.';
  }

  return (
    <div style={gradeS.card}>
      <div style={gradeS.cardHead}>
        <div style={gradeS.noteName}>
          <span style={{ ...gradeS.noteDot, background: palette.dot }} />
          <span>{note.name || note.title}</span>
        </div>
        <span style={gradeS.examDate}>{formatExamDate(note.date || note.examDate)}</span>
      </div>

      <div style={gradeS.barWrap}>
        <div style={gradeS.track} />
        <div style={{ ...gradeS.fill, width: `${predPct}%` }} />
        {!hasScores ? null : onTarget ? (
          <div style={{ ...gradeS.point, ...gradeS.pointGood, left: `${targetPct}%` }}>
            <span style={{ ...gradeS.pointLabel, ...gradeS.pointLabelGood, width: 60, left: -22 }}>On target</span>
          </div>
        ) : overlap ? (
          <div style={{ ...gradeS.point, ...gradeS.pointTarget, left: `${targetPct}%`, zIndex: 3 }}>
            <span style={{ ...gradeS.pointLabel, ...gradeS.pointLabelTarget }}>{gradeText(targetGrade)}</span>
          </div>
        ) : (
          <React.Fragment>
            <div style={{ ...gradeS.point, ...gradeS.pointPred, left: `${predPct}%`, zIndex: 2 }}>
              <span style={{ ...gradeS.pointLabel, ...gradeS.pointLabelPred }}>{gradeText(predictedGrade)}</span>
            </div>
            <div style={{ ...gradeS.point, ...gradeS.pointTarget, left: `${targetPct}%`, zIndex: 3 }}>
              <span style={{ ...gradeS.pointLabel, ...gradeS.pointLabelTarget }}>{gradeText(targetGrade)}</span>
            </div>
          </React.Fragment>
        )}
        <span style={gradeS.minLabel}>18</span>
        <span style={gradeS.maxLabel}>30</span>
      </div>

      <div style={gradeS.nums}>
        <div>
          <div style={{ ...gradeS.num, ...gradeS.numPred }}>{hasScores ? gradeText(predictedGrade) : '—'}</div>
          <div style={gradeS.numLabel}>Previsione attuale</div>
        </div>
        <div>
          <div style={{ ...gradeS.num, ...gradeS.numTarget }}>{gradeText(targetGrade)}</div>
          <div style={gradeS.numLabel}>Il tuo obiettivo</div>
        </div>
        <div>
          <div style={{ ...gradeS.num, color: hasScores && gap > 0 ? '#B91C1C' : '#047857' }}>{hasScores ? (gap > 0 ? `-${gap}` : `+${Math.abs(gap)}`) : '—'}</div>
          <div style={gradeS.numLabel}>Punti da recuperare</div>
        </div>
      </div>

      <div style={{ ...gradeS.message, ...messageStyle }}>{message}</div>
      <button style={gradeS.quizBtn} onClick={() => {
        const ch = note.chapters && note.chapters[0];
        if (openQuiz && ch) {
          openQuiz({ noteId: note.id, subject: note.subject, title: ch.title || note.name, questions: ch.questions || [] });
        } else {
          setTab && setTab('quiz');
        }
      }}>Vai al Quiz →</button>
    </div>
  );
}

const analS = {
  noticeCard: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:16, color:'var(--gray)', fontSize:14 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 },
  kpiCard: { borderRadius: 20, padding: '18px 20px', display: 'flex', flexDirection: 'column' },
  statCard: { display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 },
  statIcon: { width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', flexShrink: 0 },
  statValue: { fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' },
  statLabel: { fontSize: 12, color: 'var(--gray)', marginTop: 2 },
  row: { display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 },
  chartCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 22 },
  cardHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)' },
  cardSub: { margin: '4px 0 0', fontSize: 13, color: 'var(--gray)' },
  legend: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--gray)' },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  chart: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, alignItems: 'end', height: 240 },
  barCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  barLabel: { fontSize: 11, color: 'var(--gray)' },
  barTrack: { width: '100%', maxWidth: 40, height: 190, background: 'var(--chart-track)', borderRadius: 10, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', background: 'linear-gradient(180deg, var(--indigo), var(--purple))', borderRadius: 10, transition: 'height .4s ease' },
  dayLabel: { fontSize: 12, color: 'var(--gray)', fontWeight: 600 },
  subjectCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 22 },
  subjRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 },
  subjName: { fontSize: 13, fontWeight: 600, color: 'var(--ink)' },
  subjPct: { fontSize: 13, color: 'var(--gray)', fontWeight: 600 },
  progTrack: { height: 8, background: 'var(--chart-track)', borderRadius: 999, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: 999, transition: 'width .4s ease' },
};

export { AnalyticsView, GradePredictorCard };
