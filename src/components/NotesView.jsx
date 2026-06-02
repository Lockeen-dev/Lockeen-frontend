import React, { useEffect, useRef, useState } from 'react';

import { BarChart3, BookOpen, ChevronDown, Eye, FileText, Layers, LockeenLogo, Paperclip, Pencil, Plus, Search, Sparkles, Trash2 } from '../lib/icons';
import { tt } from '../lib/i18n';
import { EXTRA_SUBJECT_COLORS, daysLeft, formatExamDate, getSubjectPalette, inferSubjectFromName } from '../data/mockData';
import { getExamEmoji } from '../lib/examUi';
import useIsMobile from '../lib/useIsMobile';
import { createChapter, createExam, deleteChapter, deleteExam, listExams, updateChapter, updateExam } from '../services/exams';
import { createMaterial, deleteMaterial, extractTextFromFile, getMaterialDownloadUrl, getMaterialProcessingLabel, listMaterials, requestMaterialOcr, updateMaterial } from '../services/materials';
import { createNote, deleteNote, listNotes, updateNote } from '../services/notes';
import { createQuiz, listQuizzes } from '../services/quiz';
import { createFlashcard, listFlashcards } from '../services/flashcards';
import { generatePracticeFromText } from '../services/practiceGeneration';
import { createStudyMaterialSignedUrl, deleteStudyMaterialFile, uploadStudyMaterialFile, validateStudyMaterialFile } from '../services/storage';
import { CreateExamModal, DeleteExamModal, EditChapterModal, EditExamModal, UploadChapterModal } from './ExamModals';
import { EmojiPickerButton, GradeValue, getPriorityMeta, gradeS } from './common/ExamControls';
import { homeS } from '../styles/dashboardStyles';

function formatExamServiceError(error, fallback) {
  if (!error) return fallback;
  if (error.code === 'AUTH_REQUIRED') {
    return 'Real mode requires an authenticated Supabase session.';
  }
  if (error.code === 'SUPABASE_CONFIG_MISSING') {
    return 'Supabase config is missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
  }
  if (error.code === 'VALIDATION_ERROR') {
    return error.message || 'Check required fields before saving.';
  }
  return error.message || fallback;
}

function formatStudyServiceError(error, fallback) {
  if (!error) return fallback;
  if (error.code === 'AUTH_REQUIRED') {
    return 'Real mode requires an authenticated Supabase session.';
  }
  if (error.code === 'SUPABASE_CONFIG_MISSING') {
    return 'Supabase config is missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
  }
  if (error.code === 'VALIDATION_ERROR') {
    return error.message || 'Check required fields.';
  }
  return error.message || fallback;
}

function cleanPracticeTitle(value, fallback = 'Study practice') {
  return String(value || fallback).replace(/\s+/g, ' ').trim().slice(0, 120) || fallback;
}

function isFallbackPracticeQuestion(question) {
  const text = String(question?.q || question?.prompt || '').toLowerCase();
  return [
    'what is the best first step when reviewing ',
    'which action helps test understanding of ',
    'what should you do after missing a question on ',
    'which note is most useful for ',
    'when should ',
  ].some((pattern) => text.includes(pattern));
}

function cleanStudyText(value = '') {
  return String(value || '')
    .replace(/[#*_`>]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractStudyFacts(seedText = '') {
  const raw = String(seedText || '')
    .replace(/[#*_`>]+/g, ' ')
    .replace(/\r/g, '\n')
    .trim();
  if (!raw) return [];
  return raw
    .split(/\n+|(?<=[.!?])\s+|(?:\s+-\s+)|(?:\s+\d+[.)]\s+)/)
    .map((item) => cleanStudyText(item))
    .flatMap((item) => {
      if (item.length <= 260) return [item];
      return item.match(/.{80,220}(?:\s|$)/g) || [item.slice(0, 220)];
    })
    .map((item) => cleanStudyText(item))
    .filter((item) => item.length >= 35 && item.length <= 260)
    .filter((item, index, all) => all.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index)
    .slice(0, 12);
}

function shortFact(value = '', maxLength = 150) {
  const text = cleanStudyText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, '')}...`;
}

function buildQuestionsFromText(title, seedText = '') {
  const facts = extractStudyFacts(seedText);
  if (facts.length < 2) return [];
  return facts.slice(0, 5).map((fact, index) => {
    const distractors = facts
      .filter((_, factIndex) => factIndex !== index)
      .slice(0, 3)
      .map((item) => shortFact(item, 140));
    while (distractors.length < 3) {
      distractors.push([
        'This point is unrelated to the uploaded material.',
        'The material says the opposite without evidence.',
        'The document does not support this conclusion.',
      ][distractors.length]);
    }
    return {
      q: 'According to the uploaded material, which statement is correct?',
      options: [shortFact(fact, 140), ...distractors],
      correct: 0,
      explanation: shortFact(fact, 220),
    };
  });
}

function buildFlashcardsFromText(title, seedText = '') {
  const facts = extractStudyFacts(seedText);
  if (!facts.length) return [];
  return facts.slice(0, 8).map((fact, index) => ({
    front: index === 0 ? 'Main point from uploaded material' : `Key detail ${index + 1} from uploaded material`,
    back: shortFact(fact, 220),
  }));
}

function buildGeneratedQuestions(title, seedQuestions = [], seedText = '') {
  const normalizedSeeds = (seedQuestions || [])
    .filter((question) => (question.q || question.prompt) && Array.isArray(question.options) && question.options.length >= 2)
    .map((question) => ({
      q: question.q || question.prompt,
      options: question.options,
      correct: Number(question.correct ?? question.correctAnswer ?? 0),
      explanation: question.explanation || '',
    }));
  if (normalizedSeeds.length) return normalizedSeeds.slice(0, 10);
  const textQuestions = buildQuestionsFromText(title, seedText);
  if (textQuestions.length) return textQuestions;

  const topic = cleanPracticeTitle(title, 'this topic');
  return [
    {
      q: `What is the best first step when reviewing ${topic}?`,
      options: ['Define the core idea', 'Skip examples', 'Ignore weak points', 'Memorize random dates'],
      correct: 0,
      explanation: 'Start by naming the core idea before details.',
    },
    {
      q: `Which action helps test understanding of ${topic}?`,
      options: ['Explain it in your own words', 'Only reread headings', 'Avoid practice', 'Study without checking answers'],
      correct: 0,
      explanation: 'Self-explanation reveals gaps quickly.',
    },
    {
      q: `What should you do after missing a question on ${topic}?`,
      options: ['Review the reason and retry', 'Delete the topic', 'Move on forever', 'Lower the target'],
      correct: 0,
      explanation: 'Correction plus retry turns mistakes into usable feedback.',
    },
    {
      q: `Which note is most useful for ${topic}?`,
      options: ['A concise rule plus one example', 'A copied paragraph only', 'An unrelated summary', 'A blank note'],
      correct: 0,
      explanation: 'Rule plus example is easier to recall and apply.',
    },
    {
      q: `When should ${topic} be reviewed again?`,
      options: ['After a short delay with active recall', 'Only once before the exam', 'Never after success', 'Only while distracted'],
      correct: 0,
      explanation: 'Spaced active recall improves retention.',
    },
  ];
}

function buildGeneratedFlashcards(title, seedCards = [], seedText = '') {
  const normalizedSeeds = (seedCards || [])
    .filter((card) => (card.front || card.q) && (card.back || card.a))
    .map((card) => ({ front: card.front || card.q, back: card.back || card.a }));
  if (normalizedSeeds.length) return normalizedSeeds.slice(0, 12);
  const textCards = buildFlashcardsFromText(title, seedText);
  if (textCards.length) return textCards;

  const topic = cleanPracticeTitle(title, 'this topic');
  return [
    { front: `Core idea of ${topic}`, back: 'Write the main concept in one clear sentence, then connect one example.' },
    { front: `Best review method for ${topic}`, back: 'Use active recall: answer first, then check and correct.' },
    { front: `Common weak point in ${topic}`, back: 'The part you cannot explain without looking should become the next practice target.' },
    { front: `Example check for ${topic}`, back: 'Create one concrete example and explain why it matches the rule.' },
    { front: `Next step after a mistake in ${topic}`, back: 'Record why the answer was wrong, review the concept, and retry later.' },
  ];
}

function NotesView({ exams, lang = 'en', setExams, activeId, setActiveId, onOpenFlashcards, onOpenQuiz, onOpenQuizForExam, darkMode, onOpenPlanner, onExamAdded, quizHistory = {}, flashHistory = {}, quizRuns = [], recentFlashDecks = [] }) {
  const isMobile = useIsMobile();
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [deletingExam, setDeletingExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [savingAction, setSavingAction] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialExams() {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await listExams();
      if (cancelled) return;
      if (error) {
        setLoadError(formatExamServiceError(error, 'Unable to load exams.'));
      } else {
        setExams(data || []);
      }
      setLoading(false);
    }

    loadInitialExams();
    return () => { cancelled = true; };
  }, [setExams]);

  const handleDeleteExam = async (id) => {
    setActionError(null);
    setSavingAction('delete');
    const { error } = await deleteExam(id);
    if (error) {
      setActionError(formatExamServiceError(error, 'Unable to delete exam.'));
      setSavingAction(null);
      return;
    }
    setExams(prev => prev.filter(e => e.id !== id));
    setDeletingExam(null);
    setSavingAction(null);
  };

  const handleEditExam = async (id, changes) => {
    setActionError(null);
    setSavingAction('edit');
    const { data, error } = await updateExam(id, changes);
    if (error) {
      setActionError(formatExamServiceError(error, 'Unable to update exam.'));
      setSavingAction(null);
      return;
    }
    setExams(prev => prev.map(e => e.id === id ? data : e));
    setEditingExam(null);
    setSavingAction(null);
  };

  const handleCreateExam = async (exam) => {
    setActionError(null);
    if (!exam?.name?.trim()) {
      setActionError(formatExamServiceError({ code: 'VALIDATION_ERROR', message: 'Exam name is required.' }, 'Exam name is required.'));
      return;
    }
    setSavingAction('create');
    const inferredSubject = inferSubjectFromName(`${exam.subject || ''} ${exam.name || ''}`);
    const palette = getSubjectPalette(inferredSubject, EXTRA_SUBJECT_COLORS.Other);
    const enriched = { ...exam, subject: exam.subject || inferredSubject, color: palette.bg, dot: palette.dot };
    const { data, error } = await createExam(enriched);
    if (error) {
      setActionError(formatExamServiceError(error, 'Unable to create exam.'));
      setSavingAction(null);
      return;
    }
    const created = data || enriched;
    setExams((p) => [created, ...p]);
    setShowCreate(false);
    setSavingAction(null);
    if (created.date && onExamAdded) {
      const [yr, mo, dy] = created.date.split('-').map(Number);
      const dateKey = `${yr}-${mo}-${dy}`;
      onExamAdded(dateKey, {
        name: '📝 Exam: ' + created.name,
        time: '09:00', dur: '2h', cat: 'study',
        noteId: created.id,
        noteColor: palette.dot, noteBg: palette.bg,
        noteText: palette.text, noteSubject: created.subject,
      });
    }
  };

  const activeExam = exams.find((x) => x.id === activeId);

  if (activeExam) {
    const refreshExams = async () => {
      const result = await listExams();
      if (result.error) throw new Error(formatExamServiceError(result.error, 'Unable to reload exams.'));
      setExams(result.data || []);
    };
    const onAddChapter = async ({ chapterId, chapterName, fileCount, files = [] }) => {
      let targetChapter = (activeExam.chapters || []).find((chapter) => String(chapter.id) === String(chapterId));
      const materialMetadataResults = await Promise.all((files || []).map(buildMaterialFileMetadata));
      const metadataError = materialMetadataResults.find((result) => result.error);
      if (metadataError) throw new Error(formatStudyServiceError(metadataError.error, 'Unable to inspect material file.'));
      const materialMetadata = materialMetadataResults.map((result) => result.data);
      const knownPageTotal = materialMetadata.reduce((sum, metadata) => sum + (Number(metadata?.pageCount) || 0), 0);
      const pageCount = Math.max(1, knownPageTotal || fileCount);

      if (chapterId) {
        const result = await updateChapter(activeId, chapterId, {
          files: (targetChapter?.files || 0) + fileCount,
          pages: (targetChapter?.pages || 0) + pageCount,
        });
        if (result.error) throw new Error(formatExamServiceError(result.error, 'Unable to update chapter.'));
        targetChapter = result.data;
      } else {
        const result = await createChapter(activeId, {
          title: chapterName,
          position: activeExam.chapters?.length || 0,
          files: fileCount,
          pages: pageCount,
        });
        if (result.error) throw new Error(formatExamServiceError(result.error, 'Unable to create chapter.'));
        targetChapter = result.data;
      }

      const createdMaterials = [];
      for (const [index, file] of files.entries()) {
        const uploadResult = await uploadStudyMaterialFile({ file, materialId: crypto.randomUUID() });
        if (uploadResult.error) throw new Error(formatStudyServiceError(uploadResult.error, 'Unable to upload material file.'));
        const materialResult = await createMaterial({
          examId: activeId,
          chapterId: targetChapter.id,
          title: file.name,
          storagePath: uploadResult.data.path,
          mimeType: uploadResult.data.mimeType,
          sizeBytes: uploadResult.data.sizeBytes,
          pageCount: materialMetadata[index]?.pageCount ?? null,
          processingStatus: materialMetadata[index]?.processingStatus,
          extractedText: materialMetadata[index]?.extractedText,
          extractionError: materialMetadata[index]?.extractionError,
          processedAt: materialMetadata[index]?.processedAt,
          type: 'file',
        });
        if (materialResult.error) throw new Error(formatStudyServiceError(materialResult.error, 'Unable to save material.'));
        if (materialResult.data) {
          let nextMaterial = {
            ...materialResult.data,
            pageCount: materialResult.data.pageCount ?? materialMetadata[index]?.pageCount ?? null,
          };
          if (shouldRunImageOcr(nextMaterial)) {
            const ocrResult = await requestMaterialOcr(nextMaterial.id);
            if (ocrResult.data) {
              nextMaterial = ocrResult.data;
            } else {
              const failedUpdate = await updateMaterial(nextMaterial.id, {
                processingStatus: 'failed',
                extractionError: formatStudyServiceError(ocrResult.error, 'OCR extraction failed.'),
                processedAt: new Date().toISOString(),
              });
              if (failedUpdate.data) nextMaterial = failedUpdate.data;
            }
          }
          if (nextMaterial.processingStatus === 'ready' && nextMaterial.extractedText) {
            createQuestionBankForMaterial({
              examId: activeId,
              chapterId: targetChapter.id,
              material: nextMaterial,
              title: targetChapter.title || chapterName || nextMaterial.title,
            }).catch(() => {});
          }
          createdMaterials.push(nextMaterial);
        }
      }

      await refreshExams();
      return { chapter: targetChapter, materials: createdMaterials };
    };
    const onEditChapter = async ({ chapterId, newTitle }) => {
      const cleanTitle = (newTitle || '').trim();
      if (!cleanTitle) return;
      const result = await updateChapter(activeId, chapterId, { title: cleanTitle });
      if (result.error) throw new Error(formatExamServiceError(result.error, 'Unable to update chapter.'));
      await refreshExams();
    };
    const onDeleteChapter = async (chapterId) => {
      const result = await deleteChapter(activeId, chapterId);
      if (result.error) throw new Error(formatExamServiceError(result.error, 'Unable to delete chapter.'));
      await refreshExams();
    };
    const onDeleteChapterDocument = async ({ chapterId, pages = 6 }) => {
      const targetChapter = (activeExam.chapters || []).find((chapter) => String(chapter.id) === String(chapterId));
      if (!targetChapter) return;
      const result = await updateChapter(activeId, chapterId, {
        files: Math.max(0, (targetChapter.files || 0) - 1),
        pages: Math.max(0, (targetChapter.pages || 0) - pages),
      });
      if (result.error) throw new Error(formatExamServiceError(result.error, 'Unable to update chapter.'));
      await refreshExams();
    };
    return <ExamDetail exam={activeExam} onBack={() => setActiveId(null)} onAddChapter={onAddChapter} onEditChapter={onEditChapter} onDeleteChapter={onDeleteChapter} onDeleteChapterDocument={onDeleteChapterDocument} onOpenFlashcards={onOpenFlashcards} onOpenQuiz={onOpenQuiz} darkMode={darkMode} quizHistory={quizHistory} flashHistory={flashHistory} quizRuns={quizRuns} recentFlashDecks={recentFlashDecks} />;
  }

  const filtered = exams.filter((x) => (x.name + ' ' + (x.subject || '')).toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={homeS.h1}>{tt(lang, 'myExams')}</h2>
            <p style={homeS.sub}>{tt(lang, 'examSub')}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button style={notesS.newBtn} onClick={() => setShowCreate(true)}><Plus size={16} /> {tt(lang, 'newExam')}</button>
          </div>
        </div>
        <div style={{ ...notesS.search, marginTop: 14, width: '100%', boxSizing: 'border-box' }}>
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tt(lang, 'searchExams')} style={{ ...notesS.searchInput, width: '100%' }} />
        </div>
      </div>

      {deletingExam && (
        <DeleteExamModal
          exam={deletingExam}
          onClose={() => { setDeletingExam(null); setActionError(null); }}
          onConfirm={() => handleDeleteExam(deletingExam.id)}
          saving={savingAction === 'delete'}
          error={actionError}
        />
      )}
      {editingExam && (
        <EditExamModal
          exam={editingExam}
          onClose={() => { setEditingExam(null); setActionError(null); }}
          onSave={(changes) => handleEditExam(editingExam.id, changes)}
          saving={savingAction === 'edit'}
          error={actionError}
        />
      )}

      {showCreate && (
        <CreateExamModal
          onClose={() => { setShowCreate(false); setActionError(null); }}
          onCreate={handleCreateExam}
          saving={savingAction === 'create'}
          error={actionError}
        />
      )}

      {loading && (
        <div style={examsS.empty}>
          <div style={examsS.emptyIcon}><FileText size={22} /></div>
          <div style={examsS.emptyTitle}>Loading exams...</div>
          <div style={examsS.emptySub}>Fetching your mock exam list.</div>
        </div>
      )}

      {!loading && loadError && (
        <div style={examsS.empty}>
          <div style={examsS.emptyIcon}><FileText size={22} /></div>
          <div style={examsS.emptyTitle}>Unable to load exams</div>
          <div style={examsS.emptySub}>{loadError}</div>
        </div>
      )}

      {!loading && !loadError && filtered.length === 0 && (
        <div style={examsS.empty}>
          <div style={examsS.emptyIcon}><FileText size={22} /></div>
          <div style={examsS.emptyTitle}>{exams.length === 0 ? 'No exams yet' : 'No exams found'}</div>
          <div style={examsS.emptySub}>{exams.length === 0 ? 'Create your first exam to start organizing chapters.' : 'Try a different search term.'}</div>
        </div>
      )}

      <div style={examsS.grid}>
        {!loading && !loadError && filtered.map((x) => {
          const palette = getSubjectPalette(x.subject, x, darkMode);
          return (
            <div key={x.id} style={notesS.card}>
              <div style={{ ...notesS.cover, background: palette.bg }}>
                <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-58%)', zIndex:2 }}>
                  <EmojiPickerButton
                    emoji={getExamEmoji(x)}
                    dot={palette.dot}
                    bg={palette.bg}
                    size={64}
                    onPick={(emoji) => setExams(prev => prev.map(e => e.id === x.id ? { ...e, emoji } : e))}
                  />
                </div>
                {x.date && (() => {
                  const dl = daysLeft(x.date);
                  return (
                    <>
                      <span style={{ position:'absolute', top:12, left:12, fontSize:11, fontWeight:700, padding:'6px 10px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, color:'var(--ink)', lineHeight:1.3 }}>
                        {formatExamDate(x.date)}
                      </span>
                      {dl >= 0 && (
                        <span style={{ position:'absolute', top:12, right:12, fontSize:11, fontWeight:700, padding:'6px 10px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, color:'var(--indigo)', lineHeight:1.3 }}>
                          {dl === 0 ? 'Oggi!' : `${dl} giorni`}
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
              <div style={{ padding: 18 }}>
                {(() => {
                  const p = getPriorityMeta(x.priority || 3);
                  return (
                    <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 9px', borderRadius:999, background:p.bg, border:`1px solid ${p.border}`, marginBottom:8 }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:p.color, flexShrink:0 }} />
                      <span style={{ fontSize:10, fontWeight:800, color:p.color, lineHeight:1 }}>{p.label}</span>
                    </div>
                  );
                })()}
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:4 }}>
                  <h3 style={{ ...notesS.title, margin:0, flex:1 }}>{x.name}</h3>
                  <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                    <button title="Modifica" onClick={() => setEditingExam(x)}
                      style={{ width:28, height:28, borderRadius:8, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--gray)', cursor:'pointer', display:'grid', placeItems:'center' }}>
                      <Pencil size={13} />
                    </button>
                    <button title="Elimina" onClick={() => setDeletingExam(x)}
                      style={{ width:28, height:28, borderRadius:8, border:'1.5px solid #FCA5A5', background:'#FEF2F2', color:'#EF4444', cursor:'pointer', display:'grid', placeItems:'center' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p style={notesS.meta}>
                  {x.chapters.length} {x.chapters.length === 1 ? 'chapter' : 'chapters'}
                </p>
                <div style={gradeS.cardTarget}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: palette.dot }} />
                  <span style={gradeS.cardTargetLabel}>Target</span>
                  <GradeValue value={x.targetGrade || 27} color={palette.dot} size={18} />
                </div>
                <div style={notesS.actions}>
                  <button style={notesS.primarySmall} onClick={() => setActiveId(x.id)}>
                    <LockeenLogo size={16} /> Open Exam
                  </button>
                  <button style={notesS.ghostSmall} onClick={() => onOpenQuizForExam && onOpenQuizForExam(x.id)}>
                    <Sparkles size={14} /> Quick Quiz
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const READINESS_FALLBACKS = { studyTime: 70, planProgress: 55 };
const MATERIAL_UI_META_KEY = 'lockeen.materialUiMeta.v1';

function readMaterialUiMeta() {
  try {
    const raw = window.localStorage.getItem(MATERIAL_UI_META_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

function writeMaterialUiMeta(meta) {
  try {
    window.localStorage.setItem(MATERIAL_UI_META_KEY, JSON.stringify(meta));
  } catch (_) {}
}

async function getFilePageCount(file) {
  if (!file) return null;
  if (file.type?.includes('pdf') || /\.pdf$/i.test(file.name || '')) {
    try {
      const text = new TextDecoder('latin1').decode(await file.arrayBuffer());
      const matches = text.match(/\/Type\s*\/Page\b/g);
      return Math.max(1, matches?.length || 1);
    } catch (_) {
      return 1;
    }
  }
  if (file.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name || '')) return 1;
  return null;
}

async function buildMaterialFileMetadata(file) {
  const [pageCount, extractionResult] = await Promise.all([
    getFilePageCount(file),
    extractTextFromFile(file),
  ]);
  if (extractionResult.error) return { error: extractionResult.error };
  return {
    data: {
      pageCount: extractionResult.data?.pageCount ?? pageCount,
      processingStatus: extractionResult.data?.processingStatus || 'uploaded',
      extractedText: extractionResult.data?.extractedText || null,
      extractionError: extractionResult.data?.extractionError || null,
      processedAt: extractionResult.data?.processedAt || null,
    },
  };
}

function shouldRunImageOcr(material = {}) {
  return material?.id && (material.mimeType === 'image/png' || material.mimeType === 'image/jpeg');
}

function clampQuestionCount(value) {
  return Math.max(5, Math.min(240, Math.round(value)));
}

function getQuestionBankChunks(sourceText = '', pageCount = null) {
  const text = String(sourceText || '').trim();
  if (!text) return [];
  const words = cleanStudyText(text).split(/\s+/).filter(Boolean).length;
  const pages = Number(pageCount) || Math.max(1, Math.ceil(words / 450));
  const maxChunks = pages >= 120 ? 12 : pages >= 40 ? 8 : pages >= 16 ? 5 : 3;
  const maxChars = 18000;
  const parts = text
    .split(/\n{2,}|(?=Page\s+\d+\b)/i)
    .map((part) => part.trim())
    .filter(Boolean);
  const chunks = [];
  let current = '';

  parts.forEach((part) => {
    if ((current.length + part.length + 2) > maxChars && current) {
      chunks.push(current);
      current = '';
    }
    if (part.length > maxChars) {
      const slices = part.match(new RegExp(`[\\s\\S]{1,${maxChars}}`, 'g')) || [];
      slices.forEach((slice) => chunks.push(slice.trim()));
      return;
    }
    current = current ? `${current}\n\n${part}` : part;
  });
  if (current) chunks.push(current);
  return chunks.slice(0, maxChunks);
}

function estimateQuestionBankPlan({ sourceText = '', pageCount = null } = {}) {
  const facts = extractStudyFacts(sourceText);
  const words = cleanStudyText(sourceText).split(/\s+/).filter(Boolean).length;
  const pages = Number(pageCount) || Math.max(1, Math.ceil(words / 450));
  const chunks = getQuestionBankChunks(sourceText, pageCount);
  const byPages = pages <= 2 ? 6 + (pages * 2) : pages <= 10 ? 10 + (pages * 2) : pages <= 40 ? 30 + Math.round((pages - 10) * 1.2) : 70 + Math.round((pages - 40) / 3);
  const byDensity = Math.ceil(words / 160);
  const byTopics = facts.length ? facts.length * 2 : 8;
  const questionCount = clampQuestionCount(Math.max(5, Math.min(byPages, Math.max(byDensity, byTopics))));
  const hasReasoningDepth = words > 900 || pages >= 4 || facts.length >= 6;
  const difficulties = hasReasoningDepth ? ['easy', 'medium', 'hard', 'extreme'] : ['easy', 'medium'];
  const coverageHint = [
    `Estimated pages: ${pages}.`,
    `Estimated words: ${words}.`,
    `Detected study points: ${facts.length}.`,
    `Planned source sections: ${chunks.length || 1}.`,
    'Create only enough questions to cover meaningful concepts; do not force all difficulties if content is shallow.',
    hasReasoningDepth ? 'Use hard/extreme only for supported reasoning and comparison questions.' : 'Prefer easy/medium because source looks short or sparse.',
  ].join(' ');
  return { questionCount, difficulties, coverageHint, chunks };
}

function dedupeQuestions(questions = []) {
  const seen = new Set();
  return questions.filter((question) => {
    const key = cleanStudyText(question.q || question.prompt || '').toLowerCase().slice(0, 180);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function buildQuestionBankQuestions({ title, sourceText, pageCount = null }) {
  const plan = estimateQuestionBankPlan({ sourceText, pageCount });
  const chunks = plan.chunks.length ? plan.chunks : [sourceText];
  const perChunk = Math.max(5, Math.ceil(plan.questionCount / chunks.length));
  const generated = [];

  for (const [index, chunk] of chunks.entries()) {
    const chunkPlan = estimateQuestionBankPlan({ sourceText: chunk, pageCount: Math.max(1, Math.round((Number(pageCount) || chunks.length) / chunks.length)) });
    const aiResult = await generatePracticeFromText({
      kind: 'quiz',
      title,
      sourceText: chunk,
      questionCount: Math.min(60, perChunk),
      difficulties: chunkPlan.difficulties,
      coverageHint: `${plan.coverageHint} Section ${index + 1} of ${chunks.length}: cover only concepts visible in this section.`,
    });
    if (aiResult.data?.questions?.length) {
      generated.push(...aiResult.data.questions);
    } else {
      generated.push(...buildGeneratedQuestions(title, [], chunk).map((question, qIndex) => ({
        ...question,
        difficulty: chunkPlan.difficulties[qIndex % chunkPlan.difficulties.length] || 'medium',
      })));
    }
  }

  return dedupeQuestions(generated).slice(0, plan.questionCount);
}

async function createQuestionBankForMaterial({ examId, chapterId = null, noteId = null, material, title }) {
  if (!material?.id || material.processingStatus !== 'ready' || !material.extractedText) return null;
  const existing = await listQuizzes({ examId, ...(chapterId ? { chapterId } : {}), ...(noteId ? { noteId } : {}), sourceMaterialId: material.id });
  if (!existing.error && (existing.data || []).some((quiz) => (quiz.questions || []).some((question) => !isFallbackPracticeQuestion(question)))) {
    return existing.data[0];
  }
  const bankTitle = cleanPracticeTitle(title || material.title, material.title || 'Uploaded material');
  const questions = await buildQuestionBankQuestions({
    title: bankTitle,
    sourceText: material.extractedText,
    pageCount: material.pageCount,
  });
  if (!questions.length) return null;
  const result = await createQuiz({
    examId,
    chapterId,
    noteId,
    sourceMaterialId: material.id,
    title: bankTitle,
    questions,
  });
  return result.error ? null : result.data;
}

function isUuidLike(value = '') {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function getDisplayFileName(material = {}) {
  const rawName = material.title || material.storagePath || material.sourceUrl || 'Study material';
  const lastPart = decodeURIComponent(String(rawName).split('?')[0].split('/').filter(Boolean).pop() || rawName);
  const clean = lastPart
    .replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[-_]/i, '')
    .split(/[-_]/g)
    .filter((part) => part && !isUuidLike(part))
    .join(' ')
    .replace(/\s+\./g, '.')
    .trim();
  return clean || 'Study material';
}

function formatFileSize(sizeBytes) {
  if (!sizeBytes) return null;
  if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(sizeBytes > 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function getFileTypeLabel(material = {}) {
  const name = getDisplayFileName(material).toLowerCase();
  if (material.mimeType?.includes('pdf') || name.endsWith('.pdf')) return 'PDF';
  if (material.mimeType?.includes('png') || name.endsWith('.png')) return 'PNG';
  if (material.mimeType?.includes('jpeg') || name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'JPG';
  if (material.mimeType?.includes('text') || name.endsWith('.txt')) return 'TXT';
  if (material.sourceUrl) return 'LINK';
  return (material.type || 'FILE').toUpperCase();
}

function getMaterialStatusTone(material = {}) {
  const status = material.processingStatus || 'uploaded';
  if (status === 'ready') return 'bg-emerald-50 text-emerald-700';
  if (status === 'processing') return 'bg-amber-50 text-amber-700';
  if (status === 'failed') return 'bg-red-50 text-red-700';
  if (status === 'unsupported') return 'bg-slate-100 text-slate-600';
  return 'bg-slate-100 text-slate-600';
}

function getMaterialStatusPillStyle(material = {}) {
  const status = material.processingStatus || 'uploaded';
  if (status === 'ready') return { background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' };
  if (status === 'processing') return { background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' };
  if (status === 'failed') return { background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' };
  if (status === 'unsupported') return { background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' };
  return { background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' };
}

function formatStudyDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getReadinessStatus(score) {
  if (score >= 90) return { label: 'Exam ready', recommendation: 'Keep momentum with quick review sessions.' };
  if (score >= 70) return { label: 'Almost ready', recommendation: 'Focus on weak topics first.' };
  if (score >= 40) return { label: 'More practice needed', recommendation: 'Focus on weak topics first.' };
  return { label: 'Getting started', recommendation: 'Upload material and generate your first quiz.' };
}

function EmptyState({ icon: IconCmp = FileText, title, copy, actionLabel, onAction, secondary = false }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-7 text-center">
      <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-500 shadow-sm">
        <IconCmp size={20} />
      </div>
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      {copy && <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">{copy}</p>}
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className={secondary ? 'mt-4 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm' : 'mt-4 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm'}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function ExamHeader({ exam, palette, stats, onBack, onStartStudy, onAddMaterial }) {
  const statItems = [
    ['Chapters', stats.chapters],
    ['Materials', stats.materials],
    ['Notes', stats.notes],
    ['Quizzes', stats.quizzes],
    ['Flashcards', stats.flashcards],
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
        <span aria-hidden="true">←</span> Back to My Exams
      </button>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">Your study workspace</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">{exam.name}</h1>
            {exam.date && (
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold text-slate-700" style={{ background: palette.bg, borderColor: `${palette.dot}33` }}>
                <span className="h-2 w-2 rounded-full" style={{ background: palette.dot }} />
                {formatExamDate(exam.date)}
              </span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {statItems.map(([label, value]) => (
              <span key={label} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                {value} {label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onStartStudy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm">
            <Sparkles size={16} /> Start studying
          </button>
          <button type="button" onClick={onAddMaterial} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
            <Plus size={16} /> Add material
          </button>
        </div>
      </div>
    </section>
  );
}

function ReadinessCard({ score, bars, exam, chapters, readinessView, setReadinessView, chapterKey, palette }) {
  const status = getReadinessStatus(score);
  const circumference = 251.33;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-base font-bold text-slate-950">Readiness score</h2>
          <p className="mt-1 text-sm text-slate-500">{status.label}</p>
        </div>
        <label className="relative">
          <select
            value={readinessView}
            onChange={(e) => setReadinessView(e.target.value)}
            className="w-32 appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="exam">Exam</option>
            {chapters.map((chapter) => (
              <option key={chapterKey(chapter)} value={chapterKey(chapter)}>{chapter.name || chapter.title || 'Chapter'}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            <ChevronDown size={14} />
          </span>
        </label>
      </div>
      <div className="flex items-center gap-5">
        <div className="relative h-28 w-28 shrink-0">
          <svg width="112" height="112" viewBox="0 0 96 96" className="-rotate-90">
            <circle cx="48" cy="48" r="40" fill="none" stroke="#E2E8F0" strokeWidth="7" />
            <circle cx="48" cy="48" r="40" fill="none" stroke={palette.dot} strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-950">{score}%</span>
            <span className="text-xs font-medium text-slate-500">ready</span>
          </div>
        </div>
        <p className="text-sm leading-6 text-slate-600">{status.recommendation}</p>
      </div>
      <div className="mt-5 space-y-3">
        {bars.map((bar) => (
          <div key={bar.label}>
            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>{bar.label}</span>
              <span>{bar.value}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${bar.value}%`, background: bar.color }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <div className="text-sm font-semibold text-slate-950">{exam.targetGrade ? `Target ${exam.targetGrade}/30` : 'Keep building consistency'}</div>
        <p className="mt-1 text-sm text-slate-500">Small sessions plus quick quizzes are best next step.</p>
      </div>
    </section>
  );
}

function QuickActionsCard({ onAddMaterial, onNewChapter, onQuiz, onFlashcards }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="m-0 text-base font-bold text-slate-950">Quick actions</h2>
      <div className="mt-4 grid gap-2">
        <button type="button" onClick={onQuiz} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white">
          <Sparkles size={16} /> Generate quiz
        </button>
        <button type="button" onClick={onFlashcards} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <Layers size={16} /> Create flashcards
        </button>
        <button type="button" onClick={onAddMaterial} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <Paperclip size={16} /> Upload material
        </button>
        <button type="button" onClick={onNewChapter} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <BookOpen size={16} /> New chapter
        </button>
      </div>
    </section>
  );
}

function UploadMaterialCard({ materialTitle, setMaterialTitle, materialUrl, setMaterialUrl, materialFile, setMaterialFile, showUrlField, setShowUrlField, savingStudyAction, materialsError, onSubmit, onValidateFile, onClearFile }) {
  const busy = savingStudyAction === 'create-material';
  const uploadLabel = materialFile && (materialFile.type === 'image/png' || materialFile.type === 'image/jpeg')
    ? 'Uploading and reading image...'
    : 'Uploading...';
  return (
    <section id="upload-material" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="m-0 text-base font-bold text-slate-950">Upload material</h2>
          <p className="mt-1 text-sm text-slate-500">PDF, PNG, JPG, or TXT. Add a clean title students can recognize.</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Material title
          <input value={materialTitle} onChange={(e) => setMaterialTitle(e.target.value)} disabled={busy} placeholder="Paper LBO" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none focus:border-indigo-300" />
        </label>
        <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-center">
          <span className="mb-2 text-slate-500">
            <Paperclip size={22} />
          </span>
          <span className="text-sm font-semibold text-slate-800">{materialFile ? materialFile.name : 'Drop file here or browse'}</span>
          <span className="mt-1 text-xs text-slate-500">Supported files: PDF, PNG, JPG, TXT</span>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
            disabled={busy}
            onChange={(e) => onValidateFile(e.target.files?.[0] || null)}
            className="sr-only"
          />
        </label>
        {materialFile && (
          <button type="button" onClick={onClearFile} disabled={busy} className="justify-self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">
            Remove file
          </button>
        )}
        <button type="button" onClick={() => setShowUrlField((value) => !value)} className="justify-self-start text-sm font-semibold text-slate-600">
          {showUrlField ? 'Hide source URL' : 'Add source URL instead'}
        </button>
        {showUrlField && (
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Optional source URL
            <input value={materialUrl} onChange={(e) => setMaterialUrl(e.target.value)} disabled={busy || Boolean(materialFile)} placeholder="https://..." className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none focus:border-indigo-300" />
          </label>
        )}
        {materialsError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{materialsError}</div>}
        <button type="submit" disabled={busy} className="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? (materialFile ? uploadLabel : 'Saving...') : 'Upload material'}
        </button>
      </form>
    </section>
  );
}

function MaterialCard({ material, savingStudyAction, onOpen, onDelete, onQuiz, onFlashcards }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = getDisplayFileName(material);
  const fileSize = formatFileSize(material.sizeBytes);
  const uploaded = formatStudyDate(material.createdAt);
  const canOpen = Boolean(material.sourceUrl || material.storagePath);
  const quizBusy = savingStudyAction === `generate-quiz-material-${material.id}`;
  const flashBusy = savingStudyAction === `generate-flashcards-material-${material.id}`;
  const scopeLabel = material.chapterId ? 'chapter' : 'exam';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600">
          <FileText size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 min-w-0 break-words text-base font-bold text-slate-950">{displayName}</h3>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">{getFileTypeLabel(material)}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-slate-500">
            {fileSize && <span>{fileSize}</span>}
            {uploaded && <span>Uploaded {uploaded}</span>}
            <span className={`rounded-full px-2 py-0.5 font-bold ${getMaterialStatusTone(material)}`}>
              {getMaterialProcessingLabel(material)}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {canOpen && (
              <button type="button" onClick={() => onOpen(material.id)} disabled={savingStudyAction === `open-material-${material.id}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                <Eye size={15} /> {savingStudyAction === `open-material-${material.id}` ? 'Opening...' : 'Open'}
              </button>
            )}
            <button type="button" onClick={onQuiz} disabled={quizBusy} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
              <Sparkles size={15} /> {quizBusy ? 'Generating...' : `Generate ${scopeLabel} quiz`}
            </button>
            <button type="button" onClick={onFlashcards} disabled={flashBusy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">
              <Layers size={15} /> {flashBusy ? 'Creating...' : `Create ${scopeLabel} flashcards`}
            </button>
            <div className="relative">
              <button type="button" onClick={() => setMenuOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                More
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-20 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onDelete(material.id); }}
                    disabled={savingStudyAction === `delete-material-${material.id}`}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    <Trash2 size={15} /> {savingStudyAction === `delete-material-${material.id}` ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function MaterialsPanel({ materials, materialsLoading, materialsError, savingStudyAction, onOpen, onDelete, onQuiz, onFlashcards, onAddMaterial }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="m-0 text-lg font-bold text-slate-950">Study materials</h2>
          <p className="mt-1 text-sm text-slate-500">Clean files ready for practice.</p>
        </div>
        <button type="button" onClick={onAddMaterial} className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 sm:inline-flex">
          Add material
        </button>
      </div>
      {materialsLoading && <EmptyState icon={FileText} title="Loading materials..." copy="Fetching your study files." />}
      {!materialsLoading && materialsError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{materialsError}</div>}
      {!materialsLoading && !materialsError && materials.length === 0 && (
        <EmptyState icon={Paperclip} title="No materials yet" copy="Upload your first material to generate quizzes and flashcards." actionLabel="Upload material" onAction={onAddMaterial} />
      )}
      <div className="grid gap-3">
        {!materialsLoading && materials.map((material) => (
          <MaterialCard key={material.id} material={material} savingStudyAction={savingStudyAction} onOpen={onOpen} onDelete={onDelete} onQuiz={() => onQuiz(material)} onFlashcards={() => onFlashcards(material)} />
        ))}
      </div>
    </section>
  );
}

function ChaptersPanel({ chapters, filtered, q, setQ, onNewChapter, onEditChapter, onOpenPdf, onQuiz, onFlashcards, quizRuns }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="m-0 text-lg font-bold text-slate-950">Chapters</h2>
          <p className="mt-1 text-sm text-slate-500">Organize materials by topic.</p>
        </div>
        <div className="flex gap-2">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-500">
            <Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chapters" className="w-32 border-0 bg-transparent text-sm font-medium text-slate-900 outline-none sm:w-40" />
          </label>
          <button type="button" onClick={onNewChapter} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
            <Plus size={15} /> New chapter
          </button>
        </div>
      </div>
      {chapters.length === 0 ? (
        <EmptyState icon={BookOpen} title="Create a chapter to organize your materials." actionLabel="New chapter" onAction={onNewChapter} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No chapters found" copy="Try a different search." />
      ) : (
        <div className="grid gap-3">
          {filtered.map((chapter) => {
            const lastRun = quizRuns.find((run) => String(run.chapterId) === String(chapter.id));
            return (
              <article key={chapter.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="m-0 text-base font-bold text-slate-950">{chapter.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {chapter.files || 0} materials · {(chapter.questions || []).length} quizzes · {chapter.updated ? `Updated ${chapter.updated}` : 'Ready to organize'}
                    </p>
                    {lastRun && <p className="mt-2 text-xs font-semibold text-slate-600">Last quiz {lastRun.score}% · {lastRun.date}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => onOpenPdf(chapter)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Open chapter</button>
                    <button type="button" onClick={() => onQuiz(chapter)} className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Generate quiz</button>
                    <button type="button" onClick={() => onFlashcards(chapter)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Flashcards</button>
                    <button type="button" onClick={() => onEditChapter(chapter)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500" title="Edit chapter"><Pencil size={15} /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function NotesPanel({ notes, notesLoading, notesError, showNoteForm, setShowNoteForm, noteTitle, setNoteTitle, noteBody, setNoteBody, savingStudyAction, onCreateNote, editingNoteId, editingNoteTitle, setEditingNoteTitle, editingNoteBody, setEditingNoteBody, beginEditNote, cancelEditNote, onUpdateNote, onDeleteNote }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="m-0 text-lg font-bold text-slate-950">Study notes</h2>
          <p className="mt-1 text-sm text-slate-500">Summaries, reminders, weak topics.</p>
        </div>
        <button type="button" onClick={() => setShowNoteForm((value) => !value)} className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">New note</button>
      </div>
      {showNoteForm && (
        <form onSubmit={onCreateNote} className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} disabled={savingStudyAction === 'create-note'} placeholder="Note title" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none" />
          <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} disabled={savingStudyAction === 'create-note'} placeholder="Summarize key concepts..." className="min-h-[88px] rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-950 outline-none" />
          <button type="submit" disabled={savingStudyAction === 'create-note'} className="justify-self-start rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{savingStudyAction === 'create-note' ? 'Saving...' : 'Create note'}</button>
        </form>
      )}
      {notesError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{notesError}</div>}
      {notesLoading && <EmptyState icon={FileText} title="Loading notes..." />}
      {!notesLoading && !notesError && notes.length === 0 && (
        <EmptyState icon={FileText} title="No notes yet" copy="Create your first note to summarize key concepts." actionLabel="New note" onAction={() => setShowNoteForm(true)} />
      )}
      <div className="grid gap-3">
        {!notesLoading && notes.map((note) => (
          <article key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {editingNoteId === note.id ? (
              <div className="grid gap-3">
                <input value={editingNoteTitle} onChange={(e) => setEditingNoteTitle(e.target.value)} disabled={savingStudyAction === `edit-note-${note.id}`} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none" />
                <textarea value={editingNoteBody} onChange={(e) => setEditingNoteBody(e.target.value)} disabled={savingStudyAction === `edit-note-${note.id}`} className="min-h-[76px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-950 outline-none" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => onUpdateNote(note.id)} disabled={savingStudyAction === `edit-note-${note.id}`} className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Save</button>
                  <button type="button" onClick={cancelEditNote} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="m-0 text-base font-bold text-slate-950">{note.title}</h3>
                {note.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{note.body}</p>}
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => beginEditNote(note)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Edit</button>
                  <button type="button" onClick={() => onDeleteNote(note.id)} disabled={savingStudyAction === `delete-note-${note.id}`} className="rounded-xl border border-red-100 bg-white px-3 py-2 text-sm font-semibold text-red-600">{savingStudyAction === `delete-note-${note.id}` ? 'Deleting...' : 'Delete'}</button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function ActivityPanel({ quizHistory, flashHistory, exam, onQuiz, onFlashcards }) {
  const qh = quizHistory[exam.id] || [];
  const fh = [
    ...(flashHistory[exam.id] || []),
    ...(exam.chapters || []).flatMap((c) => flashHistory[c.id] || []),
  ];
  const avgQ = qh.length ? Math.round(qh.reduce((a, b) => a + b, 0) / qh.length) : null;
  const avgFlash = fh.length ? Math.round(fh.reduce((a, b) => a + b, 0) / fh.length) : null;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="m-0 text-lg font-bold text-slate-950">Study history</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {avgQ !== null ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-sm font-semibold text-slate-600">Quiz</div><div className="mt-2 text-2xl font-bold text-slate-950">{avgQ}%</div><p className="mt-1 text-sm text-slate-500">{qh.length} sessions completed</p></div>
        ) : (
          <EmptyState icon={Sparkles} title="No quizzes yet" copy="Generate your first quiz from your uploaded material." actionLabel="Generate quiz" onAction={onQuiz} />
        )}
        {avgFlash !== null ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-sm font-semibold text-slate-600">Flashcards</div><div className="mt-2 text-2xl font-bold text-slate-950">{avgFlash}%</div><p className="mt-1 text-sm text-slate-500">{fh.length} sessions completed</p></div>
        ) : (
          <EmptyState icon={Layers} title="No flashcards yet" copy="Create flashcards from your uploaded material." actionLabel="Create flashcards" onAction={onFlashcards} secondary />
        )}
      </div>
    </section>
  );
}

function CleanExamHeader({ exam, palette, chapters, q, setQ, onBack, onNewChapter }) {
  return (
    <section className="space-y-7">
      <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-base font-bold text-slate-950 shadow-sm">
        <span aria-hidden="true">←</span> My Exams
      </button>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-4xl font-black leading-tight tracking-normal text-slate-950 sm:text-5xl">{exam.name}</h1>
            {exam.date && (
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-extrabold text-slate-950" style={{ background: palette.bg }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: palette.dot }} />
                {formatExamDate(exam.date)}
              </span>
            )}
          </div>
          <p className="mt-4 text-xl font-semibold text-slate-500">{chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'}</p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
          <label className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-slate-400 shadow-sm xl:w-[360px]">
            <Search size={22} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chapters..." className="min-w-0 flex-1 border-0 bg-transparent text-base font-semibold text-slate-950 outline-none placeholder:text-slate-400" />
          </label>
          <button type="button" onClick={onNewChapter} className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-6 text-base font-extrabold text-white shadow-sm">
            <Plus size={22} /> New Chapter
          </button>
        </div>
      </div>
    </section>
  );
}

function CleanChapterGrid({ chapters, filtered, palette, onNewChapter, onEditChapter, onOpenPdf, onQuiz, onFlashcards, quizRuns, savingStudyAction }) {
  if (!chapters.length) {
    return <EmptyState icon={BookOpen} title="Create a chapter to organize your materials." actionLabel="New chapter" onAction={onNewChapter} />;
  }
  if (!filtered.length) {
    return <EmptyState icon={Search} title="No chapters found" copy="Try a different search." />;
  }

  return (
    <section className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
      {filtered.map((chapter, index) => {
        const lastRun = quizRuns.find((run) => String(run.chapterId) === String(chapter.id));
        const files = chapter.files || chapter.fileCount || 0;
        const pages = chapter.pages || chapter.pageCount || Math.max(0, files * 6);
        const updated = chapter.updated || (chapter.updatedAt ? formatStudyDate(chapter.updatedAt) : null) || 'Just now';
        const coverBg = index % 2 === 0 ? palette.bg : '#FFF1F8';
        const dot = index % 2 === 0 ? palette.dot : '#8B5CF6';
        const quizBusy = savingStudyAction === `generate-quiz-chapter-${chapter.id}`;
        const flashBusy = savingStudyAction === `generate-flashcards-chapter-${chapter.id}`;

        return (
          <article key={chapter.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="relative grid h-36 place-items-center" style={{ background: coverBg }}>
              <div className="h-12 w-12 rounded-2xl shadow-sm" style={{ background: dot }} />
              <div className="absolute right-4 top-4 flex gap-3">
                <button type="button" onClick={() => onEditChapter(chapter)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm" aria-label="Edit chapter">
                  <Pencil size={18} />
                </button>
                <button type="button" onClick={() => onOpenPdf(chapter)} className="grid h-11 w-11 place-items-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 shadow-sm" aria-label="Open chapter">
                  <FileText size={19} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <h2 className="m-0 text-xl font-black text-slate-950">{chapter.title || chapter.name || 'Untitled chapter'}</h2>
              <p className="mt-3 text-base font-semibold text-slate-500">
                {files} {files === 1 ? 'file' : 'files'} · {pages} {pages === 1 ? 'page' : 'pages'} · Updated {updated}
              </p>
              {lastRun && <p className="mt-2 text-sm font-bold text-slate-600">Last quiz {lastRun.score}% · {lastRun.date}</p>}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => onQuiz(chapter)} disabled={quizBusy} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-extrabold text-white disabled:opacity-60">
                  <Sparkles size={17} /> {quizBusy ? 'Generating...' : 'Generate Quiz'}
                </button>
                <button type="button" onClick={() => onFlashcards(chapter)} disabled={flashBusy} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-950 disabled:opacity-60">
                  <Layers size={18} /> {flashBusy ? 'Creating...' : 'Flashcards'}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function WideReadinessCard({ score, bars, chapters, readinessView, setReadinessView, chapterKey, palette }) {
  const status = getReadinessStatus(score);
  const circumference = 251.33;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="m-0 inline-flex items-center gap-2 text-xl font-black text-slate-950"><BarChart3 size={22} /> Readiness Score</h2>
        <label className="flex items-center gap-3 text-sm font-extrabold text-slate-500">
          View
          <span className="relative">
            <select value={readinessView} onChange={(e) => setReadinessView(e.target.value)} className="h-12 min-w-44 appearance-none rounded-full border border-slate-200 bg-white px-5 pr-10 text-base font-extrabold text-slate-700 outline-none">
              <option value="exam">Exam</option>
              {chapters.map((chapter) => (
                <option key={chapterKey(chapter)} value={chapterKey(chapter)}>{chapter.name || chapter.title || 'Chapter'}</option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </span>
        </label>
      </div>
      <div className="grid gap-6 lg:grid-cols-[160px_minmax(0,1fr)] lg:items-center">
        <div className="relative mx-auto h-36 w-36 lg:mx-0">
          <svg width="144" height="144" viewBox="0 0 96 96" className="-rotate-90">
            <circle cx="48" cy="48" r="40" fill="none" stroke="#E5E7EB" strokeWidth="7" />
            <circle cx="48" cy="48" r="40" fill="none" stroke={palette.dot} strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-indigo-600">{score}%</span>
            <span className="text-sm font-semibold text-slate-500">ready</span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="mb-5">
            <div className="text-lg font-black text-slate-950">{score >= 40 ? '⚠ More practice needed' : status.label}</div>
            <p className="mt-2 text-base font-semibold text-slate-500">{status.recommendation}</p>
          </div>
          <div className="space-y-4">
            {bars.map((bar) => (
              <div key={bar.label} className="grid grid-cols-[150px_minmax(0,1fr)_42px] items-center gap-4">
                <span className="text-base font-semibold text-slate-500">{bar.label}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <span className="block h-full rounded-full" style={{ width: `${bar.value}%`, background: bar.color }} />
                </span>
                <span className="text-right text-base font-extrabold" style={{ color: bar.color }}>{bar.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StudyHistoryPanel({ quizHistory, flashHistory, quizRuns, recentFlashDecks, exam, onQuiz, onFlashcards, savingStudyAction }) {
  const qh = quizHistory[exam.id] || [];
  const examRuns = quizRuns.filter((run) => String(run.examId || run.noteId) === String(exam.id));
  const quizItems = examRuns.length
    ? examRuns.map((run) => ({ id: run.id, label: run.chapterName || run.title || run.examName || exam.name, score: run.score, meta: run.date || 'Recent' }))
    : qh.map((score, index) => ({ id: `quiz-${index}`, label: `Quiz ${index + 1}`, score, meta: 'Saved session' }));
  const flashScores = [
    ...(flashHistory[exam.id] || []),
    ...(exam.chapters || []).flatMap((chapter) => flashHistory[chapter.id] || []),
  ];
  const flashItems = recentFlashDecks
    .filter((deck) => String(deck.noteId) === String(exam.id) || (exam.chapters || []).some((chapter) => String(chapter.id) === String(deck.noteId)))
    .map((deck) => ({ id: deck.ts || deck.title, label: deck.title || exam.name, score: deck.lastScore ?? null, meta: deck.subject || 'Flashcards' }));
  const fallbackFlashItems = flashItems.length ? flashItems : flashScores.map((score, index) => ({ id: `flash-${index}`, label: `Flashcard session ${index + 1}`, score, meta: 'Saved session' }));

  return (
    <section className="space-y-4">
      <div>
        <h2 className="m-0 text-lg font-black uppercase tracking-normal text-slate-500">Storico attività</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="m-0 text-lg font-black text-slate-950">Quiz history</h3>
            <button type="button" onClick={onQuiz} disabled={savingStudyAction === 'generate-quiz-exam'} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-extrabold text-white disabled:opacity-60">
              <Sparkles size={17} /> {savingStudyAction === 'generate-quiz-exam' ? 'Generating...' : 'Genera Quiz'}
            </button>
          </div>
          {quizItems.length === 0 ? (
            <p className="m-0 text-base font-semibold text-slate-500">Nessun quiz ancora</p>
          ) : (
            <div className="space-y-3">
              {quizItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-slate-950">{item.label}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{item.meta}</div>
                  </div>
                  <div className="text-xl font-black text-indigo-600">{item.score}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="m-0 text-lg font-black text-slate-950">Flashcard history</h3>
            <button type="button" onClick={onFlashcards} disabled={savingStudyAction === 'generate-flashcards-exam'} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-950 disabled:opacity-60">
              <Layers size={17} /> {savingStudyAction === 'generate-flashcards-exam' ? 'Creating...' : 'Flashcard'}
            </button>
          </div>
          {fallbackFlashItems.length === 0 ? (
            <p className="m-0 text-base font-semibold text-slate-500">Nessuna flashcard ancora</p>
          ) : (
            <div className="space-y-3">
              {fallbackFlashItems.slice(0, 5).map((item) => {
                const score = Number.isFinite(Number(item.score)) ? Number(item.score) : 0;
                return (
                  <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-slate-950">{item.label}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">{item.meta}</div>
                    </div>
                    <div className="text-right text-sm font-extrabold">
                      <div className="text-emerald-600">Giuste {score}%</div>
                      <div className="text-orange-500">Da ripassare {Math.max(0, 100 - score)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ExamDetail({ exam, onBack, onAddChapter, onEditChapter, onDeleteChapter, onDeleteChapterDocument, onOpenFlashcards, onOpenQuiz, darkMode, quizHistory = {}, flashHistory = {}, quizRuns = [], recentFlashDecks = [] }) {
  const [q, setQ] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showUrlField, setShowUrlField] = useState(false);
  const [readinessView, setReadinessView] = useState('exam');
  const [editingChapter, setEditingChapter] = useState(null);
  const [pdfChapter, setPdfChapter] = useState(null);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState(null);
  const [notes, setNotes] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [materialsError, setMaterialsError] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [materialUiMeta, setMaterialUiMeta] = useState(() => readMaterialUiMeta());
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState('');
  const [editingNoteBody, setEditingNoteBody] = useState('');
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialUrl, setMaterialUrl] = useState('');
  const [materialFile, setMaterialFile] = useState(null);
  const [savingStudyAction, setSavingStudyAction] = useState(null);
  const palette = getSubjectPalette(exam.subject, exam, darkMode);
  const chapters = exam.chapters || [];
  const filtered = chapters.filter((c) => (c.title || '').toLowerCase().includes(q.toLowerCase()));
  const chapterKey = (chapter) => String(chapter.id ?? chapter.name ?? chapter.title);
  const selectedChapter = readinessView === 'exam' ? null : chapters.find((c) => chapterKey(c) === readinessView);
  const selectedChapterKey = selectedChapter ? chapterKey(selectedChapter) : null;
  const allQuiz = quizHistory[exam.id] || [];
  const allFlash = [
    ...(flashHistory[exam.id] || []),
    ...chapters.flatMap((c) => flashHistory[c.id] || []),
  ];
  const quizAvg = allQuiz.length ? Math.round(allQuiz.reduce((a, b) => a + b, 0) / allQuiz.length) : 50;
  const flashAvg = allFlash.length ? Math.round(allFlash.reduce((a, b) => a + b, 0) / allFlash.length) : 50;
  const chQuiz = selectedChapterKey != null ? (quizHistory[selectedChapterKey] || []) : [];
  const chFlash = selectedChapterKey != null ? (flashHistory[selectedChapterKey] || []) : [];
  const chQuizAvg = selectedChapter ? (chQuiz.length ? Math.round(chQuiz.reduce((a, b) => a + b, 0) / chQuiz.length) : (selectedChapter.mastery || 50)) : 50;
  const chFlashAvg = selectedChapter ? (chFlash.length ? Math.round(chFlash.reduce((a, b) => a + b, 0) / chFlash.length) : (selectedChapter.mastery || 50)) : 50;
  const readiness = Math.round(quizAvg * 0.4 + flashAvg * 0.3 + READINESS_FALLBACKS.studyTime * 0.2 + READINESS_FALLBACKS.planProgress * 0.1);
  const chReadiness = Math.round(chQuizAvg * 0.5 + chFlashAvg * 0.5);
  const currentReadiness = selectedChapter ? chReadiness : readiness;
  const readinessBars = selectedChapter
    ? [
      { label: 'Quiz performance', value: chQuizAvg, color: '#4F46E5' },
      { label: 'Flashcard mastery', value: chFlashAvg, color: '#7C3AED' },
    ]
    : [
      { label: 'Quiz performance', value: quizAvg, color: '#4F46E5' },
      { label: 'Flashcard mastery', value: flashAvg, color: '#7C3AED' },
      { label: 'Study time', value: READINESS_FALLBACKS.studyTime, color: '#059669' },
      { label: 'Plan progress', value: READINESS_FALLBACKS.planProgress, color: '#D97706' },
    ];
  const stats = {
    chapters: chapters.length,
    materials: materials.length,
    notes: notes.length,
    quizzes: allQuiz.length,
    flashcards: allFlash.length,
  };

  useEffect(() => {
    let cancelled = false;
    async function loadStudyData() {
      setNotesLoading(true);
      setMaterialsLoading(true);
      setNotesError(null);
      setMaterialsError(null);
      const [notesResult, materialsResult] = await Promise.all([
        listNotes({ examId: exam.id }),
        listMaterials({ examId: exam.id }),
      ]);
      if (cancelled) return;
      if (notesResult.error) {
        setNotesError(formatStudyServiceError(notesResult.error, 'Unable to load notes.'));
        setNotes([]);
      } else {
        setNotes(notesResult.data || []);
      }
      if (materialsResult.error) {
        setMaterialsError(formatStudyServiceError(materialsResult.error, 'Unable to load materials.'));
        setMaterials([]);
      } else {
        setMaterials((materialsResult.data || []).map((material) => ({ ...material, ...(materialUiMeta[material.id] || {}) })));
      }
      setNotesLoading(false);
      setMaterialsLoading(false);
    }
    loadStudyData();
    return () => { cancelled = true; };
  }, [exam.id]);

  const reloadMaterials = async () => {
    const result = await listMaterials({ examId: exam.id });
    if (result.error) {
      setMaterialsError(formatStudyServiceError(result.error, 'Unable to load materials.'));
      return;
    }
    setMaterials((result.data || []).map((material) => ({ ...material, ...(materialUiMeta[material.id] || {}) })));
  };

  const rememberMaterialUiMeta = (entries = []) => {
    const nextMeta = { ...materialUiMeta };
    for (const entry of entries) {
      if (!entry?.id) continue;
      nextMeta[entry.id] = {
        ...(nextMeta[entry.id] || {}),
        ...(entry.pageCount ? { pageCount: entry.pageCount } : {}),
      };
    }
    setMaterialUiMeta(nextMeta);
    writeMaterialUiMeta(nextMeta);
    return nextMeta;
  };
  const mergeCreatedMaterials = (createdMaterials = []) => {
    if (!createdMaterials.length) return;
    const nextMeta = rememberMaterialUiMeta(createdMaterials);
    setMaterials((prev) => {
      const existingIds = new Set(prev.map((material) => String(material.id)));
      return [
        ...createdMaterials
          .filter((material) => !existingIds.has(String(material.id)))
          .map((material) => ({ ...material, ...(nextMeta[material.id] || {}) })),
        ...prev,
      ];
    });
  };
  const getReadyMaterialSeed = ({ chapterId = null } = {}) => {
    const readyMaterials = materials.filter((material) => {
      if (material.processingStatus !== 'ready' || !material.extractedText) return false;
      if (chapterId && String(material.chapterId) !== String(chapterId)) return false;
      return true;
    });
    if (!readyMaterials.length) return { seedText: '', sourceMaterialId: null };
    return {
      seedText: readyMaterials.map((material) => material.extractedText).join('\n\n'),
      sourceMaterialId: readyMaterials.length === 1 ? readyMaterials[0].id : null,
    };
  };

  const startStudy = async () => {
    const seed = getReadyMaterialSeed();
    const result = await handleGenerateQuiz({
      title: exam.name,
      seedQuestions: seed.seedText ? [] : chapters.flatMap((c) => c.questions || []),
      seedText: seed.seedText,
      sourceMaterialId: seed.sourceMaterialId,
      actionKey: 'exam',
    });
    return result;
  };

  const handleGenerateQuiz = async ({ title, chapterId = null, noteId = null, sourceMaterialId = null, seedQuestions = [], seedText = '', actionKey = 'exam' }) => {
    if (!onOpenQuiz) return null;
    setMaterialsError(null);
    setSavingStudyAction(`generate-quiz-${actionKey}`);

    try {
      const shouldReuseExisting = !seedText || sourceMaterialId;
      const filters = {
        examId: exam.id,
        ...(chapterId ? { chapterId } : {}),
        ...(noteId ? { noteId } : {}),
        sourceMaterialId: sourceMaterialId || null,
      };
      if (shouldReuseExisting) {
        const existing = await listQuizzes(filters);
        if (!existing.error) {
          const existingQuiz = (existing.data || []).find((quiz) => {
            const questions = quiz.questions || [];
            return questions.length > 0 && !questions.some(isFallbackPracticeQuestion);
          });
          if (existingQuiz) {
            onOpenQuiz({
              noteId: chapterId || noteId || exam.id,
              quizId: existingQuiz.id,
              subject: exam.subject,
              title: existingQuiz.title || cleanPracticeTitle(title, exam.name),
              questions: existingQuiz.questions || [],
              _meta: {
                examId: exam.id,
                examName: exam.name,
                chapterId: chapterId || 'all',
                chapterName: title,
                numQ: (existingQuiz.questions || []).length,
              },
            });
            return existingQuiz;
          }
        }
      }

      let questions = buildGeneratedQuestions(title, seedQuestions, seedText);
      if (seedText) {
        questions = await buildQuestionBankQuestions({
          title: cleanPracticeTitle(title, exam.name),
          sourceText: seedText,
        });
      }
      const result = await createQuiz({
        examId: exam.id,
        chapterId,
        noteId,
        sourceMaterialId,
        title: cleanPracticeTitle(title, exam.name),
        questions,
      });
      if (result.error) {
        setMaterialsError(formatStudyServiceError(result.error, 'Unable to generate quiz.'));
        return null;
      }
      const quiz = result.data;
      onOpenQuiz({
        noteId: chapterId || noteId || exam.id,
        quizId: quiz.id,
        subject: exam.subject,
        title: quiz.title,
        questions: quiz.questions || questions,
        _meta: { examId: exam.id, examName: exam.name, chapterId: chapterId || 'all', chapterName: title, numQ: (quiz.questions || questions).length },
      });
      return quiz;
    } catch (error) {
      setMaterialsError(error?.message || 'Unable to generate quiz.');
      return null;
    } finally {
      setSavingStudyAction(null);
    }
  };

  const handleGenerateFlashcards = async ({ title, chapterId = null, noteId = null, sourceMaterialId = null, seedCards = [], seedText = '', actionKey = 'exam' }) => {
    if (!onOpenFlashcards) return null;
    setMaterialsError(null);
    setSavingStudyAction(`generate-flashcards-${actionKey}`);

    try {
      if ((chapterId || noteId || sourceMaterialId) && (!seedText || sourceMaterialId)) {
        const existing = await listFlashcards({
          examId: exam.id,
          ...(chapterId ? { chapterId } : {}),
          ...(noteId ? { noteId } : {}),
          sourceMaterialId: sourceMaterialId || null,
        });
        if (!existing.error && existing.data?.length) {
          onOpenFlashcards({
            noteId: chapterId || noteId || exam.id,
            subject: exam.subject,
            title: cleanPracticeTitle(title, exam.name),
            cards: existing.data,
            _meta: { examId: exam.id, chapterId: chapterId || 'all' },
          });
          return existing.data;
        }
      }

      let cards = buildGeneratedFlashcards(title, seedCards, seedText);
      if (seedText) {
        const aiResult = await generatePracticeFromText({
          kind: 'flashcards',
          title: cleanPracticeTitle(title, exam.name),
          sourceText: seedText,
        });
        if (aiResult.data?.cards?.length) cards = aiResult.data.cards;
      }
      const created = [];
      for (const card of cards) {
        const result = await createFlashcard({
          examId: exam.id,
          chapterId,
          noteId,
          sourceMaterialId,
          front: card.front,
          back: card.back,
        });
        if (result.error) {
          setMaterialsError(formatStudyServiceError(result.error, 'Unable to create flashcards.'));
          return null;
        }
        created.push(result.data);
      }

      onOpenFlashcards({
        noteId: chapterId || noteId || exam.id,
        subject: exam.subject,
        title: cleanPracticeTitle(title, exam.name),
        cards: created,
        _meta: { examId: exam.id, chapterId: chapterId || 'all' },
      });
      return created;
    } catch (error) {
      setMaterialsError(error?.message || 'Unable to create flashcards.');
      return null;
    } finally {
      setSavingStudyAction(null);
    }
  };

  const resetNoteForm = () => {
    setNoteTitle('');
    setNoteBody('');
  };
  const handleCreateNote = async (e) => {
    e.preventDefault();
    setNotesError(null);
    if (!noteTitle.trim()) {
      setNotesError('Note title is required.');
      return;
    }
    setSavingStudyAction('create-note');
    const { data, error } = await createNote({ examId: exam.id, title: noteTitle.trim(), body: noteBody.trim() });
    if (error) {
      setNotesError(formatStudyServiceError(error, 'Unable to create note.'));
      setSavingStudyAction(null);
      return;
    }
    setNotes((prev) => [data, ...prev]);
    resetNoteForm();
    setShowNoteForm(false);
    setSavingStudyAction(null);
  };
  const beginEditNote = (note) => {
    setNotesError(null);
    setEditingNoteId(note.id);
    setEditingNoteTitle(note.title || '');
    setEditingNoteBody(note.body || '');
  };
  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteTitle('');
    setEditingNoteBody('');
  };
  const handleUpdateNote = async (id) => {
    setNotesError(null);
    if (!editingNoteTitle.trim()) {
      setNotesError('Note title is required.');
      return;
    }
    setSavingStudyAction(`edit-note-${id}`);
    const { data, error } = await updateNote(id, { title: editingNoteTitle.trim(), body: editingNoteBody.trim() });
    if (error) {
      setNotesError(formatStudyServiceError(error, 'Unable to update note.'));
      setSavingStudyAction(null);
      return;
    }
    setNotes((prev) => prev.map((note) => String(note.id) === String(id) ? data : note));
    cancelEditNote();
    setSavingStudyAction(null);
  };
  const handleDeleteNote = async (id) => {
    setNotesError(null);
    setSavingStudyAction(`delete-note-${id}`);
    const { error } = await deleteNote(id);
    if (error) {
      setNotesError(formatStudyServiceError(error, 'Unable to delete note.'));
      setSavingStudyAction(null);
      return;
    }
    setNotes((prev) => prev.filter((note) => String(note.id) !== String(id)));
    setMaterials((prev) => prev.filter((material) => String(material.noteId) !== String(id)));
    setSavingStudyAction(null);
  };
  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    setMaterialsError(null);
    if (!materialTitle.trim()) {
      setMaterialsError('Material title is required.');
      return;
    }
    if (materialFile) {
      const validation = validateStudyMaterialFile(materialFile);
      if (validation.error) {
        setMaterialsError(formatStudyServiceError(validation.error, 'File is not valid.'));
        return;
      }
    }
    setSavingStudyAction('create-material');
    let uploadedFile = null;
    let materialMetadata = {
      pageCount: null,
      processingStatus: 'uploaded',
      extractedText: null,
      extractionError: null,
      processedAt: null,
    };
    if (materialFile) {
      const metadataResult = await buildMaterialFileMetadata(materialFile);
      if (metadataResult.error) {
        setMaterialsError(formatStudyServiceError(metadataResult.error, 'Unable to inspect material file.'));
        setSavingStudyAction(null);
        return;
      }
      materialMetadata = metadataResult.data;
      const uploadResult = await uploadStudyMaterialFile({ file: materialFile, materialId: crypto.randomUUID() });
      if (uploadResult.error) {
        setMaterialsError(formatStudyServiceError(uploadResult.error, 'Unable to upload material file.'));
        setSavingStudyAction(null);
        return;
      }
      uploadedFile = uploadResult.data;
    }
    const { data, error } = await createMaterial({
      examId: exam.id,
      title: materialTitle.trim(),
      sourceUrl: uploadedFile ? null : materialUrl.trim() || null,
      storagePath: uploadedFile?.path || null,
      mimeType: uploadedFile?.mimeType || null,
      sizeBytes: uploadedFile?.sizeBytes ?? null,
      pageCount: materialMetadata.pageCount,
      processingStatus: materialMetadata.processingStatus,
      extractedText: materialMetadata.extractedText,
      extractionError: materialMetadata.extractionError,
      processedAt: materialMetadata.processedAt,
      type: uploadedFile ? 'file' : (materialUrl.trim() ? 'link' : 'metadata'),
    });
    if (error) {
      setMaterialsError(formatStudyServiceError(error, 'Unable to create material.'));
      setSavingStudyAction(null);
      return;
    }
    const resolvedPageCount = data.pageCount ?? materialMetadata.pageCount ?? null;
    let material = { ...data, pageCount: resolvedPageCount };
    if (shouldRunImageOcr(material)) {
      const ocrResult = await requestMaterialOcr(material.id);
      if (ocrResult.data) {
        material = ocrResult.data;
      } else {
        const failedUpdate = await updateMaterial(material.id, {
          processingStatus: 'failed',
          extractionError: formatStudyServiceError(ocrResult.error, 'OCR extraction failed.'),
          processedAt: new Date().toISOString(),
        });
        if (failedUpdate.data) material = failedUpdate.data;
      }
    }
    if (material.processingStatus === 'ready' && material.extractedText) {
      createQuestionBankForMaterial({
        examId: exam.id,
        material,
        title: material.title || exam.name,
      }).catch(() => {});
    }
    if (resolvedPageCount) rememberMaterialUiMeta([material]);
    setMaterials((prev) => [material, ...prev]);
    setMaterialTitle('');
    setMaterialUrl('');
    setMaterialFile(null);
    setShowUrlField(false);
    setSavingStudyAction(null);
  };
  const handleDeleteMaterial = async (id) => {
    setMaterialsError(null);
    setSavingStudyAction(`delete-material-${id}`);
    const material = materials.find((item) => String(item.id) === String(id));
    if (material?.storagePath) {
      const fileResult = await deleteStudyMaterialFile(material.storagePath);
      if (fileResult.error) {
        setMaterialsError(formatStudyServiceError(fileResult.error, 'Unable to delete material file.'));
        setSavingStudyAction(null);
        return;
      }
    }
    const { error } = await deleteMaterial(id);
    if (error) {
      setMaterialsError(formatStudyServiceError(error, 'Unable to delete material.'));
      setSavingStudyAction(null);
      return;
    }
    setMaterials((prev) => prev.filter((material) => String(material.id) !== String(id)));
    setSavingStudyAction(null);
  };
  const handleOpenMaterial = async (id) => {
    setMaterialsError(null);
    setSavingStudyAction(`open-material-${id}`);
    const { data, error } = await getMaterialDownloadUrl(id);
    setSavingStudyAction(null);
    if (error) {
      setMaterialsError(formatStudyServiceError(error, 'Unable to open material.'));
      return;
    }
    window.open(data.url, '_blank', 'noopener,noreferrer');
  };
  const handleValidateFile = (file) => {
    setMaterialFile(file);
    setMaterialsError(null);
    if (!file) return;
    if (!materialTitle.trim()) setMaterialTitle(getDisplayFileName({ title: file.name }));
    const validation = validateStudyMaterialFile(file);
    if (validation.error) setMaterialsError(formatStudyServiceError(validation.error, 'File is not valid.'));
  };
  const handleMaterialQuiz = (material) => handleGenerateQuiz({
    title: getDisplayFileName(material),
    chapterId: material.chapterId || null,
    noteId: material.noteId || null,
    sourceMaterialId: material.id,
    seedText: material.extractedText || '',
    actionKey: `material-${material.id}`,
  });
  const handleMaterialFlashcards = (material) => handleGenerateFlashcards({
    title: getDisplayFileName(material),
    chapterId: material.chapterId || null,
    noteId: material.noteId || null,
    sourceMaterialId: material.id,
    seedText: material.extractedText || '',
    actionKey: `material-${material.id}`,
  });
  const handleAddChapterDocuments = async (chapter, files) => {
    const pickedFiles = Array.from(files || []);
    if (!pickedFiles.length) return;
    const result = await onAddChapter({ chapterId: chapter.id, fileCount: pickedFiles.length, files: pickedFiles });
    const createdMaterials = result?.materials || [];
    mergeCreatedMaterials(createdMaterials);
    if (result?.chapter) {
      setPdfChapter((current) => current && String(current.id) === String(chapter.id) ? { ...current, ...result.chapter } : current);
    }
    await reloadMaterials();
  };
  const handleRenameChapterDocument = async (material, title) => {
    const cleanTitle = String(title || '').trim();
    if (!material?.id || !cleanTitle) return;
    setMaterialsError(null);
    setSavingStudyAction(`rename-material-${material.id}`);
    const { data, error } = await updateMaterial(material.id, { title: cleanTitle });
    setSavingStudyAction(null);
    if (error) {
      setMaterialsError(formatStudyServiceError(error, 'Unable to rename material.'));
      return;
    }
    setMaterials((prev) => prev.map((item) => String(item.id) === String(material.id)
      ? { ...item, ...data, ...(materialUiMeta[material.id] || {}) }
      : item));
  };
  const handleDeleteChapterDocument = async (chapter, material) => {
    if (material?.id) await handleDeleteMaterial(material.id);
    if (onDeleteChapterDocument) await onDeleteChapterDocument({ chapterId: chapter.id, pages: Math.max(1, Math.round((chapter.pages || 6) / Math.max(1, chapter.files || 1))) });
  };

  return (
    <div className="mx-auto max-w-7xl bg-white pb-10 text-slate-950">
      <div className="space-y-8">
        <CleanExamHeader
          exam={exam}
          palette={palette}
          chapters={chapters}
          q={q}
          setQ={setQ}
          onBack={onBack}
          onNewChapter={() => setShowUpload(true)}
        />

        {showUpload && (
          <UploadChapterModal
            existingChapters={chapters}
            onClose={() => setShowUpload(false)}
            onUpload={async (payload) => {
              const result = await onAddChapter(payload);
              mergeCreatedMaterials(result?.materials || []);
              setShowUpload(false);
            }}
          />
        )}

        <CleanChapterGrid
          chapters={chapters}
          filtered={filtered}
          palette={palette}
          onNewChapter={() => setShowUpload(true)}
          onEditChapter={setEditingChapter}
          onOpenPdf={setPdfChapter}
          onQuiz={(chapter) => {
            const seed = getReadyMaterialSeed({ chapterId: chapter.id });
            return handleGenerateQuiz({
              title: chapter.title,
              chapterId: chapter.id,
              sourceMaterialId: seed.sourceMaterialId,
              seedQuestions: seed.seedText ? [] : chapter.questions || [],
              seedText: seed.seedText,
              actionKey: `chapter-${chapter.id}`,
            });
          }}
          onFlashcards={(chapter) => {
            const seed = getReadyMaterialSeed({ chapterId: chapter.id });
            return handleGenerateFlashcards({
              title: chapter.title,
              chapterId: chapter.id,
              sourceMaterialId: seed.sourceMaterialId,
              seedCards: seed.seedText ? [] : chapter.cards || [],
              seedText: seed.seedText,
              actionKey: `chapter-${chapter.id}`,
            });
          }}
          quizRuns={quizRuns}
          savingStudyAction={savingStudyAction}
        />

        <WideReadinessCard
          score={currentReadiness}
          bars={readinessBars}
          chapters={chapters}
          readinessView={readinessView}
          setReadinessView={setReadinessView}
          chapterKey={chapterKey}
          palette={palette}
        />

        <StudyHistoryPanel
          quizHistory={quizHistory}
          flashHistory={flashHistory}
          quizRuns={quizRuns}
          recentFlashDecks={recentFlashDecks}
          exam={exam}
          onQuiz={startStudy}
          onFlashcards={() => {
            const seed = getReadyMaterialSeed();
            return handleGenerateFlashcards({
              title: exam.name,
              sourceMaterialId: seed.sourceMaterialId,
              seedCards: seed.seedText ? [] : chapters.flatMap((c) => c.cards || []),
              seedText: seed.seedText,
              actionKey: 'exam',
            });
          }}
          savingStudyAction={savingStudyAction}
        />

        {editingChapter && (
          <EditChapterModal
            chapter={editingChapter}
            onClose={() => setEditingChapter(null)}
            onSave={async (newTitle) => { await onEditChapter({ chapterId: editingChapter.id, newTitle }); setEditingChapter(null); }}
            onDelete={async () => { await onDeleteChapter(editingChapter.id); setEditingChapter(null); }}
          />
        )}
        {pdfChapter && (
          <PDFModal
            chapter={pdfChapter}
            materials={materials.filter((material) => String(material.chapterId) === String(pdfChapter.id))}
            onClose={() => setPdfChapter(null)}
            onAddDocument={handleAddChapterDocuments}
            onDeleteDocument={handleDeleteChapterDocument}
            onRenameDocument={handleRenameChapterDocument}
            saving={savingStudyAction}
          />
        )}
      </div>
    </div>
  );
}

function PDFModal({ chapter, materials = [], onClose, onAddDocument, onDeleteDocument, onRenameDocument, saving }) {
  const inputRef = useRef(null);
  const [previewUrls, setPreviewUrls] = useState({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [editingDocId, setEditingDocId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const title = chapter.title || chapter.name || 'Chapter';
  const docs = materials;
  const docCount = docs.length;
  const docsPreviewKey = docs.map((doc) => `${doc.id}:${doc.storagePath || doc.sourceUrl || ''}`).join('|');
  const pagesFor = (doc) => {
    if (doc.pageCount) return doc.pageCount;
    if (doc.page_count) return doc.page_count;
    if (doc.pages) return doc.pages;
    return null;
  };
  const handleFilePick = async (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = '';
    if (!picked.length) return;
    await onAddDocument(chapter, picked);
  };

  useEffect(() => {
    let cancelled = false;
    async function loadPreviews() {
      setPreviewLoading(true);
      const entries = await Promise.all(docs.filter((doc) => !doc.mock).map(async (doc) => {
        if (doc.sourceUrl) return [doc.id, doc.sourceUrl];
        if (doc.storagePath) {
          const result = await createStudyMaterialSignedUrl(doc.storagePath);
          return [doc.id, result.error ? null : result.data?.url || null];
        }
        if (!doc.id) return [doc.id, null];
        const result = await getMaterialDownloadUrl(doc.id);
        return [doc.id, result.error ? null : result.data?.url || null];
      }));
      if (!cancelled) {
        setPreviewUrls(Object.fromEntries(entries));
        setPreviewLoading(false);
      }
    }
    loadPreviews();
    return () => { cancelled = true; };
  }, [docsPreviewKey]);
  const selectedDocIndex = selectedDocId ? docs.findIndex((doc) => String(doc.id) === String(selectedDocId)) : -1;
  const selectedDoc = selectedDocIndex >= 0 ? docs[selectedDocIndex] : null;
  const selectedName = selectedDoc ? getDisplayFileName(selectedDoc) : '';
  const selectedUrl = selectedDoc ? previewUrls[selectedDoc.id] : null;
  const selectedPreviewReady = selectedDoc ? Object.prototype.hasOwnProperty.call(previewUrls, selectedDoc.id) : false;
  const selectedIsImage = selectedDoc ? (/\.(png|jpe?g|webp|gif)$/i.test(selectedName) || selectedDoc.mimeType?.startsWith('image/')) : false;
  const selectedIsPdf = selectedDoc ? (/\.pdf$/i.test(selectedName) || selectedDoc.mimeType?.includes('pdf')) : false;
  const beginRename = (doc) => {
    setEditingDocId(doc.id);
    setEditingTitle(getDisplayFileName(doc));
  };
  const cancelRename = () => {
    setEditingDocId(null);
    setEditingTitle('');
  };
  const saveRename = async (doc) => {
    await onRenameDocument?.(doc, editingTitle);
    cancelRename();
  };
  const isRenaming = (doc) => saving === `rename-material-${doc.id}`;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        display: 'grid',
        placeItems: 'center',
        padding: 14,
        background: 'rgba(15,16,53,.45)'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(960px, 96vw)',
          height: 'min(740px, 92vh)',
          background: '#fff',
          border: '1px solid #D9DDE7',
          borderRadius: 28,
          boxShadow: '0 30px 90px rgba(15,16,53,.28)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: '26px 28px 24px', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, color: 'var(--ink)', fontSize: 24, fontWeight: 900, lineHeight: 1.1 }}>{selectedDoc ? selectedName : title}</h2>
            <div style={{ margin: '12px 0 0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--gray)', fontSize: 18, fontWeight: 600 }}>
                {selectedDoc ? `${title} · preview` : `${docCount} ${docCount === 1 ? 'document' : 'documents'}`}
              </span>
              {selectedDoc && (
                <span style={{ ...getMaterialStatusPillStyle(selectedDoc), borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 900 }}>
                  {getMaterialProcessingLabel(selectedDoc)}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {selectedDoc ? (
              <button
                type="button"
                onClick={() => setSelectedDocId(null)}
                style={{ height: 50, borderRadius: 14, border: '1.5px solid #E5E7EB', background: '#fff', color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 10, padding: '0 20px', fontSize: 16, fontWeight: 900, cursor: 'pointer' }}
              >
                ← Documents
              </button>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                style={{ height: 50, borderRadius: 14, border: '1.5px solid #C7CAFF', background: '#EEF2FF', color: 'var(--indigo)', display: 'inline-flex', alignItems: 'center', gap: 12, padding: '0 22px', fontSize: 17, fontWeight: 900, cursor: 'pointer' }}
              >
                <Plus size={22} /> Add document
              </button>
            )}
            <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain" multiple onChange={handleFilePick} style={{ display: 'none' }} />
            <button
              type="button"
              onClick={onClose}
              style={{ width: 50, height: 50, borderRadius: 999, border: '1.5px solid #E5E7EB', background: '#fff', color: '#6B7280', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 30, fontWeight: 700, lineHeight: 1 }}
              aria-label="Close documents"
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ flex: 1, background: '#F3F6FB', padding: 32, overflow: 'auto' }}>
          {selectedDoc ? (
            <div style={{ height: '100%', minHeight: 480, border: '1px solid #DDE3EE', borderRadius: 22, background: '#fff', boxShadow: '0 18px 44px rgba(15,23,42,.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, minHeight: 0, background: '#EEF2F7', display: 'grid', placeItems: 'center', padding: 22 }}>
                {selectedUrl && selectedIsImage ? (
                  <img src={selectedUrl} alt={selectedName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12, boxShadow: '0 18px 44px rgba(15,23,42,.18)' }} />
                ) : selectedUrl && selectedIsPdf ? (
                  <iframe src={selectedUrl} title={selectedName} style={{ width: '100%', height: '100%', minHeight: 440, border: 'none', borderRadius: 12, background: '#fff' }} />
                ) : selectedUrl ? (
                  <iframe src={selectedUrl} title={selectedName} style={{ width: '100%', height: '100%', minHeight: 440, border: 'none', borderRadius: 12, background: '#fff' }} />
                ) : !selectedPreviewReady || previewLoading ? (
                  <div style={{ width: 'min(360px, 86%)', borderRadius: 18, background: '#fff', boxShadow: '0 18px 44px rgba(15,23,42,.14)', padding: 28, boxSizing: 'border-box', display: 'grid', justifyItems: 'center', gap: 16, color: 'var(--gray)', textAlign: 'center', fontWeight: 800 }}>
                    <div style={{ width: 58, height: 70, borderRadius: 12, border: '1.5px solid #C7CAFF', background: '#EEF2FF', color: 'var(--indigo)', display: 'grid', placeItems: 'center' }}>
                      <FileText size={30} />
                    </div>
                    Loading preview...
                  </div>
                ) : (
                  <div style={{ width: 'min(360px, 86%)', borderRadius: 18, background: '#fff', boxShadow: '0 18px 44px rgba(15,23,42,.14)', padding: 28, boxSizing: 'border-box', display: 'grid', justifyItems: 'center', gap: 16, color: 'var(--gray)', textAlign: 'center', fontWeight: 800 }}>
                    <div style={{ width: 58, height: 70, borderRadius: 12, border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#EF4444', display: 'grid', placeItems: 'center' }}>
                      <FileText size={30} />
                    </div>
                    Preview unavailable. Try reopening the document.
                  </div>
                )}
              </div>
              <div style={{ borderTop: '1px solid #DDE3EE', background: '#fff', padding: '14px 18px', color: 'var(--ink)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 15, fontWeight: 900 }}>
                  {selectedName}
                </span>
                <span style={{ ...getMaterialStatusPillStyle(selectedDoc), borderRadius: 999, padding: '4px 9px', fontSize: 11, fontWeight: 900 }}>
                  {getMaterialProcessingLabel(selectedDoc)}
                </span>
              </div>
            </div>
          ) : docCount === 0 ? (
            <div style={{ minHeight: 260, border: '1px dashed #CBD5E1', borderRadius: 22, background: '#fff', display: 'grid', placeItems: 'center', textAlign: 'center', color: 'var(--gray)', fontWeight: 700, boxShadow: '0 14px 34px rgba(15,23,42,.06)' }}>
              No documents yet. Add first document.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 18 }}>
              {docs.map((doc) => {
                const canDelete = !doc.mock && doc.id;
                const name = getDisplayFileName(doc);
                const pages = pagesFor(doc);
                const meta = [
                  pages ? `${pages} ${pages === 1 ? 'page' : 'pages'}` : null,
                  formatFileSize(doc.sizeBytes),
                  getFileTypeLabel(doc),
                ].filter(Boolean).join(' · ');
                const editing = editingDocId === doc.id;
                const processingLabel = getMaterialProcessingLabel(doc);
                return (
                  <article
                    key={doc.id || name}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedDocId(doc.id)}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedDocId(doc.id); }}
                    style={{ position: 'relative', minHeight: 210, border: '1px solid #DDE3EE', background: '#fff', borderRadius: 22, padding: '22px 88px 22px 22px', boxShadow: '0 18px 44px rgba(15,23,42,.08)', cursor: 'pointer' }}
                  >
                    <div style={{ width: 64, height: 76, borderRadius: 14, border: '1.5px solid #C7CAFF', background: '#EEF2FF', color: 'var(--indigo)', display: 'grid', placeItems: 'center', marginBottom: 24 }}>
                      <FileText size={30} />
                    </div>
                    {editing ? (
                      <div onClick={(event) => event.stopPropagation()} style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
                        <input
                          value={editingTitle}
                          onChange={(event) => setEditingTitle(event.target.value)}
                          disabled={isRenaming(doc)}
                          autoFocus
                          style={{ height: 44, borderRadius: 12, border: '1.5px solid #C7CAFF', padding: '0 12px', color: 'var(--ink)', fontSize: 16, fontWeight: 800, outline: 'none' }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" onClick={() => saveRename(doc)} disabled={isRenaming(doc) || !editingTitle.trim()} style={{ border: 'none', borderRadius: 12, background: 'var(--indigo)', color: '#fff', padding: '9px 13px', fontSize: 13, fontWeight: 900, cursor: 'pointer', opacity: isRenaming(doc) ? .65 : 1 }}>Save</button>
                          <button type="button" onClick={cancelRename} disabled={isRenaming(doc)} style={{ border: '1px solid #E5E7EB', borderRadius: 12, background: '#fff', color: 'var(--gray)', padding: '9px 13px', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 style={{ margin: 0, color: 'var(--ink)', fontSize: 20, fontWeight: 900, overflowWrap: 'anywhere' }}>{name}</h3>
                        <div style={{ margin: '12px 0 0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: 'var(--gray)', fontSize: 16, fontWeight: 700 }}>{meta || 'Uploaded file'}</span>
                          <span style={{ ...getMaterialStatusPillStyle(doc), borderRadius: 999, padding: '4px 9px', fontSize: 11, fontWeight: 900 }}>
                            {processingLabel}
                          </span>
                        </div>
                      </>
                    )}
                    {canDelete && (
                      <div style={{ position: 'absolute', top: 18, right: 18, display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); beginRename(doc); }}
                          disabled={isRenaming(doc)}
                          style={{ width: 44, height: 44, borderRadius: 14, border: '1.5px solid #DDE3EE', background: '#fff', color: 'var(--indigo)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                          aria-label={`Rename ${name}`}
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); onDeleteDocument(chapter, doc); }}
                          disabled={saving === `delete-material-${doc.id}`}
                          style={{ width: 44, height: 44, borderRadius: 14, border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#EF4444', display: 'grid', placeItems: 'center', cursor: 'pointer', opacity: saving === `delete-material-${doc.id}` ? .6 : 1 }}
                          aria-label={`Delete ${name}`}
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LegacyPDFModal({ chapter, onClose }) {
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [page, setPage] = useState(1);
  const title = chapter.title || chapter.name || 'Chapter';
  const fileCount = Math.max(1, chapter.files || 1);
  const pdfs = Array.from({ length: fileCount }, (_, i) => {
    const basePages = Math.max(1, Math.round((chapter.pages || 8) / fileCount));
    return {
      id: i + 1,
      name: i === 0 ? 'chapter.pdf' : 'chapter-' + (i + 1) + '.pdf',
      pages: i === fileCount - 1 ? Math.max(1, (chapter.pages || 8) - basePages * i) : basePages,
    };
  });
  const totalPages = Math.max(1, selectedPdf ? selectedPdf.pages : chapter.pages || 8);

  useEffect(() => {
    setPage(1);
  }, [chapter.id, selectedPdf && selectedPdf.id]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        display: 'grid',
        placeItems: 'center',
        padding: 18,
        background: 'rgba(15,16,53,.45)'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(660px, 94vw)',
          height: 'min(520px, 86vh)',
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 20,
          boxShadow: '0 24px 80px rgba(15,16,53,.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            {selectedPdf && (
              <button
                type="button"
                onClick={() => setSelectedPdf(null)}
                title="Back to PDFs"
                style={{ width: 30, height: 30, borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0 }}
              >
                ‹
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>{selectedPdf ? selectedPdf.name : fileCount + ' PDF ' + (fileCount === 1 ? 'file' : 'files')}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close PDF"
            style={{ width: 30, height: 30, borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--gray)', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 18, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {!selectedPdf ? (
          <div style={{ flex: 1, background: '#F8FAFC', padding: 22, overflow: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              {pdfs.map((pdf) => (
                <button
                  key={pdf.id}
                  type="button"
                  onClick={() => setSelectedPdf(pdf)}
                  style={{ textAlign: 'left', border: '1px solid var(--border)', background: '#fff', borderRadius: 16, padding: 14, cursor: 'pointer', boxShadow: '0 10px 30px rgba(15,16,53,.06)' }}
                >
                  <div style={{ width: 44, height: 52, borderRadius: 10, background: 'var(--lavender)', border: '1px solid rgba(55,48,232,.18)', color: 'var(--indigo)', display: 'grid', placeItems: 'center', marginBottom: 12 }}>
                    <FileText size={22} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdf.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4 }}>{pdf.pages} {pdf.pages === 1 ? 'page' : 'pages'}</div>
                  <div style={{ height: 6, borderRadius: 999, background: '#E5E7EB', marginTop: 12, width: '88%' }} />
                  <div style={{ height: 6, borderRadius: 999, background: '#E5E7EB', marginTop: 6, width: '64%' }} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, background: '#E5E7EB', display: 'grid', placeItems: 'center', minHeight: 0 }}>
              <div style={{ width: '72%', height: '90%', borderRadius: 6, background: '#fff', boxShadow: '0 12px 32px rgba(15,16,53,.18)', padding: 26, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ width: '42%', height: 14, borderRadius: 999, background: '#D1D5DB', marginBottom: 8 }} />
                <div style={{ width: '100%', height: 8, borderRadius: 999, background: '#E5E7EB' }} />
                <div style={{ width: '94%', height: 8, borderRadius: 999, background: '#E5E7EB' }} />
                <div style={{ width: '88%', height: 8, borderRadius: 999, background: '#E5E7EB' }} />
                <div style={{ width: '100%', height: 8, borderRadius: 999, background: '#E5E7EB', marginTop: 10 }} />
                <div style={{ width: '76%', height: 8, borderRadius: 999, background: '#E5E7EB' }} />
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end', marginTop: 14 }}>
                  <div style={{ height: '72%', borderRadius: 8, background: '#F3F4F6' }} />
                  <div style={{ height: '54%', borderRadius: 8, background: '#F3F4F6' }} />
                </div>
                <div style={{ width: '62%', height: 8, borderRadius: 999, background: '#E5E7EB' }} />
                <div style={{ width: '84%', height: 8, borderRadius: 999, background: '#E5E7EB' }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid var(--border)', background: page === 1 ? '#F3F4F6' : '#fff', color: page === 1 ? 'var(--gray-2)' : 'var(--ink)', cursor: page === 1 ? 'default' : 'pointer', fontSize: 20 }}
              >
                ‹
              </button>
              <div style={{ minWidth: 74, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{page} / {totalPages}</div>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid var(--border)', background: page === totalPages ? '#F3F4F6' : '#fff', color: page === totalPages ? 'var(--gray-2)' : 'var(--ink)', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 20 }}
              >
                ›
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}



const studyS = {
  wrap: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 22 },
  column: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 },
  sectionHead: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  title: { margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--ink)' },
  sub: { margin: '4px 0 0', fontSize: 12, color: 'var(--gray)', lineHeight: 1.4 },
  form: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 },
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--input-bg)', color: 'var(--ink)', fontSize: 13, outline: 'none' },
  fileLabel: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px dashed var(--border)', borderRadius: 12, background: 'var(--input-bg)', color: 'var(--gray)', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  fileText: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileInput: { width: 110, maxWidth: '45%', fontSize: 11, color: 'var(--gray)' },
  primaryBtn: { alignSelf: 'flex-start', padding: '9px 13px', borderRadius: 10, background: 'var(--indigo)', color: '#fff', fontWeight: 700, fontSize: 12 },
  empty: { padding: '14px 12px', borderRadius: 12, background: 'var(--sidebar-bg)', border: '1px dashed var(--border)', color: 'var(--gray)', fontSize: 13, textAlign: 'center' },
  error: { marginBottom: 10, padding: '10px 12px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: 12, fontWeight: 700, lineHeight: 1.4 },
  item: { padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--sidebar-bg)', marginTop: 8 },
  itemTitle: { fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 5 },
  itemBody: { fontSize: 12, color: 'var(--gray)', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  actions: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' },
  primaryMini: { padding: '7px 10px', borderRadius: 9, background: 'var(--indigo)', color: '#fff', fontSize: 12, fontWeight: 700 },
  ghostMini: { padding: '7px 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 12, fontWeight: 700, textDecoration: 'none' },
  dangerMini: { padding: '7px 10px', borderRadius: 9, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#EF4444', fontSize: 12, fontWeight: 700 },
};

const examsS = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 },
  backBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14, padding: '7px 14px 7px 12px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)', fontWeight: 600, fontSize: 13 },
  subjectBadge: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: 'var(--ink)' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 20px', background: 'var(--sidebar-bg)', border: '1px dashed var(--border)', borderRadius: 18, color: 'var(--gray)', textAlign: 'center' },
  emptyIcon: { width: 44, height: 44, borderRadius: 12, background: 'var(--lavender)', color: 'var(--indigo)', display: 'grid', placeItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 15, fontWeight: 700, color: 'var(--ink)' },
  emptySub: { fontSize: 13 },
};

const examS = {
  readinessCard: { background: '#fff', borderRadius: 18, border: '1px solid var(--border)', padding: 20, marginTop: 14 },
  readinessHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  sectionTitle: { margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ink)' },
  viewMenuWrap: { display: 'inline-flex', alignItems: 'center', gap: 7 },
  viewMenuLabel: { fontSize: 11, fontWeight: 700, color: 'var(--gray)' },
  viewMenu: {
    minWidth: 172,
    maxWidth: 240,
    padding: '7px 32px 7px 12px',
    borderRadius: 999,
    border: '1px solid var(--border)',
    color: 'var(--gray)',
    background: 'var(--surface)',
    fontSize: 12,
    fontWeight: 700,
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
    backgroundImage: 'linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%)',
    backgroundPosition: 'calc(100% - 17px) 50%, calc(100% - 12px) 50%',
    backgroundSize: '5px 5px, 5px 5px',
    backgroundRepeat: 'no-repeat',
    fontFamily: 'inherit',
  },
  readinessGrid: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'center' },
  ringBox: { width: 96, height: 96, position: 'relative' },
  ringSvg: { display: 'block', transform: 'rotate(-90deg)' },
  ringCenter: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontSize: 22, fontWeight: 800, lineHeight: 1 },
  ringLabel: { fontSize: 9, color: 'var(--gray)', marginTop: 3 },
  msg: { fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 },
  sub: { fontSize: 12, color: 'var(--gray)', lineHeight: 1.5 },
  bars: { display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 },
  barRow: { display: 'flex', alignItems: 'center', gap: 9 },
  barLabel: { minWidth: 110, fontSize: 11, color: 'var(--gray)' },
  track: { flex: 1, height: 4, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' },
  fill: { display: 'block', height: '100%', borderRadius: 999 },
  barValue: { width: 30, textAlign: 'right', fontSize: 11, fontWeight: 600 },
};

const notesS = {
  headRow: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 16, flexWrap: 'wrap' },
  search: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px', color: 'var(--gray)' },
  searchInput: { border: 'none', outline: 'none', fontSize: 14, color: 'var(--ink)', width: 180, background: 'transparent' },
  newBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 12, background: 'var(--indigo)', color: '#fff', fontWeight: 600, fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', transition: 'transform .15s, box-shadow .15s' },
  cover: { height: 100, position: 'relative', display: 'grid', placeItems: 'center' },
  coverDot: { width: 36, height: 36, borderRadius: 12 },
  subjectChip: { position: 'absolute', top: 12, right: 12, fontSize: 11, fontWeight: 700, padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--ink)', textAlign: 'right', lineHeight: 1.4 },
  title: { margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' },
  meta: { margin: '0 0 14px', color: 'var(--gray)', fontSize: 12 },
  actions: { display: 'flex', gap: 8 },
  primarySmall: { flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px', borderRadius: 10, background: 'var(--indigo)', color: '#fff', fontWeight: 600, fontSize: 12 },
  ghostSmall:   { flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--border)', fontWeight: 600, fontSize: 12 },
};

export { NotesView, PDFModal, ExamDetail };
