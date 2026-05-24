import React, { useState, useEffect, useRef } from 'react';

import { Clock, Flame, Layers, Sparkles, Trend, Trophy } from '../lib/icons';
import { formatExamDate, getSubjectPalette, seedExams } from '../data/mockData';
import useIsMobile from '../lib/useIsMobile';
import { homeS } from '../styles/dashboardStyles';
import { tt } from '../lib/i18n';

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

function KpiStat({ label, rawValue, displayValue, Icon, tint, col, delay = 0 }) {
  const I = Icon;
  const counted = typeof rawValue === 'number' ? useCountUp(rawValue, 900, delay) : '';
  const value = displayValue || counted;
  return (
    <div style={{ ...analS.kpiCard, background: tint }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
        <div style={{ ...analS.statIcon, background: 'rgba(255,255,255,.6)', color: col }}><I size={18} /></div>
      </div>
      <div style={analS.kpiValue(col)}>{value}</div>
      <div style={analS.kpiLabel(col)}>{label}</div>
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

function AnalyticsView({ weekData, notes, quizHistory, flashHistory, setTab, openQuiz, openFlashcards, lang = 'en' }) {
  const isMobile = useIsMobile();
  const maxMin = Math.max(...weekData.map(d => d.mins), 1);
  const totalMin = weekData.reduce((a, b) => a + b.mins, 0);
  const trackedNotes = notes && notes.length ? notes : seedExams;
  const avgTarget = trackedNotes.length
    ? (trackedNotes.reduce((sum, n) => sum + (n.targetGrade || 27), 0) / trackedNotes.length).toFixed(1)
    : '27.0';

  const [chartRef, chartInView] = useInView('-40px');
  // Count-up values
  const studyH = useCountUp(Math.floor(totalMin / 60), 900, 0);
  const studyM = useCountUp(totalMin % 60, 900, 0);
  const avgVal = useCountUp(Math.round(parseFloat(avgTarget) * 10), 900, 240);
  const streakVal = useCountUp(42, 900, 120);
  const quizScores = Object.values(quizHistory || {}).flat();
  const averageQuizScore = quizScores.length
    ? Math.round(quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length)
    : 88;
  const avgQuizVal = useCountUp(averageQuizScore, 900, 200);

  const kpiCards = [
    { label: tt(lang, 'studyTimeWeek'), displayValue: `${studyH}h ${studyM}m`, Icon: Clock, tint: 'var(--lavender)', col: 'var(--indigo)', delay: 0 },
    { label: tt(lang, 'currentStreak'), displayValue: `${streakVal} ${tt(lang, 'days')}`, Icon: Flame, tint: '#FFF7ED', col: '#F97316', delay: 120 },
    { label: tt(lang, 'avgQuizScore'), displayValue: `${avgQuizVal}%`, Icon: Trend, tint: '#ECFDF5', col: '#10B981', delay: 200 },
    { label: tt(lang, 'avgTargetGrade'), displayValue: `${(avgVal/10).toFixed(1)}`, Icon: Trophy, tint: '#FEF9C3', col: '#CA8A04', delay: 280 },
  ];

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={homeS.h1}>{tt(lang, 'analytics')}</h2>
        <p style={homeS.sub}>{tt(lang, 'analyticsSub')}</p>
      </div>

      <div style={{ ...analS.statsGrid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)' }}>
        {kpiCards.map(s => <KpiStat key={s.label} {...s} />)}
      </div>

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
            {weekData.map((d) => (
              <AnimatedBar key={d.day} mins={d.mins} maxMin={maxMin} day={d.day} animate={chartInView} />
            ))}
          </div>
        </div>

        <div style={analS.subjectCard}>
          <h3 style={{ ...analS.cardTitle, marginBottom: 4 }}>{tt(lang, 'subjectMastery')}</h3>
          <p style={{ ...analS.cardSub, marginBottom: 26 }}>{tt(lang, 'progressPerSubject')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {subjects.map(s => (
              <div key={s.name}>
                <div style={analS.subjRow}>
                  <span style={analS.subjName}>{s.name}</span>
                  <span style={analS.subjPct}>{s.progress}%</span>
                </div>
                <AnimatedProgress progress={s.progress} color={s.color} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={predictS.section}>
        <div style={predictS.head}>
          <div>
            <h3 style={predictS.title}>{tt(lang, 'gradePredictor')}</h3>
            <p style={predictS.sub}>{tt(lang, 'gradePredictorSub')}</p>
          </div>
          <div style={predictS.summaryPills}>
            <span style={predictS.pill('#ECFDF5', '#047857')}>{tt(lang, 'onTrack')}</span>
            <span style={predictS.pill('#EEF2FF', 'var(--indigo)')}>{tt(lang, 'closeStatus')}</span>
            <span style={predictS.pill('#FEF2F2', '#EF4444')}>{tt(lang, 'atRisk')}</span>
            <span style={predictS.pill('#FFF7ED', '#F97316')}>{tt(lang, 'needsPractice')}</span>
          </div>
        </div>
        <div style={predictS.panel}>
          {trackedNotes.map(note => (
            <GradePredictorRow
              key={note.id}
              note={note}
              quizHistory={quizHistory || {}}
              flashHistory={flashHistory || {}}
              setTab={setTab}
              openQuiz={openQuiz}
              openFlashcards={openFlashcards}
              lang={lang}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function GradePredictorRow({ note, quizHistory, flashHistory, setTab, openQuiz, openFlashcards, lang = 'en' }) {
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [practiceType, setPracticeType] = useState('quiz');
  const [scopeId, setScopeId] = useState('all');
  const [difficulty, setDifficulty] = useState('medium');
  const [quizCount, setQuizCount] = useState(10);
  const [flashCount, setFlashCount] = useState(20);
  const [timerOn, setTimerOn] = useState(true);
  const [timerSecs, setTimerSecs] = useState(30);
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
  const status = !hasScores
    ? { label: tt(lang, 'needsPractice'), bg: '#FFF7ED', color: '#F97316', text: tt(lang, 'needsPractice'), cta: tt(lang, 'startPractice') }
    : gap > 4
      ? { label: tt(lang, 'atRisk'), bg: '#FEF2F2', color: '#EF4444', text: `${gap} ${tt(lang, 'atRisk').toLowerCase()}.`, cta: tt(lang, 'practiceNow') }
      : gap > 0
        ? { label: tt(lang, 'closeStatus'), bg: '#EEF2FF', color: 'var(--indigo)', text: `${gap} ${tt(lang, 'target').toLowerCase()}.`, cta: tt(lang, 'reviewPractice') }
        : { label: tt(lang, 'onTrack'), bg: '#ECFDF5', color: '#047857', text: tt(lang, 'keepGoing'), cta: tt(lang, 'keepGoing') };
  const confidence = !hasScores ? tt(lang, 'noData') : allScores.length >= 3 ? tt(lang, 'reliable') : tt(lang, 'lowConfidence');
  const chapters = note.chapters || [];
  const selectedChapter = chapters.find(c => String(c.id) === String(scopeId));
  const allQuestions = chapters.flatMap(c => c.questions || []);
  const allCards = chapters.flatMap(c => c.cards || []);
  const scopedQuestions = scopeId === 'all'
    ? allQuestions
    : (selectedChapter?.questions || []);
  const scopedCards = scopeId === 'all'
    ? allCards
    : (selectedChapter?.cards || []);
  const quizLimit = Math.min(quizCount, scopedQuestions.length || quizCount);
  const flashLimit = Math.min(flashCount, scopedCards.length || flashCount);
  const scopeTitle = scopeId === 'all' ? 'Intero esame' : (selectedChapter?.title || 'Capitolo');
  const openTargetQuiz = () => {
    if (openQuiz) {
      openQuiz({
        noteId: note.id,
        subject: note.subject,
        title: `${note.name || note.title} · ${scopeTitle}`,
        questions: scopedQuestions.slice(0, quizLimit),
        _difficulty: difficulty,
        _timerOn: timerOn,
        _timerSecs: timerSecs,
        _meta: {
          source: 'gradePredictor',
          examId: note.id,
          examName: note.name || note.title,
          chapterId: scopeId,
          chapterName: scopeTitle,
          numQ: quizLimit,
          difficulty,
          timerOn,
          timerSecs,
        },
      });
    } else {
      setTab && setTab('quiz');
    }
  };
  const openTargetFlashcards = () => {
    if (openFlashcards) {
      openFlashcards({
        noteId: note.id,
        subject: note.subject,
        title: `${note.name || note.title} · ${scopeTitle}`,
        cards: scopedCards.slice(0, flashLimit),
        _meta: {
          source: 'gradePredictor',
          examId: note.id,
          examName: note.name || note.title,
          chapterId: scopeId,
          chapterName: scopeTitle,
          cardCount: flashLimit,
          difficulty,
        },
      });
    } else {
      setTab && setTab('flashcards');
    }
  };
  const startPractice = () => {
    setPracticeOpen(false);
    if (practiceType === 'quiz') openTargetQuiz();
    else openTargetFlashcards();
  };
  const practiceAvailable = practiceType === 'quiz' ? scopedQuestions.length : scopedCards.length;

  return (
    <React.Fragment>
      <div style={predictS.row}>
        <div style={predictS.identity}>
          <span style={{ ...predictS.dot, background: palette.dot }} />
          <div style={{ minWidth: 0 }}>
            <div style={predictS.examName}>{note.name || note.title}</div>
            <div style={predictS.meta}>{formatExamDate(note.date || note.examDate)} · {confidence}</div>
          </div>
        </div>
        <div style={predictS.metric}>
          <span style={predictS.metricValue}>{targetGrade}</span>
          <span style={predictS.metricLabel}>{tt(lang, 'target')}</span>
        </div>
        <div style={predictS.metric}>
          <span style={{ ...predictS.metricValue, color: hasScores ? 'var(--ink)' : 'var(--gray-2)' }}>{hasScores ? predictedGrade : '—'}</span>
          <span style={predictS.metricLabel}>{tt(lang, 'prediction')}</span>
        </div>
        <div style={predictS.progressCell}>
          <div style={predictS.statusLine}>
            <span style={predictS.badge(status.bg, status.color)}>{status.label}</span>
            <span style={{ color: status.color, fontWeight: 900 }}>{hasScores ? (gap > 0 ? `-${gap}` : `+${Math.abs(gap)}`) : '—'}</span>
          </div>
          <div style={predictS.track}>
            {hasScores && <div style={{ ...predictS.fill, width: `${predPct}%`, background: status.color }} />}
            <span style={{ ...predictS.targetMarker, left: `${targetPct}%` }} />
          </div>
          <div style={predictS.helpText}>{status.text}</div>
        </div>
        <button style={predictS.cta} onClick={() => setPracticeOpen(true)}>{status.cta}</button>
      </div>
      {practiceOpen && (
        <div style={predictS.modalOverlay} onClick={() => setPracticeOpen(false)}>
          <div style={predictS.modal} onClick={(e) => e.stopPropagation()}>
            <div style={predictS.modalKicker}>{tt(lang, 'configurePractice')}</div>
            <h4 style={predictS.modalTitle}>{note.name || note.title}</h4>
            <p style={predictS.modalText}>{tt(lang, 'gradePredictorSub')}</p>
            <div style={predictS.practiceGrid}>
              <button style={{ ...predictS.practiceCard, ...(practiceType === 'quiz' ? predictS.practiceCardActive('var(--indigo)', 'var(--lavender)') : null) }} onClick={() => setPracticeType('quiz')}>
                <span style={{ ...predictS.practiceIcon, color: 'var(--indigo)', background: 'var(--lavender)' }}><Sparkles size={20} /></span>
                <span style={predictS.practiceTitle}>Quiz</span>
                <span style={predictS.practiceSub}>{tt(lang, 'questionCount')} + {tt(lang, 'timer')}</span>
              </button>
              <button style={{ ...predictS.practiceCard, ...(practiceType === 'flashcards' ? predictS.practiceCardActive('#10B981', '#ECFDF5') : null) }} onClick={() => setPracticeType('flashcards')}>
                <span style={{ ...predictS.practiceIcon, color: '#10B981', background: '#ECFDF5' }}><Layers size={20} /></span>
                <span style={predictS.practiceTitle}>Flashcards</span>
                <span style={predictS.practiceSub}>{tt(lang, 'reviewPractice')}</span>
              </button>
            </div>
            <div style={predictS.modalSection}>
              <div style={predictS.modalLabel}>{tt(lang, 'scope')}</div>
              <div style={predictS.optionWrap}>
                {[{ id: 'all', title: tt(lang, 'wholeExam'), count: practiceType === 'quiz' ? allQuestions.length : allCards.length }, ...chapters.map(c => ({ id: c.id, title: c.title, count: practiceType === 'quiz' ? (c.questions || []).length : (c.cards || []).length }))].map(opt => {
                  const active = String(scopeId) === String(opt.id);
                  return (
                    <button key={opt.id} style={{ ...predictS.optionPill, ...(active ? predictS.optionPillActive : null) }} onClick={() => setScopeId(opt.id)}>
                      {opt.title}
                      <span style={predictS.countPill(active)}>{opt.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={predictS.modalSection}>
              <div style={predictS.modalLabel}>Difficulty</div>
              <div style={predictS.optionGrid}>
                {[
                  { id: 'easy', label: 'Easy', sub: 'Warm-up' },
                  { id: 'medium', label: 'Medium', sub: 'Balanced' },
                  { id: 'hard', label: 'Hard', sub: 'Exam mode' },
                ].map(opt => {
                  const active = difficulty === opt.id;
                  return (
                    <button key={opt.id} style={{ ...predictS.diffBtn, ...(active ? predictS.diffBtnActive : null) }} onClick={() => setDifficulty(opt.id)}>
                      <span>{opt.label}</span>
                      <small>{opt.sub}</small>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={predictS.modalSection}>
              <div style={predictS.modalLabel}>{practiceType === 'quiz' ? 'Questions' : 'Cards'}</div>
              <div style={predictS.optionGrid}>
                {(practiceType === 'quiz' ? [5, 10, 15, 20] : [10, 20, 30, 50]).map(n => {
                  const max = practiceType === 'quiz' ? scopedQuestions.length : scopedCards.length;
                  const disabled = max > 0 && n > max;
                  const active = (practiceType === 'quiz' ? quizCount : flashCount) === n && !disabled;
                  return (
                    <button key={n} disabled={disabled} style={{ ...predictS.amountBtn, ...(active ? predictS.amountBtnActive : null), ...(disabled ? predictS.disabledOption : null) }} onClick={() => practiceType === 'quiz' ? setQuizCount(n) : setFlashCount(n)}>
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
            {practiceType === 'quiz' && (
              <div style={predictS.modalSection}>
                <div style={predictS.timerRow}>
                  <div>
                    <div style={predictS.modalLabel}>Timer</div>
                    <div style={predictS.timerSub}>Seconds per question</div>
                  </div>
                  <button style={{ ...predictS.timerToggle, ...(timerOn ? predictS.timerToggleOn : null) }} onClick={() => setTimerOn(v => !v)}>
                    <span style={{ ...predictS.timerKnob, ...(timerOn ? predictS.timerKnobOn : null) }} />
                  </button>
                </div>
                {timerOn && (
                  <div style={predictS.optionGrid}>
                    {[15, 30, 60, 90].map(s => (
                      <button key={s} style={{ ...predictS.amountBtn, ...(timerSecs === s ? predictS.amountBtnActive : null) }} onClick={() => setTimerSecs(s)}>{s}s</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={predictS.modalActions}>
              <button style={predictS.modalCancel} onClick={() => setPracticeOpen(false)}>Cancel</button>
              <button disabled={practiceAvailable === 0} style={{ ...predictS.modalStart, ...(practiceAvailable === 0 ? predictS.modalStartDisabled : null) }} onClick={startPractice}>Start practice</button>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

const analS = {
  noticeCard: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:16, color:'var(--gray)', fontSize:14 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22, marginBottom: 32 },
  kpiCard: { borderRadius: 28, padding: '34px 40px 32px', minHeight: 198, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' },
  kpiValue: (color) => ({ fontSize: 42, fontWeight: 900, color, letterSpacing: '-0.04em', lineHeight: 1.05 }),
  kpiLabel: (color) => ({ fontSize: 17, color, opacity: 0.68, marginTop: 12, fontWeight: 800, lineHeight: 1.35 }),
  statCard: { display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 },
  statIcon: { width: 48, height: 48, borderRadius: 14, display: 'grid', placeItems: 'center', flexShrink: 0 },
  statValue: { fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' },
  statLabel: { fontSize: 12, color: 'var(--gray)', marginTop: 2 },
  row: { display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 },
  chartCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 28, padding: 28 },
  cardHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 },
  cardTitle: { margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.03em' },
  cardSub: { margin: '10px 0 0', fontSize: 19, color: 'var(--gray)', lineHeight: 1.35 },
  legend: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--gray)' },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  chart: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, alignItems: 'end', height: 240 },
  barCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  barLabel: { fontSize: 11, color: 'var(--gray)' },
  barTrack: { width: '100%', maxWidth: 40, height: 190, background: 'var(--chart-track)', borderRadius: 10, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', background: 'linear-gradient(180deg, var(--indigo), var(--purple))', borderRadius: 10, transition: 'height .4s ease' },
  dayLabel: { fontSize: 12, color: 'var(--gray)', fontWeight: 600 },
  subjectCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 28, padding: 34 },
  subjRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  subjName: { fontSize: 19, fontWeight: 900, color: 'var(--ink)' },
  subjPct: { fontSize: 19, color: 'var(--gray)', fontWeight: 900 },
  progTrack: { height: 10, background: 'var(--chart-track)', borderRadius: 999, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: 999, transition: 'width .4s ease' },
};

const predictS = {
  section: { marginTop: 32 },
  head: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.03em' },
  sub: { margin: '8px 0 0', fontSize: 16, color: 'var(--gray)' },
  summaryPills: { display: 'flex', gap: 8, alignItems: 'center' },
  pill: (bg, color) => ({ display: 'inline-flex', padding: '8px 12px', borderRadius: 999, background: bg, color, fontSize: 12, fontWeight: 900 }),
  panel: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 28, overflow: 'hidden', boxShadow: '0 16px 36px -30px rgba(15,16,53,.35)' },
  row: { display: 'grid', gridTemplateColumns: 'minmax(230px, 1.25fr) 90px 110px minmax(260px, 1.2fr) 130px', gap: 18, alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid var(--border)' },
  identity: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
  dot: { width: 10, height: 10, borderRadius: 999, flexShrink: 0 },
  examName: { fontSize: 16, fontWeight: 900, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  meta: { marginTop: 4, fontSize: 12, color: 'var(--gray)', fontWeight: 700 },
  metric: { display: 'flex', flexDirection: 'column', gap: 3 },
  metricValue: { fontSize: 26, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.04em', lineHeight: 1 },
  metricLabel: { fontSize: 11, fontWeight: 800, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '.04em' },
  progressCell: { minWidth: 0 },
  statusLine: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 9 },
  badge: (bg, color) => ({ display: 'inline-flex', padding: '5px 9px', borderRadius: 999, background: bg, color, fontSize: 11, fontWeight: 900, whiteSpace: 'nowrap' }),
  track: { position: 'relative', height: 9, borderRadius: 999, background: 'var(--chart-track)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  targetMarker: { position: 'absolute', top: 0, width: 3, height: '100%', borderRadius: 999, background: 'var(--ink)', opacity: .55 },
  helpText: { marginTop: 7, fontSize: 12, color: 'var(--gray)', fontWeight: 650, lineHeight: 1.35 },
  cta: { padding: '11px 14px', borderRadius: 13, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13, fontWeight: 900, cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, zIndex: 2500, background: 'rgba(15,16,53,.38)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', padding: 18 },
  modal: { width: 'min(620px, 100%)', maxHeight: 'calc(100vh - 36px)', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: 24, boxShadow: '0 28px 80px rgba(15,16,53,.28)' },
  modalKicker: { fontSize: 11, fontWeight: 900, color: 'var(--indigo)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 },
  modalTitle: { margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-.03em' },
  modalText: { margin: '8px 0 18px', fontSize: 14, color: 'var(--gray)', lineHeight: 1.5 },
  practiceGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  practiceCard: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 16, minHeight: 142, borderRadius: 18, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer', textAlign: 'left' },
  practiceCardActive: (color, bg) => ({ borderColor: color, background: bg, boxShadow: `0 16px 30px -24px ${color}` }),
  practiceIcon: { width: 42, height: 42, borderRadius: 14, display: 'grid', placeItems: 'center' },
  practiceTitle: { fontSize: 16, fontWeight: 900, color: 'var(--ink)' },
  practiceSub: { fontSize: 12, fontWeight: 700, color: 'var(--gray)', lineHeight: 1.35 },
  modalSection: { marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' },
  modalLabel: { fontSize: 11, fontWeight: 900, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 },
  optionWrap: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  optionPill: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--gray)', fontSize: 13, fontWeight: 900, cursor: 'pointer' },
  optionPillActive: { borderColor: 'var(--indigo)', background: 'var(--lavender)', color: 'var(--indigo)' },
  countPill: (active) => ({ minWidth: 20, height: 20, borderRadius: 999, display: 'inline-grid', placeItems: 'center', padding: '0 6px', background: active ? 'var(--indigo)' : 'var(--sidebar-bg)', color: active ? '#fff' : 'var(--gray)', fontSize: 10, fontWeight: 900 }),
  optionGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  diffBtn: { minHeight: 70, padding: '10px 8px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, cursor: 'pointer', fontWeight: 900 },
  diffBtnActive: { borderColor: 'var(--indigo)', background: 'var(--lavender)', color: 'var(--indigo)' },
  amountBtn: { minHeight: 46, borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 15, fontWeight: 900, cursor: 'pointer' },
  amountBtnActive: { borderColor: 'var(--indigo)', background: 'var(--lavender)', color: 'var(--indigo)' },
  disabledOption: { opacity: .35, cursor: 'not-allowed' },
  timerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  timerSub: { fontSize: 12, color: 'var(--gray)', fontWeight: 700 },
  timerToggle: { width: 50, height: 30, borderRadius: 999, border: '1px solid var(--border)', background: 'var(--sidebar-bg)', padding: 3, cursor: 'pointer' },
  timerToggleOn: { background: 'var(--indigo)', borderColor: 'var(--indigo)' },
  timerKnob: { display: 'block', width: 22, height: 22, borderRadius: 999, background: '#fff', transition: 'transform .18s ease' },
  timerKnobOn: { transform: 'translateX(20px)' },
  modalActions: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 },
  modalCancel: { padding: '12px 14px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--sidebar-bg)', color: 'var(--gray)', fontSize: 13, fontWeight: 900, cursor: 'pointer' },
  modalStart: { padding: '12px 14px', borderRadius: 14, border: 'none', background: 'var(--indigo)', color: '#fff', fontSize: 13, fontWeight: 900, cursor: 'pointer' },
  modalStartDisabled: { background: '#CBD5E1', cursor: 'not-allowed' },
};

export { AnalyticsView, GradePredictorRow };
