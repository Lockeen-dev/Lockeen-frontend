import React, { useState } from 'react';

import { Brain, Check, Sparkles, XMark } from '../lib/icons';
import { EXTRA_SUBJECT_COLORS, SUBJECT_COLORS, seedNotes } from '../data/mockData';
import { SUBJECT_NOTE_MAP, durToMins } from './CalendarView';
import { generateStudyPlan } from '../services/ai';

function AIStudyPlanner({ onClose, onPlanAdded, initialNoteId, existingEvents }) {
  const SUBJECTS_LIST = ['Biology','Chemistry','History','Math','Economics','Literature'];
  const TECH_PRESETS  = ['Pomodoro 25/5','Pomodoro 50/10','Blocchi 1h','Blocchi 2h','Blocchi 3h'];
  const TECH_DUR      = { 'Pomodoro 25/5':25, 'Pomodoro 50/10':50, 'Blocchi 1h':60, 'Blocchi 2h':120, 'Blocchi 3h':180 };
  const TIME_SLOTS    = {
    morning:   ['07:00','08:30','10:00','11:00'],
    afternoon: ['13:00','14:30','16:00','17:00'],
    evening:   ['19:00','20:30','21:30'],
    night:     ['22:00','23:30'],
  };
  const TIME_DEFS = [
    { id:'morning',   label:'Mattina',    emoji:'🌅' },
    { id:'afternoon', label:'Pomeriggio', emoji:'☀️' },
    { id:'evening',   label:'Sera',       emoji:'🌆' },
    { id:'night',     label:'Notte',      emoji:'🌙' },
  ];

  const durLabel = (m) => m >= 60 ? (m % 60 ? `${Math.floor(m/60)}h${m%60}m` : `${Math.floor(m/60)}h`) : `${m}m`;
  const hoursLabel = (v) => Number.isInteger(v) ? `${v}h` : `${v}h`;

  const [step, setStep]                   = useState('form');
  const [selSubjects, setSelSubjects]     = useState(new Set(['Biology','Math']));
  const [hoursVal, setHoursVal]           = useState(2);
  const [selTechniques, setSelTechniques] = useState(new Set(['Pomodoro 25/5']));
  const [customTech, setCustomTech]       = useState('');
  const [selTimes, setSelTimes]           = useState(new Set(['morning']));
  const [blockLimitNotice, setBlockLimitNotice] = useState(null);
  const [plan, setPlan]                   = useState(null);
  const [aiPlanText, setAiPlanText]       = useState('');
  const [aiError, setAiError]             = useState('');
  const [added, setAdded]                 = useState(false);
  const [errors, setErrors]               = useState({});

  const toggleSubject = (s) => {
    setSelSubjects(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
    setErrors(e => ({ ...e, subjects: null }));
  };
  const toggleTech = (t) => {
    setCustomTech('');
    setSelTechniques(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });
    setErrors(e => ({ ...e, tech: null }));
  };
  const toggleTime = (id) => {
    setSelTimes(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      if (n.size === 1 && hoursVal > 4) {
        const only = [...n][0];
        const label = TIME_DEFS.find(t => t.id === only)?.label || 'Fascia';
        setHoursVal(4);
        setBlockLimitNotice(`${label} max 4h`);
      } else if (n.size !== 1 || hoursVal < 4) {
        setBlockLimitNotice(null);
      }
      return n;
    });
    setErrors(e => ({ ...e, time: null }));
  };
  const onCustomChange = (v) => {
    setCustomTech(v);
    if (v) setSelTechniques(new Set());
    setErrors(e => ({ ...e, tech: null }));
  };

  const validate = () => {
    const errs = {};
    if (selSubjects.size === 0) errs.subjects = 'Seleziona almeno una materia';
    if (selTechniques.size === 0 && !customTech.trim()) errs.tech = 'Seleziona o scrivi una tecnica';
    if (selTimes.size === 0) errs.time = 'Seleziona almeno un orario';
    if (hoursVal >= 8 && selTimes.size < 2) errs.time = 'Per 8h+ seleziona almeno 2 fasce orarie';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPlan = () => {
    const subjects = [...selSubjects];
    const durM = customTech.trim() ? 90 : TECH_DUR[[...selTechniques][0]] || 90;
    const techName = customTech.trim() || [...selTechniques][0] || 'Sessione';
    const allSlots = [...selTimes].flatMap(t => TIME_SLOTS[t]).sort();
    const nSess = Math.min(Math.floor(hoursVal * 60 / durM), allSlots.length);

    // End date = closest examDate among selected subjects
    const examDates = subjects
      .map(s => { const n = seedNotes.find(nn => nn.subject === s); return n && n.examDate ? new Date(n.examDate) : null; })
      .filter(Boolean);
    const endDate = examDates.length > 0
      ? new Date(Math.min(...examDates.map(d => d.getTime())))
      : new Date(Date.now() + 21 * 86400000);
    endDate.setHours(0,0,0,0);

    const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate() + 1);
    const DAY_N = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
    const MON_N = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const timeToMins = (t) => { const [h,m] = (t||'00:00').split(':').map(Number); return h*60 + m; };
    const overlaps = (aS, aE, bS, bE) => aS < bE && aE > bS;

    const days = []; let sIdx = 0; const cur = new Date(start);
    while (cur < endDate) {
      const d = new Date(cur);
      const dayLabel = `${DAY_N[d.getDay()]} ${MON_N[d.getMonth()]} ${d.getDate()}`;
      const dateKey = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
      const existing = (existingEvents && existingEvents[dateKey]) || [];
      const existingBlocks = existing.map(ev => {
        const s = timeToMins(ev.time); return { s, e: s + (durToMins(ev.dur) || 30) };
      });
      const sessions = [];
      for (const slot of allSlots) {
        if (sessions.length >= nSess) break;
        const sMin = timeToMins(slot); const eMin = sMin + durM;
        const conflict =
          existingBlocks.some(b => overlaps(sMin, eMin, b.s, b.e)) ||
          sessions.some(s => { const a = timeToMins(s.time); return overlaps(sMin, eMin, a, a + durM); });
        if (conflict) continue;
        const subj = subjects[sIdx % subjects.length]; sIdx++;
        const col = SUBJECT_COLORS[subj] || EXTRA_SUBJECT_COLORS.Other;
        sessions.push({ time: slot, name: `${subj} — ${techName}`,
          dur: durLabel(durM), color: col.dot, bg: col.bg, text: col.text, subject: subj, dateKey });
      }
      const tm = sessions.length * durM;
      const total = (tm >= 60 ? Math.floor(tm/60)+'h ' : '') + (tm % 60 ? tm%60+'m' : '');
      days.push({ day: dayLabel, date: dateKey, sessions, total: total.trim() });
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  };

  const formatAiError = (error) => {
    if (!error) return 'AI request failed.';
    if (error.code === 'AI_QUOTA_EXCEEDED') return 'Daily AI quota reached. Try again tomorrow.';
    if (error.code === 'AI_PROVIDER_UNAVAILABLE') return 'AI provider is not configured. Showing fallback when available.';
    return error.message || 'AI request failed.';
  };

  const buildPrompt = () => {
    const subjects = [...selSubjects].join(', ');
    const technique = customTech.trim() || [...selTechniques].join(', ');
    const times = [...selTimes].map(id => TIME_DEFS.find(t => t.id === id)?.label || id).join(', ');
    return `Create a study plan for ${subjects}. Available time: ${hoursVal}h per day. Technique: ${technique}. Preferred times: ${times}.`;
  };

  const generate = async () => {
    if (!validate()) return;
    setAiError('');
    setAiPlanText('');
    setStep('loading');
    try {
      const result = await generateStudyPlan({
        prompt: buildPrompt(),
        context: {
          subjects: [...selSubjects],
          hoursPerDay: hoursVal,
          techniques: customTech.trim() ? [customTech.trim()] : [...selTechniques],
          preferredTimes: [...selTimes],
          initialNoteId,
        },
      });
      if (result.error) {
        setAiError(formatAiError(result.error));
      }
      setAiPlanText(result.data?.text || '');
      setPlan(buildPlan());
      setStep('result');
    } catch {
      setAiError('AI provider unavailable. Showing local fallback plan.');
      setAiPlanText('');
      setPlan(buildPlan());
      setStep('result');
    }
  };

  const addToCalendar = () => {
    const eventsToAdd = [];
    plan.forEach(day => day.sessions.forEach(s => {
      const col = SUBJECT_COLORS[s.subject] || EXTRA_SUBJECT_COLORS.Other;
      const nm  = SUBJECT_NOTE_MAP[s.subject];
      eventsToAdd.push({ dateKey: s.dateKey, event: {
        name: s.name, time: s.time, dur: s.dur, cat:'study',
        noteId: nm ? nm.noteId : null,
        noteColor: (nm && nm.color) || col.dot,
        noteBg:    (nm && nm.bg)    || col.bg,
        noteText:  (nm && nm.text)  || col.text,
        noteSubject: s.subject,
      }});
    }));
    setAdded(true);
    onPlanAdded(eventsToAdd);
    setTimeout(() => onClose(), 1500);
  };

  const overlayClick = (e) => { if (e.target === e.currentTarget && step === 'form') onClose(); };
  const errMsg = { fontSize:11, color:'#DC2626', marginTop:4 };

  // Slider fill percentage
  const sliderPct = ((hoursVal - 1) / 7) * 100;

  const toggleStyle = (sel) => ({
    padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:600,
    cursor:'pointer', border:'1px solid', transition:'all .15s',
    background:  sel ? 'var(--lavender)' : 'var(--sidebar-bg)',
    borderColor: sel ? 'var(--indigo)'   : 'var(--border)',
    color:       sel ? 'var(--indigo)'   : 'var(--gray)',
  });

  return (
    <div style={plannerS.overlay} onClick={overlayClick}>
      <div style={plannerS.card}>

        {/* HEADER */}
        <div style={plannerS.header}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={plannerS.brainBox}><Brain size={20} style={{ color:'#fff' }} /></div>
            <div>
              <div style={plannerS.title}>AI Study Planner</div>
              <div style={plannerS.sub}>Genera un piano personalizzato</div>
            </div>
          </div>
          <button onClick={onClose} style={plannerS.closeBtn}><XMark size={16} /></button>
        </div>

        {/* BODY form */}
        {step !== 'result' && (
          <div style={plannerS.body}>

            {/* Campo 1 — Materie */}
            <div>
              <div style={plannerS.fieldLabel}>Materie da studiare</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8 }}>
                {SUBJECTS_LIST.map(s => {
                  const col = SUBJECT_COLORS[s]; const sel = selSubjects.has(s);
                  return (
                    <button key={s} onClick={() => toggleSubject(s)} style={{
                      padding:'6px 14px', borderRadius:999, fontSize:12, fontWeight:600,
                      cursor:'pointer', border:'1.5px solid', transition:'all .15s',
                      background: sel ? col.dot : col.bg,
                      color:      sel ? '#fff'  : col.text,
                      borderColor: sel ? col.dot : col.border,
                    }}>{s}</button>
                  );
                })}
              </div>
              {errors.subjects && <div style={errMsg}>{errors.subjects}</div>}
            </div>

            {/* Campo 2 — Ore slider */}
            <div>
              <div style={plannerS.fieldLabel}>Ore disponibili al giorno</div>
              <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:10 }}>
                <div style={{ textAlign:'center', minWidth:48 }}>
                  <div style={{ fontSize:22, fontWeight:700, color:'var(--indigo)', lineHeight:1 }}>{hoursLabel(hoursVal)}</div>
                  <div style={{ fontSize:11, color:'var(--gray)', marginTop:2 }}>al giorno</div>
                </div>
                <div style={{ flex:1 }}>
                  <input type="range" min="1" max="8" step="0.5" value={hoursVal}
                    onChange={e => {
                      let val = Number(e.target.value);
                      if (val > 4 && selTimes.size === 1) {
                        const only = [...selTimes][0];
                        const label = TIME_DEFS.find(t => t.id === only)?.label || 'Fascia';
                        val = 4;
                        setBlockLimitNotice(`${label} max 4h`);
                      } else if (val < 4 || selTimes.size !== 1) {
                        setBlockLimitNotice(null);
                      }
                      setHoursVal(val);
                    }}
                    style={{ width:'100%', height:4, borderRadius:999, cursor:'pointer', outline:'none', appearance:'none',
                      background:`linear-gradient(to right, var(--indigo) ${sliderPct}%, var(--border) ${sliderPct}%)` }} />
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <span key={n} style={{ fontSize:10, color:'var(--gray)' }}>{n}h</span>
                    ))}
                  </div>
                  {blockLimitNotice && (
                    <div style={{ marginTop:6, display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999, background:'#FEF3C7', border:'1px solid #F59E0B', fontSize:11, fontWeight:700, color:'#92400E' }}>
                      ⚠️ {blockLimitNotice}
                    </div>
                  )}
                </div>
              </div>
              <style>{`
                input[type=range]::-webkit-slider-thumb{appearance:none;width:20px;height:20px;border-radius:50%;background:var(--indigo);box-shadow:0 0 0 3px rgba(55,48,232,.2);cursor:pointer}
                input[type=range]::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:var(--indigo);border:none;box-shadow:0 0 0 3px rgba(55,48,232,.2);cursor:pointer}
              `}</style>
            </div>

            {/* Campo 3 — Tecnica */}
            <div>
              <div style={plannerS.fieldLabel}>Tecnica di studio</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
                {TECH_PRESETS.map(t => (
                  <button key={t} onClick={() => toggleTech(t)} style={toggleStyle(selTechniques.has(t))}>{t}</button>
                ))}
              </div>
              <input value={customTech} onChange={e => onCustomChange(e.target.value)}
                placeholder="Oppure scrivi la tua tecnica… es. Sessioni da 4h"
                style={{ marginTop:8, width:'100%', padding:'9px 12px', border:'1px solid var(--border)',
                  borderRadius:10, fontSize:13, color:'var(--ink)', background:'var(--surface)',
                  outline:'none', boxSizing:'border-box' }} />
              {errors.tech && <div style={errMsg}>{errors.tech}</div>}
            </div>

            {/* Campo 4 — Quando studi */}
            <div>
              <div style={plannerS.fieldLabel}>Quando studi?</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:8 }}>
                {TIME_DEFS.map(t => {
                  const sel = selTimes.has(t.id);
                  return (
                    <button key={t.id} onClick={() => toggleTime(t.id)} style={{
                      display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                      padding:'10px 6px', borderRadius:12, border:'1px solid',
                      cursor:'pointer', transition:'all .15s',
                      background:  sel ? 'var(--lavender)' : 'var(--sidebar-bg)',
                      borderColor: sel ? 'var(--indigo)'   : 'var(--border)',
                      color:       sel ? 'var(--indigo)'   : 'var(--gray)',
                    }}>
                      <span style={{ fontSize:20 }}>{t.emoji}</span>
                      <span style={{ fontSize:11, fontWeight:600 }}>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            {errors.time && <div style={errMsg}>{errors.time}</div>}
            </div>
          </div>
        )}
        {step === 'form' && aiError && (
          <div style={{ margin:'0 24px 12px', padding:'10px 12px', borderRadius:12, background:'#FEF2F2', border:'1px solid #FCA5A5', color:'#991B1B', fontSize:13, fontWeight:600 }}>
            {aiError}
          </div>
        )}

        {/* BODY result */}
        {step === 'result' && plan && (
          <div style={plannerS.body}>
            {aiError && (
              <div style={{ padding:'10px 12px', borderRadius:12, background:'#FEF2F2', border:'1px solid #FCA5A5', color:'#991B1B', fontSize:13, fontWeight:600 }}>
                {aiError}
              </div>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#DCFCE7', border:'1px solid #86efac', borderRadius:12 }}>
              <Check size={16} style={{ color:'#166534' }} />
              <span style={{ fontSize:13, fontWeight:600, color:'#166534' }}>Plan ready</span>
              <span style={{ fontSize:12, color:'#166534', marginLeft:'auto' }}>{selSubjects.size} subjects · {plan.length} days</span>
            </div>
            {aiPlanText && (
              <div style={{ padding:'12px 14px', background:'var(--sidebar-bg)', border:'1px solid var(--border)', borderRadius:12, color:'var(--ink)', fontSize:13, lineHeight:1.5, whiteSpace:'pre-wrap' }}>
                {aiPlanText}
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {plan.map((day, di) => (
                <div key={di} style={{ borderRadius:14, border:'1px solid var(--border)', overflow:'hidden' }}>
                  <div style={{ padding:'8px 14px', background:'var(--sidebar-bg)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>{day.day}</span>
                    <span style={{ fontSize:11, color:'var(--gray)' }}>{day.total} total</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6, padding:'10px 12px' }}>
                    {day.sessions.map((s, si) => (
                      <div key={si} style={{ borderLeft:`3px solid ${s.color}`, background:s.bg, borderRadius:8, padding:'7px 10px' }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)' }}>{s.name}</div>
                        <div style={{ fontSize:10, color:'var(--gray)', marginTop:2 }}>{s.time} · {s.dur}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {added && (
              <div style={{ padding:'12px 16px', background:'#DCFCE7', border:'1px solid #86efac', borderRadius:12, fontSize:13, fontWeight:600, color:'#166534', textAlign:'center' }}>
                Piano aggiunto al calendario! ✓
              </div>
            )}
          </div>
        )}

        {/* FOOTER */}
        <div style={plannerS.footer}>
          {step === 'form' && (
            <button onClick={generate} style={plannerS.generateBtn}>
              <Sparkles size={16} /> Generate Plan
            </button>
          )}
          {step === 'loading' && (
            <button disabled style={{ ...plannerS.generateBtn, background:'#6366f1', pointerEvents:'none', gap:6 }}>
              <span>Generating plan</span>
              <span style={{ animation:'bounce .8s infinite .0s',  display:'inline-block' }}>.</span>
              <span style={{ animation:'bounce .8s infinite .15s', display:'inline-block' }}>.</span>
              <span style={{ animation:'bounce .8s infinite .3s',  display:'inline-block' }}>.</span>
            </button>
          )}
          {step === 'result' && !added && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button onClick={addToCalendar} style={plannerS.addBtn}>Add all to Calendar</button>
              <button onClick={() => { setStep('form'); setPlan(null); setErrors({}); }} style={plannerS.regenBtn}>Regenerate</button>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
    </div>
  );
}

const plannerS = {
  overlay:    { position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:200, display:'grid', placeItems:'center', padding:16 },
  card:       { background:'#fff', borderRadius:24, border:'1px solid var(--border)', width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto', display:'flex', flexDirection:'column' },
  header:     { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', position:'sticky', top:0, background:'#fff', zIndex:1 },
  brainBox:   { width:44, height:44, borderRadius:14, background:'linear-gradient(135deg, #3730E8, #8B5CF6)', display:'grid', placeItems:'center', flexShrink:0 },
  title:      { fontSize:16, fontWeight:700, color:'var(--ink)' },
  sub:        { fontSize:12, color:'var(--gray)', marginTop:2 },
  closeBtn:   { width:32, height:32, borderRadius:999, background:'var(--sidebar-bg)', border:'1px solid var(--border)', color:'var(--gray)', display:'grid', placeItems:'center', cursor:'pointer' },
  body:       { padding:'20px 24px', display:'flex', flexDirection:'column', gap:16, flex:1, overflowY:'auto' },
  fieldLabel: { fontSize:12, fontWeight:700, color:'var(--ink)' },
  footer:     { padding:'16px 24px', borderTop:'1px solid var(--border)', position:'sticky', bottom:0, background:'#fff' },
  generateBtn:{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px', borderRadius:14, background:'var(--indigo)', color:'#fff', fontSize:14, fontWeight:600, border:'none', cursor:'pointer' },
  addBtn:     { width:'100%', padding:'11px', borderRadius:12, border:'1.5px solid var(--indigo)', background:'#fff', color:'var(--indigo)', fontSize:13, fontWeight:600, cursor:'pointer' },
  regenBtn:   { width:'100%', padding:'11px', borderRadius:12, border:'1px solid var(--border)', background:'var(--sidebar-bg)', color:'var(--gray)', fontSize:13, fontWeight:600, cursor:'pointer' },
};

/* ===================== MOUNT ===================== */

export default AIStudyPlanner;
