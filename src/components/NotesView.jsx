import React, { useEffect, useState } from 'react';

import { FileText, Layers, LockeenLogo, Pencil, Plus, Search, Sparkles, Trash2 } from '../lib/icons';
import { tt } from '../lib/i18n';
import { EXTRA_SUBJECT_COLORS, daysLeft, formatExamDate, getSubjectPalette, inferSubjectFromName, makeSampleChapter } from '../data/mockData';
import { getExamEmoji } from '../lib/examUi';
import useIsMobile from '../lib/useIsMobile';
import { CreateExamModal, DeleteExamModal, EditChapterModal, EditExamModal, UploadChapterModal } from './ExamModals';
import { EmojiPickerButton, GradeValue, getPriorityMeta, gradeS } from './common/ExamControls';
import { homeS } from '../styles/dashboardStyles';

function NotesView({ exams, lang = 'en', setExams, activeId, setActiveId, onOpenFlashcards, onOpenQuiz, onOpenQuizForExam, darkMode, onOpenPlanner, onExamAdded, quizHistory = {}, flashHistory = {}, quizRuns = [], recentFlashDecks = [] }) {
  const isMobile = useIsMobile();
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [deletingExam, setDeletingExam] = useState(null);

  const handleDeleteExam = (id) => {
    setExams(prev => prev.filter(e => e.id !== id));
    setDeletingExam(null);
  };

  const handleEditExam = (id, changes) => {
    setExams(prev => prev.map(e => e.id === id ? { ...e, ...changes } : e));
    setEditingExam(null);
  };

  const activeExam = exams.find((x) => x.id === activeId);

  if (activeExam) {
    const onAddChapter = ({ chapterId, chapterName, fileCount }) => {
      setExams((prev) => prev.map((x) => {
        if (x.id !== activeId) return x;
        if (chapterId) {
          // Append files to existing chapter
          const chapters = x.chapters.map((c) => c.id === chapterId
            ? { ...c, files: (c.files || 1) + fileCount, pages: (c.pages || 0) + fileCount * 6, updated: 'Just now' }
            : c);
          return { ...x, chapters, updated: 'Just now' };
        }
        // Create a new chapter
        const idx = x.chapters.length;
        const newChapter = makeSampleChapter(Date.now(), chapterName, 'Just now', Math.max(1, fileCount * 6), fileCount, idx);
        return { ...x, chapters: [newChapter, ...x.chapters], updated: 'Just now' };
      }));
    };
    const onEditChapter = ({ chapterId, newTitle }) => {
      const cleanTitle = (newTitle || '').trim();
      if (!cleanTitle) return;
      setExams((prev) => prev.map((x) => x.id !== activeId ? x : ({
        ...x,
        chapters: x.chapters.map((c) => c.id === chapterId ? { ...c, title: cleanTitle, updated: 'Just now' } : c),
        updated: 'Just now',
      })));
    };
    const onDeleteChapter = (chapterId) => {
      setExams((prev) => prev.map((x) => x.id !== activeId ? x : ({
        ...x,
        chapters: x.chapters.filter((c) => c.id !== chapterId),
        updated: 'Just now',
      })));
    };
    return <ExamDetail exam={activeExam} onBack={() => setActiveId(null)} onAddChapter={onAddChapter} onEditChapter={onEditChapter} onDeleteChapter={onDeleteChapter} onOpenFlashcards={onOpenFlashcards} onOpenQuiz={onOpenQuiz} darkMode={darkMode} quizHistory={quizHistory} flashHistory={flashHistory} quizRuns={quizRuns} recentFlashDecks={recentFlashDecks} />;
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
          onClose={() => setDeletingExam(null)}
          onConfirm={() => handleDeleteExam(deletingExam.id)}
        />
      )}
      {editingExam && (
        <EditExamModal
          exam={editingExam}
          onClose={() => setEditingExam(null)}
          onSave={(changes) => handleEditExam(editingExam.id, changes)}
        />
      )}

      {showCreate && (
        <CreateExamModal
          onClose={() => setShowCreate(false)}
          onCreate={(exam) => {
            const palette = getSubjectPalette(inferSubjectFromName(exam.subject), EXTRA_SUBJECT_COLORS.Other);
            const enriched = { ...exam, color: palette.bg, dot: palette.dot };
            setExams((p) => [enriched, ...p]);
            setShowCreate(false);
            if (exam.date && onExamAdded) {
              const [yr, mo, dy] = exam.date.split('-').map(Number);
              const dateKey = `${yr}-${mo}-${dy}`;
              onExamAdded(dateKey, {
                name: '📝 Exam: ' + exam.name,
                time: '09:00', dur: '2h', cat: 'study',
                noteId: exam.id,
                noteColor: palette.dot, noteBg: palette.bg,
                noteText: palette.text, noteSubject: exam.subject,
              });
            }
          }}
        />
      )}

      <div style={examsS.grid}>
        {filtered.map((x) => {
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

function ExamDetail({ exam, onBack, onAddChapter, onEditChapter, onDeleteChapter, onOpenFlashcards, onOpenQuiz, darkMode, quizHistory = {}, flashHistory = {}, quizRuns = [], recentFlashDecks = [] }) {
  const [q, setQ] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [readinessView, setReadinessView] = useState('exam');
  const [editingChapter, setEditingChapter] = useState(null);
  const [pdfChapter, setPdfChapter] = useState(null);
  const examChapterIds = (exam.chapters || []).map((c) => c.id);
  const belongsToExam = (noteId) => String(noteId) === String(exam.id) || examChapterIds.some((id) => String(id) === String(noteId));
  const examRuns = quizRuns.filter(r => r.examId === exam.id).slice(0, 5);
  const examFlashDecks = recentFlashDecks.filter(d => belongsToExam(d.noteId)).slice(0, 5);
  const palette = getSubjectPalette(exam.subject, exam, darkMode);
  const filtered = exam.chapters.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));
  const chapterKey = (chapter) => String(chapter.id ?? chapter.name ?? chapter.title);
  const allQuiz = quizHistory[exam.id] || [];
  const allFlash = [
    ...(flashHistory[exam.id] || []),
    ...(exam.chapters || []).flatMap((c) => flashHistory[c.id] || []),
  ];
  const quizAvg = allQuiz.length > 0
    ? Math.round(allQuiz.reduce((a, b) => a + b, 0) / allQuiz.length)
    : 50;
  const flashAvg = allFlash.length > 0
    ? Math.round(allFlash.reduce((a, b) => a + b, 0) / allFlash.length)
    : 50;
  const readiness = Math.round(quizAvg * 0.4 + flashAvg * 0.3 + 70 * 0.2 + 55 * 0.1);
  const selectedChapter = readinessView === 'exam'
    ? null
    : (exam.chapters || []).find((c) => chapterKey(c) === readinessView);
  const selectedChapterKey = selectedChapter ? chapterKey(selectedChapter) : null;
  const chapterName = selectedChapter ? (selectedChapter.name || selectedChapter.title || 'Chapter') : '';
  const chQuiz = selectedChapterKey != null ? (quizHistory[selectedChapterKey] || []) : [];
  const chFlash = selectedChapterKey != null ? (flashHistory[selectedChapterKey] || []) : [];
  const chQuizAvg = selectedChapter
    ? (chQuiz.length > 0 ? Math.round(chQuiz.reduce((a, b) => a + b, 0) / chQuiz.length) : (selectedChapter.mastery || 50))
    : 50;
  const chFlashAvg = selectedChapter
    ? (chFlash.length > 0 ? Math.round(chFlash.reduce((a, b) => a + b, 0) / chFlash.length) : (selectedChapter.mastery || 50))
    : 50;
  const chReadiness = Math.round(chQuizAvg * 0.5 + chFlashAvg * 0.5);
  const currentReadiness = selectedChapter ? chReadiness : readiness;
  const circumference = 251.33;
  const dashOffset = circumference - (currentReadiness / 100) * circumference;

  function readinessMsg() {
    if (readiness >= 80) return {
      icon: '🎉',
      msg: 'Excellent! You\'re well prepared.',
      sub: 'Keep it up for the last few sessions.'
    };
    if (readiness >= 60) return {
      icon: '💪',
      msg: 'On track for ' + (exam.targetGrade || 27) + '/30',
      sub: 'Need ' + Math.ceil((80 - readiness) / 10) + ' more strong sessions.'
    };
    return {
      icon: '⚠️',
      msg: 'More practice needed',
      sub: 'Focus on weak topics and increase study sessions.'
    };
  }

  function chReadinessMsg() {
    if (chReadiness >= 80) return {
      icon: '✅',
      msg: chapterName + ' — Strong!',
      sub: 'This chapter is well covered.'
    };
    if (chReadiness >= 55) return {
      icon: '📘',
      msg: chapterName + ' — Getting there',
      sub: 'A few more sessions to master this chapter.'
    };
    return {
      icon: '🔴',
      msg: chapterName + ' — Needs work',
      sub: 'This is a weak chapter — prioritize it.'
    };
  }

  const rm = selectedChapter ? chReadinessMsg() : readinessMsg();
  const readinessBars = selectedChapter
    ? [
      { label: 'Quiz performance', value: chQuizAvg, color: '#3730E8' },
      { label: 'Flashcard mastery', value: chFlashAvg, color: '#8B5CF6' },
    ]
    : [
      { label: 'Quiz performance', value: quizAvg, color: '#3730E8' },
      { label: 'Flashcard mastery', value: flashAvg, color: '#8B5CF6' },
      { label: 'Study time', value: 70, color: '#10B981' },
      { label: 'Plan progress', value: 55, color: '#F59E0B' },
    ];
  return (
    <div>
      <button onClick={onBack} style={examsS.backBtn}>← My Exams</button>

      <div style={notesS.headRow}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={homeS.h1}>{exam.name}</h2>
            {exam.date && (
              <span style={{ ...examsS.subjectBadge, background: palette.bg }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: palette.dot }} />
                {formatExamDate(exam.date)}
              </span>
            )}
          </div>
          <p style={homeS.sub}>{exam.chapters.length} {exam.chapters.length === 1 ? 'chapter' : 'chapters'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={notesS.search}>
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chapters…" style={notesS.searchInput} />
          </div>
          <button style={notesS.newBtn} onClick={() => setShowUpload(true)}><Plus size={16} /> New Chapter</button>
        </div>
      </div>

      {showUpload && (
        <UploadChapterModal
          existingChapters={exam.chapters}
          onClose={() => setShowUpload(false)}
          onUpload={(payload) => { onAddChapter(payload); setShowUpload(false); }}
        />
      )}

      {filtered.length === 0 ? (
        <div style={examsS.empty}>
          <div style={examsS.emptyIcon}><FileText size={22} /></div>
          <div style={examsS.emptyTitle}>No chapters yet</div>
          <div style={examsS.emptySub}>Click “+ New Chapter” to upload your first study material.</div>
        </div>
      ) : (
        <div style={examsS.grid}>
          {filtered.map((n) => (
            <div key={n.id} style={{ ...notesS.card, position: 'relative' }}>
              <div style={{ ...notesS.cover, background: n.color, position: 'relative' }}>
                <div style={{ ...notesS.coverDot, background: n.dot }} />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setEditingChapter(n); }}
                  title="Edit chapter"
                  style={{ position: 'absolute', top: 10, right: 48, width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.9)', border: '1px solid var(--border)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink)' }}
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPdfChapter(n); }}
                  title="Open PDF"
                  style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 8, background: 'var(--lavender)', border: '1px solid rgba(55,48,232,.18)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--indigo)' }}
                >
                  <FileText size={15} />
                </button>
              </div>
              <div style={{ padding: 18 }}>
                <h3 style={notesS.title}>{n.title}</h3>
                <p style={notesS.meta}>{n.files || 1} {(n.files || 1) === 1 ? 'file' : 'files'} • {n.pages} pages • Updated {n.updated}</p>
                <div style={notesS.actions}>
                  <button style={notesS.primarySmall} onClick={() => onOpenQuiz && onOpenQuiz({ noteId: exam.id, subject: exam.subject, title: n.title, questions: n.questions || [] })}>
                    <Sparkles size={14} /> Generate Quiz
                  </button>
                  <button style={notesS.ghostSmall} onClick={() => onOpenFlashcards && onOpenFlashcards({ noteId: exam.id, subject: exam.subject, title: n.title, cards: n.cards || [] })}>
                    <Layers size={14} /> Flashcards
                  </button>
                </div>
                {(() => {
                  const chRuns = quizRuns.filter(r => String(r.chapterId) === String(n.id));
                  const lastRun = chRuns[0];
                  if (!lastRun) return null;
                  const sc = lastRun.score >= 80 ? '#10B981' : lastRun.score >= 60 ? '#F59E0B' : '#EF4444';
                  return (
                    <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: `${sc}12`, border: `1px solid ${sc}30`, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: sc, lineHeight: 1 }}>{lastRun.score}%</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>Ultimo quiz</div>
                        <div style={{ fontSize: 10, color: 'var(--gray)' }}>{lastRun.numQ} domande · {lastRun.date}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Aggregate stats: avg quiz score + flashcard session count */}
      {(examRuns.length > 0 || examFlashDecks.length > 0) && (() => {
        const avgScore = examRuns.length > 0 ? Math.round(examRuns.reduce((s, r) => s + r.score, 0) / examRuns.length) : null;
        const flashSessions = examFlashDecks.length;
        return (
          <section style={{ marginTop: 24, padding: '16px 20px', borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', gap: 12 }}>
            {avgScore !== null && (
              <div style={{ flex: 1, padding: '14px 18px', borderRadius: 14, background: 'var(--lavender)', border: '1px solid rgba(55,48,232,.12)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--indigo)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Avg quiz score</span>
                <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--indigo)', letterSpacing: '-0.02em', lineHeight: 1 }}>{avgScore}%</span>
                <span style={{ fontSize: 11, color: 'var(--gray)' }}>{examRuns.length} quiz{examRuns.length !== 1 ? 'zes' : ''} completed</span>
              </div>
            )}
            {flashSessions > 0 && (
              <div style={{ flex: 1, padding: '14px 18px', borderRadius: 14, background: '#F5F3FF', border: '1px solid rgba(139,92,246,.15)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Flashcard sessions</span>
                <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--purple)', letterSpacing: '-0.02em', lineHeight: 1 }}>{flashSessions}</span>
                <span style={{ fontSize: 11, color: 'var(--gray)' }}>deck{flashSessions !== 1 ? 's' : ''} completed</span>
              </div>
            )}
          </section>
        );
      })()}

      {editingChapter && (
        <EditChapterModal
          chapter={editingChapter}
          onClose={() => setEditingChapter(null)}
          onSave={(newTitle) => { onEditChapter && onEditChapter({ chapterId: editingChapter.id, newTitle }); setEditingChapter(null); }}
          onDelete={() => { onDeleteChapter && onDeleteChapter(editingChapter.id); setEditingChapter(null); }}
        />
      )}
      {pdfChapter && (
        <PDFModal
          chapter={pdfChapter}
          onClose={() => setPdfChapter(null)}
        />
      )}
      <section style={examS.readinessCard}>
        <div style={examS.readinessHead}>
          <h3 style={examS.sectionTitle}>📊 Readiness Score</h3>
          <label style={examS.viewMenuWrap}>
            <span style={examS.viewMenuLabel}>View</span>
            <select
              value={readinessView}
              onChange={(e) => setReadinessView(e.target.value)}
              style={{ ...examS.viewMenu, borderColor: readinessView === 'exam' ? 'var(--border)' : palette.dot, color: readinessView === 'exam' ? 'var(--gray)' : palette.text, backgroundColor: readinessView === 'exam' ? 'var(--surface)' : palette.bg }}
            >
              <option value="exam">Exam</option>
              {(exam.chapters || []).map((chapter) => (
                <option key={chapterKey(chapter)} value={chapterKey(chapter)}>
                  {chapter.name || chapter.title || 'Chapter'}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={examS.readinessGrid}>
          <div style={examS.ringBox}>
            <svg width="96" height="96" viewBox="0 0 96 96" style={examS.ringSvg}>
              <circle cx="48" cy="48" r="40" fill="none" stroke="var(--border)" strokeWidth="7" />
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke={palette.dot}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div style={examS.ringCenter}>
              <div style={{ ...examS.ringPct, color: palette.dot }}>{currentReadiness}%</div>
              <div style={examS.ringLabel}>ready</div>
            </div>
          </div>

          <div>
            <div style={examS.msg}>{rm.icon} {rm.msg}</div>
            <div style={examS.sub}>{rm.sub}</div>
            <div style={examS.bars}>
              {readinessBars.map((b) => (
                <div key={b.label} style={examS.barRow}>
                  <span style={examS.barLabel}>{b.label}</span>
                  <span style={examS.track}>
                    <span style={{ ...examS.fill, width: b.value + '%', background: b.color }} />
                  </span>
                  <span style={{ ...examS.barValue, color: b.color }}>{b.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      {(() => {
        const qh = quizHistory[exam.id] || [];
        const fh = [
          ...(flashHistory[exam.id] || []),
          ...(exam.chapters || []).flatMap((c) => flashHistory[c.id] || []),
        ];
        const avgQ = qh.length ? Math.round(qh.reduce((a,b)=>a+b,0)/qh.length) : null;
        const avgQColor = avgQ !== null ? (avgQ >= 80 ? '#10B981' : avgQ >= 60 ? '#F59E0B' : '#EF4444') : null;
        const flashCount = fh.length;
        const avgFlash = fh.length ? Math.round(fh.reduce((a,b)=>a+b,0)/fh.length) : null;
        const avgFlashColor = avgFlash !== null ? (avgFlash >= 80 ? '#10B981' : avgFlash >= 60 ? '#F59E0B' : '#EF4444') : null;
        return (
          <div style={{ marginTop:28 }}>
            <h3 style={{ margin:'0 0 12px', fontSize:13, fontWeight:700, color:'var(--gray)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Storico attività</h3>
            <div style={{ display:'flex', gap:10 }}>
              {avgQ !== null ? (
                <div style={{ flex:1, padding:'14px 16px', borderRadius:14, background:'var(--surface)', border:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:20 }}>🧠</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>Quiz</div>
                    <div style={{ fontSize:11, color:'var(--gray)', marginTop:2 }}>{qh.length} sessioni completate</div>
                  </div>
                  <div style={{ fontSize:20, fontWeight:800, color:avgQColor }}>{avgQ}%</div>
                </div>
              ) : (
                <div style={{ flex:1, padding:'14px 16px', borderRadius:14, background:'var(--surface)', border:'1.5px dashed var(--border)', display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:20 }}>🧠</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:'var(--gray)' }}>Nessun quiz ancora</div>
                  </div>
                  <button style={notesS.primarySmall} onClick={() => onOpenQuiz && onOpenQuiz({ noteId: exam.id, subject: exam.subject, title: exam.name, questions: (exam.chapters||[]).flatMap(c=>c.questions||[]) })}>
                    <Sparkles size={13} /> Genera Quiz
                  </button>
                </div>
              )}
              {flashCount > 0 ? (
                <div style={{ flex:1, padding:'14px 16px', borderRadius:14, background:'var(--surface)', border:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:20 }}>🃏</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>Flashcard</div>
                    <div style={{ fontSize:11, color:'var(--gray)', marginTop:2 }}>{flashCount} sessioni completate</div>
                  </div>
                  <div style={{ fontSize:20, fontWeight:800, color:avgFlashColor }}>{avgFlash}%</div>
                </div>
              ) : (
                <div style={{ flex:1, padding:'14px 16px', borderRadius:14, background:'var(--surface)', border:'1.5px dashed var(--border)', display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:20 }}>🃏</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:'var(--gray)' }}>Nessuna flashcard ancora</div>
                  </div>
                  <button style={notesS.ghostSmall} onClick={() => onOpenFlashcards && onOpenFlashcards({ noteId: exam.id, subject: exam.subject, title: exam.name, cards: (exam.chapters||[]).flatMap(c=>c.cards||[]) })}>
                    <Layers size={13} /> Flashcard
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function PDFModal({ chapter, onClose }) {
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
