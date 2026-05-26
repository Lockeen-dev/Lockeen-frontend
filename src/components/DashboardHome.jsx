import React, { useEffect, useState } from 'react';

import { ArrowRight, CalendarIcon, Check, CheckCircle, MsgCircle } from '../lib/icons';
import { tt } from '../lib/i18n';
import { mockDashboard } from '../data/mockData';
import { getDashboardSummary } from '../services/dashboard';
import useIsMobile from '../lib/useIsMobile';
import { LIFE_CATS, dayKey, resolveEventPalette } from './CalendarView';
import { homeS } from '../styles/dashboardStyles';

function formatDashboardError(error) {
  if (!error) return 'Unable to load dashboard data.';
  if (error.code === 'AUTH_REQUIRED') {
    return 'Real mode requires an authenticated Supabase session.';
  }
  if (error.code === 'SUPABASE_CONFIG_MISSING') {
    return 'Supabase config is missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
  }
  return error.message || 'Unable to load dashboard data.';
}

function DashboardHome({ user, lang = 'en', setTab, openQuiz, openFlashcards, recommendedQuizDone = false, recommendedFlashDone = false, onOpenPlanner, darkMode, calEvents, onMarkEventDone, onStartTimer, realMode = false }) {
  const isMobile = useIsMobile();
  const todayKey = dayKey(new Date());
  const todayEvents = (calEvents && calEvents[todayKey]) || [];
  const [summary, setSummary] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);
  const [checked, setChecked] = React.useState({});
  const [confirmModal, setConfirmModal] = React.useState(null);
  const toggleCheck = (idx) => setChecked(prev => ({ ...prev, [idx]: !prev[idx] }));
  const doneCount = Object.values(checked).filter(Boolean).length;
  const recommendedDoneCount = realMode ? 0 : (recommendedQuizDone ? 1 : 0) + (recommendedFlashDone ? 1 : 0);
  const fmtDur = (mins) => mins >= 60 ? (mins % 60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${Math.floor(mins/60)}h`) : `${mins}m`;

  useEffect(() => {
    let cancelled = false;

    async function loadReadModels() {
      setDashboardLoading(true);
      setDashboardError(null);
      const summaryResult = await getDashboardSummary();
      if (cancelled) return;
      const error = summaryResult.error;
      if (error) {
        setDashboardError(formatDashboardError(error));
        setSummary(null);
      } else {
        setSummary(summaryResult.data || null);
      }
      setDashboardLoading(false);
    }

    loadReadModels();
    return () => { cancelled = true; };
  }, []);

  const upcomingExams = summary?.upcomingExams || [];
  const nextExam = summary?.nextExam || upcomingExams[0] || null;
  const countCards = [
    ['Exams', summary?.totalExams],
    ['Notes', summary?.notesCount],
    ['Materials', summary?.materialsCount],
    ['Flashcards', summary?.flashcardsCount],
    ['Quizzes', summary?.quizzesCount],
    ['Attempts', summary?.quizAttemptsCount],
  ].filter(([, value]) => Number.isFinite(Number(value)));

  return (
    <div style={homeS.wrap}>
      {confirmModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:2000, display:'grid', placeItems:'center' }} onClick={() => setConfirmModal(null)}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:20, padding:'28px 24px', width:320, boxShadow:'0 24px 64px rgba(0,0,0,.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:'var(--lavender)', display:'grid', placeItems:'center', margin:'0 auto 16px' }}>
              <CheckCircle size={22} color="var(--indigo)" />
            </div>
            <h3 style={{ margin:'0 0 8px', fontSize:17, fontWeight:700, color:'var(--ink)', textAlign:'center' }}>Attività completata?</h3>
            <p style={{ margin:'0 0 22px', fontSize:13, color:'var(--gray)', textAlign:'center', lineHeight:1.5 }}>
              Hai completato <strong style={{ color:'var(--ink)' }}>{confirmModal.ev.name}</strong>?
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button onClick={() => { toggleCheck(confirmModal.idx); onMarkEventDone && onMarkEventDone(todayKey, confirmModal.idx, confirmModal.ev.name); setConfirmModal(null); }}
                style={{ padding:'12px 16px', borderRadius:12, background:'var(--indigo)', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', width:'100%' }}>
                Sì, completata!
              </button>
              <button onClick={() => setConfirmModal(null)}
                style={{ padding:'12px 16px', borderRadius:12, background:'var(--sidebar-bg)', border:'1px solid var(--border)', color:'var(--gray)', fontWeight:600, fontSize:14, cursor:'pointer', width:'100%' }}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ marginBottom: 24 }}>
        <h2 style={homeS.h1}>{tt(lang, 'goodMorning')}, {user.name}</h2>
        <p style={homeS.sub}>{tt(lang, 'ready')}</p>
      </div>

      {/* HERO — Today's Schedule (full-width) */}
      <div style={{ ...homeS.scheduleCard, padding: isMobile ? '16px 14px' : '22px 24px' }}>
        <div style={homeS.scheduleHead}>
          <CalendarIcon size={18} color="var(--indigo)" />
          <h3 style={homeS.scheduleTitle}>
            {tt(lang, 'todaySchedule')}
            {todayEvents.length > 0 && <span style={{ marginLeft:8, fontSize:12, fontWeight:600, color:'var(--gray)' }}>{doneCount}/{todayEvents.length} completati</span>}
          </h3>
        </div>

        {todayEvents.length === 0 ? (
          <div style={{ textAlign:'center', padding:'24px 0', color:'var(--gray)', fontSize:14 }}>
            Nessun impegno oggi — aggiungine uno dal Calendario!
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:2, marginBottom:18 }}>
            {todayEvents.map((ev, idx) => {
              const cat = LIFE_CATS.find(c => c.id === ev.cat);
              const eventPalette = resolveEventPalette(ev);
              const accentColor = eventPalette.color || cat?.color || 'var(--indigo)';
              const catBg = eventPalette.bg || cat?.bg || 'var(--lavender)';
              const catText = eventPalette.text || cat?.text || 'var(--indigo)';
              const done = !!checked[idx];
              return (
                <div key={idx} onClick={() => { if (!done) setConfirmModal({ idx, ev }); else toggleCheck(idx); }} style={{ display:'flex', alignItems:'center', gap: isMobile ? 8 : 14, padding: isMobile ? '10px 10px' : '12px 14px', borderRadius:12, cursor:'pointer', transition:'background .12s', background: done ? 'transparent' : 'var(--sidebar-bg)', opacity: done ? 0.45 : 1, width:'100%', minWidth:0, maxWidth:'100%', boxSizing:'border-box' }}>
                  <div style={{ width:3, alignSelf:'stretch', borderRadius:999, background:accentColor, flexShrink:0 }} />
                  <div style={{ minWidth: isMobile ? 44 : 52, fontSize:12, fontWeight:700, color:'var(--gray)', flexShrink:0 }}>{ev.time}</div>
                  <div style={{ flex:1, minWidth:0, fontSize:14, fontWeight:600, color:'var(--ink)', textDecoration:done?'line-through':'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.name}</div>
                  {ev.dur && !isMobile && <span style={{ fontSize:11, color:'var(--gray)', flexShrink:0 }}>⏱ {ev.dur}</span>}
                  <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:999, background:catBg, color:catText, flexShrink:0, whiteSpace:'nowrap', maxWidth: isMobile ? 80 : 'none', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {ev.noteSubject || cat?.label || 'Task'}
                  </span>
                  <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${done?'var(--indigo)':'var(--border)'}`, background:done?'var(--indigo)':'transparent', display:'grid', placeItems:'center', flexShrink:0, transition:'all .15s' }}>
                    {done && <Check size={12} color="#fff" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => setTab('calendar')} style={{ width:'100%', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px 16px', borderRadius:12, background:'var(--sidebar-bg)', border:'1px solid var(--border)', color:'var(--ink)', fontWeight:600, fontSize:13, cursor:'pointer' }}>
          <CalendarIcon size={14} /> {tt(lang, 'openCalendar')}
        </button>
      </div>

      <div style={{ marginBottom: 8 }}><h3 style={homeS.sectionLabel}>📝 Prossimi esami</h3></div>
      <div style={{ ...homeS.cardsRow, gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', marginBottom: 24 }}>
        {dashboardLoading && (
          <div style={{ ...homeS.bigCard, gridColumn: '1 / -1', background:'var(--surface)', textAlign:'center', color:'var(--gray)', fontSize:14 }}>
            Caricamento esami...
          </div>
        )}
        {!dashboardLoading && dashboardError && (
          <div style={{ ...homeS.bigCard, gridColumn: '1 / -1', background:'#FEF2F2', border:'1px solid #FCA5A5', color:'#991B1B', fontSize:13, fontWeight:700 }}>
            {dashboardError}
          </div>
        )}
        {!dashboardLoading && !dashboardError && (!summary || summary.totalExams === 0) && (
          <div style={{ ...homeS.bigCard, gridColumn: '1 / -1', background:'var(--surface)', textAlign:'center', color:'var(--gray)', fontSize:14 }}>
            Nessun esame ancora — crea il primo da Notes.
          </div>
        )}
        {!dashboardLoading && !dashboardError && summary && summary.totalExams > 0 && upcomingExams.length === 0 && (
          <div style={{ ...homeS.bigCard, gridColumn: '1 / -1', background:'var(--surface)', textAlign:'center', color:'var(--gray)', fontSize:14 }}>
            Nessun esame imminente con data.
          </div>
        )}
        {!dashboardLoading && !dashboardError && nextExam && (
          <div style={{ ...homeS.bigCard, background:'var(--bigcard-bio)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
              <div style={{ width:9, height:9, borderRadius:999, background:nextExam.dot || nextExam.color || 'var(--indigo)', flexShrink:0 }} />
              <span style={{ fontSize:11, fontWeight:700, color:'var(--indigo)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Next exam</span>
            </div>
            <h3 style={{ margin:'0 0 6px', fontSize:17, fontWeight:700, color:'var(--ink)', lineHeight:1.3 }}>{nextExam.name}</h3>
            <p style={{ ...homeS.cardMeta, marginBottom:14 }}>{nextExam.date || 'No date'}</p>
            <button style={{ ...homeS.primaryBtn, width:'100%' }} onClick={() => setTab('notes')}>Open Notes</button>
          </div>
        )}
        {!dashboardLoading && !dashboardError && upcomingExams.filter((exam) => String(exam.id) !== String(nextExam?.id)).map((exam) => (
          <div key={exam.id} style={{ ...homeS.bigCard, background:'var(--surface)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
              <div style={{ width:9, height:9, borderRadius:999, background:exam.dot || exam.color || 'var(--indigo)', flexShrink:0 }} />
              <span style={{ fontSize:11, fontWeight:700, color:'var(--gray)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{exam.subject || 'Exam'}</span>
            </div>
            <h3 style={{ margin:'0 0 6px', fontSize:17, fontWeight:700, color:'var(--ink)', lineHeight:1.3 }}>{exam.name}</h3>
            <p style={{ ...homeS.cardMeta, marginBottom:14 }}>{exam.date || 'No date'}</p>
            <button style={{ ...homeS.outlineBtn, width:'100%' }} onClick={() => setTab('notes')}>Open Notes</button>
          </div>
        ))}
      </div>

      {!realMode && countCards.length > 0 && (
        <>
          <div style={{ marginBottom: 8 }}><h3 style={homeS.sectionLabel}>📊 Study summary</h3></div>
          <div style={{ ...homeS.cardsRow, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)', marginBottom: 24 }}>
            {countCards.map(([label, value]) => (
              <div key={label} style={{ ...homeS.bigCard, background:'var(--surface)', padding:14 }}>
                <div style={{ fontSize:20, fontWeight:800, color:'var(--ink)', lineHeight:1 }}>{value}</div>
                <div style={{ marginTop:6, fontSize:11, fontWeight:700, color:'var(--gray)', textTransform:'uppercase', letterSpacing:'.04em' }}>{label}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {!realMode && (
        <>
          <div style={{ marginBottom: 8 }}><h3 style={homeS.sectionLabel}>📅 {tt(lang, 'dailyTasks')}</h3></div>
          <div style={{ ...homeS.cardsRow, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', marginBottom: 24 }}>
            {mockDashboard.todayTasks.map(task => (
              <div key={task.id} style={{ ...homeS.bigCard, background:'var(--surface)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                  <div style={{ width:9, height:9, borderRadius:999, background:task.accentColor, flexShrink:0 }} />
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--gray)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{task.subject}</span>
                </div>
                <div style={{ borderLeft:`3px solid ${task.accentColor}`, paddingLeft:12, marginBottom:14 }}>
                  <h3 style={{ margin:0, fontSize:17, fontWeight:700, color:'var(--ink)', lineHeight:1.3 }}>{task.topic}</h3>
                  <div style={{ display:'flex', alignItems:'center', gap:14, marginTop:6, color:'var(--gray)', fontSize:12 }}>
                    <span>🕐 {task.time}</span>
                    <span>⏱ {fmtDur(task.durationMinutes)}</span>
                  </div>
                </div>
                <button style={{ ...homeS.primaryBtn, marginTop:0, background:task.accentColor }} onClick={() => onStartTimer && onStartTimer(task.durationMinutes)}>Inizia ora</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Consigliati oggi */}
      {!realMode && (
        <>
          <div style={{ marginBottom: 8, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
            <h3 style={homeS.sectionLabel}>⭐ {tt(lang, 'recommended')}</h3>
            <span style={{ fontSize:12, fontWeight:800, color: recommendedDoneCount === 2 ? '#166534' : 'var(--gray)', background: recommendedDoneCount === 2 ? '#DCFCE7' : 'var(--sidebar-bg)', border:'1px solid var(--border)', borderRadius:999, padding:'5px 10px' }}>
              {recommendedDoneCount}/2 completati oggi
            </span>
          </div>
          <div style={{ ...homeS.cardsRow, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', marginBottom: 24 }}>
            <div style={{ ...homeS.bigCard, ...(recommendedQuizDone ? homeS.recoDoneCard : { background: 'var(--bigcard-bio)' }) }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <div style={{ ...homeS.dot, ...(recommendedQuizDone ? homeS.doneDot : { background: 'var(--indigo)' }) }}>
                  {recommendedQuizDone && <Check size={14} color="#fff" />}
                </div>
                <span style={{ ...(recommendedQuizDone ? homeS.doneBadge : homeS.recoBadge), background: recommendedQuizDone ? '#DCFCE7' : 'var(--lavender)', color: recommendedQuizDone ? '#166534' : 'var(--indigo)' }}>
                  {recommendedQuizDone ? 'Completato' : mockDashboard.recommendedQuiz.difficulty}
                </span>
              </div>
              <h3 style={homeS.cardTitle}>{mockDashboard.recommendedQuiz.title}</h3>
              <p style={homeS.cardMeta}>
                {recommendedQuizDone
                  ? 'Quiz completato oggi'
                  : `${mockDashboard.recommendedQuiz.questionCount} questions • ${mockDashboard.recommendedQuiz.estimatedMinutes} min`}
              </p>
              <button
                style={{
                  ...(recommendedQuizDone ? homeS.doneBtn : homeS.primaryBtn),
                  cursor: recommendedQuizDone ? 'default' : 'pointer',
                }}
                onClick={recommendedQuizDone ? undefined : openQuiz}
                disabled={recommendedQuizDone}
              >
                {recommendedQuizDone ? '✓ Completed' : 'Start Quiz'}
              </button>
            </div>
            <div style={{ ...homeS.bigCard, ...(recommendedFlashDone ? homeS.recoDoneCard : { background: 'var(--bigcard-chem)' }) }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <div style={{ ...homeS.dot, ...(recommendedFlashDone ? homeS.doneDot : { background: 'var(--purple)' }) }}>
                  {recommendedFlashDone && <Check size={14} color="#fff" />}
                </div>
                <span style={{ ...(recommendedFlashDone ? homeS.doneBadge : homeS.recoBadge), background: recommendedFlashDone ? '#DCFCE7' : '#F5F3FF', color: recommendedFlashDone ? '#166534' : 'var(--purple)' }}>
                  {recommendedFlashDone ? 'Completato' : mockDashboard.recommendedFlashcards.mode}
                </span>
              </div>
              <h3 style={homeS.cardTitle}>{mockDashboard.recommendedFlashcards.title}</h3>
              <p style={homeS.cardMeta}>
                {recommendedFlashDone
                  ? 'Flashcards completate oggi'
                  : `${mockDashboard.recommendedFlashcards.cardCount} cards • ${mockDashboard.recommendedFlashcards.mode}`}
              </p>
              {!recommendedFlashDone && <p style={{ ...homeS.cardMeta, fontSize:11, marginTop:2 }}>Ultima sessione: {mockDashboard.recommendedFlashcards.lastSessionDaysAgo} gg fa</p>}
              <button
                style={{
                  ...(recommendedFlashDone ? homeS.doneBtn : homeS.outlineBtn),
                  cursor: recommendedFlashDone ? 'default' : 'pointer',
                }}
                onClick={recommendedFlashDone ? undefined : openFlashcards}
                disabled={recommendedFlashDone}
              >
                {recommendedFlashDone ? '✓ Completed' : 'Review Cards'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* AI Study Assistant — no Study Plan button */}
      <div style={homeS.assistant}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={homeS.assistantIcon}><MsgCircle size={18} /></div>
          <div>
            <h4 style={homeS.assistantTitle}>AI Study Assistant</h4>
            <p style={homeS.assistantSub}>Ask me anything</p>
          </div>
        </div>
        {!realMode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={homeS.msgUser}>Explain photosynthesis in simple terms</div>
            <div style={homeS.msgAI}>Photosynthesis is how plants make their own food using sunlight…</div>
          </div>
        )}
        <button onClick={() => setTab('tutor')} style={{ ...homeS.outlineBtn, marginTop: 16, width: 'auto', alignSelf: 'flex-start', padding: '10px 18px' }}>
          Open AI Tutor <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default DashboardHome;
