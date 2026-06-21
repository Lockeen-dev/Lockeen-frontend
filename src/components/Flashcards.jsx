import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, XMark } from '../lib/icons';
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
    front.length >= 8 &&
    front.length <= 150 &&
    back.length >= 16 &&
    back.length <= 560 &&
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

export function FlashcardLanding({ deck, recentDecks, onOpenDeck, setTab, darkMode, exams = [], lang = 'en' }) {
  const isMobile = useIsMobile();
  const [selectedExamId, setSelectedExamId] = useState(deck?._examId ?? deck?._practiceConfig?.examId ?? exams[0]?.id ?? null);
  const [selectedChapterId, setSelectedChapterId] = useState(deck?._practiceConfig?.chapterId ?? 'all');
  const [numCards, setNumCards] = useState(deck?._practiceConfig?.count ?? 10);
  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardsLoaded, setCardsLoaded] = useState(false);
  const [cardsError, setCardsError] = useState('');
  const [form, setForm] = useState({ chapterId: '', front: '', back: '' });
  const [editingId, setEditingId] = useState(null);
  const selectedExam = exams.find(e => e.id === selectedExamId);
  const selectedPalette = selectedExam ? getExamPalette(selectedExam, darkMode) : getSubjectPalette('', {}, darkMode);

  const fmtDate = (ts) => new Date(ts).toLocaleDateString(localeFor(lang), { day:'numeric', month:'short' });
  const fmtScore = (s) => s >= 80 ? { label: s + '%', color: '#10B981', bg:'#ECFDF5' } : s >= 60 ? { label: s + '%', color: '#F59E0B', bg:'#FFFBEB' } : { label: s + '%', color: '#EF4444', bg:'#FEF2F2' };

  const sL = { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--gray)', marginBottom:12 };

  const loadCards = async (examId = selectedExamId) => {
    if (!examId) return;
    setLoadingCards(true);
    setCardsLoaded(false);
    setCardsError('');
    const result = await listFlashcards({ examId });
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
    setSelectedExamId(deck._examId ?? deck._practiceConfig.examId ?? exams[0]?.id ?? null);
    setSelectedChapterId(deck._practiceConfig.chapterId || 'all');
    setNumCards(deck._practiceConfig.count || 10);
  }, [deck, exams]);

  useEffect(() => {
    const firstChapterId = selectedExam?.chapters?.[0]?.id || '';
    setForm({ chapterId: firstChapterId, front: '', back: '' });
    setEditingId(null);
    if (!deck?._practiceConfig) setSelectedChapterId('all');
  }, [selectedExamId, selectedExam]);

  const playableCards = cards.filter(isPlayableFlashcard);
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
  const effectiveCards = Math.min(numCards, maxCards || 1);
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
  const startConfiguredDeck = () => {
    if (!selectedExam || !maxCards) return;
    const chapter = selectedChapterId === 'all' ? null : selectedExam.chapters.find((item) => String(item.id) === String(selectedChapterId));
    const rotationKey = [
      selectedExam.id,
      chapter?.id || 'all',
      deck?._practiceConfig?.sourceMaterialId || deck?._practiceConfig?.noteId || 'all-materials',
    ].map(String).join(':');
    const sessionCards = selectRotatingFlashcards(availableCards, effectiveCards, rotationKey);
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
        numCards: effectiveCards,
      },
    });
  };

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

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:28, maxWidth:860 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
        <div>
          <h2 style={{ margin:'0 0 4px', fontSize:22, fontWeight:800, color:'var(--ink)' }}>
            {focusedFromNotes ? `${tt(lang, 'flashcards')} · ${focusTitle}` : tt(lang, 'flashcards')}
          </h2>
          <p style={{ margin:0, color:'var(--gray)', fontSize:14 }}>
            {selectedExam ? `${selectedExam.name} · ${focusScopeLabel}` : tt(lang, 'flashSub')}
          </p>
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

      {/* Exam selector */}
      {exams.length > 0 && (
        <div>
          <div style={sL}>{tt(lang, 'chooseExam')}</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {exams.map(exam => {
              const active = exam.id === selectedExamId;
              const pal = getExamPalette(exam, darkMode);
              const emoji = getExamEmoji(exam);
              return (
                <button key={exam.id} onClick={() => { setSelectedExamId(exam.id); setSelectedChapterId('all'); }}
                  style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:999, border:`1.5px solid ${active ? pal.dot : 'var(--border)'}`, background: active ? pal.dot : 'var(--surface)', color: active ? '#fff' : 'var(--ink)', fontWeight:600, fontSize:13, cursor:'pointer', transition:'all .15s' }}>
                  <span style={{ fontSize:14 }}>{emoji}</span>
                  {exam.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chapter cards */}
      {selectedExam && (
        <div>
          <div style={sL}>Setup — {selectedExam.name}</div>
          <div style={{ border:'1px solid var(--border)', borderRadius:18, background:'var(--surface)', overflow:'hidden', marginBottom:18 }}>
            <div style={{ padding:18 }}>
              <div style={sL}>{tt(lang, 'chapter')}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {[{ id:'all', title:tt(lang, 'wholeExam') }, ...(selectedExam.chapters || []).map(ch => ({ id: ch.id, title: ch.title }))].map(ch => {
                  const active = selectedChapterId === ch.id;
                  const count = countCardsForChapter(ch.id);
                  return (
                    <button key={ch.id} type="button" onClick={() => setSelectedChapterId(ch.id)}
                      style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'8px 14px', borderRadius:999, border:`1.5px solid ${active ? selectedPalette.dot : 'var(--border)'}`, background: active ? selectedPalette.bg : 'var(--surface)', color: active ? selectedPalette.text : 'var(--gray)', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                      {ch.title}
                      <span style={{ background: active ? selectedPalette.dot : 'var(--border)', color: active ? '#fff' : 'var(--gray)', fontSize:10, fontWeight:900, borderRadius:999, padding:'1px 7px', lineHeight:1.5 }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {maxCards > 0 && (
              <>
                <div style={{ height:1, background:'var(--border)' }} />
                <div style={{ padding:18 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <div style={sL}>{tt(lang, 'cards')}</div>
                    <span style={{ fontSize:12, color:'var(--gray)', fontWeight:700 }}>{tt(lang, 'availableCount', { count: maxCards })}</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                    {[5,10,15,20].map(n => {
                      const disabled = n > maxCards;
                      const active = numCards === n && !disabled;
                      return (
                        <button key={n} type="button" onClick={() => !disabled && setNumCards(n)} disabled={disabled}
                          style={{ padding:'12px 4px', borderRadius:12, border:`1.5px solid ${active ? selectedPalette.dot : 'var(--border)'}`, background: active ? selectedPalette.bg : 'var(--surface)', fontWeight:900, fontSize:18, color: active ? selectedPalette.text : disabled ? 'var(--border)' : 'var(--gray)', opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                          {n}
                          <span style={{ fontSize:9, fontWeight:700, color: active ? selectedPalette.text : 'var(--gray-2)', opacity: disabled ? 0 : 0.7 }}>{tt(lang, 'cardsShort')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
          <button type="button" onClick={startConfiguredDeck} disabled={!maxCards || loadingCards}
            style={{ width:'100%', borderRadius:16, padding:'16px', background: maxCards && !loadingCards ? `linear-gradient(135deg, ${selectedPalette.dot} 0%, ${selectedPalette.dot}cc 100%)` : '#CBD5E1', color:'#fff', fontWeight:900, fontSize:16, cursor: maxCards && !loadingCards ? 'pointer' : 'not-allowed', border:'none', marginBottom:24 }}>
            {loadingCards ? tt(lang, 'loading') : maxCards ? tt(lang, 'studyCardsCta', { count: effectiveCards, title: focusTitle }) : waitingForPractice ? tt(lang, 'generatingFlashcards') : tt(lang, 'flashPreparing')}
          </button>

          <div style={sL}>{tt(lang, 'chapters')} — {selectedExam.name}</div>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap:12 }}>
            {selectedExam.chapters.map(ch => {
              const pal = selectedPalette;
              const chapterCards = getCardsForChapter(ch);
              const cardCount = chapterCards.length;
              const hasCards = cardCount > 0;
              const recentDeck = recentDecks.find(d => d.title === ch.title);
              const lastScore = recentDeck?.lastScore ?? null;
              const scoreStyle = lastScore != null ? fmtScore(lastScore) : null;
              const studied = lastScore != null;
              return (
                <div key={ch.id}
                  onClick={() => hasCards && onOpenDeck({ noteId: ch.id, subject: selectedExam.subject, title: ch.title, cards: chapterCards, _examColor: selectedExam.color || null, _examDot: selectedExam.dot || null, _meta: { examId: selectedExam.id, examColor: selectedExam.color || null, examDot: selectedExam.dot || null, chapterId: ch.id } })}
                  style={{ display:'flex', flexDirection:'column', gap:0, background:'var(--surface)', border:`1.5px solid ${studied ? pal.dot + '40' : 'var(--border)'}`, borderRadius:18, overflow:'hidden', opacity: hasCards ? 1 : 0.5, cursor: hasCards ? 'pointer' : 'default', transition:'box-shadow .15s, border-color .15s' }}
                  onMouseEnter={e => { if (hasCards) e.currentTarget.style.boxShadow='0 4px 20px rgba(55,48,232,.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; }}>

                  {/* Card top: colored band */}
                  <div style={{ height:6, background: pal.dot, opacity: studied ? 1 : 0.3 }} />

                  <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:12, flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <SubjectIcon subject={selectedExam.subject} size={44} radius={12} dot={pal.dot} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ch.title}</div>
                        <div style={{ fontSize:12, color:'var(--gray)', marginTop:2 }}>
                          {hasCards ? tt(lang, 'cardsCount', { count: cardCount }) : tt(lang, 'noFlashcardsYet')}
                        </div>
                      </div>
                      {scoreStyle && (
                        <span style={{ fontSize:12, fontWeight:700, color:scoreStyle.color, background:scoreStyle.bg, padding:'3px 8px', borderRadius:999, flexShrink:0 }}>
                          {scoreStyle.label}
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div style={{ height:4, borderRadius:999, background:'var(--border)', overflow:'hidden' }}>
                      <div style={{ height:'100%', width: studied ? `${lastScore}%` : '0%', background: !studied ? pal.dot : lastScore >= 80 ? '#10B981' : lastScore >= 60 ? '#F59E0B' : '#EF4444', borderRadius:999, transition:'width .5s ease' }} />
                    </div>

                    <button
                      disabled={!hasCards}
                      onClick={e => { e.stopPropagation(); if(hasCards) onOpenDeck({ noteId: ch.id, subject: selectedExam.subject, title: ch.title, cards: chapterCards, _examColor: selectedExam.color || null, _examDot: selectedExam.dot || null, _meta: { examId: selectedExam.id, examColor: selectedExam.color || null, examDot: selectedExam.dot || null, chapterId: ch.id } }); }}
                      style={{ width:'100%', padding:'10px', borderRadius:12, background: hasCards ? pal.dot : 'var(--border)', color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor: hasCards ? 'pointer' : 'not-allowed', letterSpacing:'.01em' }}>
                      {studied ? `↻ ${tt(lang, 'review')}` : `▶ ${tt(lang, 'study')}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {loadingCards && <p style={{ margin:'12px 0 0', color:'var(--gray)', fontSize:13 }}>{tt(lang, 'loadingFlashcards')}</p>}
          {cardsError && <p style={{ margin:'12px 0 0', color:'#DC2626', fontSize:13 }}>{cardsError}</p>}
          {!loadingCards && !cardsError && playableCards.length === 0 && (
            <p style={{ margin:'12px 0 0', color:'var(--gray)', fontSize:13 }}>{tt(lang, 'noFlashcardsYet')}</p>
          )}
          <form onSubmit={submitCardForm} style={{ marginTop:16, padding:16, border:'1px solid var(--border)', borderRadius:16, background:'var(--surface)', display:'grid', gap:10 }}>
            <div style={sL}>{editingId ? tt(lang, 'editFlashcard') : tt(lang, 'newFlashcard')}</div>
            <select value={form.chapterId} onChange={e => setForm(f => ({ ...f, chapterId: e.target.value }))}
              style={{ padding:'10px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--ink)' }}>
              {(selectedExam.chapters || []).map(ch => <option key={ch.id} value={ch.id}>{ch.title}</option>)}
            </select>
            <input value={form.front} onChange={e => setForm(f => ({ ...f, front: e.target.value }))} placeholder={tt(lang, 'front')}
              style={{ padding:'10px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--ink)' }} />
            <textarea value={form.back} onChange={e => setForm(f => ({ ...f, back: e.target.value }))} placeholder={tt(lang, 'back')} rows={3}
              style={{ padding:'10px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--ink)', resize:'vertical' }} />
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button type="submit" style={{ padding:'10px 14px', borderRadius:10, border:'none', background:'var(--indigo)', color:'#fff', fontWeight:700 }}>
                {editingId ? tt(lang, 'save') : tt(lang, 'create')}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setForm(f => ({ ...f, front:'', back:'' })); }}
                  style={{ padding:'10px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontWeight:700 }}>
                  {tt(lang, 'cancel')}
                </button>
              )}
            </div>
          </form>
          {playableCards.length > 0 && (
            <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
              {playableCards.slice(0, 8).map(card => (
                <div key={card.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', border:'1px solid var(--border)', borderRadius:12, background:'var(--surface)' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.front}</div>
                    <div style={{ fontSize:12, color:'var(--gray)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.back}</div>
                  </div>
                  <button type="button" onClick={() => startEditCard(card)} style={{ padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontWeight:700, fontSize:12 }}>{tt(lang, 'edit')}</button>
                  <button type="button" onClick={() => removeCard(card.id)} style={{ padding:'7px 10px', borderRadius:8, border:'1px solid #fca5a5', background:'#FEE2E2', color:'#991B1B', fontWeight:700, fontSize:12 }}>{tt(lang, 'delete')}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent sessions */}
      {recentDecks.length > 0 && (
        <div>
          <div style={{ height:1, background:'var(--border)', marginBottom:20 }} />
          <div style={sL}>{tt(lang, 'recentSessions')}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {recentDecks.map((deck, i) => {
              const sc = deck.lastScore != null ? fmtScore(deck.lastScore) : null;
              const deckExam = exams.find((exam) => String(exam.id) === String(deck._meta?.examId || deck._examId));
              const pal = getExamPalette(deckExam || { subject: deck.subject, color: deck._examColor || deck._meta?.examColor, dot: deck._examDot || deck._meta?.examDot }, darkMode);
              return (
                <div key={i}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, cursor:'pointer', transition:'border-color .15s' }}
                  onClick={() => onOpenDeck(deck)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = pal.dot + '60'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <SubjectIcon subject={deck.subject} size={40} radius={10} dot={pal.dot} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{deck.title}</div>
                    <div style={{ fontSize:12, color:'var(--gray)', marginTop:1 }}>{deck.subject} · {tt(lang, 'cardsCount', { count: (deck.cards||[]).length })}{deck.ts ? ' · ' + fmtDate(deck.ts) : ''}</div>
                  </div>
                  {sc && <span style={{ fontSize:12, fontWeight:700, color:sc.color, background:sc.bg, padding:'3px 9px', borderRadius:999, flexShrink:0 }}>{sc.label}</span>}
                  <button onClick={e => { e.stopPropagation(); onOpenDeck(deck); }}
                    style={{ padding:'7px 16px', borderRadius:10, background:'var(--indigo)', color:'#fff', fontWeight:600, fontSize:12, border:'none', cursor:'pointer', flexShrink:0 }}>
                    {tt(lang, 'review')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
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
};
