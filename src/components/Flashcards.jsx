import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, ChevronLeft, ChevronRight, Pencil, Play, Plus, Trash2, XMark } from '../lib/icons';
import { getExamEmoji, getExamPalette, SubjectIcon } from '../lib/examUi';
import useIsMobile from '../lib/useIsMobile';
import { getSubjectPalette } from '../data/mockData';
import { createFlashcard, deleteFlashcard, listFlashcards, submitFlashcardReview, updateFlashcard } from '../services/flashcards';
import { localeFor, tt } from '../lib/i18n';

function FlashStyles() {
  return (
    <style>{`
      @keyframes fSlideIn  { from { opacity:0; transform:translateX(18px);  } to { opacity:1; transform:translateX(0); } }
      @keyframes fSlideBack { from { opacity:0; transform:translateX(-18px); } to { opacity:1; transform:translateX(0); } }
      @keyframes fFadeUp   { from { opacity:0; transform:translateY(16px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
      .flash-interactive { will-change: transform; }
      @media (hover:hover) {
        .flash-exam-pill:hover,
        .flash-scope-chip:hover,
        .flash-count-btn:hover,
        .flash-chapter-card:hover {
          transform: translateY(-1px);
        }
        .flash-primary-cta:hover {
          transform: translateY(-1px);
          filter: saturate(1.05);
        }
      }
      .flash-exam-pill:active,
      .flash-scope-chip:active,
      .flash-count-btn:active,
      .flash-primary-cta:active,
      .flash-chapter-card:active {
        transform: translateY(0) scale(.99);
      }
      .flash-exam-pill:focus-visible,
      .flash-scope-chip:focus-visible,
      .flash-count-btn:focus-visible,
      .flash-primary-cta:focus-visible {
        outline: 3px solid rgba(55,48,232,.22);
        outline-offset: 3px;
      }
      @media (max-width: 640px) {
        .flash-exam-rail {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .flash-exam-pill {
          width: 100%;
          justify-content: center;
          min-width: 0;
        }
        .flash-launcher-stat {
          flex: 1 1 100%;
          justify-content: center;
        }
        .flash-launch-actions {
          grid-template-columns: 1fr !important;
        }
      }
    `}</style>
  );
}

function normalizeFlashcard(card) {
  return {
    ...card,
    front: card.front ?? card.q ?? '',
    back: card.back ?? card.a ?? '',
    q: card.q ?? card.front ?? '',
    a: card.a ?? card.back ?? '',
  };
}

function cleanFlashcardText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function hasBadFlashcardReference(value = '') {
  const text = cleanFlashcardText(value).toLowerCase();
  return (
    /\b(pdf|file|documento|materiale caricato|uploaded material|source text|page|pagina|chapter|capitolo|figure|figura|indice|index|table of contents|sommario|study point|punto\s+studio|appendix|appendice|section|sezione)\b/.test(text) ||
    /\btesi\s+matr\b|\bmatr\.\s*\d+/i.test(text) ||
    /\b\d{1,2}\.\d{1,2}(?:\.\d{1,2})?\b/.test(text)
  );
}

function hasBrokenFlashcardText(value = '') {
  const text = cleanFlashcardText(value);
  return (
    !text ||
    /\.{2,}|…/.test(text) ||
    /^[,.;:)\]-]/.test(text) ||
    /(?:\b(di|del|della|delle|che|per|con|tra|fra|a|in|il|la|lo|gli|le|un|una|the|of|to|and|with|for|come|da|al|ai)\b)[,;:]?$/i.test(text)
  );
}

function isGenericFlashcardFront(value = '') {
  const text = cleanFlashcardText(value).toLowerCase();
  return [
    'main point from uploaded material',
    'key detail',
    'core idea of',
    'best review method',
    'common weak point',
    'example check',
    'next step after a mistake',
    'what is the main idea',
    'qual è il concetto principale',
    'spiega questo concetto',
  ].some((pattern) => text.includes(pattern));
}

function isPlayableFlashcard(card = {}) {
  const front = cleanFlashcardText(card.front || card.q);
  const back = cleanFlashcardText(card.back || card.a);
  const visibleTexts = [front, back, card.topic];
  return (
    front.length > 0 &&
    back.length > 0 &&
    front.toLowerCase() !== back.toLowerCase() &&
    !isGenericFlashcardFront(front) &&
    !visibleTexts.some(hasBadFlashcardReference) &&
    ![front, back].some(hasBrokenFlashcardText)
  );
}

function realId(value) {
  return value && value !== 'all' ? value : null;
}

const FLASHCARD_ROTATION_PREFIX = 'lockeen.flashcardRotation.v1';

function getFlashcardRotationId(card = {}, index = 0) {
  if (card.id || card.flashcardId) return String(card.id || card.flashcardId);
  const front = cleanFlashcardText(card.front || card.q).slice(0, 90);
  const back = cleanFlashcardText(card.back || card.a).slice(0, 90);
  return `${index}:${front}:${back}`;
}

function shuffleFlashcards(items = []) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function readFlashcardRotation(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(`${FLASHCARD_ROTATION_PREFIX}:${key}`) || '[]');
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeFlashcardRotation(key, ids) {
  try {
    localStorage.setItem(`${FLASHCARD_ROTATION_PREFIX}:${key}`, JSON.stringify([...ids].slice(-500)));
  } catch {
    // Rotation is a UX helper only; studying still works if storage is unavailable.
  }
}

function selectRotatingFlashcards(cards = [], count = 10, rotationKey = 'default') {
  const indexedCards = cards.map((card, index) => ({
    card,
    id: getFlashcardRotationId(card, index),
  }));
  const availableIds = new Set(indexedCards.map((item) => item.id));
  const activeSeenIds = new Set([...readFlashcardRotation(rotationKey)].filter((id) => availableIds.has(id)));
  const unseen = indexedCards.filter((item) => !activeSeenIds.has(item.id));
  const seen = indexedCards.filter((item) => activeSeenIds.has(item.id));
  const shouldRecycle = unseen.length === 0;
  const selected = shuffleFlashcards(shouldRecycle ? indexedCards : unseen).slice(0, count);

  if (selected.length < count && !shouldRecycle) {
    selected.push(...shuffleFlashcards(seen).slice(0, count - selected.length));
  }

  const nextSeenIds = shouldRecycle ? new Set() : activeSeenIds;
  selected.forEach((item) => nextSeenIds.add(item.id));
  writeFlashcardRotation(rotationKey, nextSeenIds);

  return selected.map((item) => item.card);
}

function FlashResultScreen({ percent, correct, total, palette, title, subject, subjectStyle, saveError, saved, onReset, onBack, lang = 'en' }) {
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
  const titleText = percent >= 80 ? tt(lang, 'excellentWork') : percent >= 60 ? tt(lang, 'goodEffort') : tt(lang, 'keepStudying');
  return (
    <>
      <FlashStyles />
      <div style={{ ...flashS.resultWrap, animation: 'fFadeUp .45s cubic-bezier(.22,1,.36,1)' }}>
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
        <h2 style={flashS.resultTitle}>{titleText}</h2>
        <p style={flashS.resultSub}>{title}</p>
        {saved && <p style={{ ...flashS.resultSub, color:'#10B981' }}>{tt(lang, 'progressSaved')}</p>}
        {saveError && <p style={{ ...flashS.resultSub, color:'#DC2626' }}>{saveError}</p>}
        <div style={flashS.resultActions}>
          <button onClick={onReset} style={{ ...flashS.tryAgainBtn, background: palette.dot }}>{tt(lang, 'tryAgain')}</button>
          <button onClick={onBack} style={flashS.backBtn}>{tt(lang, 'backToDecks')}</button>
        </div>
      </div>
    </>
  );
}

function EmptyFlashcardState({ lang, setTab }) {
  const isIt = lang === 'it';
  return (
    <div style={flashS.emptyState}>
      <div style={flashS.emptyIcon}><BookOpen size={24} /></div>
      <h3 style={flashS.emptyTitle}>{tt(lang, 'noExamsYet')}</h3>
      <p style={flashS.emptyText}>
        {isIt
          ? 'Crea il primo esame e carica il materiale: troverai qui le flashcard appena saranno pronte.'
          : 'Create your first exam and upload material: your flashcards will appear here as soon as they are ready.'}
      </p>
      <button type="button" onClick={() => setTab('notes')} style={flashS.emptyCta}>
        <Plus size={18} /> {tt(lang, 'newExam')}
      </button>
    </div>
  );
}

export function FlashcardLanding({ deck, recentDecks, onOpenDeck, onOpenExam, setTab, darkMode, exams = [], lang = 'en' }) {
  const isMobile = useIsMobile();
  const [selectedExamId, setSelectedExamId] = useState(deck?._examId ?? deck?._practiceConfig?.examId ?? exams[0]?.id ?? null);
  const [selectedChapterId, setSelectedChapterId] = useState(deck?._practiceConfig?.chapterId ?? 'all');
  const [numCards, setNumCards] = useState(deck?._practiceConfig?.count ?? 10);
  const [cards, setCards] = useState([]);
  const [cardsExamId, setCardsExamId] = useState(null);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardsLoaded, setCardsLoaded] = useState(false);
  const [cardsError, setCardsError] = useState('');
  const [form, setForm] = useState({ chapterId: '', front: '', back: '' });
  const [editingId, setEditingId] = useState(null);
  const [managedChapterId, setManagedChapterId] = useState(null);
  const [reviewSession, setReviewSession] = useState(null);
  const [expandedReviewCard, setExpandedReviewCard] = useState(null);
  const manageFormRef = useRef(null);
  const setupRef = useRef(null);
  const loadCardsSeqRef = useRef(0);
  const autoStartRef = useRef(false);
  const selectedExam = exams.find(e => e.id === selectedExamId);
  const selectedPalette = selectedExam ? getExamPalette(selectedExam, darkMode) : getSubjectPalette('', {}, darkMode);

  const fmtDate = (ts) => new Date(ts).toLocaleDateString(localeFor(lang), { day:'numeric', month:'short' });
  const fmtScore = (s) => s >= 80 ? { label: s + '%', color: '#10B981', bg:'#ECFDF5' } : s >= 60 ? { label: s + '%', color: '#F59E0B', bg:'#FFFBEB' } : { label: s + '%', color: '#EF4444', bg:'#FEF2F2' };

  const sL = { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--gray)', marginBottom:12 };

  const loadCards = async (examId = selectedExamId) => {
    if (!examId) return;
    const requestId = loadCardsSeqRef.current + 1;
    loadCardsSeqRef.current = requestId;
    setCardsExamId(examId);
    setCards([]);
    setLoadingCards(true);
    setCardsLoaded(false);
    setCardsError('');
    const result = await listFlashcards({ examId });
    if (loadCardsSeqRef.current !== requestId) return;
    if (result.error) {
      setCardsError(result.error.message || tt(lang, 'couldNotLoadFlashcards'));
      setCards([]);
    } else {
      setCards((result.data || []).map(normalizeFlashcard));
    }
    setCardsLoaded(true);
    setLoadingCards(false);
  };

  useEffect(() => {
    if (!selectedExamId) return;
    loadCards(selectedExamId);
  }, [selectedExamId]);

  useEffect(() => {
    if (!deck?._practiceConfig) return;
    autoStartRef.current = false;
    setSelectedExamId(deck._examId ?? deck._practiceConfig.examId ?? exams[0]?.id ?? null);
    setSelectedChapterId(deck._practiceConfig.chapterId || 'all');
    setNumCards(deck._practiceConfig.count || 10);
  }, [deck, exams]);

  useEffect(() => {
    const firstChapterId = selectedExam?.chapters?.[0]?.id || '';
    setForm({ chapterId: firstChapterId, front: '', back: '' });
    setEditingId(null);
    setManagedChapterId(null);
    if (!deck?._practiceConfig) setSelectedChapterId('all');
  }, [selectedExamId, selectedExam]);

  const cardsBelongToSelectedExam = selectedExamId && String(cardsExamId) === String(selectedExamId);
  const selectedExamCards = cardsBelongToSelectedExam ? cards : [];
  const deckFallbackCards = deck?._practiceConfig?.source === 'analytics-grade-predictor' &&
    String(deck?._examId ?? deck?._practiceConfig?.examId) === String(selectedExamId)
    ? (deck.cards || []).map(normalizeFlashcard)
    : [];
  const playableCards = (selectedExamCards.length ? selectedExamCards : deckFallbackCards).filter(isPlayableFlashcard);
  const getCardsForChapter = (chapter) => {
    const serviceCards = playableCards.filter((card) => String(card.chapterId) === String(chapter.id));
    if (cardsLoaded && !cardsError) return serviceCards;
    const fallbackCards = (chapter.cards || []).map(normalizeFlashcard).filter(isPlayableFlashcard);
    return serviceCards.length ? serviceCards : fallbackCards;
  };
  const availableCards = selectedChapterId === 'all'
    ? playableCards
    : playableCards.filter((card) => String(card.chapterId) === String(selectedChapterId));
  const maxCards = availableCards.length;
  const focusedFromNotes = deck?._practiceConfig?.source === 'study-material';
  const waitingForPractice = focusedFromNotes && !loadingCards && maxCards === 0;
  useEffect(() => {
    if (!focusedFromNotes || !selectedExamId || maxCards > 0 || loadingCards) return undefined;
    let cancelled = false;
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      const result = await listFlashcards({ examId: selectedExamId });
      if (!cancelled && !result.error) {
        setCards((result.data || []).map(normalizeFlashcard));
        setCardsLoaded(true);
      }
      if (attempts >= 20) clearInterval(timer);
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [focusedFromNotes, selectedExamId, maxCards, loadingCards]);

  const selectedChapter = selectedChapterId === 'all'
    ? null
    : selectedExam?.chapters?.find((chapter) => String(chapter.id) === String(selectedChapterId));
  const focusTitle = selectedChapter?.title || deck?._practiceConfig?.chapterName || selectedExam?.name || 'Flashcards';
  const focusScopeLabel = selectedChapterId === 'all' ? tt(lang, 'wholeExam') : tt(lang, 'chapter');
  const countCardsForChapter = (chapterId) => {
    if (!selectedExam) return 0;
    if (chapterId === 'all') return playableCards.length;
    return playableCards.filter((card) => String(card.chapterId) === String(chapterId)).length;
  };
  const getCardProgressId = (card = {}, index = 0) => {
    const id = card.id || card.flashcardId || card.cardId;
    return id ? String(id) : getFlashcardRotationId(card, index);
  };
  const getScopePracticeStats = (sourceCards = []) => {
    const cardEntries = sourceCards.map((card, index) => ({ card, id: getCardProgressId(card, index) }));
    const sourceIds = new Set(cardEntries.map((entry) => entry.id));
    const latestKnownById = new Map();
    const orderedReviews = [...recentDecks].sort((a, b) => Number(a?.ts || 0) - Number(b?.ts || 0));

    orderedReviews.forEach((review) => {
      const answers = Array.isArray(review?.answers) ? review.answers : [];
      if (answers.length) {
        answers.forEach((answer) => {
          const answerId = answer?.flashcardId || answer?.id || answer?.cardId;
          if (!answerId || !sourceIds.has(String(answerId))) return;
          latestKnownById.set(String(answerId), answer.known === true);
        });
        return;
      }

      if (Array.isArray(review?.cards)) {
        review.cards.forEach((card, index) => {
          const cardId = getCardProgressId(card, index);
          if (!sourceIds.has(cardId) || typeof card.known !== 'boolean') return;
          latestKnownById.set(cardId, card.known === true);
        });
      }
    });

    const seenIds = new Set(latestKnownById.keys());
    const missedIds = new Set([...latestKnownById.entries()].filter(([, known]) => !known).map(([id]) => id));
    const knownIds = new Set([...latestKnownById.entries()].filter(([, known]) => known).map(([id]) => id));
    const unseenCards = cardEntries.filter((entry) => !seenIds.has(entry.id)).map((entry) => entry.card);
    const missedCards = cardEntries.filter((entry) => missedIds.has(entry.id)).map((entry) => entry.card);

    return {
      total: sourceCards.length,
      seen: seenIds.size,
      unseen: unseenCards.length,
      missed: missedCards.length,
      known: knownIds.size,
      unseenCards,
      missedCards,
    };
  };
  const getChapterProgress = (chapter, rawCount) => {
    const stats = getScopePracticeStats(playableCardsForChapter(chapter.id));
    if (!stats.seen || !rawCount) return null;
    const coverage = Math.min(100, Math.round((stats.seen / rawCount) * 100));
    const score = Math.max(0, Math.min(100, Math.round((stats.known / stats.seen) * 100)));
    const reliableThreshold = Math.min(rawCount, Math.max(5, Math.ceil(rawCount * 0.4)));
    const reliable = stats.seen >= reliableThreshold;
    const tone = reliable ? fmtScore(score) : { label: `${Math.min(stats.seen, rawCount)}/${rawCount}`, color: '#64748B', bg: '#F1F5F9' };
    return {
      score,
      coverage,
      reliable,
      label: tone.label,
      color: tone.color,
      bg: tone.bg,
      detail: reliable
        ? (lang === 'it' ? 'Mastery pesata' : 'Weighted mastery')
        : (lang === 'it' ? 'Carte viste' : 'Cards seen'),
    };
  };
  const scopeStats = getScopePracticeStats(availableCards);
  const primaryPracticeCards = scopeStats.unseenCards.length ? scopeStats.unseenCards : availableCards;
  const primaryMaxCards = primaryPracticeCards.length;
  const effectiveCards = Math.min(numCards, primaryMaxCards || maxCards || 1);
  const missedEffectiveCards = Math.min(numCards, scopeStats.missedCards.length);
  const studyTargetTitle = selectedChapter?.title || selectedExam?.name || 'Flashcards';
  const primaryStudyLabel = scopeStats.unseen > 0
    ? (lang === 'it'
      ? `Inizia ${effectiveCards} nuove`
      : `Start ${effectiveCards} new`)
    : (lang === 'it'
      ? `Ripassa ${effectiveCards} carte`
      : `Review ${effectiveCards} cards`);
  const startConfiguredDeck = (mode = 'new') => {
    if (!selectedExam || !maxCards) return;
    const chapter = selectedChapterId === 'all' ? null : selectedExam.chapters.find((item) => String(item.id) === String(selectedChapterId));
    const pool = mode === 'missed' ? scopeStats.missedCards : primaryPracticeCards;
    const count = Math.min(numCards, pool.length || 1);
    if (!pool.length) return;
    const rotationKey = [
      selectedExam.id,
      chapter?.id || 'all',
      deck?._practiceConfig?.sourceMaterialId || deck?._practiceConfig?.noteId || 'all-materials',
      mode,
    ].map(String).join(':');
    const sessionCards = selectRotatingFlashcards(pool, count, rotationKey);
    onOpenDeck({
      noteId: chapter?.id || selectedExam.id,
      subject: selectedExam.subject,
      title: chapter?.title || selectedExam.name,
      cards: sessionCards,
      _examColor: selectedExam.color || null,
      _examDot: selectedExam.dot || null,
      _meta: {
        ...(deck?._practiceConfig || {}),
        examId: selectedExam.id,
        examName: selectedExam.name,
        examColor: selectedExam.color || null,
        examDot: selectedExam.dot || null,
        chapterId: chapter?.id || 'all',
        chapterName: chapter?.title || tt(lang, 'wholeExam'),
        numCards: count,
        studyMode: mode,
      },
    });
  };

  useEffect(() => {
    const shouldAutoStart =
      deck?._practiceConfig?.source === 'analytics-grade-predictor' &&
      deck._practiceConfig.autoStart === true;
    if (!shouldAutoStart || autoStartRef.current || loadingCards || !cardsLoaded || !maxCards) return;
    autoStartRef.current = true;
    startConfiguredDeck('new');
  }, [deck, loadingCards, cardsLoaded, maxCards]);

  const submitCardForm = async (event) => {
    event.preventDefault();
    if (!selectedExamId || !form.chapterId) return;
    setCardsError('');
    const input = {
      examId: selectedExamId,
      chapterId: form.chapterId,
      front: form.front.trim(),
      back: form.back.trim(),
    };
    const result = editingId
      ? await updateFlashcard(editingId, input)
      : await createFlashcard(input);
    if (result.error) {
      setCardsError(result.error.message || tt(lang, 'couldNotSaveFlashcard'));
      return;
    }
    setForm({ chapterId: form.chapterId, front: '', back: '' });
    setEditingId(null);
    await loadCards(selectedExamId);
  };

  const startEditCard = (card) => {
    setEditingId(card.id);
    setForm({
      chapterId: card.chapterId || selectedExam?.chapters?.[0]?.id || '',
      front: card.front || card.q || '',
      back: card.back || card.a || '',
    });
    requestAnimationFrame(() => {
      manageFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const removeCard = async (id) => {
    setCardsError('');
    const result = await deleteFlashcard(id);
    if (result.error) {
      setCardsError(result.error.message || tt(lang, 'couldNotDeleteFlashcard'));
      return;
    }
    await loadCards(selectedExamId);
  };

  const rawCardsForChapter = (chapterId) => cards.filter((card) => String(card.chapterId) === String(chapterId));
  const playableCardsForChapter = (chapterId) => playableCards.filter((card) => String(card.chapterId) === String(chapterId));
  const managedChapter = selectedExam?.chapters?.find((chapter) => String(chapter.id) === String(managedChapterId));
  const managedCards = managedChapter ? rawCardsForChapter(managedChapter.id) : [];

  const openManageChapter = (chapter) => {
    setManagedChapterId(chapter.id);
    setEditingId(null);
    setForm({ chapterId: chapter.id, front: '', back: '' });
  };

  const closeManageChapter = () => {
    setManagedChapterId(null);
    setEditingId(null);
    setForm((current) => ({ ...current, front: '', back: '' }));
  };

  const buildReviewCards = (recent, sourceCards = cards) => {
    const reviewAnswers = Array.isArray(recent?.answers) ? recent.answers : [];
    if (Array.isArray(recent?.cards) && recent.cards.length) {
      return recent.cards.map((card, index) => ({
        ...normalizeFlashcard(card),
        known: reviewAnswers[index]?.known,
      })).filter((card) => cleanFlashcardText(card.front || card.q) && cleanFlashcardText(card.back || card.a));
    }
    return reviewAnswers
      .map((answer) => {
        const source = sourceCards.find((card) => String(card.id) === String(answer.flashcardId));
        const card = normalizeFlashcard(source || answer);
        return {
          ...card,
          front: card.front || answer.front || '',
          back: card.back || answer.back || '',
          known: answer.known,
        };
      })
      .filter((card) => cleanFlashcardText(card.front || card.q) && cleanFlashcardText(card.back || card.a));
  };
  const openRecentReview = async (recent) => {
    const reviewExamId = recent?._meta?.examId || recent?._examId || null;
    let sourceCards = cards;
    if (reviewExamId && String(reviewExamId) !== String(selectedExamId)) {
      const result = await listFlashcards({ examId: reviewExamId });
      sourceCards = result.error ? [] : (result.data || []).map(normalizeFlashcard);
      setSelectedExamId(reviewExamId);
    }
    const reviewCards = buildReviewCards(recent, sourceCards);
    setExpandedReviewCard(null);
    setReviewSession({ ...recent, cards: reviewCards });
  };
  const startReviewDeck = (session, missedOnly = false) => {
    const sessionCards = (session?.cards || [])
      .filter((card) => !missedOnly || card.known === false)
      .map(({ known, ...card }) => card);
    if (!sessionCards.length) return;
    onOpenDeck({
      ...session,
      title: missedOnly
        ? (lang === 'it' ? `Errori · ${session.title}` : `Missed · ${session.title}`)
        : session.title,
      cards: sessionCards,
      _meta: {
        ...(session._meta || {}),
        reviewMode: missedOnly ? 'missed' : 'session',
      },
    });
  };
  const openSelectedExamForChapter = () => {
    if (selectedExam?.id && typeof onOpenExam === 'function') {
      onOpenExam(selectedExam.id);
      return;
    }
    setTab('notes');
  };

  return (
    <>
      <FlashStyles />
      <div style={{ display:'flex', flexDirection:'column', gap:24, width:'100%', maxWidth: exams.length === 0 ? 600 : 1120, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div>
            <h2 style={{ margin:'0 0 4px', fontSize:22, fontWeight:850, color:'var(--ink)', letterSpacing:'-.02em' }}>
              {focusedFromNotes ? `${tt(lang, 'flashcards')} · ${focusTitle}` : tt(lang, 'flashcards')}
            </h2>
            <p style={{ margin:0, color:'var(--gray)', fontSize:14, fontWeight:650 }}>{tt(lang, 'flashSub')}</p>
          </div>
        </div>

        {focusedFromNotes && (
          <div style={{ padding:'14px 16px', borderRadius:16, border:`1.5px solid ${selectedPalette.dot}33`, background:selectedPalette.bg, color:selectedPalette.text }}>
            <div style={{ fontSize:12, fontWeight:900, textTransform:'uppercase', letterSpacing:'.08em', opacity:.75 }}>{tt(lang, 'selectedScope', { scope: focusScopeLabel })}</div>
            <div style={{ marginTop:4, fontSize:16, fontWeight:900 }}>{focusTitle}</div>
            <div style={{ marginTop:3, fontSize:12, fontWeight:700, opacity:.75 }}>
              {loadingCards ? tt(lang, 'loadingFlashcards') : maxCards > 0 ? tt(lang, 'flashcardsReady', { count: maxCards }) : tt(lang, 'generatingFlashcardsBackground')}
            </div>
          </div>
        )}

        {exams.length === 0 && <EmptyFlashcardState lang={lang} setTab={setTab} />}

        {exams.length > 0 && (
          <section>
            <div style={sL}>{tt(lang, 'chooseExam')}</div>
            <div className="flash-exam-rail" style={isMobile ? flashS.examRailMobile : flashS.examRail}>
              {exams.map(exam => {
                const active = exam.id === selectedExamId;
                const pal = getExamPalette(exam, darkMode);
                const emoji = getExamEmoji(exam);
                return (
                  <button key={exam.id} type="button" className="flash-exam-pill flash-interactive" onClick={() => { setSelectedExamId(exam.id); setSelectedChapterId('all'); }}
                    style={{ ...flashS.examPill, borderColor: active ? pal.dot : 'var(--border)', background: active ? pal.dot : 'var(--surface)', color: active ? '#fff' : 'var(--ink)', boxShadow: active ? `0 18px 32px -22px ${pal.dot}` : '0 10px 24px -24px rgba(15,16,53,.45)' }}>
                    <span style={flashS.examEmoji}>{emoji}</span>
                    {exam.name}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {selectedExam && maxCards > 0 && (
          <section ref={setupRef} style={flashS.setupCard}>
            <div style={flashS.setupHeader}>
              <div style={{ minWidth:0 }}>
                <div style={flashS.launcherEyebrow}>{lang === 'it' ? 'Ripasso pronto' : 'Review ready'}</div>
                <h3 style={{ ...flashS.launcherTitle, whiteSpace: isMobile ? 'normal' : 'nowrap' }}>{studyTargetTitle}</h3>
                <p style={flashS.launcherSub}>
                  {scopeStats.unseen > 0
                    ? (lang === 'it'
                      ? `${scopeStats.unseen} carte mai viste su ${scopeStats.total}. Il prossimo ripasso parte da quelle nuove.`
                      : `${scopeStats.unseen} unseen cards out of ${scopeStats.total}. Your next review starts with new cards.`)
                    : (lang === 'it'
                      ? 'Hai già visto tutte le carte disponibili. Consolida il capitolo o ripassa solo gli errori.'
                      : 'You have seen every available card. Consolidate the chapter or focus only on missed cards.')}
                </p>
              </div>
              <div style={flashS.launcherStats}>
                <span className="flash-launcher-stat" style={{ ...flashS.launcherStat, background:'#ECFDF5', color:'#047857' }}>
                  <strong>{scopeStats.unseen}</strong>{lang === 'it' ? ' mai viste' : ' unseen'}
                </span>
                <span className="flash-launcher-stat" style={{ ...flashS.launcherStat, background:'#EEF2FF', color:'#3730E8' }}>
                  <strong>{scopeStats.seen}/{scopeStats.total}</strong>{lang === 'it' ? ' già viste' : ' seen'}
                </span>
                <span className="flash-launcher-stat" style={{ ...flashS.launcherStat, background:'#FEF2F2', color:'#B91C1C' }}>
                  <strong>{scopeStats.missed}</strong>{lang === 'it' ? ' errori' : ' missed'}
                </span>
              </div>
            </div>

            <div style={flashS.launcherBody}>
              <div style={flashS.setupGroup}>
                <div style={sL}>{tt(lang, 'chapter')}</div>
                <div style={flashS.scopeRow}>
                  {[{ id:'all', title:tt(lang, 'wholeExam') }, ...(selectedExam.chapters || []).map(ch => ({ id:ch.id, title:ch.title }))].map((chapter) => {
                    const cardCount = countCardsForChapter(chapter.id);
                    const active = selectedChapterId === chapter.id;
                    const disabled = cardCount === 0;
                    return (
                      <button
                        key={chapter.id}
                        type="button"
                        className="flash-scope-chip flash-interactive"
                        disabled={disabled}
                        onClick={() => {
                          if (disabled) return;
                          setSelectedChapterId(chapter.id);
                          setNumCards((current) => Math.min(current, cardCount));
                        }}
                        style={{
                          ...flashS.scopeChip,
                          borderColor: active ? selectedPalette.dot : 'var(--border)',
                          background: active ? selectedPalette.bg : 'var(--surface)',
                          color: active ? selectedPalette.text : disabled ? '#A7ADBD' : 'var(--ink)',
                          opacity: disabled ? .55 : 1,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <span style={flashS.scopeTitle}>{chapter.title}</span>
                        <span style={{ ...flashS.scopeCount, background: active ? selectedPalette.dot : '#EEF2FF', color: active ? '#fff' : 'var(--gray)' }}>{cardCount}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={flashS.countPanel}>
                <div style={{ ...sL, marginBottom:0 }}>{lang === 'it' ? 'Quanto ripassare' : 'Session size'}</div>
                <div style={flashS.countGrid}>
                  {[5, 10, 15, 20].map((count) => {
                    const disabled = count > (primaryMaxCards || maxCards);
                    const active = numCards === count && !disabled;
                    return (
                      <button
                        key={count}
                        type="button"
                        className="flash-count-btn flash-interactive"
                        disabled={disabled}
                        onClick={() => !disabled && setNumCards(count)}
                        style={{
                          ...flashS.countButton,
                          borderColor: active ? selectedPalette.dot : 'var(--border)',
                          background: active ? selectedPalette.bg : 'var(--surface)',
                          color: active ? selectedPalette.text : disabled ? '#C8CEDA' : 'var(--ink)',
                          opacity: disabled ? .45 : 1,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <strong style={flashS.countNumber}>{count}</strong>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              className="flash-launch-actions"
              style={{
                ...flashS.setupActions,
                gridTemplateColumns: scopeStats.missed > 0 ? 'minmax(0, 1fr) minmax(220px, .34fr)' : 'minmax(0, 1fr)',
              }}
            >
              <button type="button" className="flash-primary-cta flash-interactive" onClick={() => startConfiguredDeck('new')} style={{ ...flashS.startSetup, background:selectedPalette.dot }}>
                <Play size={16} />
                {primaryStudyLabel}
              </button>
              {scopeStats.missed > 0 && (
                <button type="button" className="flash-primary-cta flash-interactive" onClick={() => startConfiguredDeck('missed')} style={flashS.missedSetup}>
                  <Play size={16} />
                  {lang === 'it'
                    ? `Ripassa ${missedEffectiveCards} errori`
                    : `Review ${missedEffectiveCards} missed`}
                </button>
              )}
            </div>
          </section>
        )}

        {selectedExam && (
          <section>
            <div style={sL}>{tt(lang, 'chapters')} — {selectedExam.name}</div>
            {(selectedExam.chapters || []).length === 0 ? (
              <div style={flashS.chapterEmptyState}>
                <div style={flashS.emptyIcon}><BookOpen size={24} /></div>
                <h3 style={flashS.emptyTitle}>{tt(lang, 'noFlashcardsYet')}</h3>
                <p style={flashS.emptyText}>{lang === 'it' ? 'Aggiungi un capitolo e carica il materiale: le flashcard appariranno qui appena pronte.' : 'Add a chapter and upload material: flashcards will appear here as soon as they are ready.'}</p>
                <button type="button" onClick={openSelectedExamForChapter} style={flashS.emptyCta}>
                  <Plus size={18} /> {lang === 'it' ? 'Nuovo capitolo' : 'New Chapter'}
                </button>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap:14 }}>
                {(selectedExam.chapters || []).map((chapter) => {
                  const pal = selectedPalette;
                  const rawCount = rawCardsForChapter(chapter.id).length;
                  const chapterStats = getScopePracticeStats(playableCardsForChapter(chapter.id));
                  const progress = getChapterProgress(chapter, rawCount);
                  const statusText = rawCount ? tt(lang, 'cardsCount', { count: rawCount }) : tt(lang, 'noFlashcardsYet');
                  return (
                    <article key={chapter.id} className="flash-chapter-card flash-interactive" style={{ minHeight:164, display:'grid', alignContent:'space-between', gap:14, padding:14, borderRadius:18, border:`1.5px solid ${progress?.reliable ? pal.dot : 'var(--border)'}`, borderTop:`5px solid ${progress ? progress.color : `${pal.dot}44`}`, background:'var(--surface)', boxShadow:'0 18px 38px -34px rgba(15,16,53,.30)', transition:'transform .15s ease, box-shadow .15s ease, border-color .15s ease' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
                        <SubjectIcon subject={selectedExam.subject} size={42} radius={12} dot={pal.dot} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <h3 style={{ margin:0, color:'var(--ink)', fontSize:14, fontWeight:850, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{chapter.title}</h3>
                          <p style={{ margin:'4px 0 0', color:'var(--gray)', fontSize:12, fontWeight:650 }}>{statusText}</p>
                        </div>
                        {progress && (
                          <span title={progress.detail} style={{ fontSize:12, fontWeight:850, color:progress.color, background:progress.bg, padding:'4px 8px', borderRadius:999 }}>
                            {progress.label}
                          </span>
                        )}
                      </div>
                      <div style={{ height:4, borderRadius:999, background:'var(--border)', overflow:'hidden' }}>
                        <div style={{ width: progress ? `${progress.reliable ? progress.score : progress.coverage}%` : rawCount ? '18%' : '0%', height:'100%', borderRadius:999, background: progress ? progress.color : pal.dot }} />
                      </div>
                      {rawCount > 0 && (
                        <div style={flashS.chapterStats}>
                          <span>{chapterStats.unseen} {lang === 'it' ? 'mai viste' : 'unseen'}</span>
                          <span>{chapterStats.seen}/{chapterStats.total} {lang === 'it' ? 'viste' : 'seen'}</span>
                          <span>{chapterStats.missed} {lang === 'it' ? 'errori' : 'missed'}</span>
                        </div>
                      )}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:8 }}>
                        <button type="button" onClick={() => openManageChapter(chapter)}
                          style={{ minHeight:40, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7, border:'1.5px solid var(--border)', borderRadius:11, background:'var(--surface)', color:'var(--ink)', fontSize:13, fontWeight:850, cursor:'pointer' }}>
                          <Pencil size={14} /> {lang === 'it' ? 'Gestisci' : 'Manage'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {loadingCards && <p style={{ margin:'12px 0 0', color:'var(--gray)', fontSize:13 }}>{tt(lang, 'loadingFlashcards')}</p>}
            {cardsError && <p style={{ margin:'12px 0 0', color:'#DC2626', fontSize:13, fontWeight:750 }}>{cardsError}</p>}
          </section>
        )}

        {recentDecks.length > 0 && (
          <section>
            <div style={{ height:1, background:'var(--border)', marginBottom:18 }} />
            <div style={sL}>{tt(lang, 'recentSessions')}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:9, width:'100%' }}>
              {recentDecks.slice(0, 5).map((recent, index) => {
                const score = recent.lastScore != null ? fmtScore(recent.lastScore) : null;
                const deckExam = exams.find((exam) => String(exam.id) === String(recent._meta?.examId || recent._examId));
                const pal = getExamPalette(deckExam || { subject: recent.subject, color: recent._examColor || recent._meta?.examColor, dot: recent._examDot || recent._meta?.examDot }, darkMode);
                return (
                  <button key={`${recent.title}-${index}`} type="button" onClick={() => openRecentReview(recent)}
                    style={{ display:'flex', alignItems:'center', gap:12, width:'100%', minHeight:58, padding:'10px 12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, cursor:'pointer', textAlign:'left' }}>
                    <SubjectIcon subject={recent.subject} size={38} radius={10} dot={pal.dot} />
                    <span style={{ flex:1, minWidth:0 }}>
                      <strong style={{ display:'block', color:'var(--ink)', fontSize:13, fontWeight:850, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{recent.title}</strong>
                      <small style={{ display:'block', marginTop:2, color:'var(--gray)', fontSize:12, fontWeight:650 }}>{recent.subject} · {tt(lang, 'cardsCount', { count: (recent.cards || []).length })}{recent.ts ? ` · ${fmtDate(recent.ts)}` : ''}</small>
                    </span>
                    {score && <span style={{ fontSize:12, fontWeight:850, color:score.color, background:score.bg, padding:'4px 9px', borderRadius:999 }}>{score.label}</span>}
                    <span style={{ padding:'7px 13px', borderRadius:10, background:'var(--indigo)', color:'#fff', fontWeight:800, fontSize:12 }}>{tt(lang, 'review')}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {managedChapter && (
        <div style={flashS.manageOverlay}>
          <button type="button" aria-label={tt(lang, 'close')} onClick={closeManageChapter} style={flashS.manageScrim} />
          <aside style={{ ...flashS.manageDrawer, width: isMobile ? '100%' : 430 }}>
            <div style={flashS.manageTop}>
              <button type="button" onClick={closeManageChapter} style={flashS.manageBack}>{lang === 'it' ? 'Torna ai capitoli' : 'Back to chapters'}</button>
              <button type="button" onClick={closeManageChapter} style={flashS.manageClose}><XMark size={16} /></button>
            </div>
            <div style={{ color:'var(--gray)', fontSize:11, fontWeight:800, marginBottom:6 }}>{tt(lang, 'flashcards')} / {selectedExam.name}</div>
            <div style={flashS.manageTitleRow}>
              <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                <SubjectIcon subject={selectedExam.subject} size={38} radius={11} dot={selectedPalette.dot} />
                <h3 style={flashS.manageTitle}>{managedChapter.title}</h3>
              </div>
              <span style={flashS.manageCount}>{tt(lang, 'cardsCount', { count: managedCards.length })}</span>
            </div>
            <button type="button" disabled={!playableCardsForChapter(managedChapter.id).length} onClick={() => startReviewDeck({ title: managedChapter.title, subject: selectedExam.subject, cards: playableCardsForChapter(managedChapter.id), _meta: { examId: selectedExam.id, chapterId: managedChapter.id, examName: selectedExam.name, chapterName: managedChapter.title } }, false)}
              style={{ ...flashS.manageStudy, background: playableCardsForChapter(managedChapter.id).length ? 'var(--indigo)' : '#CBD5E1', cursor: playableCardsForChapter(managedChapter.id).length ? 'pointer' : 'not-allowed' }}>
              <Play size={14} /> {lang === 'it' ? 'Studia questo capitolo' : 'Study this chapter'}
            </button>
            <form ref={manageFormRef} onSubmit={submitCardForm} style={flashS.manageForm}>
              <div style={{ ...sL, marginBottom:0 }}>{editingId ? tt(lang, 'editFlashcard') : tt(lang, 'newFlashcard')}</div>
              <input value={form.front} onChange={event => setForm(current => ({ ...current, front: event.target.value }))} placeholder={lang === 'it' ? 'Scrivi la domanda o il termine...' : 'Write the question or term...'} style={flashS.manageInput} />
              <textarea value={form.back} onChange={event => setForm(current => ({ ...current, back: event.target.value }))} placeholder={lang === 'it' ? 'Scrivi la risposta o la spiegazione...' : 'Write the answer or explanation...'} rows={4} style={{ ...flashS.manageInput, resize:'vertical', minHeight:88 }} />
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <button type="submit" style={flashS.manageCreate}>{editingId ? tt(lang, 'save') : tt(lang, 'create')}</button>
                {editingId && (
                  <button type="button" onClick={() => { setEditingId(null); setForm({ chapterId: managedChapter.id, front:'', back:'' }); }} style={flashS.manageCancel}>{tt(lang, 'cancel')}</button>
                )}
              </div>
            </form>
            <div style={flashS.manageList}>
              {managedCards.length === 0 ? (
                <div style={flashS.manageEmpty}>{tt(lang, 'noFlashcardsYet')}</div>
              ) : managedCards.map((card) => (
                <article key={card.id} style={flashS.manageCard}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <strong style={flashS.manageCardFront}>{card.front || card.q}</strong>
                    <span style={flashS.manageCardBack}>{card.back || card.a}</span>
                  </div>
                  <button type="button" onClick={() => startEditCard(card)} style={flashS.manageEdit}><Pencil size={13} /> {tt(lang, 'edit')}</button>
                  <button type="button" onClick={() => removeCard(card.id)} style={flashS.manageDelete}><Trash2 size={13} /> {tt(lang, 'delete')}</button>
                </article>
              ))}
            </div>
          </aside>
        </div>
      )}

      {reviewSession && (
        <div style={flashS.manageOverlay}>
          <button type="button" aria-label={tt(lang, 'close')} onClick={() => setReviewSession(null)} style={flashS.manageScrim} />
          <aside style={{ ...flashS.manageDrawer, width: isMobile ? '100%' : 480 }}>
            <div style={flashS.manageTop}>
              <button type="button" onClick={() => setReviewSession(null)} style={flashS.manageBack}>{lang === 'it' ? 'Torna alle sessioni' : 'Back to sessions'}</button>
              <button type="button" onClick={() => setReviewSession(null)} style={flashS.manageClose}><XMark size={16} /></button>
            </div>
            <div style={{ color:'var(--gray)', fontSize:11, fontWeight:800, marginBottom:6 }}>{lang === 'it' ? 'Sessione recente' : 'Recent session'}</div>
            <div style={flashS.manageTitleRow}>
              <h3 style={flashS.manageTitle}>{reviewSession.title}</h3>
              {reviewSession.lastScore != null && <span style={flashS.manageCount}>{reviewSession.lastScore}%</span>}
            </div>
            <div style={flashS.reviewActions}>
              <button type="button" disabled={!reviewSession.cards?.length} onClick={() => startReviewDeck(reviewSession, false)} style={{ ...flashS.manageStudy, background: reviewSession.cards?.length ? 'var(--indigo)' : '#CBD5E1' }}>
                <Play size={14} /> {lang === 'it' ? 'Ripassa tutte' : 'Review all'}
              </button>
              <button type="button" disabled={!reviewSession.cards?.some((card) => card.known === false)} onClick={() => startReviewDeck(reviewSession, true)} style={{ ...flashS.manageStudy, background: reviewSession.cards?.some((card) => card.known === false) ? '#EF4444' : '#CBD5E1' }}>
                <Play size={14} /> {lang === 'it' ? 'Ripassa errori' : 'Review missed'}
              </button>
            </div>
            <div style={flashS.manageList}>
              {!reviewSession.cards?.length ? (
                <div style={flashS.manageEmpty}>{lang === 'it' ? 'Questa sessione non ha carte recuperabili.' : 'This session has no recoverable cards.'}</div>
              ) : reviewSession.cards.map((card, index) => {
                const cardKey = `${card.id || card.front}-${index}`;
                const expanded = expandedReviewCard === cardKey;
                return (
                <button key={cardKey} type="button" onClick={() => setExpandedReviewCard(expanded ? null : cardKey)} style={{ ...flashS.manageCard, alignItems: expanded ? 'flex-start' : 'center', width:'100%', textAlign:'left', cursor:'pointer', borderColor: card.known === false ? '#FCA5A5' : '#BBF7D0', background: card.known === false ? '#FEF2F2' : '#F0FDF4' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <strong style={expanded ? flashS.reviewCardFrontExpanded : flashS.manageCardFront}>{card.front || card.q}</strong>
                    <span style={expanded ? flashS.reviewCardBackExpanded : flashS.manageCardBack}>{card.back || card.a}</span>
                    {!expanded && <small style={flashS.reviewCardHint}>{lang === 'it' ? 'Clicca per leggere tutto' : 'Click to read all'}</small>}
                  </div>
                  <span style={{ ...flashS.reviewBadge, color: card.known === false ? '#B91C1C' : '#047857', background: card.known === false ? '#FEE2E2' : '#D1FAE5' }}>
                    {card.known === false ? (lang === 'it' ? 'Da ripassare' : 'Missed') : (lang === 'it' ? 'Saputa' : 'Known')}
                  </span>
                </button>
              );})}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

export function FlashcardViewer({ noteId, subject, title, cards, _meta, _examColor, _examDot, setTab, darkMode, exams = [], onFlashComplete, onBackToLanding, lang = 'en' }) {
  const currentExam = exams.find((exam) => String(exam.id) === String(_meta?.examId || noteId));
  const palette = getExamPalette(currentExam || { subject, color: _meta?.examColor || _examColor, dot: _meta?.examDot || _examDot }, darkMode);
  const normalizedCards = (cards || []).map(normalizeFlashcard).filter(isPlayableFlashcard);
  const total = normalizedCards.length;
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [answered, setAnswered] = useState([]);
  const [seen, setSeen] = useState(() => new Set([0]));
  const [done, setDone] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const resultSavedRef = useRef(false);
  const [cardKey, setCardKey] = useState(0);
  const [cardDir, setCardDir] = useState(1); // 1=forward, -1=back

  const answeredCount = answered.filter((v) => v !== undefined).length;
  const allAnswered = answeredCount >= total;

  const reset = () => {
    setIdx(0);
    setCorrect(0);
    setFlipped(false);
    setAnswered([]);
    setSeen(new Set([0]));
    setDone(false);
    setSaveError('');
    setSaved(false);
    resultSavedRef.current = false;
  };

  useEffect(() => {
    reset();
  }, [subject, title, cards]);

  useEffect(() => {
    if (!done || !total || resultSavedRef.current) return;
    resultSavedRef.current = true;
    const completedAt = new Date().toISOString();
    const answers = normalizedCards.map((card, index) => ({
      flashcardId: card.id || null,
      known: answered[index] === true,
      front: card.front || card.q || '',
      back: card.back || card.a || '',
    }));
    async function saveReview() {
      const result = await submitFlashcardReview({
        examId: _meta?.examId || null,
        chapterId: realId(_meta?.chapterId),
        noteId: realId(_meta?.noteId) || (_meta?.examId ? null : realId(noteId)),
        sourceMaterialId: realId(_meta?.sourceMaterialId),
        score: correct,
        total,
        knownCount: correct,
        answers,
        completedAt,
      });
      if (result.error) {
        setSaveError(result.error.message || tt(lang, 'couldNotSaveFlashcardProgress'));
      } else {
        setSaved(true);
      }
      onFlashComplete && onFlashComplete(noteId, Math.round((correct / total) * 100), {
        ...(_meta || {}),
        title,
        subject,
        cards: normalizedCards,
        answers,
        savedReview: result.data || null,
      });
    }
    saveReview();
  }, [done, total, correct, noteId, onFlashComplete, _meta, title, subject, normalizedCards, answered]);

  if (!total) {
    return (
      <div style={flashS.emptyWrap}>
        <div style={{ ...flashS.subjectChip, background: palette.bg, color: palette.text, borderColor: palette.border }}>{subject}</div>
        <h2 style={flashS.resultTitle}>{tt(lang, 'noFlashcardsYet')}</h2>
        <p style={flashS.resultSub}>{title}</p>
        <button onClick={() => setTab('notes')} style={flashS.backBtn}>{tt(lang, 'backToStudy')}</button>
      </div>
    );
  }

  const isAnswered = answered[idx] !== undefined;
  const progress = ((idx + 1) / total) * 100;
  const current = normalizedCards[idx];

  const goTo = (nextIdx) => {
    if (nextIdx < 0 || nextIdx >= total) return;
    if (nextIdx > idx && answered[idx] === undefined) return;
    setCardDir(nextIdx > idx ? 1 : -1);
    setCardKey(k => k + 1);
    setSeen(prev => new Set([...prev, idx, nextIdx]));
    setIdx(nextIdx);
    setFlipped(answered[nextIdx] !== undefined);
  };

  const handleAnswer = (known) => {
    if (isAnswered) return;
    const nextAnswered = [...answered];
    nextAnswered[idx] = known;
    setAnswered(nextAnswered);
    setSeen(prev => new Set([...prev, idx]));
    if (known) setCorrect((c) => c + 1);
    setTimeout(() => {
      if (idx < total - 1) {
        setCardDir(1);
        setCardKey(k => k + 1);
        setSeen(prev => new Set([...prev, idx + 1]));
        setIdx((i) => i + 1);
        setFlipped(false);
      }
    }, 350);
  };

  if (done) {
    const percent = Math.round((correct / total) * 100);
    return (
      <FlashResultScreen
        percent={percent} correct={correct} total={total}
        palette={palette} title={title} subject={subject}
        subjectStyle={{ ...flashS.subjectChip, background: palette.bg, color: palette.text, borderColor: palette.border }}
        saveError={saveError}
        saved={saved}
        onReset={reset}
        onBack={() => onBackToLanding ? onBackToLanding() : setTab('notes')}
        lang={lang}
      />
    );
  }

  return (
    <>
      <FlashStyles />
      <div style={flashS.wrap}>
        <div style={flashS.headerRow}>
          <div style={flashS.headerLeft}>
            <span style={{ ...flashS.subjectChip, background: palette.bg, color: palette.text, borderColor: palette.border }}>{subject}</span>
            <span style={flashS.deckTitle}>{title}</span>
          </div>
          <span style={flashS.correctCount}>{tt(lang, 'flashKnownCount', { correct, total })}</span>
        </div>

        <div style={flashS.progressTrack}>
          <div style={{ ...flashS.progressFill, width: `${progress}%`, background: palette.dot }} />
        </div>

        <div key={cardKey} style={{ animation: `${cardDir >= 0 ? 'fSlideIn' : 'fSlideBack'} .26s cubic-bezier(.22,1,.36,1)` }}>
          <button
            type="button"
            onClick={() => { if (!isAnswered) setFlipped((v) => !v); }}
            style={flashS.cardStage}
          >
            <div style={{ ...flashS.cardInner, transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
              <div style={flashS.cardFront}>
                <span style={flashS.faceLabel}>{tt(lang, 'question')}</span>
                <div style={flashS.questionText}>{current.q}</div>
                <span style={flashS.cardHint}>{tt(lang, 'tapRevealAnswer')}</span>
              </div>
              <div style={{ ...flashS.cardBack, background: palette.bg, borderColor: palette.border }}>
                <span style={{ ...flashS.faceLabel, color: palette.text }}>{tt(lang, 'answer')}</span>
                <div style={{ ...flashS.answerText, color: palette.text }}>{current.a}</div>
              </div>
            </div>
          </button>
        </div>

      <div style={{ ...flashS.answerRow, opacity: flipped && !isAnswered ? 1 : 0, pointerEvents: flipped && !isAnswered ? 'auto' : 'none' }}>
        <button onClick={() => handleAnswer(false)} style={flashS.dontKnowBtn}>
          <XMark size={16} /> {tt(lang, 'stillLearning')}
        </button>
        <button onClick={() => handleAnswer(true)} style={flashS.knewBtn}>
          <Check size={16} /> {tt(lang, 'known')}
        </button>
      </div>

      <div style={flashS.navRow}>
        <button onClick={() => goTo(idx - 1)} disabled={idx === 0} style={{ ...flashS.navBtn, ...(idx === 0 ? flashS.navBtnDisabled : null) }}>
          <ChevronLeft size={16} />
        </button>
        <span style={flashS.navLabel}>{idx + 1} / {total}</span>
        <button onClick={() => goTo(idx + 1)} disabled={idx === total - 1 || !isAnswered} style={{ ...flashS.navBtn, ...(idx === total - 1 || !isAnswered ? flashS.navBtnDisabled : null) }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {!allAnswered && (
        <p style={{ textAlign:'center', fontSize:12, color:'var(--gray)', margin:0 }}>
          {tt(lang, 'answerEveryCard', { answered: answeredCount, total })}
        </p>
      )}

      <button
        onClick={() => setDone(true)}
        disabled={!allAnswered}
        style={{ width:'100%', borderRadius:14, padding:'14px 16px', fontWeight:700, fontSize:15, border:'none', cursor: allAnswered ? 'pointer' : 'not-allowed', background: allAnswered ? `linear-gradient(135deg, ${palette.dot} 0%, ${palette.dot}cc 100%)` : 'var(--border)', color: allAnswered ? '#fff' : 'var(--gray)', opacity: allAnswered ? 1 : 0.5, transition:'all .2s', boxShadow: allAnswered ? `0 4px 14px ${palette.dot}44` : 'none' }}>
        {allAnswered ? `✓ ${tt(lang, 'complete')}` : tt(lang, 'completeAnswers', { answered: answeredCount, total })}
      </button>
    </div>
    </>
  );
}

const flashS = {
  wrap: { maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 },
  headerRow: { maxWidth: 480, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },
  subjectChip: { display: 'inline-flex', alignItems: 'center', padding: '6px 10px', borderRadius: 999, border: '1px solid transparent', fontSize: 12, fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap' },
  deckTitle: { fontWeight: 600, color: 'var(--ink)', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  correctCount: { color: 'var(--gray)', fontSize: 12, whiteSpace: 'nowrap' },
  progressTrack: { maxWidth: 480, width: '100%', height: 4, borderRadius: 999, background: '#E5E7EB', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, transition: 'width .4s' },
  cardStage: { maxWidth: 480, width: '100%', height: 280, perspective: 1000, padding: 0, background: 'transparent', border: 'none', textAlign: 'left' },
  cardInner: { position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transition: 'transform .55s cubic-bezier(.4,0,.2,1)' },
  cardFront: { position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
  cardBack: { position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', border: '1.5px solid transparent', borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 18 },
  faceLabel: { color: 'var(--gray)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em' },
  questionText: { color: 'var(--ink)', fontSize: 20, fontWeight: 700, lineHeight: 1.35, textAlign: 'center', alignSelf: 'center' },
  answerText: { fontSize: 15, lineHeight: 1.6, fontWeight: 500 },
  cardHint: { color: 'var(--gray)', fontSize: 13, textAlign: 'center' },
  answerRow: { maxWidth: 480, width: '100%', display: 'flex', gap: 10, transition: 'opacity .2s ease' },
  dontKnowBtn: { flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, borderRadius: 14, border: '1px solid #fca5a5', background: '#FEE2E2', color: '#991B1B', fontWeight: 600 },
  knewBtn: { flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, borderRadius: 14, border: '1px solid #86efac', background: '#DCFCE7', color: '#166534', fontWeight: 600 },
  navRow: { maxWidth: 480, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 2 },
  navBtn: { width: 36, height: 36, borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', display: 'grid', placeItems: 'center' },
  navBtnDisabled: { opacity: .45, cursor: 'not-allowed' },
  navLabel: { minWidth: 42, textAlign: 'center', color: 'var(--gray)', fontSize: 13, fontWeight: 600 },
  resultWrap: { maxWidth: 480, minHeight: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center' },
  scoreCircle: { width: 96, height: 96, borderRadius: 999, border: '3px solid transparent', display: 'grid', placeItems: 'center', alignContent: 'center' },
  scorePercent: { fontSize: 28, lineHeight: 1, fontWeight: 800 },
  scoreFraction: { fontSize: 13, fontWeight: 700, marginTop: 4 },
  resultTitle: { margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--ink)' },
  resultSub: { margin: 0, color: 'var(--gray)', fontSize: 15 },
  resultActions: { display: 'flex', gap: 10, marginTop: 10 },
  tryAgainBtn: { padding: '12px 18px', borderRadius: 999, color: '#fff', fontWeight: 600 },
  backBtn: { padding: '12px 18px', borderRadius: 999, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontWeight: 600 },
  emptyWrap: { maxWidth: 480, minHeight: 360, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center' },
  emptyState: { minHeight: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '34px 24px', borderRadius: 22, border: '1.5px dashed var(--border)', background: 'linear-gradient(180deg, #FAFBFF 0%, #FFFFFF 100%)', textAlign: 'center', boxShadow: '0 18px 40px -34px rgba(15,16,53,.35)' },
  chapterEmptyState: { width: 'min(760px, 100%)', minHeight: 360, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '34px 24px', borderRadius: 22, border: '1.5px dashed var(--border)', background: 'linear-gradient(180deg, #FAFBFF 0%, #FFFFFF 100%)', textAlign: 'center', boxShadow: '0 18px 40px -34px rgba(15,16,53,.35)' },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, background: 'var(--lavender)', color: 'var(--indigo)', display: 'grid', placeItems: 'center' },
  emptyTitle: { margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-.02em' },
  emptyText: { margin: 0, maxWidth: 390, color: 'var(--gray)', fontSize: 15, fontWeight: 650, lineHeight: 1.5 },
  emptyCta: { marginTop: 4, minHeight: 48, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '0 20px', borderRadius: 16, border: 'none', background: 'var(--indigo)', color: '#fff', fontSize: 15, fontWeight: 900, cursor: 'pointer', boxShadow: '0 14px 28px -20px rgba(55,48,232,.8)' },
  examRail: { display:'flex', flexWrap:'wrap', gap:12, padding:'2px 0 4px' },
  examRailMobile: { display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:12, padding:'2px 0 4px' },
  examPill: { minHeight:52, display:'inline-flex', alignItems:'center', gap:11, padding:'0 20px', borderRadius:17, border:'1.5px solid var(--border)', fontSize:15, fontWeight:950, cursor:'pointer', transition:'transform .15s ease, box-shadow .15s ease, border-color .15s ease', letterSpacing:'-.01em' },
  examEmoji: { width:28, height:28, borderRadius:10, display:'inline-grid', placeItems:'center', fontSize:18, background:'rgba(255,255,255,.5)' },
  setupCard: { padding:18, borderRadius:22, border:'1px solid var(--border)', background:'linear-gradient(180deg, #FFFFFF 0%, #FBFCFF 100%)', boxShadow:'0 22px 54px -42px rgba(15,16,53,.38)', display:'grid', gap:16 },
  setupHeader: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:18, flexWrap:'wrap', paddingBottom:14, borderBottom:'1px solid #EEF1F7' },
  launcherEyebrow: { marginBottom:6, color:'var(--gray)', fontSize:11, fontWeight:900, textTransform:'uppercase', letterSpacing:'.1em' },
  launcherTitle: { margin:0, color:'var(--ink)', fontSize:22, fontWeight:950, letterSpacing:'-.03em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  launcherSub: { margin:'6px 0 0', color:'var(--gray)', fontSize:13, fontWeight:700, lineHeight:1.45 },
  launcherStats: { display:'flex', alignItems:'center', justifyContent:'flex-end', flexWrap:'wrap', gap:8, maxWidth:520 },
  launcherStat: { minHeight:34, display:'inline-flex', alignItems:'center', gap:5, borderRadius:999, padding:'0 11px', fontSize:12, fontWeight:850, whiteSpace:'nowrap' },
  launcherBody: { display:'grid', gridTemplateColumns:'1fr', gap:18, alignItems:'stretch' },
  setupHint: { margin:'4px 0 0', color:'var(--gray)', fontSize:13, fontWeight:650, lineHeight:1.45 },
  setupAvailable: { color:'var(--gray)', fontSize:12, fontWeight:850, whiteSpace:'nowrap' },
  setupGroup: { display:'grid', gap:9 },
  setupLine: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 },
  scopeRow: { display:'flex', flexWrap:'wrap', gap:8 },
  scopeChip: { minHeight:40, maxWidth:'100%', display:'inline-flex', alignItems:'center', gap:8, padding:'0 13px', borderRadius:14, border:'1.5px solid var(--border)', fontSize:13, fontWeight:850, transition:'all .15s' },
  scopeTitle: { overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  scopeCount: { minWidth:22, height:22, borderRadius:999, display:'inline-grid', placeItems:'center', padding:'0 6px', fontSize:11, fontWeight:900 },
  countPanel: { display:'grid', gap:9 },
  countGrid: { display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:10, width:'100%' },
  countButton: { minHeight:52, borderRadius:15, border:'1.5px solid var(--border)', display:'grid', placeItems:'center', alignContent:'center', gap:3, transition:'all .15s' },
  countNumber: { fontSize:18, lineHeight:1, fontWeight:950 },
  countLabel: { color:'var(--gray)', fontSize:11, fontWeight:850 },
  startSetup: { minHeight:50, border:'none', borderRadius:16, color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, padding:'0 18px', fontSize:15, fontWeight:950, cursor:'pointer', boxShadow:'0 18px 32px -24px rgba(55,48,232,.85)' },
  setupActions: { display:'grid', gridTemplateColumns:'minmax(0, 1fr)', gap:10 },
  missedSetup: { minHeight:48, border:'1.5px solid #FCA5A5', borderRadius:15, background:'#FEF2F2', color:'#DC2626', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, padding:'0 18px', fontSize:15, fontWeight:950, cursor:'pointer' },
  chapterStats: { display:'flex', alignItems:'center', flexWrap:'wrap', gap:6, marginTop:-2, color:'#697386', fontSize:11, fontWeight:850 },
  manageOverlay: { position:'fixed', inset:0, zIndex:2200, display:'flex', justifyContent:'flex-end' },
  manageScrim: { position:'absolute', inset:0, border:'none', background:'rgba(15,16,53,.34)', cursor:'pointer' },
  manageDrawer: { position:'relative', zIndex:1, height:'100%', maxWidth:'100%', overflowY:'auto', background:'#fff', borderLeft:'1px solid #E7E9F2', boxShadow:'-26px 0 60px rgba(15,16,53,.18)', padding:22, display:'flex', flexDirection:'column', gap:14 },
  manageTop: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 },
  manageBack: { border:'none', background:'transparent', color:'#3730E8', fontSize:13, fontWeight:850, cursor:'pointer', padding:0 },
  manageClose: { width:34, height:34, borderRadius:10, border:'1px solid #E7E9F2', background:'#fff', color:'#777C90', display:'grid', placeItems:'center', cursor:'pointer' },
  manageTitleRow: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, minWidth:0 },
  manageTitle: { margin:0, color:'#171733', fontSize:18, fontWeight:900, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  manageCount: { borderRadius:999, background:'#EEF2FF', color:'#3730E8', padding:'5px 9px', fontSize:11, fontWeight:900, whiteSpace:'nowrap' },
  manageStudy: { minHeight:42, border:'none', borderRadius:10, color:'#fff', fontSize:13, fontWeight:900, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8 },
  reviewActions: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 },
  reviewBadge: { flex:'0 0 auto', borderRadius:999, padding:'6px 9px', fontSize:11, fontWeight:900, whiteSpace:'nowrap' },
  reviewCardFrontExpanded: { display:'block', color:'#171733', fontSize:13, fontWeight:900, lineHeight:1.35, whiteSpace:'normal' },
  reviewCardBackExpanded: { display:'block', marginTop:6, color:'#777C90', fontSize:12, fontWeight:700, lineHeight:1.5, whiteSpace:'normal' },
  reviewCardHint: { display:'block', marginTop:5, color:'#8E95A8', fontSize:10, fontWeight:800 },
  manageList: { display:'flex', flexDirection:'column', gap:8, minHeight:0 },
  manageEmpty: { padding:16, border:'1px dashed #DDE1EF', borderRadius:14, background:'#FAFBFF', color:'#777C90', fontSize:13, fontWeight:750, textAlign:'center' },
  manageCard: { display:'flex', alignItems:'center', gap:8, padding:'10px 10px', border:'1px solid #E7E9F2', borderRadius:12, background:'#fff', minWidth:0 },
  manageCardFront: { display:'block', color:'#171733', fontSize:12, fontWeight:900, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  manageCardBack: { display:'block', marginTop:2, color:'#777C90', fontSize:11, fontWeight:650, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  manageEdit: { minHeight:30, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:5, border:'1px solid #E7E9F2', borderRadius:9, background:'#fff', color:'#171733', padding:'0 8px', fontSize:11, fontWeight:850, cursor:'pointer', flex:'0 0 auto' },
  manageDelete: { minHeight:30, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:5, border:'1px solid #FCA5A5', borderRadius:9, background:'#FEF2F2', color:'#B91C1C', padding:'0 8px', fontSize:11, fontWeight:850, cursor:'pointer', flex:'0 0 auto' },
  manageForm: { padding:14, border:'1px solid #E7E9F2', borderRadius:14, background:'#FBFCFF', display:'grid', gap:9 },
  manageInput: { width:'100%', boxSizing:'border-box', padding:'11px 12px', borderRadius:10, border:'1px solid #E7E9F2', background:'#fff', color:'#171733', fontSize:13, fontWeight:650, outline:'none' },
  manageCreate: { minHeight:36, border:'none', borderRadius:10, background:'#7C6CF6', color:'#fff', padding:'0 16px', fontSize:12, fontWeight:900, cursor:'pointer' },
  manageCancel: { minHeight:36, border:'1px solid #E7E9F2', borderRadius:10, background:'#fff', color:'#777C90', padding:'0 14px', fontSize:12, fontWeight:850, cursor:'pointer' },
};
