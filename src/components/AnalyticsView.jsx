import React from 'react';

import { Clock, Flame, Trend, Trophy } from '../lib/icons';
import { formatExamDate, getSubjectPalette, seedExams } from '../data/mockData';
import useIsMobile from '../lib/useIsMobile';
import { gradeS } from './common/ExamControls';
import { homeS } from '../styles/dashboardStyles';

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

function AnalyticsView({ weekData, notes, quizHistory, flashHistory, setTab, openQuiz }) {
  const isMobile = useIsMobile();
  const maxMin = Math.max(...weekData.map(d => d.mins), 1);
  const totalMin = weekData.reduce((a, b) => a + b.mins, 0);
  const trackedNotes = notes && notes.length ? notes : seedExams;
  const avgTarget = trackedNotes.length
    ? (trackedNotes.reduce((sum, n) => sum + (n.targetGrade || 27), 0) / trackedNotes.length).toFixed(1)
    : '27.0';
  const stats = [
    { label: 'Study time this week', value: `${Math.floor(totalMin/60)}h ${totalMin%60}m`, Icon: Clock,     tint: 'var(--lavender)', col: 'var(--indigo)' },
    { label: 'Current streak',       value: '42 days',                                    Icon: Flame,     tint: '#FFF7ED',         col: '#F97316' },
    { label: 'Avg. quiz score',      value: '88%',                                        Icon: Trend,     tint: '#ECFDF5',         col: '#10B981' },
    { label: 'Voto medio target',    value: avgTarget,                                    Icon: Trophy,    tint: '#FEF9C3',         col: '#CA8A04' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={homeS.h1}>Analytics</h2>
        <p style={homeS.sub}>Track your study habits and progress across subjects</p>
      </div>

      <div style={{ ...analS.statsGrid, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
        {stats.map(s => {
          const I = s.Icon;
          return (
            <div key={s.label} style={analS.statCard}>
              <div style={{ ...analS.statIcon, background: s.tint, color: s.col }}><I size={18} /></div>
              <div>
                <div style={analS.statValue}>{s.value}</div>
                <div style={analS.statLabel}>{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ ...analS.row, gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr' }}>
        <div style={analS.chartCard}>
          <div style={analS.cardHeader}>
            <div>
              <h3 style={analS.cardTitle}>Weekly study time</h3>
              <p style={analS.cardSub}>Minutes spent studying per day</p>
            </div>
            <span style={analS.legend}><span style={{ ...analS.legendDot, background: 'var(--indigo)' }} /> mins</span>
          </div>
          <div style={analS.chart}>
            {weekData.map(d => {
              const h = Math.round((d.mins / maxMin) * 180);
              return (
                <div key={d.day} style={analS.barCol}>
                  <div style={analS.barLabel}>{d.mins}m</div>
                  <div style={analS.barTrack}>
                    <div style={{ ...analS.bar, height: h }} />
                  </div>
                  <div style={analS.dayLabel}>{d.day}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={analS.subjectCard}>
          <h3 style={{ ...analS.cardTitle, marginBottom: 4 }}>Subject mastery</h3>
          <p style={{ ...analS.cardSub, marginBottom: 18 }}>Your progress per subject</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {subjects.map(s => (
              <div key={s.name}>
                <div style={analS.subjRow}>
                  <span style={analS.subjName}>{s.name}</span>
                  <span style={analS.subjPct}>{s.progress}%</span>
                </div>
                <div style={analS.progTrack}>
                  <div style={{ ...analS.progFill, width: `${s.progress}%`, background: s.color }} />
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
  const avgScore = allScores.length > 0
    ? allScores.reduce((a,b)=>a+b,0) / allScores.length
    : 50;
  const predictedGrade = Math.round(18 + (avgScore / 100) * 12);
  const gap = targetGrade - predictedGrade;
  const predPct = Math.max(0, Math.min(100, ((predictedGrade - 18) / 12) * 100));
  const targetPct = Math.max(0, Math.min(100, ((targetGrade - 18) / 12) * 100));
  const onTarget = predictedGrade === targetGrade;
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
        {onTarget ? (
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
          <div style={{ ...gradeS.num, ...gradeS.numPred }}>{gradeText(predictedGrade)}</div>
          <div style={gradeS.numLabel}>Previsione attuale</div>
        </div>
        <div>
          <div style={{ ...gradeS.num, ...gradeS.numTarget }}>{gradeText(targetGrade)}</div>
          <div style={gradeS.numLabel}>Il tuo obiettivo</div>
        </div>
        <div>
          <div style={{ ...gradeS.num, color: gap > 0 ? '#B91C1C' : '#047857' }}>{gap > 0 ? `-${gap}` : `+${Math.abs(gap)}`}</div>
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
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 },
  statCard: { display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 },
  statIcon: { width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center' },
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
