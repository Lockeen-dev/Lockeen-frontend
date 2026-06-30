import React, { useState, useEffect, useRef } from 'react';

import { BookOpen, Clock, Flame, Trend, Trophy } from '../lib/icons';
import { formatExamDate, getSubjectPalette } from '../data/mockData';
import { getExamPalette } from '../lib/examUi';
import useIsMobile from '../lib/useIsMobile';
import { homeS } from '../styles/dashboardStyles';
import { getStudyStreak, getStudySummary, listStudySessions, sessionsToWeekData } from '../services/analytics';
import { durToMins } from './calendarData';
import { tt } from '../lib/i18n';

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

function getLocalQuizScores(quizHistory = {}) {
  return Object.values(quizHistory).flat().filter((score) => Number.isFinite(Number(score))).map(Number);
}

function getAverage(values = []) {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getRecentWeightedAverage(values = []) {
  const nums = values.filter((value) => Number.isFinite(Number(value))).map(Number);
  if (!nums.length) return null;
  const weighted = nums.reduce((acc, value, index) => {
    const weight = index + 1;
    return {
      score: acc.score + (value * weight),
      weight: acc.weight + weight,
    };
  }, { score: 0, weight: 0 });
  return Math.round(weighted.score / weighted.weight);
}

function getAverageDecimal(values = [], digits = 1) {
  const nums = values.filter((value) => Number.isFinite(Number(value))).map(Number);
  if (!nums.length) return null;
  const factor = 10 ** digits;
  return Math.round((nums.reduce((sum, value) => sum + value, 0) / nums.length) * factor) / factor;
}

function getPerformanceScore(quizAvg, flashAvg) {
  if (quizAvg != null && flashAvg != null) return (quizAvg * 0.7) + (flashAvg * 0.3);
  return quizAvg ?? flashAvg ?? null;
}

function estimateCoverage(exam = {}, quizScores = [], flashScores = []) {
  const chapters = exam.chapters || [];
  if (!chapters.length) return quizScores.length || flashScores.length ? 0.5 : 0;
  const signalCount = quizScores.length + flashScores.length;
  return clamp(signalCount / Math.max(1, chapters.length * 2), 0, 1);
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

function getExamMastery(notes = [], quizHistory = {}, flashHistory = {}) {
  return (notes || [])
    .filter((exam) => !exam.status || exam.status === 'active')
    .map((exam) => {
      const name = String(exam.name || exam.subject || '').trim();
      if (!name) return null;
      const ids = [exam.id, ...(exam.chapters || []).map((chapter) => chapter.id)];
      const scores = ids.flatMap((id) => [
        ...((quizHistory || {})[id] || []),
        ...((flashHistory || {})[id] || []),
      ]).filter((score) => Number.isFinite(Number(score))).map(Number);
      const quizScores = ids.flatMap((id) => (quizHistory || {})[id] || [])
        .filter((score) => Number.isFinite(Number(score))).map(Number);
      const flashScores = ids.flatMap((id) => (flashHistory || {})[id] || [])
        .filter((score) => Number.isFinite(Number(score))).map(Number);
      const performanceScore = getPerformanceScore(getRecentWeightedAverage(quizScores), getRecentWeightedAverage(flashScores));
      const mastery = (exam.chapters || [])
        .map((chapter) => Number(chapter.mastery ?? chapter.progress))
        .filter((value) => Number.isFinite(value));
      const progress = performanceScore != null ? Math.round(performanceScore) : getAverage(scores) ?? getAverage(mastery);
      if (progress == null) return null;
      return { name, progress, color: getExamPalette(exam).dot };
    })
    .filter(Boolean);
}

function estimateGradePrediction(exam, quizHistory = {}, flashHistory = {}, lang = 'en') {
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
      confidenceLabel: tt(lang, 'noData'),
      delta: null,
      status: 'needs-practice',
      statusLabel: tt(lang, 'needsPractice'),
      helper: tt(lang, 'needsPractice'),
    };
  }

  const quizAvg = getRecentWeightedAverage(quizScores);
  const flashAvg = getRecentWeightedAverage(flashScores);
  const performanceScore = getPerformanceScore(quizAvg, flashAvg) ?? getAverage(scores);
  const rawGrade = 18 + ((performanceScore || 0) / 100) * 12;
  const attemptCount = scores.length;
  const daysUntilExam = getDaysUntilExam(exam);
  const coverageRatio = estimateCoverage(exam, quizScores, flashScores);
  const prediction = Number.isFinite(Number(backendPrediction))
    ? Math.round(Number(backendPrediction))
    : clamp(Math.round(rawGrade * 10) / 10, 18, 30);
  const target = exam.targetGrade || 27;
  const delta = Math.round((prediction - target) * 10) / 10;
  const attemptsConfidence = clamp(attemptCount * 9, 0, 55);
  const sourceConfidence = quizScores.length && flashScores.length ? 15 : 6;
  const coverageConfidence = Math.round(coverageRatio * 20);
  const confidence = Number.isFinite(Number(backendConfidence))
    ? Math.round(Number(backendConfidence))
    : clamp(15 + attemptsConfidence + sourceConfidence + coverageConfidence, 0, 100);
  const confidenceLabel = confidence >= 70 ? (lang === 'it' ? 'Alta confidenza' : 'High confidence') : confidence >= 40 ? (lang === 'it' ? 'Media confidenza' : 'Medium confidence') : confidence > 0 ? (lang === 'it' ? 'Bassa confidenza' : 'Low confidence') : tt(lang, 'noData');
  const cramRisk = daysUntilExam != null && daysUntilExam <= 7 && coverageRatio < 0.5;
  const lowCoverage = coverageRatio > 0 && coverageRatio < 0.35;
  let status = backendStatus || (
    delta >= 0 && confidence >= 40 ? 'on-track' :
    delta >= -2 ? 'close' :
    delta >= -5 ? 'at-risk' :
    'needs-practice'
  );
  if (!backendStatus && status === 'on-track' && (cramRisk || lowCoverage)) status = 'close';
  if (!backendStatus && status === 'close' && cramRisk) status = 'at-risk';
  const labels = {
    'on-track': tt(lang, 'onTrack'),
    close: lang === 'it' ? 'Vicino' : 'Close',
    'at-risk': tt(lang, 'atRisk'),
    'needs-practice': tt(lang, 'needsPractice'),
  };
  const helpers = {
    'on-track': 'On track: maintain practice',
    close: lowCoverage ? 'Close: improve coverage' : quizScores.length ? 'Close: one focused quiz can lift it' : 'Close: add quiz attempts',
    'at-risk': cramRisk ? 'Cram risk: low coverage near exam' : lowCoverage ? 'At risk: low coverage' : 'At risk: practice weak quiz topics',
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

function AnalyticsEmptyState({ lang, setTab }) {
  const isIt = lang === 'it';
  return (
    <div style={analS.emptyState}>
      <div style={analS.emptyIcon}><BookOpen size={22} /></div>
      <div>
        <h4 style={analS.emptyTitle}>{tt(lang, 'noExamsYet')}</h4>
        <p style={analS.emptyText}>
          {isIt
            ? 'Crea il primo esame e completa qualche quiz o flashcard: le analytics inizieranno a riempirsi automaticamente.'
            : 'Create your first exam and complete a quiz or flashcard session: analytics will start filling in automatically.'}
        </p>
      </div>
      <button type="button" style={analS.emptyButton} onClick={() => setTab('notes')}>
        {tt(lang, 'goToMyExams')}
      </button>
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

function AnalyticsView({ weekData, studySessions = [], calEvents = {}, notes, quizHistory, flashHistory, setTab, openQuizForExam, lang = 'en' }) {
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
  const hasQuizData = Number(summary?.quizAttemptsCount || 0) > 0 || localQuizScores.length > 0;
  const hasFlashData = Number(summary?.flashcardReviewsCount || 0) > 0 || localFlashScores.length > 0;
  const gradePredictions = trackedNotes
    .map((note) => estimateGradePrediction(note, quizHistory || {}, flashHistory || {}, lang).prediction)
    .filter((prediction) => typeof prediction === 'number' && Number.isFinite(prediction));
  const averagePredictedGrade = getAverageDecimal(gradePredictions);
  const streakDays = getStudyStreak(visibleStudySessions);
  const examMastery = getExamMastery(trackedNotes, quizHistory, flashHistory);
  const missingSignals = [
    totalMin === 0 ? (lang === 'it' ? 'Nessun tempo di studio registrato.' : 'No study time logged yet.') : null,
    !hasQuizData ? (lang === 'it' ? 'Nessun tentativo quiz ancora.' : 'No quiz attempts yet.') : null,
    !hasFlashData ? (lang === 'it' ? 'Nessuna review flashcard ancora.' : 'No flashcard reviews yet.') : null,
  ].filter(Boolean);

  // Count-up values
  const studyH = Math.floor(totalMin / 60);
  const studyM = totalMin % 60;
  const quizScoreDisplay = hasQuizData && averageQuizScore != null ? `${averageQuizScore}%` : 'n.a.';
  const flashScoreDisplay = averageFlashcardScore != null ? `${averageFlashcardScore}%` : 'n.a.';
  const averagePredictedGradeDisplay = averagePredictedGrade != null ? averagePredictedGrade.toFixed(1) : 'n.a.';
  const kpiCards = [
    { label: tt(lang, 'studyTimeWeek'), displayValue: `${studyH}h ${studyM}m`, Icon: Clock, tint: 'var(--lavender)', col: 'var(--indigo)' },
    { label: tt(lang, 'currentStreak'), displayValue: `${streakDays} ${streakDays === 1 ? tt(lang, 'day') : tt(lang, 'days')}`, Icon: Flame, tint: '#FFF7ED', col: '#F97316' },
    { label: tt(lang, 'avgQuizScore'), displayValue: quizScoreDisplay, Icon: Trend, tint: '#ECFDF5', col: '#10B981' },
    { label: tt(lang, 'flashMastery'), displayValue: flashScoreDisplay, Icon: Trophy, tint: '#FEF9C3', col: '#CA8A04' },
    { label: tt(lang, 'averagePredictionGrade'), displayValue: averagePredictedGradeDisplay, Icon: Trophy, tint: '#EEF2FF', col: 'var(--indigo)' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={homeS.h1}>{tt(lang, 'analytics')}</h2>
        <p style={homeS.sub}>{tt(lang, 'analyticsSub')}</p>
      </div>

      {analyticsLoading && (
        <div style={{ ...analS.noticeCard, marginBottom:22 }}>{tt(lang, 'loadingAnalytics')}</div>
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
          <b style={{ color:'var(--ink)' }}>{tt(lang, 'analyticsNeedMoreData')}</b>
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
              <h3 style={analS.cardTitle}>{tt(lang, 'weeklyStudyTime')}</h3>
              <p style={analS.cardSub}>{tt(lang, 'minutesPerDay')}</p>
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
          <h3 style={{ ...analS.cardTitle, marginBottom: 4 }}>{tt(lang, 'examMastery')}</h3>
          <p style={{ ...analS.cardSub, marginBottom: 24 }}>{tt(lang, 'progressByExam')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {examMastery.length === 0 ? (
              <p style={{ margin:0, color:'var(--gray)', fontSize:13 }}>{tt(lang, 'noExamMastery')}</p>
            ) : examMastery.map(exam => (
              <div key={exam.name}>
                <div style={analS.subjRow}>
                  <span style={analS.subjName}>{exam.name}</span>
                  <span style={analS.subjPct}>{exam.progress}%</span>
                </div>
                <AnimatedProgress progress={exam.progress} color={exam.color} />
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {!analyticsLoading && !analyticsError && (
      <section style={analS.gradeSection}>
        <div style={{ ...analS.gradeHead, ...(isMobile ? analS.gradeHeadMobile : null) }}>
          <div style={analS.gradeTitleBlock}>
            <h3 style={analS.gradeTitle}>{tt(lang, 'gradePredictor')}</h3>
            <p style={{ ...analS.gradeSub, ...(isMobile ? analS.gradeSubMobile : null) }}>{tt(lang, 'predictionBased')}</p>
          </div>
          <div style={{ ...analS.gradeLegend, ...(isMobile ? analS.gradeLegendMobile : null) }}>
            {GRADE_STATUS_LEGEND.map((item) => {
              const style = getGradeStatusStyle(item.key);
              return <span key={item.key} style={{ ...analS.statusPill, background: style.bg, color: style.color }}>{tt(lang, item.key === 'on-track' ? 'onTrack' : item.key === 'at-risk' ? 'atRisk' : item.key === 'needs-practice' ? 'needsPractice' : 'closeStatus')}</span>;
            })}
          </div>
        </div>
        <div style={analS.gradeList}>
          {trackedNotes.length === 0 ? (
            <AnalyticsEmptyState lang={lang} setTab={setTab} />
          ) : trackedNotes.map(note => (
            <GradePredictorCard
              key={note.id}
              note={note}
              quizHistory={quizHistory || {}}
              flashHistory={flashHistory || {}}
              setTab={setTab}
              openQuizForExam={openQuizForExam}
              isMobile={isMobile}
              lang={lang}
            />
          ))}
        </div>
      </section>
      )}
    </div>
  );
}

function GradePredictorCard({ note, quizHistory, flashHistory, setTab, openQuizForExam, isMobile = false, lang = 'en' }) {
  const palette = getSubjectPalette(note.subject, note, false);
  const targetGrade = note.targetGrade || 27;
  const prediction = estimateGradePrediction(note, quizHistory, flashHistory, lang);
  const targetPct = Math.max(0, Math.min(100, ((targetGrade - 18) / 12) * 100));
  const predictionPct = prediction.prediction == null ? null : Math.max(0, Math.min(100, ((prediction.prediction - 18) / 12) * 100));
  const statusStyle = getGradeStatusStyle(prediction.status);
  const examDate = formatExamDate(note.date || note.examDate);
  const subtitle = `${examDate || (lang === 'it' ? 'Nessuna data' : 'No date')} · ${prediction.prediction == null ? tt(lang, 'noData') : prediction.confidenceLabel}`;
  const hasProgress = predictionPct != null;
  const progressPct = hasProgress ? predictionPct : targetPct;
  const deltaDisplay = prediction.delta == null ? '—' : prediction.delta > 0 ? `+${prediction.delta.toFixed(1)}` : prediction.delta.toFixed(1);
  const hasChapters = (note.chapters || []).length > 0;
  const practiceLabel = !hasChapters ? tt(lang, 'addMaterialShort') : prediction.status === 'on-track' ? tt(lang, 'keepGoing') : tt(lang, 'startPractice');
  const openPractice = () => {
    if (!hasChapters) return;
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
        <div style={analS.gradeLabel}>{tt(lang, 'target').toUpperCase()}</div>
      </div>
      <div style={analS.gradeNumberBox}>
        <div style={{ ...analS.gradeNumber, color: prediction.prediction == null ? 'var(--gray-2)' : 'var(--ink)' }}>{prediction.prediction ?? '—'}</div>
        <div style={analS.gradeLabel}>{tt(lang, 'prediction').toUpperCase()}</div>
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
      <button
        type="button"
        disabled={!hasChapters}
        title={hasChapters ? practiceLabel : tt(lang, 'addMaterialForQuickQuiz')}
        style={{ ...analS.practiceBtn, ...(!hasChapters ? analS.practiceBtnDisabled : null), ...(isMobile ? { justifySelf: 'stretch', width: '100%' } : null) }}
        onClick={openPractice}
      >
        {practiceLabel}
      </button>
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
  gradeHeadMobile: { gridTemplateColumns: '1fr', alignItems: 'start', rowGap: 14 },
  gradeTitleBlock: { minWidth: 0 },
  gradeTitle: { margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--ink)', letterSpacing: 0 },
  gradeSub: { margin: '12px 0 0', color: 'var(--gray)', fontSize: 16, fontWeight: 600 },
  gradeSubMobile: { maxWidth: 320, fontSize: 14, lineHeight: 1.35, marginTop: 8 },
  gradeLegend: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', paddingBottom: 4 },
  gradeLegendMobile: { justifyContent: 'flex-start', paddingBottom: 0 },
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
  practiceBtn: { justifySelf: 'end', minWidth: 128, maxWidth: '100%', padding: '11px 12px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer' },
  practiceBtnDisabled: { background: '#F1F5F9', borderColor: '#E2E8F0', color: '#94A3B8', cursor: 'not-allowed', boxShadow: 'none' },
  emptyState: { display:'grid', justifyItems:'center', gap:12, padding:'34px 20px', textAlign:'center', color:'var(--gray)' },
  emptyIcon: { width:54, height:54, borderRadius:18, display:'grid', placeItems:'center', background:'var(--lavender)', color:'var(--indigo)' },
  emptyTitle: { margin:0, fontSize:18, fontWeight:900, color:'var(--ink)', letterSpacing:0 },
  emptyText: { margin:0, maxWidth:430, fontSize:14, lineHeight:1.45, fontWeight:650 },
  emptyButton: { marginTop:2, border:'none', borderRadius:14, background:'var(--indigo)', color:'#fff', padding:'12px 16px', fontWeight:900, cursor:'pointer' },
};

export { AnalyticsView, GradePredictorCard };
