import React, { useEffect, useRef, useState } from 'react';
import { Check, Clock, XMark } from '../lib/icons';
import { getExamEmoji } from '../lib/examUi';
import { getSubjectPalette } from '../data/mockData';
import { getQuiz, listQuizzes, submitQuizAttempt } from '../services/quiz';

function QuizStyles() {
  return (
    <style>{`
      @keyframes qSlideIn { from { opacity:0; transform:translateX(22px); } to { opacity:1; transform:translateX(0); } }
      @keyframes qShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(7px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(3px)} }
      @keyframes qFadeUp { from { opacity:0; transform:translateY(18px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
    `}</style>
  );
}

function normalizeQuestion(question) {
  return {
    ...question,
    q: question.q ?? question.prompt ?? '',
    options: question.options || [],
    correct: Number(question.correct ?? question.correctAnswer ?? 0),
    explanation: question.explanation || '',
  };
}

function normalizeQuiz(quiz) {
  return {
    ...quiz,
    questions: (quiz.questions || []).map(normalizeQuestion),
  };
}

function QuizResultScreen({ percent, correct, total, palette, resultTitle, subject, subjectStyle, attemptError, attemptSaved, onRestart, onBack }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf;
    const s = performance.now();
    const tick = (now) => {
      const prog = Math.min((now - s) / 1000, 1);
      setP(Math.round((1 - Math.pow(1 - prog, 3)) * percent));
      if (prog < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [percent]);
  const r = 44, circ = 2 * Math.PI * r;
  const offset = circ * (1 - p / 100);
  const emoji = percent >= 80 ? '🎉' : percent >= 60 ? '👍' : '💪';
  return (
    <>
      <QuizStyles />
      <div style={{ ...quizS.resultWrap, animation: 'qFadeUp .45s cubic-bezier(.22,1,.36,1)' }}>
        <span style={subjectStyle}>{subject}</span>
        <div style={{ position: 'relative', width: 120, height: 120, margin: '4px 0' }}>
          <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
            <circle cx="60" cy="60" r={r} fill="none" stroke={palette.dot} strokeWidth="8"
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: palette.dot, lineHeight: 1 }}>{p}%</span>
            <span style={{ fontSize: 12, color: palette.text, fontWeight: 700 }}>{correct}/{total}</span>
          </div>
        </div>
        <div style={{ fontSize: 32 }}>{emoji}</div>
        <h2 style={quizS.resultTitle}>{resultTitle}</h2>
        {attemptSaved && <p style={{ ...quizS.resultSub, color:'#10B981' }}>Score saved</p>}
        {attemptError && <p style={{ ...quizS.resultSub, color:'#DC2626' }}>{attemptError}</p>}
        <div style={quizS.resultActions}>
          <button onClick={onRestart} style={{ ...quizS.tryAgainBtn, background: palette.dot }}>Try again</button>
          <button onClick={onBack} style={quizS.backBtn}>Back to Study</button>
        </div>
      </div>
    </>
  );
}

export function QuizView({ noteId, quizId, subject, title, questions, setTab, darkMode, onQuizComplete, backTo = 'notes', autoStart = true, initialDifficulty = 'medium', timerOn: initialTimerOn = false, timerSecs: initialTimerSecs = 30 }) {
  const palette = getSubjectPalette(subject, {}, darkMode);
  const normalizedQuestions = (questions || []).map(normalizeQuestion);
  const total = normalizedQuestions.length;
  const [started, setStarted] = useState(true);
  const autoStartHandled = useRef(false);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState(null);
  const [pendingIdx, setPendingIdx] = useState(null);
  const DIFF_OPTIONS = [{id:'easy',label:'Easy',color:'#10B981',secs:60},{id:'medium',label:'Medium',color:'#F59E0B',secs:30},{id:'hard',label:'Hard',color:'#EF4444',secs:20},{id:'extreme',label:'Extreme',color:'#64748B',secs:10}];
  const initDiff = DIFF_OPTIONS.find(d => d.id === initialDifficulty) ? initialDifficulty : 'medium';
  const initSecs = Math.max(5, Math.min(300, Number(initialTimerSecs) || (DIFF_OPTIONS.find(d => d.id === initDiff)?.secs || 30)));
  const [difficulty, setDifficulty] = useState(initDiff);
  const [timerOn, setTimerOn] = useState(!!initialTimerOn);
  const [timerSecs, setTimerSecs] = useState(initSecs);
  const [timerVal, setTimerVal] = useState(initSecs);
  const timerID = useRef(null);
  const [done, setDone] = useState(false);
  const [attemptError, setAttemptError] = useState('');
  const [attemptSaved, setAttemptSaved] = useState(false);
  const resultSavedRef = useRef(false);
  const userAnswers = useRef([]);
  const [qKey, setQKey] = useState(0);
  const [shake, setShake] = useState(false);

  const stopTimer = () => {
    if (timerID.current) {
      clearInterval(timerID.current);
      timerID.current = null;
    }
  };

  const resetAll = () => {
    stopTimer();
    setStarted(true);
    setIdx(0);
    setCorrect(0);
    setSelected(null);
    setPendingIdx(null);
    setTimerOn(!!initialTimerOn);
    setTimerSecs(initSecs);
    setTimerVal(initSecs);
    setDifficulty(initDiff);
    setDone(false);
    setAttemptError('');
    setAttemptSaved(false);
    resultSavedRef.current = false;
    userAnswers.current = [];
  };

  const restartQuiz = () => {
    stopTimer();
    setIdx(0);
    setCorrect(0);
    setSelected(null);
    setPendingIdx(null);
    setDone(false);
    setAttemptError('');
    setAttemptSaved(false);
    resultSavedRef.current = false;
    userAnswers.current = [];
    setStarted(true);
    setTimeout(startTimer, 0);
  };

  useEffect(() => () => stopTimer(), []);
  useEffect(() => {
    setDifficulty(initDiff);
    setTimerOn(!!initialTimerOn);
    setTimerSecs(initSecs);
    setTimerVal(initSecs);
  }, [initDiff, initialTimerOn, initSecs]);
  useEffect(() => {
    if (autoStart && !autoStartHandled.current) {
      autoStartHandled.current = true;
      setStarted(true);
      setIdx(0); setCorrect(0); setSelected(null); setPendingIdx(null); setDone(false);
      setAttemptError(''); setAttemptSaved(false);
      resultSavedRef.current = false; userAnswers.current = [];
      setTimeout(startTimer, 0);
      return;
    }
    resetAll();
  }, [subject, title, questions]);
  useEffect(() => {
    if (!done || !total || resultSavedRef.current) return;
    resultSavedRef.current = true;
    async function saveAttempt() {
      const answers = [...userAnswers.current];
      if (quizId) {
        const result = await submitQuizAttempt(quizId, {
          score: correct,
          total,
          answers,
          completedAt: new Date().toISOString(),
        });
        if (result.error) {
          setAttemptError(result.error.message || 'Could not save score.');
        } else {
          setAttemptSaved(true);
        }
      }
      onQuizComplete && onQuizComplete(noteId, Math.round((correct / total) * 100), answers);
    }
    saveAttempt();
  }, [done, total, correct, noteId, quizId, onQuizComplete]);

  const startTimer = () => {
    stopTimer();
    setTimerVal(timerSecs);
    if (!timerOn) return;
    timerID.current = setInterval(() => {
      setTimerVal((v) => {
        if (v <= 1) {
          stopTimer();
          setSelected(-1);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  };

  const handleSelect = (i) => {
    if (selected !== null || pendingIdx !== null) return;
    setPendingIdx(i);
    stopTimer();
    userAnswers.current[idx] = i;
    setTimeout(() => {
      setSelected(i);
      setPendingIdx(null);
      if (i === normalizedQuestions[idx].correct) {
        setCorrect((c) => c + 1);
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 440);
      }
    }, 150);
  };

  const nextQuestion = () => {
    stopTimer();
    if (idx === total - 1) {
      setDone(true);
      return;
    }
    setIdx((i) => i + 1);
    setQKey((k) => k + 1);
    setShake(false);
    setSelected(null);
    setPendingIdx(null);
    setTimeout(startTimer, 0);
  };

  if (!total) {
    return (
      <div style={quizS.resultWrap}>
        <span style={{ ...quizS.subjectChip, background: palette.bg, color: palette.text, borderColor: palette.border }}>{subject}</span>
        <h2 style={quizS.resultTitle}>No quiz yet</h2>
        <p style={quizS.resultSub}>{title}</p>
        <button onClick={() => setTab(backTo)} style={quizS.backBtn}>Back to Study</button>
      </div>
    );
  }

  if (done) {
    const percent = Math.round((correct / total) * 100);
    const resultTitle = percent >= 80 ? 'Excellent work!' : percent >= 60 ? 'Good effort!' : 'Keep studying!';
    return (
      <QuizResultScreen
        percent={percent} correct={correct} total={total}
        palette={palette} resultTitle={resultTitle} subject={subject}
        subjectStyle={{ ...quizS.subjectChip, background: palette.bg, color: palette.text, borderColor: palette.border, alignSelf: 'center' }}
        attemptError={attemptError}
        attemptSaved={attemptSaved}
        onRestart={restartQuiz}
        onBack={() => setTab(backTo)}
      />
    );
  }

  const q = normalizedQuestions[idx];
  const progress = ((idx + 1) / total) * 100;
  const answered = selected !== null;

  const optionStyle = (i) => {
    if (selected === null && pendingIdx === i) return quizS.optionPending;
    if (selected === null) return quizS.option;
    if (i === q.correct && i === selected) return quizS.optionCorrect;
    if (i === selected && i !== q.correct) return quizS.optionWrong;
    if (i === q.correct) return quizS.optionCorrectMuted;
    return quizS.optionNeutral;
  };

  const ok = selected === q.correct;
  const feedbackText = selected === -1 ? `Time expired. ${q.explanation}` : q.explanation;

  return (
    <>
      <QuizStyles />
      <div style={quizS.wrap}>
        <div style={quizS.headerRow}>
          <span style={{ ...quizS.subjectChip, background: palette.bg, color: palette.text, borderColor: palette.border }}>{subject}</span>
          {timerOn && (
            <span style={{ ...quizS.timerLive, color: timerVal <= 5 ? '#DC2626' : 'var(--gray)' }}>
              <Clock size={15} /> {timerVal}s
            </span>
          )}
        </div>

        <div style={quizS.progressMeta}>
          <span>Question {idx + 1} of {total}</span>
          <span>{correct} correct</span>
        </div>
        <div style={quizS.progressTrack}>
          <div style={{ ...quizS.progressFill, width: `${progress}%`, background: palette.dot }} />
        </div>

        <div key={qKey} style={{ ...quizS.card, animation: shake ? 'qShake .42s ease' : 'qSlideIn .28s cubic-bezier(.22,1,.36,1)' }}>
          <span style={quizS.questionLabel}>Question {idx + 1}</span>
          <div style={quizS.questionText}>{q.q}</div>
          <div style={quizS.options}>
            {q.options.map((option, i) => (
              <button key={option} className={!answered && pendingIdx === null ? 'quiz-option-ready' : ''} disabled={answered} onClick={() => handleSelect(i)} style={{ ...quizS.optionBase, ...optionStyle(i) }}>
                <span style={quizS.optionLetter}>{String.fromCharCode(65 + i)}</span>
                <span>{option}</span>
              </button>
            ))}
          </div>
          {answered && (
            <div style={ok ? quizS.feedbackOk : quizS.feedbackKo}>
              {ok ? <Check size={15} /> : <XMark size={15} />} {feedbackText}
            </div>
          )}
        </div>

        <button onClick={nextQuestion} style={{ ...quizS.nextBtn, background: palette.dot, display: answered ? 'flex' : 'none' }}>
          {idx === total - 1 ? 'See results' : 'Next question'}
        </button>
      </div>
    </>
  );
}

const quizS = {
  wrap: { maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 },
  startWrap: { maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 },
  startHead: { display: 'flex', flexDirection: 'column', gap: 8 },
  startTitle: { margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--ink)' },
  startSub: { margin: 0, color: 'var(--gray)', fontSize: 14 },
  subjectChip: { display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start', padding: '6px 10px', borderRadius: 999, border: '1px solid transparent', fontSize: 12, fontWeight: 700, lineHeight: 1 },
  timerCard: { background: 'var(--sidebar-bg)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 },
  timerTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  timerLabel: { display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--ink)', fontWeight: 600, fontSize: 14 },
  toggle: { width: 42, height: 24, borderRadius: 999, background: '#CBD5E1', padding: 3, transition: 'background .2s' },
  toggleOn: { background: 'var(--indigo)' },
  toggleKnob: { display: 'block', width: 18, height: 18, borderRadius: 999, background: '#fff', transform: 'translateX(0)', transition: 'transform .2s' },
  toggleKnobOn: { transform: 'translateX(18px)' },
  timerSelect: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--ink)' },
  startBtn: { width: '100%', borderRadius: 14, padding: '13px 16px', color: '#fff', fontWeight: 600 },
  headerRow: { maxWidth: 520, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  timerLive: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 },
  progressMeta: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--gray)', fontSize: 13 },
  progressTrack: { width: '100%', height: 4, borderRadius: 999, background: '#E5E7EB', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, transition: 'width .4s' },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 },
  questionLabel: { color: 'var(--gray)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em' },
  questionText: { color: 'var(--ink)', fontSize: 18, fontWeight: 700, lineHeight: 1.4 },
  options: { display: 'flex', flexDirection: 'column', gap: 10 },
  optionBase: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', borderRadius: 14, textAlign: 'left', fontWeight: 600, transition: 'background .15s, border-color .15s, color .15s, opacity .15s' },
  option: { background: 'var(--surface)', border: '1.5px solid var(--border)', color: 'var(--ink)', cursor: 'pointer' },
  optionPending: { background: '#F1F5F9', border: '1.5px solid #94a3b8', color: 'var(--ink)' },
  optionCorrect: { background: '#DCFCE7', border: '1.5px solid #86efac', color: '#166534' },
  optionWrong: { background: '#FEE2E2', border: '1.5px solid #fca5a5', color: '#991B1B' },
  optionCorrectMuted: { background: '#DCFCE7', border: '1.5px solid #86efac', color: '#166534', opacity: .7 },
  optionNeutral: { background: 'var(--sidebar-bg)', border: '1.5px solid var(--border)', color: 'var(--ink)', opacity: .5 },
  optionLetter: { width: 24, height: 24, borderRadius: 999, border: '1.5px solid currentColor', opacity: .6, display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 12 },
  feedbackOk: { display: 'flex', alignItems: 'center', gap: 8, background: '#DCFCE7', color: '#166534', borderRadius: 12, padding: '11px 14px', fontSize: 13 },
  feedbackKo: { display: 'flex', alignItems: 'center', gap: 8, background: '#FEE2E2', color: '#991B1B', borderRadius: 12, padding: '11px 14px', fontSize: 13 },
  nextBtn: { alignItems: 'center', justifyContent: 'center', width: '100%', color: '#fff', borderRadius: 14, padding: '13px 16px', fontWeight: 600 },
  resultWrap: { maxWidth: 520, minHeight: 360, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center' },
  scoreCircle: { width: 96, height: 96, borderRadius: 999, border: '3px solid transparent', display: 'grid', placeItems: 'center', alignContent: 'center' },
  scorePercent: { fontSize: 28, lineHeight: 1, fontWeight: 800 },
  scoreFraction: { fontSize: 13, fontWeight: 700, marginTop: 4 },
  resultTitle: { margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--ink)' },
  resultSub: { margin: 0, color: 'var(--gray)', fontSize: 15 },
  resultActions: { display: 'flex', gap: 10, marginTop: 10 },
  tryAgainBtn: { padding: '12px 18px', borderRadius: 999, color: '#fff', fontWeight: 600 },
  backBtn: { padding: '12px 18px', borderRadius: 999, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontWeight: 600 },
};

export function QuizReview({ run, onBack, darkMode }) {
  const { questions = [], answers = [], chapterName, examName, score } = run;
  const sc = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ maxWidth: 580, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: 8, color: 'var(--gray)', fontSize: 20, lineHeight: 1 }}>←</button>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Review · {chapterName || examName}</h2>
          <span style={{ fontSize: 13, fontWeight: 700, color: sc }}>{score}%</span>
        </div>
      </div>
      {questions.length === 0 && (
        <p style={{ color: 'var(--gray)', textAlign: 'center', marginTop: 40 }}>Nessuna domanda salvata per questo quiz.</p>
      )}
      {questions.map((q, qi) => {
        const userIdx = answers[qi] ?? -1;
        const correctIdx = q.correct;
        const isCorrect = userIdx === correctIdx;
        return (
          <div key={qi} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 999, background: isCorrect ? '#DCFCE7' : '#FEE2E2', color: isCorrect ? '#166534' : '#991B1B', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700 }}>{isCorrect ? '✓' : '✗'}</span>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--ink)', lineHeight: 1.4 }}>{q.q}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 34 }}>
              {q.options.map((optText, oi) => {
                const isUser = oi === userIdx;
                const isRight = oi === correctIdx;
                let bg = 'transparent', border = '1.5px solid var(--border)', color = 'var(--ink)';
                if (isRight) { bg = '#DCFCE7'; border = '1.5px solid #86EFAC'; color = '#166534'; }
                else if (isUser && !isRight) { bg = '#FEE2E2'; border = '1.5px solid #FCA5A5'; color = '#991B1B'; }
                return (
                  <div key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center', background: bg, border, borderRadius: 10, padding: '8px 12px' }}>
                    <span style={{ fontWeight: 700, fontSize: 12, opacity: 0.6, flexShrink: 0 }}>{String.fromCharCode(65 + oi)}</span>
                    <span style={{ fontSize: 13, color, flex: 1 }}>{optText}</span>
                    {isRight && <span style={{ fontSize: 11, fontWeight: 700, color: '#166534', flexShrink: 0 }}>✓ Corretta</span>}
                    {isUser && !isRight && <span style={{ fontSize: 11, fontWeight: 700, color: '#991B1B', flexShrink: 0 }}>Tua risposta</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function QuizTab({ deck, exams, quizRuns, onQuizComplete, setTab, darkMode }) {
  const [selectedExamId, setSelectedExamId] = useState(deck?._examId ?? exams[0]?.id ?? null);
  const [selectedChapterId, setSelectedChapterId] = useState(deck?._practiceConfig?.chapterId ?? 'all');
  const [numQ, setNumQ] = useState(deck?._practiceConfig?.count ?? 10);
  const [selectedDiff, setSelectedDiff] = useState(deck?._practiceConfig?.difficulty ?? 'medium');
  const [timerOn, setTimerOn] = useState(deck?._practiceConfig?.mode === 'quiz');
  const [timerSecs, setTimerSecs] = useState(30);
  const [activeDeck, setActiveDeck] = useState(deck && deck.questions && deck.questions.length > 0 ? deck : null);
  const autoStartedRef = React.useRef(false);
  const [reviewRun, setReviewRun] = useState(null);
  const [serviceQuizzes, setServiceQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [quizError, setQuizError] = useState('');

  const selectedExam = exams.find(e => e.id === selectedExamId);

  useEffect(() => {
    let cancelled = false;
    async function loadQuizzes() {
      if (!selectedExamId || activeDeck) return;
      setLoadingQuizzes(true);
      setQuizError('');
      const filters = selectedChapterId === 'all'
        ? { examId: selectedExamId }
        : { examId: selectedExamId, chapterId: selectedChapterId };
      const result = await listQuizzes(filters);
      if (cancelled) return;
      if (result.error) {
        setQuizError(result.error.message || 'Could not load quizzes.');
        setServiceQuizzes([]);
      } else {
        setServiceQuizzes((result.data || []).map(normalizeQuiz));
      }
      setLoadingQuizzes(false);
    }
    loadQuizzes();
    return () => { cancelled = true; };
  }, [selectedExamId, selectedChapterId, activeDeck]);

  const availableQuestions = React.useMemo(() => {
    const serviceQuestions = serviceQuizzes.flatMap(quiz => quiz.questions || []);
    if (serviceQuestions.length > 0) return serviceQuestions;
    if (deck?._practiceConfig?.source === 'analytics-grade-predictor') return [];
    if (!selectedExam) return [];
    if (selectedChapterId === 'all') return selectedExam.chapters.flatMap(c => c.questions || []);
    const ch = selectedExam.chapters.find(c => c.id === selectedChapterId);
    return ch?.questions || [];
  }, [selectedExam, selectedChapterId, serviceQuizzes]);

  const maxQ = availableQuestions.length;
  const effectiveNumQ = Math.min(numQ, maxQ || 1);

  const startQuiz = async (overrides = {}) => {
    const examId = overrides.examId ?? selectedExamId;
    const chapterId = overrides.chapterId ?? selectedChapterId;
    const exam = exams.find(e => e.id === examId) || selectedExam;
    setLoadingQuizzes(true);
    setQuizError('');
    const filters = chapterId === 'all'
      ? { examId }
      : { examId, chapterId };
    const listResult = await listQuizzes(filters);
    let serviceQuiz = null;
    if (listResult.error) {
      setQuizError(listResult.error.message || 'Could not load quiz.');
    } else {
      serviceQuiz = (listResult.data || []).find(quiz => (quiz.questions || []).length > 0) || null;
      if (serviceQuiz) {
        const quizResult = await getQuiz(serviceQuiz.id);
        if (quizResult.error) {
          setQuizError(quizResult.error.message || 'Could not open quiz.');
          serviceQuiz = normalizeQuiz(serviceQuiz);
        } else {
          serviceQuiz = normalizeQuiz(quizResult.data);
        }
      }
    }
    setLoadingQuizzes(false);
    if (overrides.requireServiceQuiz && !serviceQuiz?.questions?.length) {
      setQuizError('No saved quiz available for this scope. Generate a quiz from uploaded material first.');
      return;
    }
    const fallbackQs = chapterId === 'all'
      ? (exam?.chapters || []).flatMap(c => c.questions || [])
      : (exam?.chapters.find(c => c.id === chapterId)?.questions || []);
    const qs = serviceQuiz?.questions?.length ? serviceQuiz.questions : fallbackQs;
    const chapterName = chapterId === 'all' ? 'Intero esame' : (exam?.chapters.find(c => c.id === chapterId)?.title || '');
    const n = overrides.numQ ?? effectiveNumQ;
    setActiveDeck({
      noteId: chapterId === 'all' ? examId : chapterId,
      quizId: serviceQuiz?.id || null,
      subject: exam?.subject || '',
      title: serviceQuiz?.title || chapterName,
      questions: qs.map(normalizeQuestion).slice(0, n),
      _meta: { ...(deck?._practiceConfig || {}), examId, examName: exam?.name || '', chapterId, chapterName, numQ: Math.min(n, qs.length) },
      _autoStart: overrides._autoStart || false,
      _difficulty: overrides._difficulty || null,
      _timerOn: overrides._timerOn || false,
      _timerSecs: overrides._timerSecs || 30,
    });
  };

  useEffect(() => {
    if (!deck?._practiceConfig?.autoStart || autoStartedRef.current || activeDeck) return;
    if (!deck._examId) return;
    autoStartedRef.current = true;
    startQuiz({
      examId: deck._examId,
      chapterId: deck._practiceConfig.chapterId || 'all',
      numQ: deck._practiceConfig.count || 10,
      _difficulty: deck._practiceConfig.difficulty || 'medium',
      _timerOn: deck._practiceConfig.mode === 'quiz' && deck._practiceConfig.timerOn !== false,
      _timerSecs: deck._practiceConfig.timerSecs || 30,
      _autoStart: true,
      requireServiceQuiz: deck._practiceConfig.source === 'analytics-grade-predictor',
    });
  }, [deck, activeDeck]);

  const handleQuizComplete = (noteId, scorePct, answers) => {
    onQuizComplete(noteId, scorePct, {
      ...(activeDeck?._meta || {}),
      questions: activeDeck?.questions || [],
      answers: answers || [],
    });
  };

  const filteredRuns = quizRuns.filter(r => String(r.examId) === String(selectedExamId));

  if (reviewRun) {
    return <QuizReview run={reviewRun} onBack={() => setReviewRun(null)} darkMode={darkMode} />;
  }

  if (activeDeck) {
    return (
      <QuizView
        noteId={activeDeck.noteId}
        quizId={activeDeck.quizId}
        subject={activeDeck.subject}
        title={activeDeck.title}
        questions={activeDeck.questions}
        setTab={(t) => { if (t === 'quiz') { setActiveDeck(null); } else { setTab(t); } }}
        darkMode={darkMode}
        onQuizComplete={handleQuizComplete}
        backTo="quiz"
        autoStart={true}
        initialDifficulty={activeDeck._difficulty || 'medium'}
        timerOn={!!activeDeck._timerOn}
        timerSecs={activeDeck._timerSecs || 30}
      />
    );
  }

  const DIFF = [
    { id:'easy',    label:'Easy',    color:'#10B981', bg:'#ECFDF5', desc:'Base' },
    { id:'medium',  label:'Medium',  color:'#F59E0B', bg:'#FFFBEB', desc:'Intermedio' },
    { id:'hard',    label:'Hard',    color:'#EF4444', bg:'#FEF2F2', desc:'Avanzato' },
    { id:'extreme', label:'Extreme', color:'#64748B', bg:'#F8FAFC', desc:'Difficile' },
  ];

  const secLabel = { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--gray-2)', marginBottom:10 };
  const divider = { height:1, background:'var(--border)', margin:'0' };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom:24, display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
        <div>
          <h2 style={{ margin:'0 0 3px', fontSize:22, fontWeight:800, color:'var(--ink)' }}>Quiz</h2>
          <p style={{ margin:0, fontSize:13, color:'var(--gray)' }}>
            {selectedExam ? `${selectedExam.name} · ${loadingQuizzes ? 'loading...' : maxQ > 0 ? effectiveNumQ + ' domande' : 'nessuna domanda'}` : 'Configura il tuo quiz'}
          </p>
        </div>
      </div>
      {quizError && <p style={{ margin:'0 0 12px', color:'#DC2626', fontSize:13 }}>{quizError}</p>}

      {/* Config card */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:22, overflow:'hidden', boxShadow:'0 2px 16px rgba(0,0,0,.04)', marginBottom:14 }}>

        {/* 1 — Exam */}
        <div style={{ padding:'20px 22px' }}>
          <div style={secLabel}>Esame</div>
          <div style={{ display:'flex', gap:8, overflowX:'auto', scrollbarWidth:'none', paddingBottom:2, WebkitOverflowScrolling:'touch' }}>
            {exams.map(exam => {
              const active = exam.id === selectedExamId;
              const pal = getSubjectPalette(exam.subject, {}, darkMode);
              const emoji = getExamEmoji(exam);
              return (
                <button key={exam.id} onClick={() => { setSelectedExamId(exam.id); setSelectedChapterId('all'); }}
                  style={{ flexShrink:0, display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:999, border:`1.5px solid ${active ? pal.dot : 'var(--border)'}`, background: active ? pal.bg : 'var(--surface)', color: active ? pal.text : 'var(--gray)', fontWeight:600, fontSize:13, cursor:'pointer', transition:'all .15s', whiteSpace:'nowrap' }}>
                  <span style={{ fontSize:13 }}>{emoji}</span>
                  {exam.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2 — Chapter */}
        {selectedExam && (
          <>
            <div style={divider} />
            <div style={{ padding:'20px 22px' }}>
              <div style={secLabel}>Capitolo</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                {[{ id:'all', title:'Intero esame', qCount: selectedExam.chapters.flatMap(c => c.questions||[]).length }, ...selectedExam.chapters.map(ch => ({ id:ch.id, title:ch.title, qCount:(ch.questions||[]).length }))].map(ch => {
                  const active = selectedChapterId === ch.id;
                  return (
                    <button key={ch.id} onClick={() => setSelectedChapterId(ch.id)}
                      style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 13px', borderRadius:999, border:`1.5px solid ${active ? 'var(--indigo)' : 'var(--border)'}`, background: active ? 'var(--lavender)' : 'var(--surface)', color: active ? 'var(--indigo)' : 'var(--gray)', fontWeight:600, fontSize:13, cursor:'pointer', transition:'all .15s' }}>
                      {ch.title}
                      <span style={{ background: active ? 'var(--indigo)' : 'var(--border)', color: active ? '#fff' : 'var(--gray)', fontSize:10, fontWeight:800, borderRadius:999, padding:'1px 6px', lineHeight:1.5 }}>
                        {ch.qCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* 3 — Question count */}
        {maxQ > 0 && (
          <>
            <div style={divider} />
            <div style={{ padding:'20px 22px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={secLabel}>Domande</div>
                <span style={{ fontSize:12, color:'var(--gray)', fontWeight:500 }}>
                  {maxQ < 20 && `Max disponibili: ${maxQ}`}
                </span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                {[5,10,15,20].map(n => {
                  const disabled = n > maxQ;
                  const active = numQ === n && !disabled;
                  return (
                    <button key={n} onClick={() => !disabled && setNumQ(n)} disabled={disabled}
                      style={{ padding:'12px 4px', borderRadius:12, border:`1.5px solid ${active ? 'var(--indigo)' : 'var(--border)'}`, background: active ? 'var(--lavender)' : 'var(--surface)', fontWeight:800, fontSize:18, color: active ? 'var(--indigo)' : disabled ? 'var(--border)' : 'var(--gray)', opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer', transition:'all .15s', display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                      {n}
                      <span style={{ fontSize:9, fontWeight:600, color: active ? 'var(--indigo)' : 'var(--gray-2)', opacity: disabled ? 0 : 0.7 }}>dom.</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* 4 — Quick start */}
        {maxQ > 0 && (
          <>
            <div style={divider} />
            <div style={{ padding:'20px 22px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={secLabel}>Difficoltà domande</div>
                <span style={{ fontSize:11, color:'var(--gray)', fontStyle:'italic' }}>filtro AI disponibile presto</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                {DIFF.map(d => (
                  <button key={d.id}
                    onClick={() => setSelectedDiff(d.id)}
                    style={{ padding:'14px 6px', borderRadius:14, border:`1.5px solid ${selectedDiff === d.id ? d.color : 'var(--border)'}`, background:selectedDiff === d.id ? d.bg : 'var(--surface)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:8, transition:'all .15s' }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = d.color; el.style.background = d.bg; }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = selectedDiff === d.id ? d.color : 'var(--border)'; el.style.background = selectedDiff === d.id ? d.bg : 'var(--surface)'; }}>
                    <div style={{ width:12, height:12, borderRadius:'50%', background:d.color, boxShadow:`0 0 0 3px ${d.color}25` }} />
                    <div style={{ fontSize:12, fontWeight:700, color:selectedDiff === d.id ? d.color : 'var(--ink)', lineHeight:1 }}>{d.label}</div>
                    <div style={{ fontSize:10, color:'var(--gray)', fontWeight:500 }}>{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 5 — Timer */}
        {maxQ > 0 && (
          <>
            <div style={divider} />
            <div style={{ padding:'20px 22px' }}>
              <div style={quizS.timerCard}>
                <div style={quizS.timerTop}>
                  <span style={quizS.timerLabel}><Clock size={16} /> Timer per domanda</span>
                  <button onClick={() => setTimerOn((v) => !v)} style={{ ...quizS.toggle, ...(timerOn ? quizS.toggleOn : null) }}>
                    <span style={{ ...quizS.toggleKnob, ...(timerOn ? quizS.toggleKnobOn : null) }} />
                  </button>
                </div>
                {timerOn && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10 }}>
                    <input type="number" min="5" max="300" value={timerSecs}
                      onChange={e => { const v = Math.max(5, Math.min(300, Number(e.target.value)||5)); setTimerSecs(v); }}
                      style={{ width:70, padding:'7px 10px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--sidebar-bg)', color:'var(--ink)', fontSize:15, fontWeight:700, fontFamily:'inherit', textAlign:'center', outline:'none' }} />
                    <span style={{fontSize:12, color:'var(--gray)'}}>secondi</span>
                    <div style={{display:'flex', gap:4, marginLeft:'auto'}}>
                      {[15,30,60,90].map(s => {
                        const diff = DIFF.find(d => d.id === selectedDiff) || DIFF[1];
                        return (
                          <button key={s} onClick={() => setTimerSecs(s)}
                            style={{padding:'5px 9px', borderRadius:8, border:`1.5px solid ${timerSecs===s?diff.color:'var(--border)'}`, background:timerSecs===s?diff.bg:'transparent', color:timerSecs===s?diff.color:'var(--gray)', fontSize:11, fontWeight:700, cursor:'pointer'}}>
                            {s}s
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Start button */}
      <button onClick={() => startQuiz({ _autoStart:true, _difficulty:selectedDiff, _timerOn:timerOn, _timerSecs:timerSecs })} disabled={maxQ === 0 || loadingQuizzes}
        style={{ width:'100%', borderRadius:16, padding:'16px', background: maxQ > 0 && !loadingQuizzes ? 'linear-gradient(135deg, var(--indigo) 0%, #5B53F0 100%)' : '#CBD5E1', color:'#fff', fontWeight:800, fontSize:16, cursor: maxQ > 0 && !loadingQuizzes ? 'pointer' : 'not-allowed', border:'none', boxShadow: maxQ > 0 && !loadingQuizzes ? '0 4px 16px rgba(55,48,232,.35)' : 'none', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'opacity .15s' }}
        onMouseEnter={e => { if (maxQ > 0) e.currentTarget.style.opacity='.9'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity='1'; }}>
        {loadingQuizzes ? 'Loading...' : 'Inizia Quiz'}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      </button>

      {/* Past quiz runs */}
      {filteredRuns.length > 0 && (
        <div style={{ maxWidth: 580, margin: '32px auto 0' }}>
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 24 }} />
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Quiz precedenti</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredRuns.map(run => {
              const sc = run.score >= 80 ? '#10B981' : run.score >= 60 ? '#F59E0B' : '#EF4444';
              return (
                <div key={run.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 999, border: `2px solid ${sc}`, background: `${sc}18`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: sc }}>{run.score}%</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{run.chapterName}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>{run.numQ} domande · {run.date}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setReviewRun(run)}
                      style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--gray)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      Review
                    </button>
                    <button onClick={() => {
                      const exam = exams.find(e => e.id === run.examId);
                      setActiveDeck({
                        noteId: run.chapterId === 'all' ? run.examId : run.chapterId,
                        subject: exam?.subject || '',
                        title: run.chapterName || run.examName || '',
                        questions: run.questions && run.questions.length > 0 ? run.questions : (() => {
                          const qs = run.chapterId === 'all'
                            ? (exam?.chapters || []).flatMap(c => c.questions || [])
                            : (exam?.chapters.find(c => c.id === run.chapterId)?.questions || []);
                          return qs.slice(0, run.numQ);
                        })(),
                        _meta: { examId: run.examId, examName: run.examName, chapterId: run.chapterId, chapterName: run.chapterName, numQ: run.numQ },
                        _autoStart: true,
                      });
                    }}
                      style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid var(--indigo)', background: '#EEF2FF', color: 'var(--indigo)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      Try again
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
