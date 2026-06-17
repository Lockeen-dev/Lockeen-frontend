import React, { useState, useEffect, useRef } from 'react';

import { Clock, Flame, Trend, Trophy } from '../lib/icons';
import { formatExamDate, getSubjectPalette } from '../data/mockData';
import useIsMobile from '../lib/useIsMobile';
import { homeS } from '../styles/dashboardStyles';
import { getStudyStreak, getStudySummary, listStudySessions, sessionsToWeekData } from '../services/analytics';
import { durToMins } from './calendarData';

function useCountUp(target, duration = 1000, delay = 0) {
  const [value, setValue] = useState(0);
  const previousTarget = useRef(0);
  useEffect(() => {
    let raf;
    const from = previousTarget.current;
    previousTarget.current = target;
    const timeout = setTimeout(() => {
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(from + (target - from) * eased));
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timeout);
      if (raf) cancelAnimationFrame(raf);
    };
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
function formatAnalyticsError(error) {
  if (!error) return 'Unable to load analytics data.';
  if (error.code === 'AUTH_REQUIRED') return 'Real mode requires an authenticated Supabase session.';
  if (error.code === 'SUPABASE_CONFIG_MISSING') return 'Supabase config is missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
  return error.message || 'Unable to load analytics data.';
}

function getCurrentGradeFromScore(score) {
  if (score == null || !Number.isFinite(Number(score)) || Number(score) <= 0) return null;
  return Math.round((18 + (Number(score) / 100) * 12) * 10) / 10;
}

function getLocalQuizScores(quizHistory = {}) {
  return Object.values(quizHistory).flat().filter((score) => Number.isFinite(Number(score))).map(Number);
}

function getAverage(values = []) {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getDaysUntilExam(exam, now = new Date()) {
  const raw = exam.date || exam.examDate;
  if (!raw) return null;
  const examDate = new Date(raw);
  if (Number.isNaN(examDate.getTime())) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  examDate.setHours(0, 0, 0, 0);
  return Math.ceil((examDate.getTime() - today.getTime()) / 86400000);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getSubjectMastery(notes = [], quizHistory = {}, flashHistory = {}) {
  const colors = ['var(--indigo)', 'var(--purple)', '#06B6D4', '#F59E0B', '#EF4444'];
  const groups = new Map();
  (notes || []).forEach((exam) => {
    const name = exam.subject || exam.name || 'General';
    const current = groups.get(name) || { name, scores: [], mastery: [] };
    const ids = [exam.id, ...(exam.chapters || []).map((chapter) => chapter.id)];
    ids.forEach((id) => {
      current.scores.push(...((quizHistory || {})[id] || []), ...((flashHistory || {})[id] || []));
    });
    (exam.chapters || []).forEach((chapter) => {
      if (Number.isFinite(Number(chapter.mastery))) current.mastery.push(Number(chapter.mastery));
    });
    groups.set(name, current);
  });

  return Array.from(groups.values()).slice(0, 5).map((group, index) => ({
    name: group.name,
    progress: getAverage(group.scores) ?? getAverage(group.mastery) ?? 0,
    color: colors[index % colors.length],
  }));
}

function estimateGradePrediction(exam, quizHistory = {}, flashHistory = {}) {
  const ids = [exam.id, ...(exam.chapters || []).map((chapter) => chapter.id)];
  const quizScores = ids.flatMap((id) => (quizHistory || {})[id] || [])
    .filter((score) => Number.isFinite(Number(score))).map(Number);
  const flashScores = ids.flatMap((id) => (flashHistory || {})[id] || [])
    .filter((score) => Number.isFinite(Number(score))).map(Number);
  const scores = [...quizScores, ...flashScores];
  const backendPrediction = exam.gradePrediction ?? exam.predictedGrade ?? exam.prediction;
  const backendConfidence = exam.gradePredictionConfidence ?? exam.predictionConfidence;
  const backendStatus = exam.gradePredictionStatus ?? exam.predictionStatus;

  if (!scores.length && !Number.isFinite(Number(backendPrediction))) {
    return {
      prediction: null,
      confidence: 0,
      confidenceLabel: 'No data',
      delta: null,
      status: 'needs-practice',
      statusLabel: 'Needs practice',
      helper: 'Needs practice',
    };
  }

  const quizAvg = getAverage(quizScores);
  const flashAvg = getAverage(flashScores);
  const avgScore = quizAvg != null && flashAvg != null
    ? Math.round((quizAvg * 0.7) + (flashAvg * 0.3))
    : quizAvg ?? flashAvg ?? getAverage(scores);
  const daysUntilExam = getDaysUntilExam(exam);
  const timePressurePenalty = daysUntilExam == null || daysUntilExam >= 21 ? 0 : daysUntilExam >= 7 ? 1 : 2;
  const dataPenalty = quizScores.length === 0 ? 1 : 0;
  const prediction = Number.isFinite(Number(backendPrediction))
    ? Math.round(Number(backendPrediction))
    : clamp(Math.round(18 + (avgScore / 100) * 12) - timePressurePenalty - dataPenalty, 18, 30);
  const target = exam.targetGrade || 27;
  const delta = prediction - target;
  const lastScore = scores[0];
  const previousScores = scores.slice(1);
  const previousAvg = getAverage(previousScores);
  const improving = previousAvg == null || lastScore == null ? false : lastScore >= previousAvg;
  const coverage = Math.min(60, (quizScores.length * 14) + (flashScores.length * 8));
  const recencyBonus = daysUntilExam != null && daysUntilExam <= 14 && scores.length > 0 ? 10 : 0;
  const confidence = Number.isFinite(Number(backendConfidence))
    ? Math.round(Number(backendConfidence))
    : clamp(20 + coverage + recencyBonus, 0, 100);
  const confidenceLabel = confidence >= 70 ? 'High confidence' : confidence >= 40 ? 'Medium confidence' : confidence > 0 ? 'Low confidence' : 'No data';
  const status = backendStatus || (delta >= 0 && confidence >= 40 ? 'on-track' : delta >= -2 ? 'close' : delta >= -4 ? 'at-risk' : 'needs-practice');
  const labels = {
    'on-track': 'On track',
    close: 'Close',
    'at-risk': 'At risk',
    'needs-practice': 'Needs practice',
  };
  const helpers = {
    'on-track': improving ? 'Keep momentum with mixed review' : 'Keep steady, repeat weak cards',
    close: quizScores.length ? 'Close: one focused quiz can lift it' : 'Close: add quiz data',
    'at-risk': flashScores.length ? 'At risk: practice weak quiz topics' : 'At risk: add flashcard review',
    'needs-practice': 'Needs practice: start with quiz + flashcards',
  };
  return {
    prediction,
    confidence,
    confidenceLabel,
    delta,
    status,
    statusLabel: labels[status] || labels['needs-practice'],
    helper: helpers[status] || helpers['needs-practice'],
  };
}

function getGradeStatusStyle(status) {
  if (status === 'on-track') return { bg: '#ECFDF5', color: '#047857' };
  if (status === 'close') return { bg: '#EEF2FF', color: 'var(--indigo)' };
  if (status === 'at-risk') return { bg: '#FEF2F2', color: '#DC2626' };
  return { bg: '#FFF7ED', color: '#F97316' };
}

const GRADE_STATUS_LEGEND = [
  { key: 'on-track', label: 'On track' },
  { key: 'close', label: 'Close' },
  { key: 'at-risk', label: 'At risk' },
  { key: 'needs-practice', label: 'Needs practice' },
];

function getChartMaxMinutes(values = []) {
  const max = Math.max(...values.map((value) => Number(value) || 0), 0);
  return Math.max(60, Math.ceil(max / 60) * 60);
}

function KpiStat({ label, displayValue, Icon, tint, col }) {
  const I = Icon;
  return (
    <div style={{ ...analS.kpiCard, background: tint }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ ...analS.statIcon, background: 'rgba(255,255,255,.6)', color: col }}><I size={18} /></div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color: col, letterSpacing: '-0.03em', lineHeight: 1 }}>{displayValue}</div>
      <div style={{ fontSize: 13, color: col, opacity: 0.7, marginTop: 8, fontWeight: 800 }}>{label}</div>
    </div>
  );
}

function AnimatedBar({ mins, maxMin, day, animate }) {
  const targetH = mins > 0 ? Math.max(8, Math.round((mins / maxMin) * 180)) : 0;
  const [h, setH] = useState(0);
  useEffect(() => {
    if (!animate) {
      setH(targetH);
      return;
    }
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

function doneStudySessionsFromCalendar(events = {}) {
  return Object.entries(events || {}).flatMap(([dateKey, dayEvents]) =>
    (dayEvents || [])
      .filter((event) => event?.completed && isStudyLikeCalendarEvent(event))
      .map((event) => ({
        id: event.source === 'study-plan-service'
          ? `planner-${event.serviceId}`
          : `calendar-activity-${event.serviceId || `${dateKey}-${event.time || '12:00'}-${event.name || 'activity'}`}`,
        minutes: Math.max(1, durToMins(event.dur || '30m') || 30),
        studiedAt: `${calendarKeyToIsoDate(dateKey)}T${event.time || '12:00'}:00`,
        source: event.source === 'study-plan-service' ? 'study-plan' : 'calendar-activity',
      })),
  );
}

function mergeStudySessionsWithCalendar(studySessions = [], calEvents = {}) {
  const calendarSessions = doneStudySessionsFromCalendar(calEvents);
  const calendarKeys = new Set(calendarSessions.map((session) => `${session.source}:${session.id}`));
  const merged = [
    ...calendarSessions,
    ...(studySessions || []).filter((session) => !calendarKeys.has(`${session.source}:${session.id}`)),
  ];
  const seen = new Set();
  return merged.filter((session) => {
    const key = `${session.source}:${session.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function AnalyticsView({ weekData, studySessions = [], calEvents = {}, notes, quizHistory, flashHistory, setTab, openQuizForExam }) {
  const isMobile = useIsMobile();
  const visibleStudySessions = mergeStudySessionsWithCalendar(studySessions, calEvents);
  const visibleWeekData = sessionsToWeekData(visibleStudySessions);
  const maxMin = getChartMaxMinutes(visibleWeekData.map(d => d.mins));
  const totalMin = visibleWeekData.reduce((a, b) => a + b.mins, 0);
  const trackedNotes = notes || [];

  const [chartRef, chartInView] = useInView('-40px');
  const [summary, setSummary] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');
  const studySessionsVersion = visibleStudySessions.map((session) => `${session.id}:${session.minutes}:${session.studiedAt}`).join('|');

  useEffect(() => {
    let cancelled = false;
    async function loadAnalytics() {
      setAnalyticsLoading(true);
      setAnalyticsError('');
      const [summaryResult, sessionsResult] = await Promise.all([
        getStudySummary(),
        listStudySessions({ days: 30 }),
      ]);
      if (cancelled) return;
      const error = summaryResult.error || sessionsResult.error;
      if (error) {
        setAnalyticsError(formatAnalyticsError(error));
        setSummary(null);
      } else {
        setSummary(summaryResult.data || null);
      }
      setAnalyticsLoading(false);
    }
    loadAnalytics();
    return () => { cancelled = true; };
  }, [studySessionsVersion]);

  const localQuizScores = getLocalQuizScores(quizHistory);
  const localFlashScores = getLocalQuizScores(flashHistory);
  const averageQuizScore = summary?.averageQuizScore ?? getAverage(localQuizScores);
  const averageFlashcardScore = summary?.averageFlashcardScore ?? getAverage(localFlashScores);
  const averagePracticeScore = summary?.averagePracticeScore ?? getAverage([
    ...localQuizScores,
    ...localFlashScores,
  ]);
  const hasQuizData = Number(summary?.quizAttemptsCount || 0) > 0 || localQuizScores.length > 0;
  const hasFlashData = Number(summary?.flashcardReviewsCount || 0) > 0 || localFlashScores.length > 0;
  const hasPracticeData = hasQuizData || hasFlashData;
  const currentGrade = hasPracticeData ? getCurrentGradeFromScore(averagePracticeScore ?? averageQuizScore) : null;
  const streakDays = getStudyStreak(visibleStudySessions);
  const subjectMastery = getSubjectMastery(trackedNotes, quizHistory, flashHistory);
  const missingSignals = [
    totalMin === 0 ? 'No study time logged yet. Start timer or mark planner sessions done.' : null,
    !hasQuizData ? 'No quiz attempts yet.' : null,
    !hasFlashData ? 'No flashcard reviews yet.' : null,
  ].filter(Boolean);

  // Count-up values
  const studyH = Math.floor(totalMin / 60);
  const studyM = totalMin % 60;
  const quizScoreDisplay = hasQuizData && averageQuizScore != null ? `${averageQuizScore}%` : 'n.a.';
  const flashScoreDisplay = averageFlashcardScore != null ? `${averageFlashcardScore}%` : 'n.a.';
  const currentGradeDisplay = currentGrade != null ? currentGrade.toFixed(1) : 'n.a.';
  const kpiCards = [
    { label: 'Study time this week', displayValue: `${studyH}h ${studyM}m`, Icon: Clock, tint: 'var(--lavender)', col: 'var(--indigo)' },
    { label: 'Current streak', displayValue: `${streakDays} ${streakDays === 1 ? 'day' : 'days'}`, Icon: Flame, tint: '#FFF7ED', col: '#F97316' },
    { label: 'Avg. quiz score', displayValue: quizScoreDisplay, Icon: Trend, tint: '#ECFDF5', col: '#10B981' },
    { label: 'Flash mastery', displayValue: flashScoreDisplay, Icon: Trophy, tint: '#FEF9C3', col: '#CA8A04' },
    { label: 'Voto medio attuale', displayValue: currentGradeDisplay, Icon: Trophy, tint: '#EEF2FF', col: 'var(--indigo)' },
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
      {!analyticsLoading && !analyticsError && (
        <div style={{ ...analS.statsGrid, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          {kpiCards.map(s => <KpiStat key={s.label} {...s} />)}
        </div>
      )}
      {!analyticsLoading && !analyticsError && missingSignals.length > 0 && (
        <div style={{ ...analS.noticeCard, marginBottom:22, background:'#F8FAFC' }}>
          <b style={{ color:'var(--ink)' }}>Analytics need more data</b>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:10 }}>
            {missingSignals.map((signal) => <span key={signal} style={analS.dataPill}>{signal}</span>)}
          </div>
        </div>
      )}

      {!analyticsLoading && !analyticsError && (
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
            {visibleWeekData.map((d, i) => (
              <AnimatedBar key={d.day} mins={d.mins} maxMin={maxMin} day={d.day} animate={chartInView} />
            ))}
          </div>
        </div>

        <div style={analS.subjectCard}>
          <h3 style={{ ...analS.cardTitle, marginBottom: 4 }}>Subject mastery</h3>
          <p style={{ ...analS.cardSub, marginBottom: 24 }}>Your progress per subject</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {subjectMastery.length === 0 ? (
              <p style={{ margin:0, color:'var(--gray)', fontSize:13 }}>No subject data yet.</p>
            ) : subjectMastery.map(subject => (
              <div key={subject.name}>
                <div style={analS.subjRow}>
                  <span style={analS.subjName}>{subject.name}</span>
                  <span style={analS.subjPct}>{subject.progress}%</span>
                </div>
                <AnimatedProgress progress={subject.progress} color={subject.color} />
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {!analyticsLoading && !analyticsError && (
      <section style={analS.gradeSection}>
        <div style={analS.gradeHead}>
          <div style={analS.gradeTitleBlock}>
            <h3 style={analS.gradeTitle}>Grade Predictor</h3>
            <p style={analS.gradeSub}>Prediction based on quiz, flashcards, and target grade</p>
          </div>
          <div style={analS.gradeLegend}>
            {GRADE_STATUS_LEGEND.map((item) => {
              const style = getGradeStatusStyle(item.key);
              return <span key={item.key} style={{ ...analS.statusPill, background: style.bg, color: style.color }}>{item.label}</span>;
            })}
          </div>
        </div>
        <div style={analS.gradeList}>
          {trackedNotes.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--gray)', fontWeight: 700 }}>Nessun esame ancora.</div>
          ) : trackedNotes.map(note => (
            <GradePredictorCard
              key={note.id}
              note={note}
              quizHistory={quizHistory || {}}
              flashHistory={flashHistory || {}}
              setTab={setTab}
              openQuizForExam={openQuizForExam}
              isMobile={isMobile}
            />
          ))}
        </div>
      </section>
      )}
    </div>
  );
}

function GradePredictorCard({ note, quizHistory, flashHistory, setTab, openQuizForExam, isMobile = false }) {
  const palette = getSubjectPalette(note.subject, note, false);
  const targetGrade = note.targetGrade || 27;
  const prediction = estimateGradePrediction(note, quizHistory, flashHistory);
  const targetPct = Math.max(0, Math.min(100, ((targetGrade - 18) / 12) * 100));
  const predictionPct = prediction.prediction == null ? null : Math.max(0, Math.min(100, ((prediction.prediction - 18) / 12) * 100));
  const statusStyle = getGradeStatusStyle(prediction.status);
  const examDate = formatExamDate(note.date || note.examDate);
  const subtitle = `${examDate || 'No date'} · ${prediction.prediction == null ? 'No data' : prediction.confidenceLabel}`;
  const hasProgress = predictionPct != null;
  const progressPct = hasProgress ? predictionPct : targetPct;
  const deltaDisplay = prediction.delta == null ? '—' : prediction.delta > 0 ? `+${prediction.delta}` : String(prediction.delta);
  const practiceLabel = prediction.status === 'on-track' ? 'Keep going' : 'Start practice';
  const openPractice = () => {
    if (openQuizForExam && note.id) {
      openQuizForExam(note.id);
      return;
    }
    setTab && setTab('quiz');
  };

  return (
    <div style={{ ...analS.gradeRow, ...(isMobile ? analS.gradeRowMobile : null) }}>
      <div style={analS.gradeCourse}>
        <span style={{ ...analS.courseDot, background: palette.dot }} />
        <div>
          <div style={analS.courseName}>{note.name || note.title}</div>
          <div style={analS.courseMeta}>{subtitle}</div>
        </div>
      </div>
      <div style={analS.gradeNumberBox}>
        <div style={analS.gradeNumber}>{targetGrade}</div>
        <div style={analS.gradeLabel}>TARGET</div>
      </div>
      <div style={analS.gradeNumberBox}>
        <div style={{ ...analS.gradeNumber, color: prediction.prediction == null ? 'var(--gray-2)' : 'var(--ink)' }}>{prediction.prediction ?? '—'}</div>
        <div style={analS.gradeLabel}>PREDICTION</div>
      </div>
      <div style={analS.gradeTrackBlock}>
        <div style={{ ...analS.statusPill, background: statusStyle.bg, color: statusStyle.color, alignSelf: 'flex-start' }}>{prediction.statusLabel}</div>
        <div style={analS.gradeTrack}>
          <span style={{ ...analS.gradeTrackFill, width: `${progressPct}%`, background: hasProgress ? statusStyle.color : 'transparent' }} />
          <span style={{ ...analS.targetMarker, left: `${targetPct}%`, background: hasProgress ? 'var(--gray)' : '#F97316' }} />
          {hasProgress && <span style={{ ...analS.predictionMarker, left: `${predictionPct}%`, background: statusStyle.color }} />}
        </div>
        <div style={analS.gradeHelper}>{prediction.helper}</div>
      </div>
      <div style={{ ...analS.gradeDelta, color: prediction.delta == null ? '#F97316' : statusStyle.color }}>{deltaDisplay}</div>
      <button style={{ ...analS.practiceBtn, ...(isMobile ? { justifySelf: 'stretch' } : null) }} onClick={openPractice}>{practiceLabel}</button>
    </div>
  );
}

const analS = {
  noticeCard: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:16, color:'var(--gray)', fontSize:14 },
  dataPill: { display:'inline-flex', alignItems:'center', border:'1px solid var(--border)', background:'#fff', color:'var(--gray)', borderRadius:999, padding:'8px 11px', fontSize:12, fontWeight:800 },
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
  gradeSection: { marginTop: 32 },
  gradeHead: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'end', columnGap: 32, rowGap: 10, marginBottom: 18 },
  gradeTitleBlock: { minWidth: 0 },
  gradeTitle: { margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.04em' },
  gradeSub: { margin: '12px 0 0', color: 'var(--gray)', fontSize: 16, fontWeight: 600 },
  gradeLegend: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', paddingBottom: 4 },
  statusPill: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, padding: '9px 15px', fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap' },
  gradeList: { border: '1px solid var(--border)', borderRadius: 22, background: 'var(--surface)', overflow: 'hidden', marginRight: 14 },
  gradeRow: { display: 'grid', gridTemplateColumns: 'minmax(250px, 1.25fr) 86px 110px minmax(300px, 1fr) 44px minmax(128px, auto)', alignItems: 'center', gap: 14, padding: '24px 22px', borderBottom: '1px solid var(--border)' },
  gradeRowMobile: { gridTemplateColumns: '1fr', alignItems: 'stretch', padding: 18 },
  gradeCourse: { display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 },
  courseDot: { width: 10, height: 10, borderRadius: 999, flexShrink: 0 },
  courseName: { fontSize: 17, fontWeight: 900, color: 'var(--ink)', lineHeight: 1.2 },
  courseMeta: { marginTop: 8, fontSize: 13, color: 'var(--gray)', fontWeight: 800 },
  gradeNumberBox: { minWidth: 0 },
  gradeNumber: { fontSize: 29, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.04em', lineHeight: 1 },
  gradeLabel: { marginTop: 6, color: 'var(--gray)', fontSize: 10, fontWeight: 900, letterSpacing: '.03em' },
  gradeTrackBlock: { display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0 },
  gradeTrack: { position: 'relative', height: 9, borderRadius: 999, background: 'var(--chart-track)', overflow: 'visible' },
  gradeTrackFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999, transition: 'width .35s ease' },
  targetMarker: { position: 'absolute', top: -4, width: 3, height: 16, borderRadius: 999, background: 'var(--gray)', transform: 'translateX(-50%)' },
  predictionMarker: { position: 'absolute', top: -4, width: 3, height: 16, borderRadius: 999, transform: 'translateX(-50%)' },
  gradeHelper: { color: 'var(--gray)', fontSize: 13, fontWeight: 900, lineHeight: 1.35 },
  gradeDelta: { justifySelf: 'center', fontSize: 18, fontWeight: 900, lineHeight: 1 },
  practiceBtn: { justifySelf: 'end', width: 128, maxWidth: '100%', padding: '11px 12px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap' },
};

export { AnalyticsView, GradePredictorCard };
