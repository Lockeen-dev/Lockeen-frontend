import React, { useEffect, useMemo, useState } from 'react';

import { Brain, Check, Sparkles, XMark } from '../lib/icons';
import { listMaterials } from '../services/materials';
import { createStudyPlan, createStudyPlanItem, listStudyPlanItems } from '../services/studyPlans';
import { generateStudyPlan } from '../services/studyPlanner';
import { calendarKeyFromDate, studyPlanItemToCalendarEvent } from './calendarData';

function formatPlannerError(error, fallback = 'Unable to generate study plan.') {
  if (!error) return fallback;
  if (error.code === 'AUTH_REQUIRED') return 'Real mode requires an authenticated Supabase session.';
  if (error.code === 'SUPABASE_CONFIG_MISSING') return 'Supabase config is missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
  return error.message || fallback;
}

function buildAvailability(hoursPerDay, startTime, selectedDays) {
  const minutes = Math.round(Number(hoursPerDay || 1) * 60);
  const days = new Set(selectedDays.map(Number));
  return [0, 1, 2, 3, 4, 5, 6].reduce((acc, day) => {
    acc[day] = days.has(day) ? { minutes, startTime } : false;
    return acc;
  }, {});
}

function AIStudyPlanner({ onClose, onPlanAdded, exams = [], quizRuns = [] }) {
  const datedExams = useMemo(() => (exams || []).filter((exam) => exam.status !== 'archived'), [exams]);
  const defaultExamIds = useMemo(() => datedExams.slice(0, 2).map((exam) => exam.id), [datedExams]);
  const [selectedExamIds, setSelectedExamIds] = useState(() => new Set(defaultExamIds));
  const [mode, setMode] = useState('until_exam');
  const [hoursPerDay, setHoursPerDay] = useState(1.5);
  const [startTime, setStartTime] = useState('17:00');
  const [intensity, setIntensity] = useState('normal');
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);
  const [preferences, setPreferences] = useState(['review', 'quiz', 'flashcards', 'mock_exam']);
  const [step, setStep] = useState('form');
  const [materials, setMaterials] = useState([]);
  const [existingItems, setExistingItems] = useState([]);
  const [loadingContext, setLoadingContext] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setSelectedExamIds(new Set(defaultExamIds));
  }, [defaultExamIds]);

  useEffect(() => {
    let cancelled = false;
    async function loadContext() {
      setLoadingContext(true);
      const [materialsResult, itemsResult] = await Promise.all([
        listMaterials(),
        listStudyPlanItems(),
      ]);
      if (cancelled) return;
      setMaterials(materialsResult.error ? [] : (materialsResult.data || []));
      setExistingItems(itemsResult.error ? [] : (itemsResult.data || []));
      setLoadingContext(false);
    }
    loadContext();
    return () => { cancelled = true; };
  }, []);

  const toggleExam = (id) => {
    setSelectedExamIds((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleDay = (day) => {
    setSelectedDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort());
  };

  const togglePreference = (preference) => {
    setPreferences((current) => current.includes(preference) ? current.filter((item) => item !== preference) : [...current, preference]);
  };

  const selectedExams = datedExams.filter((exam) => selectedExamIds.has(exam.id));

  const preview = () => generateStudyPlan({
    exams: datedExams,
    materials,
    quizRuns,
    existingItems,
    options: {
      title: 'Study plan',
      mode,
      examIds: [...selectedExamIds],
      intensity,
      preferences,
      availability: buildAvailability(hoursPerDay, startTime, selectedDays),
      maxItemsPerDay: 4,
    },
  });

  const generate = () => {
    setError('');
    if (!selectedExamIds.size) {
      setError('Select at least one exam.');
      return;
    }
    if (!selectedDays.length) {
      setError('Select at least one study day.');
      return;
    }
    if (!preferences.length) {
      setError('Select at least one activity type.');
      return;
    }
    const nextResult = preview();
    setResult(nextResult);
    setStep('result');
  };

  const addToCalendar = async () => {
    if (!result?.items?.length) return;
    setError('');
    const planResult = await createStudyPlan(result.plan);
    if (planResult.error) {
      setError(formatPlannerError(planResult.error, 'Unable to save study plan.'));
      return;
    }

    const savedItems = [];
    for (const item of result.items) {
      const itemResult = await createStudyPlanItem({ ...item, planId: planResult.data.id });
      if (itemResult.error) {
        setError(formatPlannerError(itemResult.error, 'Unable to save study plan item.'));
        return;
      }
      savedItems.push(itemResult.data);
    }

    const eventsToAdd = savedItems
      .map((item) => {
        const exam = datedExams.find((entry) => String(entry.id) === String(item.examId));
        return { dateKey: calendarKeyFromDate(item.plannedDate), event: studyPlanItemToCalendarEvent(item, exam) };
      })
      .filter((entry) => entry.dateKey);

    onPlanAdded(eventsToAdd);
    setAdded(true);
    setTimeout(() => onClose(), 900);
  };

  const overlayClick = (e) => { if (e.target === e.currentTarget && step === 'form') onClose(); };
  const preferenceLabels = { review: 'Review', quiz: 'Quiz', flashcards: 'Flashcards', mock_exam: 'Mock exam' };
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={plannerS.overlay} onClick={overlayClick}>
      <div style={plannerS.card}>
        <div style={plannerS.header}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={plannerS.brainBox}><Brain size={20} style={{ color:'#fff' }} /></div>
            <div>
              <div style={plannerS.title}>Study Plan Generator</div>
              <div style={plannerS.sub}>Deterministic calendar plan, no fake AI dates</div>
            </div>
          </div>
          <button onClick={onClose} style={plannerS.closeBtn}><XMark size={16} /></button>
        </div>

        {step === 'form' && (
          <div style={plannerS.body}>
            {loadingContext && <div style={plannerS.notice}>Loading exams and materials...</div>}
            {!loadingContext && !datedExams.length && <div style={plannerS.error}>Create an exam first, then generate a study plan.</div>}

            <div>
              <div style={plannerS.fieldLabel}>Exams</div>
              <div style={plannerS.examGrid}>
                {datedExams.map((exam) => {
                  const selected = selectedExamIds.has(exam.id);
                  return (
                    <button key={exam.id} type="button" onClick={() => toggleExam(exam.id)} style={{ ...plannerS.examChip, ...(selected ? plannerS.examChipActive : null) }}>
                      <span>{exam.name}</span>
                      <small>{exam.date || 'No date'}</small>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={plannerS.row2}>
              <div>
                <div style={plannerS.fieldLabel}>Mode</div>
                <select value={mode} onChange={(e) => setMode(e.target.value)} style={plannerS.input}>
                  <option value="until_exam">Until exam</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <div style={plannerS.fieldLabel}>Start time</div>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={plannerS.input} />
              </div>
            </div>

            <div>
              <div style={plannerS.fieldLabel}>Hours per study day</div>
              <input type="range" min="0.5" max="6" step="0.5" value={hoursPerDay} onChange={(e) => setHoursPerDay(Number(e.target.value))} style={{ width:'100%' }} />
              <div style={plannerS.rangeValue}>{hoursPerDay}h/day</div>
            </div>

            <div>
              <div style={plannerS.fieldLabel}>Days</div>
              <div style={plannerS.chipRow}>
                {dayLabels.map((label, index) => (
                  <button key={label} type="button" onClick={() => toggleDay(index)} style={{ ...plannerS.smallChip, ...(selectedDays.includes(index) ? plannerS.smallChipActive : null) }}>{label}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={plannerS.fieldLabel}>Intensity</div>
              <div style={plannerS.chipRow}>
                {['light', 'normal', 'intensive'].map((value) => (
                  <button key={value} type="button" onClick={() => setIntensity(value)} style={{ ...plannerS.smallChip, ...(intensity === value ? plannerS.smallChipActive : null) }}>{value}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={plannerS.fieldLabel}>Activities</div>
              <div style={plannerS.chipRow}>
                {Object.entries(preferenceLabels).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => togglePreference(value)} style={{ ...plannerS.smallChip, ...(preferences.includes(value) ? plannerS.smallChipActive : null) }}>{label}</button>
                ))}
              </div>
            </div>

            {error && <div style={plannerS.error}>{error}</div>}
          </div>
        )}

        {step === 'result' && result && (
          <div style={plannerS.body}>
            <div style={plannerS.success}><Check size={16} /> Plan ready · {result.stats.totalItems} items · {result.stats.totalMinutes} min</div>
            {result.warnings.map((warning) => <div key={warning} style={plannerS.notice}>{warning}</div>)}
            {error && <div style={plannerS.error}>{error}</div>}
            <div style={plannerS.summaryBox}>
              <b>{selectedExams.map((exam) => exam.name).join(', ') || 'Selected exams'}</b>
              <span>{result.plan.startDate} → {result.plan.endDate}</span>
            </div>
            <div style={plannerS.previewList}>
              {result.items.slice(0, 14).map((item, index) => {
                const exam = datedExams.find((entry) => String(entry.id) === String(item.examId));
                const chapter = exam?.chapters?.find((entry) => String(entry.id) === String(item.chapterId));
                return (
                  <div key={`${item.plannedDate}-${item.plannedTime}-${index}`} style={plannerS.previewItem}>
                    <div>
                      <b>{item.type.replace('_', ' ')}</b> · {chapter?.title || exam?.name || 'Study'}
                      {item.materialPending && <span style={plannerS.pending}> material pending</span>}
                    </div>
                    <span>{item.plannedDate} · {item.plannedTime} · {item.durationMin}m</span>
                  </div>
                );
              })}
              {result.items.length > 14 && <div style={plannerS.notice}>+{result.items.length - 14} more items</div>}
            </div>
            {added && <div style={plannerS.success}>Added to Calendar</div>}
          </div>
        )}

        <div style={plannerS.footer}>
          {step === 'form' && <button onClick={generate} disabled={loadingContext || !datedExams.length} style={plannerS.generateBtn}><Sparkles size={16} /> Generate plan</button>}
          {step === 'result' && !added && (
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => { setStep('form'); setError(''); }} style={plannerS.secondaryBtn}>Back</button>
              <button onClick={addToCalendar} style={plannerS.generateBtn}>Save to Calendar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const plannerS = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:200, display:'grid', placeItems:'center', padding:16 },
  card: { background:'#fff', borderRadius:24, border:'1px solid var(--border)', width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto', display:'flex', flexDirection:'column' },
  header: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', position:'sticky', top:0, background:'#fff', zIndex:1 },
  brainBox: { width:44, height:44, borderRadius:14, background:'linear-gradient(135deg, #3730E8, #8B5CF6)', display:'grid', placeItems:'center', flexShrink:0 },
  title: { fontSize:16, fontWeight:800, color:'var(--ink)' },
  sub: { fontSize:12, color:'var(--gray)', marginTop:2, fontWeight:700 },
  closeBtn: { width:32, height:32, borderRadius:999, background:'var(--sidebar-bg)', border:'1px solid var(--border)', color:'var(--gray)', display:'grid', placeItems:'center', cursor:'pointer' },
  body: { padding:'20px 24px', display:'flex', flexDirection:'column', gap:16, flex:1, overflowY:'auto' },
  fieldLabel: { fontSize:12, fontWeight:800, color:'var(--ink)', marginBottom:8 },
  input: { width:'100%', border:'1px solid var(--border)', borderRadius:12, padding:'10px 12px', fontSize:13, fontWeight:700, color:'var(--ink)', background:'#fff' },
  row2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  examGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:8 },
  examChip: { textAlign:'left', border:'1px solid var(--border)', background:'#fff', borderRadius:14, padding:'10px 12px', display:'flex', flexDirection:'column', gap:3, cursor:'pointer', color:'var(--ink)', fontWeight:800 },
  examChipActive: { borderColor:'var(--indigo)', background:'var(--lavender)', color:'var(--indigo)' },
  chipRow: { display:'flex', flexWrap:'wrap', gap:8 },
  smallChip: { border:'1px solid var(--border)', background:'#fff', color:'var(--gray)', borderRadius:999, padding:'8px 12px', fontSize:12, fontWeight:800, cursor:'pointer' },
  smallChipActive: { borderColor:'var(--indigo)', background:'var(--lavender)', color:'var(--indigo)' },
  rangeValue: { marginTop:6, color:'var(--indigo)', fontSize:13, fontWeight:900 },
  notice: { padding:'10px 12px', borderRadius:12, border:'1px solid var(--border)', background:'var(--sidebar-bg)', color:'var(--gray)', fontSize:12, fontWeight:800 },
  error: { padding:'10px 12px', borderRadius:12, border:'1px solid #FCA5A5', background:'#FEF2F2', color:'#991B1B', fontSize:12, fontWeight:800 },
  success: { display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:12, border:'1px solid #86EFAC', background:'#DCFCE7', color:'#166534', fontSize:13, fontWeight:900 },
  summaryBox: { display:'flex', flexDirection:'column', gap:4, padding:'12px 14px', border:'1px solid var(--border)', borderRadius:14, background:'#fff', color:'var(--ink)', fontSize:13 },
  previewList: { display:'flex', flexDirection:'column', gap:8 },
  previewItem: { padding:'10px 12px', borderRadius:12, border:'1px solid var(--border)', background:'var(--sidebar-bg)', color:'var(--ink)', fontSize:12, display:'flex', justifyContent:'space-between', gap:8, flexWrap:'wrap' },
  pending: { marginLeft:6, color:'#B45309', fontWeight:900 },
  footer: { padding:'16px 24px', borderTop:'1px solid var(--border)', position:'sticky', bottom:0, background:'#fff' },
  generateBtn: { flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px', borderRadius:14, background:'var(--indigo)', color:'#fff', fontSize:14, fontWeight:800, border:'none', cursor:'pointer' },
  secondaryBtn: { padding:'12px 18px', borderRadius:14, background:'#fff', color:'var(--ink)', fontSize:14, fontWeight:800, border:'1px solid var(--border)', cursor:'pointer' },
};

export default AIStudyPlanner;
