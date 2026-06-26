import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, Clock, Plus, XMark } from '../lib/icons';
import { getExamEmoji, getExamPalette } from '../lib/examUi';
import { getSubjectPalette } from '../data/mockData';
import { getQuiz, listQuizzes, submitQuizAttempt } from '../services/quiz';
import { tt } from '../lib/i18n';
import useIsMobile from '../lib/useIsMobile';

function QuizStyles() {
  return (
    <style>{`
      @keyframes qSlideIn { from { opacity:0; transform:translateX(22px); } to { opacity:1; transform:translateX(0); } }
      @keyframes qShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(7px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(3px)} }
      @keyframes qFadeUp { from { opacity:0; transform:translateY(18px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
      @media (hover:hover) {
        .quiz-exam-pill:hover,
        .quiz-scope-chip:hover,
        .quiz-count-btn:hover,
        .quiz-chapter-card:hover {
          transform: translateY(-1px);
        }
      }
      .quiz-exam-pill:active,
      .quiz-scope-chip:active,
      .quiz-count-btn:active,
      .quiz-chapter-card:active {
        transform: translateY(0) scale(.99);
      }
      .quiz-exam-pill:focus-visible,
      .quiz-scope-chip:focus-visible,
      .quiz-count-btn:focus-visible,
      .quiz-chapter-card:focus-visible {
        outline: 3px solid rgba(55,48,232,.22);
        outline-offset: 3px;
      }
      @media (max-width: 640px) {
        .quiz-exam-rail {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .quiz-exam-pill {
          width: 100%;
          justify-content: center;
          min-width: 0;
        }
        .quiz-launch-actions {
          grid-template-columns: 1fr !important;
        }
        .quiz-chapter-grid {
          grid-template-columns: minmax(0, 1fr) !important;
        }
        .quiz-chapter-top {
          align-items: flex-start;
        }
        .quiz-chapter-mastery {
          flex-shrink: 0;
        }
      }
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
    difficulty: DIFFICULTY_IDS.includes(question.difficulty) ? question.difficulty : 'medium',
    validationStatus: question.validationStatus || question.validation_status || 'valid',
    validationNotes: Array.isArray(question.validationNotes) ? question.validationNotes : [],
    sourceSnippet: question.sourceSnippet || question.sourceChunk || '',
    conceptKey: question.conceptKey || '',
  };
}

function normalizeQuiz(quiz) {
  return {
    ...quiz,
    questions: (quiz.questions || []).map(normalizeQuestion),
  };
}

function isFallbackPracticeQuestion(question) {
  const text = String(question?.q || question?.prompt || '').toLowerCase();
  return [
    'what is the best first step when reviewing ',
    'which action helps test understanding of ',
    'what should you do after missing a question on ',
    'which note is most useful for ',
    'when should ',
    'quale affermazione descrive meglio un concetto chiave',
  ].some((pattern) => text.includes(pattern));
}

function isReliableMaterialQuiz(quiz) {
  const questions = quiz?.questions || [];
  return Boolean(quiz?.sourceMaterialId && questions.length && !questions.some(isFallbackPracticeQuestion));
}

const DIFFICULTY_IDS = ['easy', 'medium', 'hard', 'extreme'];
const DIFFICULTY_LABELS = { easy: 'easy', medium: 'medium', hard: 'hard', extreme: 'extreme' };
const DIFFICULTY_COLORS = { easy: '#10B981', medium: '#F59E0B', hard: '#EF4444', extreme: '#64748B' };

function EmptyPracticeState({ lang, setTab }) {
  const isIt = lang === 'it';
  return (
    <div style={quizS.emptyState}>
      <div style={quizS.emptyIcon}><BookOpen size={24} /></div>
      <h3 style={quizS.emptyTitle}>{tt(lang, 'noExamsYet')}</h3>
      <p style={quizS.emptyText}>
        {isIt
          ? 'Crea il primo esame e carica il materiale: Lockeen preparerà quiz e flashcard da lì.'
          : 'Create your first exam and upload material: Lockeen will prepare quizzes and flashcards from there.'}
      </p>
      <button type="button" onClick={() => setTab('notes')} style={quizS.emptyCta}>
        <Plus size={18} /> {tt(lang, 'newExam')}
      </button>
    </div>
  );
}

function EmptyQuizMaterialState({ lang, onNewChapter }) {
  const isIt = lang === 'it';
  return (
    <div style={quizS.chapterEmptyState}>
      <div style={quizS.emptyIcon}><BookOpen size={24} /></div>
      <h3 style={quizS.emptyTitle}>{tt(lang, 'noQuizYet')}</h3>
      <p style={quizS.emptyText}>
        {isIt
          ? 'Aggiungi un capitolo e carica il materiale: i quiz appariranno qui appena saranno pronti.'
          : 'Add a chapter and upload material: quizzes will appear here as soon as they are ready.'}
      </p>
      <button type="button" onClick={onNewChapter} style={quizS.emptyCta}>
        <Plus size={18} /> {isIt ? 'Nuovo capitolo' : 'New Chapter'}
      </button>
    </div>
  );
}

function normalizeDifficultySelection(value) {
  const raw = Array.isArray(value) ? value : (value ? [value] : DIFFICULTY_IDS);
  const selected = raw.filter((id) => DIFFICULTY_IDS.includes(id));
  return selected.length ? [...new Set(selected)] : DIFFICULTY_IDS;
}

function filterQuestionsByDifficulty(questions = [], difficulties = DIFFICULTY_IDS) {
  const selected = normalizeDifficultySelection(difficulties);
  return questions.filter((question) => selected.includes(question.difficulty || 'medium'));
}

function normalizeQuestionText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function hasLayoutReference(value = '') {
  const text = normalizeQuestionText(value).toLowerCase();
  return (
    /\b(page|pagina|chapter|capitolo|indice|index|table of contents|sommario|study point|punto\s+studio)\b/.test(text) ||
    /\b\d{1,2}\.\d{1,2}(?:\.\d{1,2})?\b/.test(text)
  );
}

function hasTruncatedText(value = '') {
  const text = normalizeQuestionText(value);
  return /\.{2,}|…/.test(text) ||
    /(?:\b(di|del|della|delle|che|per|con|tra|fra|a|in|il|la|lo|gli|le|un|una|the|of|to|and|with|for)\b)[,;:]?$/i.test(text);
}

function isGenericPrompt(value = '') {
  const text = normalizeQuestionText(value).toLowerCase();
  return [
    'which statement best explains the concept',
    'which statement best matches the concept',
    'which statement is directly supported by the uploaded material',
    'which example best matches the idea',
    'what is the main implication of this concept',
    'what is the main implication of the concept',
    'which statement best matches study point',
  ].some((pattern) => text.includes(pattern));
}

function hasCorrectLengthBias(options = [], correct = 0) {
  const lengths = options.map((option) => normalizeQuestionText(option).length);
  if (lengths.length < 4 || !Number.isInteger(correct) || correct < 0 || correct >= lengths.length) return false;
  const correctLen = lengths[correct];
  const otherLengths = lengths.filter((_, index) => index !== correct).sort((a, b) => b - a);
  const secondLongest = otherLengths[0] || 0;
  const medianOther = otherLengths[1] || secondLongest || 1;
  return correctLen > secondLongest + 12 && correctLen / Math.max(medianOther, 1) > 1.12;
}

function hasObviousDistractorBias(options = [], correct = 0) {
  if (options.length < 4 || !Number.isInteger(correct) || correct < 0 || correct >= options.length) return false;
  const cueRe = /(^|[\s,.;:])(?:sempre|mai|solo|soltanto|qualsiasi|automaticamente|elimina(?:re|no|te)?|garantisce|garantiscono|impedisce|impossibile|nessun[oa]?|tutt[ioe]|completamente|scomparir[aà]|scompare|prive? di|senza ulteriori)(?=$|[\s,.;:])/i;
  const cueScores = options.map((option) => (cueRe.test(normalizeQuestionText(option)) ? 1 : 0));
  const correctScore = cueScores[correct] || 0;
  const distractorCueCount = cueScores.filter((score, index) => index !== correct && score > 0).length;
  return correctScore === 0 && distractorCueCount >= 2;
}

function isPlayableQuestion(question = {}) {
  const normalized = normalizeQuestion(question);
  const options = normalized.options.map(normalizeQuestionText).filter(Boolean);
  const uniqueOptions = new Set(options.map((option) => option.toLowerCase()));
  const texts = [normalized.q, normalized.explanation, normalized.topic, ...options];
  return (
    normalized.validationStatus !== 'rejected' &&
    normalized.q &&
    options.length >= 4 &&
    uniqueOptions.size >= 4 &&
    Number.isInteger(normalized.correct) &&
    normalized.correct >= 0 &&
    normalized.correct < options.length &&
    !isFallbackPracticeQuestion(normalized) &&
    !isGenericPrompt(normalized.q) &&
    !hasCorrectLengthBias(options, normalized.correct) &&
    !hasObviousDistractorBias(options, normalized.correct) &&
    !texts.some(hasLayoutReference) &&
    !texts.some(hasTruncatedText)
  );
}

function getPlayableQuestions(questions = [], difficulties = DIFFICULTY_IDS) {
  return filterQuestionsByDifficulty((questions || []).map(normalizeQuestion), difficulties).filter(isPlayableQuestion);
}

function questionMemoryKey(question = {}) {
  const normalized = normalizeQuestion(question);
  if (normalized.id) return `id:${normalized.id}`;
  return normalizeQuestionText(`${normalized.q} ${normalized.options[normalized.correct] || ''}`).toLowerCase().slice(0, 260);
}

function selectRotatingQuestions(questions = [], count = 10, quizRuns = []) {
  const seen = new Set();
  (quizRuns || []).forEach((run) => {
    (run.answerDetails || []).forEach((answer) => {
      if (answer?.questionId) seen.add(`id:${answer.questionId}`);
      if (answer?.questionKey) seen.add(answer.questionKey);
    });
    (run.questions || []).forEach((question) => seen.add(questionMemoryKey(question)));
  });
  const unseen = questions.filter((question) => !seen.has(questionMemoryKey(question)));
  const pool = unseen.length >= Math.min(count, questions.length) ? unseen : questions;
  const shuffled = [...pool];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, count);
}

function getQuestionProgressId(question = {}, index = 0) {
  if (question.id || question.questionId) return `id:${question.id || question.questionId}`;
  return questionMemoryKey(question) || `index:${index}`;
}

function getQuizMasteryTone(score, hasEnoughCoverage = true) {
  if (!hasEnoughCoverage) return { label: null, color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' };
  if (score >= 80) return { label: `${score}%`, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
  if (score >= 60) return { label: `${score}%`, color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' };
  return { label: `${score}%`, color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' };
}

function QuizResultScreen({ percent, correct, total, palette, resultTitle, subject, subjectStyle, attemptError, attemptSaved, onRestart, onBack, lang = 'en' }) {
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
        {attemptSaved && <p style={{ ...quizS.resultSub, color:'#10B981' }}>{tt(lang, 'scoreSaved')}</p>}
        {attemptError && <p style={{ ...quizS.resultSub, color:'#DC2626' }}>{attemptError}</p>}
        <div style={quizS.resultActions}>
          <button onClick={onRestart} style={{ ...quizS.tryAgainBtn, background: palette.dot }}>{tt(lang, 'tryAgain')}</button>
          <button onClick={onBack} style={quizS.backBtn}>{tt(lang, 'backToStudy')}</button>
        </div>
      </div>
    </>
  );
}

export function QuizView({ noteId, quizId, subject, title, questions, setTab, darkMode, onQuizComplete, backTo = 'notes', autoStart = true, initialDifficulty = 'medium', timerOn: initialTimerOn = false, timerSecs: initialTimerSecs = 30, examColor = null, examDot = null, lang = 'en' }) {
  const palette = getExamPalette({ subject, color: examColor, dot: examDot }, darkMode);
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
  const [cardEntered, setCardEntered] = useState(false);

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
    setShake(false);
    setCardEntered(false);
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
    setShake(false);
    setCardEntered(false);
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
      setShake(false); setCardEntered(false);
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
      const answers = normalizedQuestions.map((question, index) => {
        const selectedIndex = Number(userAnswers.current[index] ?? -1);
        return {
          questionId: question.id || null,
          questionKey: questionMemoryKey(question),
          selected: Number.isFinite(selectedIndex) ? selectedIndex : -1,
          correct: Number(question.correct),
          isCorrect: Number(selectedIndex) === Number(question.correct),
        };
      });
      if (quizId) {
        const result = await submitQuizAttempt(quizId, {
          score: correct,
          total,
          answers,
          completedAt: new Date().toISOString(),
        });
        if (result.error) {
          setAttemptError(result.error.message || tt(lang, 'couldNotSaveScore'));
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
        setCardEntered(true);
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
    setCardEntered(false);
    setSelected(null);
    setPendingIdx(null);
    setTimeout(startTimer, 0);
  };

  if (!total) {
    return (
      <div style={quizS.resultWrap}>
        <span style={{ ...quizS.subjectChip, background: palette.bg, color: palette.text, borderColor: palette.border }}>{subject}</span>
        <h2 style={quizS.resultTitle}>{tt(lang, 'noQuizYet')}</h2>
        <p style={quizS.resultSub}>{title}</p>
        <button onClick={() => setTab(backTo)} style={quizS.backBtn}>{tt(lang, 'backToStudy')}</button>
      </div>
    );
  }

  if (done) {
    const percent = Math.round((correct / total) * 100);
    const resultTitle = percent >= 80 ? tt(lang, 'excellentWork') : percent >= 60 ? tt(lang, 'goodEffort') : tt(lang, 'keepStudying');
    return (
      <QuizResultScreen
        percent={percent} correct={correct} total={total}
        palette={palette} resultTitle={resultTitle} subject={subject}
        subjectStyle={{ ...quizS.subjectChip, background: palette.bg, color: palette.text, borderColor: palette.border, alignSelf: 'center' }}
        attemptError={attemptError}
        attemptSaved={attemptSaved}
        onRestart={restartQuiz}
        onBack={() => setTab(backTo)}
        lang={lang}
      />
    );
  }

  const q = normalizedQuestions[idx];
  const progress = ((idx + 1) / total) * 100;
  const answered = selected !== null;
  const qDifficulty = DIFFICULTY_IDS.includes(q.difficulty) ? q.difficulty : 'medium';
  const qDifficultyColor = DIFFICULTY_COLORS[qDifficulty] || DIFFICULTY_COLORS.medium;

  const optionStyle = (i) => {
    if (selected === null && pendingIdx === i) return quizS.optionPending;
    if (selected === null) return quizS.option;
    if (i === q.correct && i === selected) return quizS.optionCorrect;
    if (i === selected && i !== q.correct) return quizS.optionWrong;
    if (i === q.correct) return quizS.optionCorrectMuted;
    return quizS.optionNeutral;
  };

  const ok = selected === q.correct;
  const feedbackText = selected === -1 ? `${tt(lang, 'timeExpired')} ${q.explanation}` : q.explanation;

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
          <span>{tt(lang, 'questionOfTotal', { current: idx + 1, total })}</span>
          <span>{tt(lang, 'correctCount', { count: correct })}</span>
        </div>
        <div style={quizS.progressTrack}>
          <div style={{ ...quizS.progressFill, width: `${progress}%`, background: palette.dot }} />
        </div>

        <div
          key={qKey}
          onAnimationEnd={() => {
            if (!shake) setCardEntered(true);
          }}
          style={{
            ...quizS.card,
            animation: shake
              ? 'qShake .42s ease'
              : cardEntered
                ? 'none'
                : 'qSlideIn .28s cubic-bezier(.22,1,.36,1)',
          }}
        >
          <div style={quizS.questionMetaRow}>
            <span style={quizS.questionLabel}>{tt(lang, 'question')} {idx + 1}</span>
            <span style={{ ...quizS.difficultyBadge, color: qDifficultyColor, borderColor: `${qDifficultyColor}55`, background: `${qDifficultyColor}14` }}>
              {tt(lang, DIFFICULTY_LABELS[qDifficulty])}
            </span>
          </div>
          <div style={quizS.questionText}>{q.q}</div>
          <div style={quizS.options}>
            {q.options.map((option, i) => (
              <button key={`${q.id || idx}-${i}`} className={!answered && pendingIdx === null ? 'quiz-option-ready' : ''} disabled={answered} onClick={() => handleSelect(i)} style={{ ...quizS.optionBase, ...optionStyle(i) }}>
                <span style={quizS.optionLetter}>{String.fromCharCode(65 + i)}</span>
                <span style={quizS.optionText}>{option}</span>
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
          {idx === total - 1 ? tt(lang, 'seeResults') : tt(lang, 'nextQuestion')}
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
  questionMetaRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  questionLabel: { color: 'var(--gray)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em' },
  difficultyBadge: { flexShrink: 0, border: '1px solid transparent', borderRadius: 999, padding: '4px 8px', fontSize: 11, fontWeight: 800, lineHeight: 1 },
  questionText: { color: 'var(--ink)', fontSize: 18, fontWeight: 700, lineHeight: 1.4 },
  options: { display: 'flex', flexDirection: 'column', gap: 10 },
  optionBase: { display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', padding: '12px 14px', borderRadius: 14, textAlign: 'left', fontWeight: 600, transition: 'background .15s, border-color .15s, color .15s, opacity .15s' },
  option: { background: 'var(--surface)', border: '1.5px solid var(--border)', color: 'var(--ink)', cursor: 'pointer' },
  optionPending: { background: '#F1F5F9', border: '1.5px solid #94a3b8', color: 'var(--ink)' },
  optionCorrect: { background: '#DCFCE7', border: '1.5px solid #86efac', color: '#166534' },
  optionWrong: { background: '#FEE2E2', border: '1.5px solid #fca5a5', color: '#991B1B' },
  optionCorrectMuted: { background: '#DCFCE7', border: '1.5px solid #86efac', color: '#166534', opacity: .7 },
  optionNeutral: { background: 'var(--sidebar-bg)', border: '1.5px solid var(--border)', color: 'var(--ink)', opacity: .5 },
  optionLetter: { width: 24, height: 24, borderRadius: 999, border: '1.5px solid currentColor', opacity: .6, display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 12 },
  optionText: { flex: 1, minWidth: 0, whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.4 },
  feedbackOk: { display: 'flex', alignItems: 'flex-start', gap: 8, background: '#DCFCE7', color: '#166534', borderRadius: 12, padding: '11px 14px', fontSize: 13, lineHeight: 1.45 },
  feedbackKo: { display: 'flex', alignItems: 'flex-start', gap: 8, background: '#FEE2E2', color: '#991B1B', borderRadius: 12, padding: '11px 14px', fontSize: 13, lineHeight: 1.45 },
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
  emptyState: { minHeight: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '34px 24px', borderRadius: 22, border: '1.5px dashed var(--border)', background: 'linear-gradient(180deg, #FAFBFF 0%, #FFFFFF 100%)', textAlign: 'center', boxShadow: '0 18px 40px -34px rgba(15,16,53,.35)' },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, background: 'var(--lavender)', color: 'var(--indigo)', display: 'grid', placeItems: 'center' },
  emptyTitle: { margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-.02em' },
  emptyText: { margin: 0, maxWidth: 380, color: 'var(--gray)', fontSize: 15, fontWeight: 650, lineHeight: 1.5 },
  emptyCta: { marginTop: 4, minHeight: 48, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '0 20px', borderRadius: 16, border: 'none', background: 'var(--indigo)', color: '#fff', fontSize: 15, fontWeight: 900, cursor: 'pointer', boxShadow: '0 14px 28px -20px rgba(55,48,232,.8)' },
  chapterEmptyState: { width:'min(760px, 100%)', minHeight: 360, margin:'0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '34px 24px', borderRadius: 22, border: '1.5px dashed var(--border)', background: 'linear-gradient(180deg, #FAFBFF 0%, #FFFFFF 100%)', textAlign: 'center', boxShadow: '0 18px 40px -34px rgba(15,16,53,.35)' },
  examRail: { display:'flex', flexWrap:'wrap', gap:12, padding:'2px 0 4px' },
  examRailMobile: { display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:12, padding:'2px 0 4px' },
  examPill: { minHeight:52, display:'inline-flex', alignItems:'center', gap:11, padding:'0 20px', borderRadius:17, border:'1.5px solid var(--border)', fontSize:15, fontWeight:950, cursor:'pointer', transition:'transform .15s ease, box-shadow .15s ease, border-color .15s ease', letterSpacing:'-.01em' },
  examEmoji: { width:28, height:28, borderRadius:10, display:'inline-grid', placeItems:'center', fontSize:18, background:'rgba(255,255,255,.5)' },
  setupCard: { padding:18, borderRadius:22, border:'1px solid var(--border)', background:'linear-gradient(180deg, #FFFFFF 0%, #FBFCFF 100%)', boxShadow:'0 22px 54px -42px rgba(15,16,53,.38)', display:'grid', gap:16 },
  launcherHeader: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:18, flexWrap:'wrap' },
  launcherEyebrow: { marginBottom:6, color:'var(--gray)', fontSize:11, fontWeight:900, textTransform:'uppercase', letterSpacing:'.1em' },
  launcherTitle: { margin:0, color:'var(--ink)', fontSize:22, fontWeight:950, letterSpacing:'-.03em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  launcherSub: { margin:'6px 0 0', color:'var(--gray)', fontSize:13, fontWeight:700, lineHeight:1.45 },
  launcherStats: { display:'flex', alignItems:'center', justifyContent:'flex-end', flexWrap:'wrap', gap:8, maxWidth:520 },
  launcherStat: { minHeight:34, display:'inline-flex', alignItems:'center', gap:5, borderRadius:999, padding:'0 11px', fontSize:12, fontWeight:850, whiteSpace:'nowrap' },
  launcherActions: { display:'grid', gridTemplateColumns:'minmax(0, 1fr)', gap:10 },
  primaryStartBtn: { width:'100%', minHeight:52, borderRadius:16, color:'#fff', fontWeight:900, fontSize:16, cursor:'pointer', border:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'opacity .15s, transform .15s' },
  scopeRow: { display:'flex', flexWrap:'wrap', gap:8 },
  scopeChip: { minHeight:40, maxWidth:'100%', display:'inline-flex', alignItems:'center', gap:8, padding:'0 13px', borderRadius:14, border:'1.5px solid var(--border)', fontSize:13, fontWeight:850, transition:'all .15s', cursor:'pointer' },
  scopeTitle: { overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  scopeCount: { minWidth:22, height:22, borderRadius:999, display:'inline-grid', placeItems:'center', padding:'0 6px', fontSize:11, fontWeight:900 },
  chapterGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:14 },
  chapterCard: { minHeight:176, padding:16, borderRadius:22, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--ink)', cursor:'pointer', textAlign:'left', display:'flex', flexDirection:'column', gap:14, transition:'transform .16s ease, border-color .16s ease, box-shadow .16s ease, background .16s ease' },
  chapterTop: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 },
  chapterIdentity: { display:'flex', alignItems:'center', gap:12, minWidth:0 },
  chapterIcon: { width:46, height:46, borderRadius:15, display:'grid', placeItems:'center', fontSize:24, flexShrink:0 },
  chapterTitle: { margin:0, color:'var(--ink)', fontSize:16, fontWeight:950, letterSpacing:'-.02em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  chapterMeta: { margin:'4px 0 0', color:'var(--gray)', fontSize:12, fontWeight:800 },
  masteryPill: { minHeight:34, display:'inline-flex', alignItems:'center', justifyContent:'center', borderRadius:999, padding:'0 12px', fontSize:13, fontWeight:950, whiteSpace:'nowrap', border:'1px solid transparent' },
  chapterProgressTrack: { height:7, borderRadius:999, background:'#EEF2F7', overflow:'hidden' },
  chapterProgressFill: { height:'100%', borderRadius:999, transition:'width .25s ease' },
  chapterStats: { display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:8 },
  chapterStat: { minHeight:44, borderRadius:14, background:'#F8FAFC', border:'1px solid #E2E8F0', padding:'7px 8px', display:'grid', alignContent:'center', gap:2 },
  chapterStatValue: { color:'var(--ink)', fontSize:14, fontWeight:950, lineHeight:1 },
  chapterStatLabel: { color:'var(--gray)', fontSize:10, fontWeight:850, textTransform:'uppercase', letterSpacing:'.04em', lineHeight:1.1 },
  chapterHint: { margin:0, color:'var(--gray)', fontSize:12, fontWeight:750, lineHeight:1.35 },
  missedStartBtn: { width:'100%', minHeight:52, borderRadius:16, border:'1.5px solid #FCA5A5', background:'#FEF2F2', color:'#DC2626', fontWeight:900, fontSize:15, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8 },
};

export function QuizReview({ run, onBack, darkMode, lang = 'en' }) {
  const { questions = [], answers = [], chapterName, examName, score } = run;
  const sc = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ maxWidth: 580, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: 8, color: 'var(--gray)', fontSize: 20, lineHeight: 1 }}>←</button>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{tt(lang, 'reviewTitle', { title: chapterName || examName })}</h2>
          <span style={{ fontSize: 13, fontWeight: 700, color: sc }}>{score}%</span>
        </div>
      </div>
      {questions.length === 0 && (
        <p style={{ color: 'var(--gray)', textAlign: 'center', marginTop: 40 }}>Nessuna domanda salvata per questo quiz.</p>
      )}
      {questions.map((q, qi) => {
        const rawAnswer = answers[qi] ?? -1;
        const userIdx = Number(rawAnswer && typeof rawAnswer === 'object' ? rawAnswer.selected : rawAnswer);
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

export function QuizTab({ deck, exams, quizRuns, onQuizComplete, setTab, onOpenExam, darkMode, lang = 'en' }) {
  const isMobile = useIsMobile();
  const [selectedExamId, setSelectedExamId] = useState(deck?._examId ?? exams[0]?.id ?? null);
  const [selectedChapterId, setSelectedChapterId] = useState(deck?._practiceConfig?.chapterId ?? 'all');
  const [numQ, setNumQ] = useState(deck?._practiceConfig?.count ?? 10);
  const [selectedDiffs, setSelectedDiffs] = useState(normalizeDifficultySelection(deck?._practiceConfig?.difficulties ?? deck?._practiceConfig?.difficulty));
  const [timerOn, setTimerOn] = useState(deck?._practiceConfig?.mode === 'quiz');
  const [timerSecs, setTimerSecs] = useState(30);
  const [activeDeck, setActiveDeck] = useState(deck && deck.questions && deck.questions.length > 0 ? deck : null);
  const autoStartedRef = React.useRef(false);
  const [reviewRun, setReviewRun] = useState(null);
  const [serviceQuizzes, setServiceQuizzes] = useState([]);
  const [quizzesExamId, setQuizzesExamId] = useState(null);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [quizError, setQuizError] = useState('');
  const loadQuizzesSeqRef = useRef(0);

  const selectedExam = exams.find(e => e.id === selectedExamId);
  const selectedPalette = selectedExam ? getExamPalette(selectedExam, darkMode) : getSubjectPalette('', {}, darkMode);

  useEffect(() => {
    if (!deck?._practiceConfig) return;
    setSelectedExamId(deck._examId ?? deck._practiceConfig.examId ?? exams[0]?.id ?? null);
    setSelectedChapterId(deck._practiceConfig.chapterId || 'all');
    setNumQ(deck._practiceConfig.count || 10);
    setSelectedDiffs(normalizeDifficultySelection(deck._practiceConfig.difficulties ?? deck._practiceConfig.difficulty));
    setTimerOn(!!deck._practiceConfig.timerOn);
    setTimerSecs(deck._practiceConfig.timerSecs || 30);
    setActiveDeck(deck.questions && deck.questions.length > 0 ? deck : null);
    autoStartedRef.current = false;
  }, [deck, exams]);

  useEffect(() => {
    async function loadQuizzes() {
      if (!selectedExamId || activeDeck) return;
      const requestId = loadQuizzesSeqRef.current + 1;
      loadQuizzesSeqRef.current = requestId;
      setQuizzesExamId(selectedExamId);
      setServiceQuizzes([]);
      setLoadingQuizzes(true);
      setQuizError('');
      const result = await listQuizzes({ examId: selectedExamId });
      if (loadQuizzesSeqRef.current !== requestId) return;
      if (result.error) {
        setQuizError(result.error.message || 'Could not load quizzes.');
        setServiceQuizzes([]);
      } else {
        setServiceQuizzes((result.data || []).map(normalizeQuiz));
      }
      setLoadingQuizzes(false);
    }
    loadQuizzes();
  }, [selectedExamId, activeDeck]);

  const validServiceQuizzes = React.useMemo(() => (
    quizzesExamId && selectedExamId && String(quizzesExamId) === String(selectedExamId) ? serviceQuizzes : []
  ), [quizzesExamId, selectedExamId, serviceQuizzes]);

  const scopedQuizzes = React.useMemo(() => {
    const predictorPractice = deck?._practiceConfig?.source === 'analytics-grade-predictor';
    const quizzes = predictorPractice
      ? validServiceQuizzes.filter(isReliableMaterialQuiz)
      : validServiceQuizzes;
    if (selectedChapterId === 'all') return quizzes;
    return quizzes.filter((quiz) => String(quiz.chapterId) === String(selectedChapterId));
  }, [deck?._practiceConfig?.source, selectedChapterId, validServiceQuizzes]);

  const allAvailableQuestions = React.useMemo(() => {
    const serviceQuestions = scopedQuizzes.flatMap(quiz => quiz.questions || []);
    if (serviceQuestions.length > 0) return getPlayableQuestions(serviceQuestions);
    if (deck?._practiceConfig?.source === 'analytics-grade-predictor') return [];
    if (!selectedExam) return [];
    if (selectedChapterId === 'all') return getPlayableQuestions(selectedExam.chapters.flatMap(c => c.questions || []));
    const ch = selectedExam.chapters.find(c => c.id === selectedChapterId);
    return getPlayableQuestions(ch?.questions || []);
  }, [deck?._practiceConfig?.source, selectedExam, selectedChapterId, scopedQuizzes]);

  const availableQuestions = React.useMemo(() => {
    const serviceQuestions = getPlayableQuestions(scopedQuizzes.flatMap(quiz => quiz.questions || []), selectedDiffs);
    if (serviceQuestions.length > 0) return serviceQuestions;
    if (deck?._practiceConfig?.source === 'analytics-grade-predictor') return [];
    if (!selectedExam) return [];
    if (selectedChapterId === 'all') return getPlayableQuestions(selectedExam.chapters.flatMap(c => c.questions || []), selectedDiffs);
    const ch = selectedExam.chapters.find(c => c.id === selectedChapterId);
    return getPlayableQuestions(ch?.questions || [], selectedDiffs);
  }, [deck?._practiceConfig?.source, selectedDiffs, selectedExam, selectedChapterId, scopedQuizzes]);

  const maxQ = availableQuestions.length;
  const getScopeQuizStats = (sourceQuestions = [], scopeChapterId = selectedChapterId) => {
    const questionEntries = sourceQuestions.map((question, index) => ({
      question,
      id: getQuestionProgressId(question, index),
      key: questionMemoryKey(question),
    }));
    const sourceIds = new Set(questionEntries.map((entry) => entry.id));
    const sourceKeys = new Set(questionEntries.map((entry) => entry.key).filter(Boolean));
    const latestById = new Map();
    const relevantRuns = [...(quizRuns || [])]
      .filter((run) => {
        const sameExam = !selectedExamId || !run?.examId || String(run.examId) === String(selectedExamId);
        const sameChapter = scopeChapterId === 'all' || !run?.chapterId || run.chapterId === 'all' || String(run.chapterId) === String(scopeChapterId);
        return sameExam && sameChapter;
      })
      .sort((a, b) => Number(new Date(a.completedAt || a.createdAt || a.ts || 0)) - Number(new Date(b.completedAt || b.createdAt || b.ts || 0)));

    relevantRuns.forEach((run) => {
      const answerDetails = Array.isArray(run?.answerDetails) ? run.answerDetails : [];
      const rawAnswers = Array.isArray(run?.answers) ? run.answers : [];
      const runQuestions = Array.isArray(run?.questions) ? run.questions.map(normalizeQuestion) : [];
      const entries = answerDetails.length ? answerDetails : rawAnswers;

      entries.forEach((answer, index) => {
        const runQuestion = runQuestions[index] || {};
        const answerObject = answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {};
        const id = answerObject.questionId ? `id:${answerObject.questionId}` : getQuestionProgressId(runQuestion, index);
        const key = answerObject.questionKey || questionMemoryKey(runQuestion);
        const selected = Number(answerObject.selected ?? answerObject.answer ?? answer);
        const correct = Number(answerObject.correct ?? runQuestion.correct);
        const isCorrect = typeof answerObject.isCorrect === 'boolean'
          ? answerObject.isCorrect
          : Number.isFinite(selected) && Number.isFinite(correct) && selected === correct;
        if (sourceIds.has(id)) latestById.set(id, isCorrect);
        else if (key && sourceKeys.has(key)) latestById.set(key, isCorrect);
      });
    });

    const seenKeys = new Set(latestById.keys());
    const isSeen = (entry) => seenKeys.has(entry.id) || (entry.key && seenKeys.has(entry.key));
    const isMissed = (entry) => latestById.get(entry.id) === false || (entry.key && latestById.get(entry.key) === false);
    const isKnown = (entry) => latestById.get(entry.id) === true || (entry.key && latestById.get(entry.key) === true);
    const unseenQuestions = questionEntries.filter((entry) => !isSeen(entry)).map((entry) => entry.question);
    const missedQuestions = questionEntries.filter(isMissed).map((entry) => entry.question);

    return {
      total: sourceQuestions.length,
      seen: questionEntries.filter(isSeen).length,
      unseen: unseenQuestions.length,
      missed: missedQuestions.length,
      known: questionEntries.filter(isKnown).length,
      unseenQuestions,
      missedQuestions,
    };
  };
  const getQuestionsForChapter = (chapterId, difficulties = selectedDiffs) => {
    if (!selectedExam) return [];
    if (chapterId === 'all') {
      const serviceQuestions = getPlayableQuestions(validServiceQuizzes.flatMap((quiz) => quiz.questions || []), difficulties);
      if (serviceQuestions.length > 0) return serviceQuestions;
      return getPlayableQuestions(selectedExam.chapters.flatMap((chapter) => chapter.questions || []), difficulties);
    }
    const chapterQuizzes = validServiceQuizzes.filter((quiz) => String(quiz.chapterId) === String(chapterId));
    const serviceQuestions = getPlayableQuestions(chapterQuizzes.flatMap((quiz) => quiz.questions || []), difficulties);
    if (serviceQuestions.length > 0) return serviceQuestions;
    const chapter = selectedExam.chapters.find((candidate) => String(candidate.id) === String(chapterId));
    return getPlayableQuestions(chapter?.questions || [], difficulties);
  };
  const scopeStats = getScopeQuizStats(availableQuestions, selectedChapterId);
  const chapterMastery = React.useMemo(() => {
    if (!selectedExam?.chapters?.length) return [];
    return selectedExam.chapters.map((chapter) => {
      const questions = getQuestionsForChapter(chapter.id);
      const stats = getScopeQuizStats(questions, chapter.id);
      const score = stats.seen > 0 ? Math.round((stats.known / stats.seen) * 100) : 0;
      const coverage = stats.total > 0 ? Math.round((stats.seen / stats.total) * 100) : 0;
      const enoughCoverage = stats.total > 0 && stats.seen >= Math.min(stats.total, Math.max(5, Math.ceil(stats.total * 0.35)));
      const tone = getQuizMasteryTone(score, enoughCoverage);
      return { chapter, questions, stats, score, coverage, enoughCoverage, tone };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExam, selectedExamId, selectedChapterId, selectedDiffs, validServiceQuizzes, quizRuns]);
  const primaryQuestions = scopeStats.unseenQuestions.length ? scopeStats.unseenQuestions : availableQuestions;
  const primaryMaxQ = primaryQuestions.length;
  const effectiveNumQ = Math.min(numQ, primaryMaxQ || maxQ || 1);
  const missedEffectiveQ = Math.min(numQ, scopeStats.missedQuestions.length);
  const focusedFromNotes = deck?._practiceConfig?.source === 'study-material';
  const waitingForPractice = focusedFromNotes && !loadingQuizzes && maxQ === 0;

  useEffect(() => {
    if (!focusedFromNotes || !selectedExamId || activeDeck || maxQ > 0 || loadingQuizzes) return undefined;
    let cancelled = false;
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      const result = await listQuizzes({ examId: selectedExamId });
      if (!cancelled && !result.error) {
        setServiceQuizzes((result.data || []).map(normalizeQuiz));
      }
      if (attempts >= 20) clearInterval(timer);
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [focusedFromNotes, selectedExamId, activeDeck, maxQ, loadingQuizzes]);

  const countQuestionsInQuizzes = (quizzes = [], difficulties = DIFFICULTY_IDS) =>
    getPlayableQuestions(quizzes.flatMap((quiz) => quiz.questions || []), difficulties).length;
  const countQuestionsForChapter = (chapterId) => {
    if (!selectedExam) return 0;
    if (chapterId === 'all') {
      const serviceCount = countQuestionsInQuizzes(validServiceQuizzes);
      if (serviceCount > 0) return serviceCount;
      return getPlayableQuestions(selectedExam.chapters.flatMap(c => c.questions || [])).length;
    }
    const chapterQuizzes = validServiceQuizzes.filter((quiz) => String(quiz.chapterId) === String(chapterId));
    const serviceCount = countQuestionsInQuizzes(chapterQuizzes);
    if (serviceCount > 0) return serviceCount;
    const ch = selectedExam.chapters.find(c => c.id === chapterId);
    return getPlayableQuestions(ch?.questions || []).length;
  };
  const difficultyCounts = React.useMemo(() => {
    const questions = getPlayableQuestions(scopedQuizzes.flatMap((quiz) => quiz.questions || []));
    return DIFFICULTY_IDS.reduce((acc, id) => {
      acc[id] = questions.filter((question) => (question.difficulty || 'medium') === id).length;
      return acc;
    }, {});
  }, [scopedQuizzes]);
  const toggleDifficulty = (id) => {
    setSelectedDiffs((current) => {
      const set = new Set(normalizeDifficultySelection(current));
      if (set.has(id) && set.size > 1) set.delete(id);
      else set.add(id);
      return DIFFICULTY_IDS.filter((diffId) => set.has(diffId));
    });
  };
  const difficultySummary = selectedDiffs.length === DIFFICULTY_IDS.length
    ? 'All difficulties'
    : selectedDiffs.map((id) => DIFFICULTY_LABELS[id]).join(' + ');
  const selectedChapter = selectedChapterId === 'all'
    ? null
    : selectedExam?.chapters?.find((chapter) => String(chapter.id) === String(selectedChapterId));
  const focusTitle = selectedChapter?.title || deck?._practiceConfig?.chapterName || selectedExam?.name || 'Quiz';
  const focusScopeLabel = selectedChapterId === 'all' ? tt(lang, 'wholeExam') : tt(lang, 'chapter');

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
    let serviceQuestions = [];
    if (listResult.error) {
      setQuizError(listResult.error.message || 'Could not load quiz.');
    } else {
      const candidateQuizzes = overrides.requireMaterialQuiz
        ? (listResult.data || []).filter(isReliableMaterialQuiz)
        : (listResult.data || []);
      const matchingQuizzes = candidateQuizzes
        .map(normalizeQuiz)
        .map((quiz) => ({ ...quiz, questions: getPlayableQuestions(quiz.questions || [], overrides._difficulties || selectedDiffs) }))
        .filter((quiz) => quiz.questions.length > 0);
      serviceQuiz = matchingQuizzes.length === 1 ? matchingQuizzes[0] : null;
      serviceQuestions = matchingQuizzes.flatMap((quiz) => quiz.questions || []);
      if (serviceQuiz?.id) {
        const quizResult = await getQuiz(serviceQuiz.id);
        if (quizResult.error) {
          setQuizError(quizResult.error.message || 'Could not open quiz.');
          serviceQuiz = normalizeQuiz(serviceQuiz);
        } else {
          serviceQuiz = normalizeQuiz(quizResult.data);
          serviceQuiz.questions = getPlayableQuestions(serviceQuiz.questions || [], overrides._difficulties || selectedDiffs);
          serviceQuestions = serviceQuiz.questions;
        }
      }
    }
    setLoadingQuizzes(false);
    if (overrides.requireServiceQuiz && !serviceQuestions.length) {
      setQuizError(tt(lang, 'materialQuizMissing'));
      return;
    }
    const fallbackQs = chapterId === 'all'
      ? (exam?.chapters || []).flatMap(c => c.questions || [])
      : (exam?.chapters.find(c => c.id === chapterId)?.questions || []);
    let qs = serviceQuestions.length
      ? serviceQuestions
      : getPlayableQuestions(fallbackQs, overrides._difficulties || selectedDiffs);
    if (overrides.studyMode === 'missed') {
      const missedKeys = new Set(scopeStats.missedQuestions.map((question, index) => getQuestionProgressId(question, index)));
      const missedMemoryKeys = new Set(scopeStats.missedQuestions.map(questionMemoryKey));
      qs = qs.filter((question, index) => missedKeys.has(getQuestionProgressId(question, index)) || missedMemoryKeys.has(questionMemoryKey(question)));
    } else if (overrides.studyMode === 'new' && scopeStats.unseenQuestions.length) {
      const unseenKeys = new Set(scopeStats.unseenQuestions.map((question, index) => getQuestionProgressId(question, index)));
      const unseenMemoryKeys = new Set(scopeStats.unseenQuestions.map(questionMemoryKey));
      qs = qs.filter((question, index) => unseenKeys.has(getQuestionProgressId(question, index)) || unseenMemoryKeys.has(questionMemoryKey(question)));
    }
    if (overrides.requireServiceQuiz && !qs.length) {
      setQuizError(tt(lang, 'materialQuestionsMissing', { difficulty: difficultySummary }));
      return;
    }
    const chapterName = chapterId === 'all' ? tt(lang, 'wholeExam') : (exam?.chapters.find(c => c.id === chapterId)?.title || '');
    const n = overrides.numQ ?? effectiveNumQ;
    const selectedQuestions = selectRotatingQuestions(qs.map(normalizeQuestion), Math.min(n, qs.length), quizRuns);
    const selectedQuizIds = new Set(selectedQuestions.map((question) => question.quizId).filter(Boolean).map(String));
    const saveQuizId = selectedQuizIds.size === 1 ? [...selectedQuizIds][0] : serviceQuiz?.id || null;
    setActiveDeck({
      noteId: chapterId === 'all' ? examId : chapterId,
      quizId: saveQuizId,
      subject: exam?.subject || '',
      title: serviceQuiz?.title || chapterName,
      questions: selectedQuestions,
      _meta: { ...(deck?._practiceConfig || {}), examId, examName: exam?.name || '', chapterId, chapterName, numQ: selectedQuestions.length },
      _examColor: exam?.color || null,
      _examDot: exam?.dot || null,
      _autoStart: overrides._autoStart || false,
      _difficulty: (overrides._difficulties || selectedDiffs)[0] || 'medium',
      _difficulties: overrides._difficulties || selectedDiffs,
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
      _difficulties: normalizeDifficultySelection(deck._practiceConfig.difficulties ?? deck._practiceConfig.difficulty),
      _timerOn: deck._practiceConfig.mode === 'quiz' && deck._practiceConfig.timerOn !== false,
      _timerSecs: deck._practiceConfig.timerSecs || 30,
      _autoStart: true,
      requireServiceQuiz: deck._practiceConfig.source === 'analytics-grade-predictor',
      requireMaterialQuiz: deck._practiceConfig.source === 'analytics-grade-predictor',
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
  const openSelectedExamForChapter = () => {
    if (selectedExam?.id && typeof onOpenExam === 'function') {
      onOpenExam(selectedExam.id);
      return;
    }
    setTab('notes');
  };

  if (reviewRun) {
    return <QuizReview run={reviewRun} onBack={() => setReviewRun(null)} darkMode={darkMode} lang={lang} />;
  }

  if (activeDeck) {
    const activeExam = exams.find((exam) => String(exam.id) === String(activeDeck._meta?.examId || activeDeck._examId));
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
        examColor={activeExam?.color || activeDeck._examColor}
        examDot={activeExam?.dot || activeDeck._examDot}
        lang={lang}
      />
    );
  }

  const DIFF = [
    { id:'easy',    label:tt(lang, 'easy'),    color:'#10B981', bg:'#ECFDF5', desc:'Base' },
    { id:'medium',  label:tt(lang, 'medium'),  color:'#F59E0B', bg:'#FFFBEB', desc:tt(lang, 'balanced') },
    { id:'hard',    label:tt(lang, 'hard'),    color:'#EF4444', bg:'#FEF2F2', desc:tt(lang, 'examMode') },
    { id:'extreme', label:'Extreme', color:'#64748B', bg:'#F8FAFC', desc:'Deep' },
  ];
  const visibleDiffs = focusedFromNotes ? DIFF.filter((diff) => diff.id !== 'extreme') : DIFF;

  const secLabel = { fontSize:11, fontWeight:900, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--gray)', marginBottom:12 };
  const divider = { height:1, background:'var(--border)', margin:'0' };

  return (
    <div style={{ width:'100%', maxWidth: exams.length === 0 ? 600 : 1120, margin: '0 auto', display:'flex', flexDirection:'column', gap:24 }}>

      {/* Page header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
        <div>
          <h2 style={{ margin:'0 0 3px', fontSize:22, fontWeight:800, color:'var(--ink)' }}>
            {focusedFromNotes ? `${tt(lang, 'quiz')} · ${focusTitle}` : tt(lang, 'quiz')}
          </h2>
          <p style={{ margin:0, color:'var(--gray)', fontSize:14, fontWeight:650 }}>
            {tt(lang, 'configurePractice')}
          </p>
        </div>
      </div>
      {quizError && <p style={{ margin:0, color:'#DC2626', fontSize:13 }}>{quizError}</p>}
      {focusedFromNotes && (
        <div style={{ padding:'14px 16px', borderRadius:16, border:`1.5px solid ${selectedPalette.dot}33`, background:selectedPalette.bg, color:selectedPalette.text }}>
          <div style={{ fontSize:12, fontWeight:900, textTransform:'uppercase', letterSpacing:'.08em', opacity:.75 }}>{tt(lang, 'selectedScope', { scope: focusScopeLabel })}</div>
          <div style={{ marginTop:4, fontSize:16, fontWeight:900 }}>{focusTitle}</div>
          <div style={{ marginTop:3, fontSize:12, fontWeight:700, opacity:.75 }}>
            {loadingQuizzes ? tt(lang, 'loadingQuestions') : maxQ > 0 ? tt(lang, 'questionsReady', { count: maxQ }) : tt(lang, 'generatingQuizBackground')}
          </div>
        </div>
      )}

      {exams.length === 0 && <EmptyPracticeState lang={lang} setTab={setTab} />}

      {exams.length > 0 && (
        <section>
          <div style={secLabel}>{tt(lang, 'chooseExam')}</div>
          <div className="quiz-exam-rail" style={isMobile ? quizS.examRailMobile : quizS.examRail}>
            {exams.map(exam => {
              const active = exam.id === selectedExamId;
              const pal = getExamPalette(exam, darkMode);
              const emoji = getExamEmoji(exam);
              return (
                <button key={exam.id} type="button" className="quiz-exam-pill" onClick={() => { setSelectedExamId(exam.id); setSelectedChapterId('all'); }}
                  style={{ ...quizS.examPill, borderColor: active ? pal.dot : 'var(--border)', background: active ? pal.dot : 'var(--surface)', color: active ? '#fff' : 'var(--ink)', boxShadow: active ? `0 18px 32px -22px ${pal.dot}` : '0 10px 24px -24px rgba(15,16,53,.45)' }}>
                  <span style={quizS.examEmoji}>{emoji}</span>
                  {exam.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {selectedExam && maxQ === 0 && (
        <EmptyQuizMaterialState lang={lang} onNewChapter={openSelectedExamForChapter} />
      )}

      {/* Config card */}
      {selectedExam && maxQ > 0 && <div style={quizS.setupCard}>

        {/* 2 — Chapter */}
        {selectedExam && (
          <>
            <div>
              <div style={secLabel}>{tt(lang, 'chapter')}</div>
              <div style={quizS.scopeRow}>
                {[{ id:'all', title:tt(lang, 'wholeExam') }, ...selectedExam.chapters.map(ch => ({ id:ch.id, title:ch.title }))].map(ch => {
                  const active = selectedChapterId === ch.id;
                  const qCount = countQuestionsForChapter(ch.id);
                  return (
                    <button key={ch.id} type="button" className="quiz-scope-chip" onClick={() => setSelectedChapterId(ch.id)}
                      style={{ ...quizS.scopeChip, borderColor: active ? selectedPalette.dot : 'var(--border)', background: active ? selectedPalette.bg : 'var(--surface)', color: active ? selectedPalette.text : 'var(--ink)' }}>
                      <span style={quizS.scopeTitle}>{ch.title}</span>
                      <span style={{ ...quizS.scopeCount, background: active ? selectedPalette.dot : '#EEF2FF', color: active ? '#fff' : 'var(--gray)' }}>
                        {qCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {maxQ > 0 && (
          <>
            <div style={divider} />
            <div style={quizS.launcherHeader}>
              <div style={{ minWidth:0 }}>
                <div style={quizS.launcherEyebrow}>{lang === 'it' ? 'Sessione pronta' : 'Session ready'}</div>
                <h3 style={quizS.launcherTitle}>{focusTitle}</h3>
                <p style={quizS.launcherSub}>
                  {scopeStats.unseen > 0
                    ? (lang === 'it'
                      ? `${scopeStats.unseen} domande nuove su ${scopeStats.total}. La prossima sessione parte da quelle che non hai ancora visto.`
                      : `${scopeStats.unseen} new questions out of ${scopeStats.total}. The next session starts from what you have not seen yet.`)
                    : (lang === 'it'
                      ? 'Hai già visto tutte le domande disponibili. Consolida il capitolo o ripassa solo gli errori.'
                      : 'You have seen every available question. Consolidate the chapter or review only mistakes.')}
                </p>
              </div>
              <div style={quizS.launcherStats}>
                <span style={{ ...quizS.launcherStat, background:'#ECFDF5', color:'#047857' }}>
                  <strong>{scopeStats.unseen}</strong>{lang === 'it' ? ' mai viste' : ' unseen'}
                </span>
                <span style={{ ...quizS.launcherStat, background:'#EEF2FF', color:'#3730E8' }}>
                  <strong>{scopeStats.seen}/{scopeStats.total}</strong>{lang === 'it' ? ' già viste' : ' seen'}
                </span>
                <span style={{ ...quizS.launcherStat, background:'#FEF2F2', color:'#B91C1C' }}>
                  <strong>{scopeStats.missed}</strong>{lang === 'it' ? ' errori' : ' missed'}
                </span>
              </div>
            </div>
          </>
        )}

        {/* 3 — Question count */}
        {maxQ > 0 && (
          <>
            <div style={divider} />
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={secLabel}>{lang === 'it' ? 'Quanto allenarti' : 'Session size'}</div>
                <span style={{ fontSize:12, color:'var(--gray)', fontWeight:650 }}>{lang === 'it' ? `${maxQ} disponibili` : `${maxQ} available`}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:8 }}>
                {[5,10,15,20].map(n => {
                  const disabled = n > maxQ;
                  const active = numQ === n && !disabled;
                  return (
                    <button key={n} className="quiz-count-btn" onClick={() => !disabled && setNumQ(n)} disabled={disabled}
                      style={{ padding:'12px 4px', borderRadius:12, border:`1.5px solid ${active ? selectedPalette.dot : 'var(--border)'}`, background: active ? selectedPalette.bg : 'var(--surface)', fontWeight:800, fontSize:18, color: active ? selectedPalette.text : disabled ? 'var(--border)' : 'var(--gray)', opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer', transition:'all .15s', display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                      {n}
                      <span style={{ fontSize:9, fontWeight:600, color: active ? selectedPalette.text : 'var(--gray-2)', opacity: disabled ? 0 : 0.7 }}>{tt(lang, 'questions')}</span>
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
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={secLabel}>{lang === 'it' ? 'Tipo di domande' : 'Question type'}</div>
                <span style={{ fontSize:11, color:'var(--gray)', fontWeight:700 }}>{difficultySummary}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                {visibleDiffs.map(d => (
                  <button key={d.id}
                    onClick={() => toggleDifficulty(d.id)}
                    style={{ padding:'14px 6px', borderRadius:14, border:`1.5px solid ${selectedDiffs.includes(d.id) ? d.color : 'var(--border)'}`, background:selectedDiffs.includes(d.id) ? d.bg : 'var(--surface)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:8, transition:'all .15s' }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = d.color; el.style.background = d.bg; }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = selectedDiffs.includes(d.id) ? d.color : 'var(--border)'; el.style.background = selectedDiffs.includes(d.id) ? d.bg : 'var(--surface)'; }}>
                    <div style={{ width:12, height:12, borderRadius:'50%', background:d.color, boxShadow:`0 0 0 3px ${d.color}25` }} />
                    <div style={{ fontSize:12, fontWeight:700, color:selectedDiffs.includes(d.id) ? d.color : 'var(--ink)', lineHeight:1 }}>{d.label}</div>
                    <div style={{ fontSize:10, color:'var(--gray)', fontWeight:500 }}>{tt(lang, 'selectedQuestions', { count: difficultyCounts[d.id] || 0, total: maxQ })}</div>
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
            <div>
              <div style={quizS.timerCard}>
                <div style={quizS.timerTop}>
                  <span style={quizS.timerLabel}><Clock size={16} /> {lang === 'it' ? 'Timer opzionale' : 'Optional timer'}</span>
                  <button onClick={() => setTimerOn((v) => !v)} style={{ ...quizS.toggle, background: timerOn ? selectedPalette.dot : '#CBD5E1' }}>
                    <span style={{ ...quizS.toggleKnob, ...(timerOn ? quizS.toggleKnobOn : null) }} />
                  </button>
                </div>
                {timerOn && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10 }}>
                    <input type="number" min="5" max="300" value={timerSecs}
                      onChange={e => { const v = Math.max(5, Math.min(300, Number(e.target.value)||5)); setTimerSecs(v); }}
                      style={{ width:70, padding:'7px 10px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--sidebar-bg)', color:'var(--ink)', fontSize:15, fontWeight:700, fontFamily:'inherit', textAlign:'center', outline:'none' }} />
                    <span style={{fontSize:12, color:'var(--gray)'}}>{tt(lang, 'seconds')}</span>
                    <div style={{display:'flex', gap:4, marginLeft:'auto'}}>
                      {[15,30,60,90].map(s => {
                        const diff = DIFF.find(d => d.id === selectedDiffs[0]) || DIFF[1];
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

        {maxQ > 0 && (
          <>
            <div style={divider} />
            <div
              className="quiz-launch-actions"
              style={{
                ...quizS.launcherActions,
                gridTemplateColumns: scopeStats.missed > 0 ? 'minmax(0, 1fr) minmax(220px, .48fr)' : 'minmax(0, 1fr)',
              }}
            >
              <button
                onClick={() => startQuiz({ _autoStart:true, _difficulties:selectedDiffs, _timerOn:timerOn, _timerSecs:timerSecs, studyMode:'new' })}
                disabled={maxQ === 0}
                style={{
                  ...quizS.primaryStartBtn,
                  background: `linear-gradient(135deg, ${selectedPalette.dot} 0%, ${selectedPalette.dot}cc 100%)`,
                  boxShadow: `0 14px 26px -20px ${selectedPalette.dot}`,
                }}
                onMouseEnter={e => { if (maxQ > 0) e.currentTarget.style.opacity='.92'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity='1'; }}
              >
                {scopeStats.unseen > 0
                  ? (lang === 'it' ? `Inizia ${effectiveNumQ} domande nuove` : `Start ${effectiveNumQ} new questions`)
                  : (lang === 'it' ? `Ripassa ${effectiveNumQ} domande` : `Review ${effectiveNumQ} questions`)}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
              {scopeStats.missed > 0 && (
                <button type="button" onClick={() => startQuiz({ _autoStart:true, _difficulties:selectedDiffs, _timerOn:timerOn, _timerSecs:timerSecs, studyMode:'missed', numQ: missedEffectiveQ })} style={quizS.missedStartBtn}>
                  {lang === 'it' ? `Rifai ${missedEffectiveQ} errori` : `Retry ${missedEffectiveQ} missed`}
                </button>
              )}
            </div>
          </>
        )}
      </div>}

      {selectedExam && chapterMastery.length > 0 && (
        <section>
          <div style={secLabel}>{tt(lang, 'chapters')} — {selectedExam.name}</div>
          <div className="quiz-chapter-grid" style={{ display:'grid', gridTemplateColumns:isMobile ? 'minmax(0, 1fr)' : 'repeat(3, minmax(0, 1fr))', gap:14 }}>
            {chapterMastery.map(({ chapter, stats, score, coverage, enoughCoverage, tone }) => {
              const active = String(selectedChapterId) === String(chapter.id);
              const questionsLabel = stats.total === 1
                ? (lang === 'it' ? '1 domanda' : '1 question')
                : (lang === 'it' ? `${stats.total} domande` : `${stats.total} questions`);
              const masteryLabel = tone.label || `${stats.seen}/${stats.total || 0}`;
              const progressWidth = enoughCoverage ? Math.max(4, score) : Math.max(4, coverage);
              const disabled = stats.total === 0;
              return (
                <button
                  key={chapter.id}
                  type="button"
                  className="quiz-chapter-card"
                  onClick={() => setSelectedChapterId(chapter.id)}
                  style={{
                    minHeight:164,
                    display:'grid',
                    alignContent:'space-between',
                    gap:14,
                    padding:14,
                    borderRadius:18,
                    border:`1.5px solid ${active ? selectedPalette.dot : 'var(--border)'}`,
                    borderTop:`5px solid ${stats.total ? selectedPalette.dot : `${selectedPalette.dot}44`}`,
                    background:'var(--surface)',
                    color:'var(--ink)',
                    cursor:'pointer',
                    textAlign:'left',
                    boxShadow:active ? `0 18px 38px -34px ${selectedPalette.dot}` : '0 18px 38px -34px rgba(15,16,53,.30)',
                    transition:'transform .15s ease, box-shadow .15s ease, border-color .15s ease',
                    opacity: disabled ? .72 : 1,
                  }}
                >
                  <div className="quiz-chapter-top" style={{ display:'flex', alignItems:'flex-start', gap:12, minWidth:0 }}>
                    <span style={{ width:42, height:42, borderRadius:12, display:'grid', placeItems:'center', flexShrink:0, fontSize:22, background:selectedPalette.bg, border:`1.5px solid ${selectedPalette.dot}33` }}>
                        {getExamEmoji(selectedExam)}
                    </span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <h3 style={{ margin:0, color:'var(--ink)', fontSize:14, fontWeight:850, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{chapter.title}</h3>
                      <p style={{ margin:'4px 0 0', color:'var(--gray)', fontSize:12, fontWeight:650 }}>{questionsLabel}</p>
                    </div>
                    <span className="quiz-chapter-mastery" style={{ fontSize:12, fontWeight:850, color:selectedPalette.text, background:selectedPalette.bg, padding:'4px 8px', borderRadius:999, lineHeight:1.15, whiteSpace:'nowrap' }}>
                      {masteryLabel}
                    </span>
                  </div>
                  <div style={{ height:4, borderRadius:999, background:'var(--border)', overflow:'hidden' }}>
                    <div style={{ width:`${Math.min(100, progressWidth)}%`, height:'100%', borderRadius:999, background:selectedPalette.dot }} />
                  </div>
                  <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:8, color:'var(--gray)', fontSize:11, fontWeight:850 }}>
                    <span>{stats.unseen} {lang === 'it' ? 'mai viste' : 'unseen'}</span>
                    <span>{stats.seen}/{stats.total} {lang === 'it' ? 'viste' : 'seen'}</span>
                    <span style={{ color:stats.missed ? '#DC2626' : 'var(--gray)' }}>{stats.missed} {lang === 'it' ? 'errori' : 'missed'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Past quiz runs */}
      {filteredRuns.length > 0 && (
        <div style={{ maxWidth: 760, width:'100%', margin: '8px auto 0' }}>
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 24 }} />
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{tt(lang, 'previousQuizzes')}</h3>
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
                    <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>{tt(lang, 'selectedQuestions', { count: run.numQ, total: run.numQ })} · {run.date}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setReviewRun(run)}
                      style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--gray)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      {tt(lang, 'review')}
                    </button>
                    <button onClick={() => {
                      const exam = exams.find(e => e.id === run.examId);
                      const retryQuestions = getPlayableQuestions(run.questions && run.questions.length > 0 ? run.questions : (() => {
                        const qs = run.chapterId === 'all'
                          ? (exam?.chapters || []).flatMap(c => c.questions || [])
                          : (exam?.chapters.find(c => c.id === run.chapterId)?.questions || []);
                        return qs.slice(0, run.numQ);
                      })());
                      if (!retryQuestions.length) {
                        setQuizError(tt(lang, 'oldQuizNotPlayable'));
                        return;
                      }
                      setActiveDeck({
                        noteId: run.chapterId === 'all' ? run.examId : run.chapterId,
                        subject: exam?.subject || '',
                        title: run.chapterName || run.examName || '',
                        questions: retryQuestions,
                        _meta: { examId: run.examId, examName: run.examName, chapterId: run.chapterId, chapterName: run.chapterName, numQ: retryQuestions.length },
                        _examColor: exam?.color || null,
                        _examDot: exam?.dot || null,
                        _autoStart: true,
                      });
                    }}
                      style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid var(--indigo)', background: '#EEF2FF', color: 'var(--indigo)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      {tt(lang, 'tryAgain')}
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
