import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Brain, CalendarIcon, ChevronDown, FileText, GripDots, Paperclip, Plus, Trash } from '../lib/icons';
import { listCalendarEvents } from '../services/calendar';
import { listStudyPlanItems } from '../services/studyPlans';
import { homeS } from '../styles/dashboardStyles';
import { LIFE_CATS, SUBJECT_NOTE_MAP, calendarKeyFromDate, dayKey, durToMins, initCalEvents, resolveEventPalette, resolveStudyPalette, studyPlanItemToCalendarEvent } from './calendarData';
export { LIFE_CATS, SUBJECT_NOTE_MAP, dayKey, durToMins, initCalEvents, resolveEventPalette };

/* ===================== CALENDAR HELPERS ===================== */
const CAL_MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CAL_MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const getMonday  = (d) => { const r = new Date(d); const day = r.getDay(); r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day)); r.setHours(0,0,0,0); return r; };
const calAddDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const CAL_HOUR_H = 42;
const CAL_START_H = 0;
const calSeedNotes = [
  { id:1, title:'Cellular Respiration' }, { id:2, title:'Organic Chemistry Reactions' },
  { id:3, title:'World War II Timeline' }, { id:4, title:'Calculus — Derivatives' },
  { id:5, title:'Macroeconomics Notes' }, { id:6, title:'Shakespeare — Hamlet' },
];

function formatCalendarError(error) {
  if (!error) return 'Unable to load calendar events.';
  if (error.code === 'AUTH_REQUIRED') {
    return 'Real mode requires an authenticated Supabase session.';
  }
  if (error.code === 'SUPABASE_CONFIG_MISSING') {
    return 'Supabase config is missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
  }
  return error.message || 'Unable to load calendar events.';
}

function serviceEventToCalendarEvent(event) {
  const palette = resolveStudyPalette(event);
  return {
    type: event.type,
    source: 'exam-service',
    serviceId: event.id,
    examId: event.examId,
    name: `📝 Exam: ${event.title}`,
    time: '09:00',
    dur: '2h',
    cat: 'study',
    noteId: event.examId,
    noteColor: palette.color,
    noteBg: palette.bg,
    noteText: palette.text,
    noteSubject: palette.subject,
  };
}

export function CalendarView({ events, setEvents, setTab, onOpenPlanner, exams = [] }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [view, setView]           = useState('week');
  const [weekStart, setWeekStart] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [viewYear, setViewYear]   = useState(() => new Date().getFullYear());
  const [activeCats, setActiveCats] = useState(() => new Set(LIFE_CATS.map(c => c.id)));
  const [modalKey, setModalKey]     = useState(null);
  const [dayDetailKey, setDayDetailKey] = useState(null);
  const [selCat, setSelCat]         = useState('study');
  const [selNoteId, setSelNoteId]   = useState(null);
  const [modalName, setModalName]   = useState('');
  const [modalTime, setModalTime]   = useState('09:00');
  const [modalDur, setModalDur]     = useState('1h');
  const [customH, setCustomH]       = useState(0);
  const [customM, setCustomM]       = useState(30);
  const [drag, setDrag]             = useState(null);
  const [viewDropOpen, setViewDropOpen] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState(null);
  const [serviceEventCount, setServiceEventCount] = useState(0);
  const dragMeta   = useRef({});
  const monthDragMeta = useRef({});
  const [monthDrag, setMonthDrag] = useState(null);
  const gridBodyRef = useRef(null);

  useEffect(() => {
    if (view !== 'week' || !gridBodyRef.current) return;
    const now = new Date();
    const scrollTo = (now.getHours() + now.getMinutes() / 60) * CAL_HOUR_H - 120;
    gridBodyRef.current.scrollTop = Math.max(0, scrollTo);
  }, [view]);

  useEffect(() => {
    let cancelled = false;

    async function loadExamEvents() {
      setCalendarLoading(true);
      setCalendarError(null);
      const [examResult, planResult] = await Promise.all([
        listCalendarEvents(),
        listStudyPlanItems(),
      ]);
      if (cancelled) return;
      if (examResult.error) {
        setCalendarError(formatCalendarError(examResult.error));
        setServiceEventCount(0);
        setCalendarLoading(false);
        return;
      }

      const grouped = {};
      (examResult.data || []).forEach((event) => {
        const key = calendarKeyFromDate(event.date);
        if (!key) return;
        grouped[key] = [...(grouped[key] || []), serviceEventToCalendarEvent(event)];
      });
      (planResult.error ? [] : (planResult.data || [])).forEach((item) => {
        const key = calendarKeyFromDate(item.plannedDate);
        if (!key) return;
        const exam = exams.find((entry) => String(entry.id) === String(item.examId));
        grouped[key] = [...(grouped[key] || []), studyPlanItemToCalendarEvent(item, exam)];
      });

      setEvents((prev) => {
        const next = { ...(prev || {}) };
        Object.keys(next).forEach((key) => {
          const kept = (next[key] || []).filter((event) => event.source !== 'exam-service' && event.source !== 'study-plan-service');
          if (kept.length) next[key] = kept;
          else delete next[key];
        });
        Object.entries(grouped).forEach(([key, value]) => {
          next[key] = [...(next[key] || []), ...value];
        });
        return next;
      });
      setServiceEventCount((examResult.data || []).length + (planResult.error ? 0 : (planResult.data || []).length));
      setCalendarLoading(false);
    }

    loadExamEvents();
    return () => { cancelled = true; };
  }, [exams, setEvents]);

  const startDrag = (e, ev, key, idx) => {
    e.preventDefault(); e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const { color, bg } = resolveEventPalette(ev);
    const evH   = Math.max(CAL_HOUR_H * 0.45, durToMins(ev.dur || '30m') / 60 * CAL_HOUR_H) - 2;
    dragMeta.current = { active:true, ev, fromKey:key, fromIdx:idx, color, bg, evH,
      offsetY: e.clientY - rect.top, offsetX: e.clientX - rect.left,
      toKey:key, toTime:ev.time, wsRef: weekStart };
    setDrag({ ev, fromKey:key, fromIdx:idx, ghostX:rect.left, ghostY:rect.top,
      ghostW:rect.width, ghostH:evH, toKey:key, toTime:ev.time, color, bg });
  };

  useEffect(() => {
    const onMove = (e) => {
      const m = dragMeta.current;
      if (!m.active) return;
      const grid = gridBodyRef.current;
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      const colsLeft  = rect.left + 50;
      const colW      = (rect.width - 50) / 7;
      const dayIdx    = Math.max(0, Math.min(6, Math.floor((e.clientX - colsLeft) / colW)));
      const relY      = e.clientY - rect.top + grid.scrollTop - m.offsetY;
      const frac      = Math.max(0, relY / CAL_HOUR_H);
      let hour        = Math.floor(frac) + CAL_START_H;
      let mins        = Math.round((frac % 1) * 4) * 15;
      if (mins >= 60) { hour++; mins = 0; }
      hour = Math.max(0, Math.min(23, hour));
      const newTime   = `${String(hour).padStart(2,'0')}:${String(mins).padStart(2,'0')}`;
      const newKey    = dayKey(calAddDays(m.wsRef, dayIdx));
      m.toKey = newKey; m.toTime = newTime;
      setDrag(prev => prev ? { ...prev,
        ghostX: e.clientX - m.offsetX,
        ghostY: e.clientY - m.offsetY,
        toKey: newKey, toTime: newTime } : null);
    };
    const onUp = () => {
      const m = dragMeta.current;
      if (!m.active) return;
      m.active = false;
      if (m.toKey && m.toTime) {
        setEvents(prev => {
          const next = { ...prev };
          const arr  = [...(next[m.fromKey] || [])];
          arr.splice(m.fromIdx, 1);
          next[m.fromKey] = arr;
          next[m.toKey]   = [...(next[m.toKey] || []), { ...m.ev, time: m.toTime }];
          return next;
        });
      }
      setDrag(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const startMonthDrag = (e, ev, key, idx) => {
    e.preventDefault(); e.stopPropagation();
    monthDragMeta.current = { active:true, started:false, ev, fromKey:key, fromIdx:idx, toKey:key, startX:e.clientX, startY:e.clientY };
  };

  useEffect(() => {
    const onMove = (e) => {
      const m = monthDragMeta.current;
      if (!m.active) return;
      if (!m.started) {
        if (Math.abs(e.clientX - m.startX) < 4 && Math.abs(e.clientY - m.startY) < 4) return;
        m.started = true;
      }
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cell = el && el.closest && el.closest('[data-month-cell]');
      const toKey = cell ? cell.getAttribute('data-month-cell') : null;
      if (toKey) m.toKey = toKey;
      setMonthDrag({ ev:m.ev, fromKey:m.fromKey, toKey:m.toKey, ghostX:e.clientX, ghostY:e.clientY });
    };
    const onUp = () => {
      const m = monthDragMeta.current;
      if (!m.active) return;
      const wasStarted = m.started;
      m.active = false; m.started = false;
      if (wasStarted && m.toKey && m.toKey !== m.fromKey) {
        setEvents(prev => {
          const next = { ...prev };
          const arr = [...(next[m.fromKey] || [])];
          arr.splice(m.fromIdx, 1);
          next[m.fromKey] = arr;
          next[m.toKey] = [...(next[m.toKey] || []), m.ev];
          return next;
        });
      }
      setMonthDrag(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [setEvents]);

  const navPrev = () => {
    if (view === 'week') { setWeekStart(d => calAddDays(d, -7)); }
    else { setViewMonth(m => { if (m === 0) { setViewYear(y => y-1); return 11; } return m-1; }); }
  };
  const navNext = () => {
    if (view === 'week') { setWeekStart(d => calAddDays(d, 7)); }
    else { setViewMonth(m => { if (m === 11) { setViewYear(y => y+1); return 0; } return m+1; }); }
  };

  const openModal = (key, time = '09:00') => { setModalKey(key); setSelCat('study'); setSelNoteId(null); setModalName(''); setModalTime(time); setModalDur('1h'); setCustomH(0); setCustomM(30); };
  const closeModal = () => setModalKey(null);
  const openDayDetail = (key) => setDayDetailKey(key);
  const closeDayDetail = () => setDayDetailKey(null);
  const toggleCat = (id) => setActiveCats(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const deleteEvent = (key, idx) => setEvents(ev => ({ ...ev, [key]: ev[key].filter((_, i) => i !== idx) }));
  const reorderEvent = (key, fromIdx, toIdx) => setEvents(prev => {
    const arr = [...(prev[key] || [])];
    if (fromIdx < 0 || fromIdx >= arr.length || toIdx < 0 || toIdx >= arr.length || fromIdx === toIdx) return prev;
    const [m] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, m);
    return { ...prev, [key]: arr };
  });

  const selectSubject = (subject) => {
    const info = SUBJECT_NOTE_MAP[subject];
    if (selNoteId === info.noteId) { setSelNoteId(null); setModalName(''); }
    else {
      setSelNoteId(info.noteId);
      const note = calSeedNotes.find(n => n.id === info.noteId);
      setModalName(`${subject} — ${note?.title || subject}`);
    }
  };

  const addEvent = () => {
    if (!modalName.trim()) return;
    const noteSubject = selCat === 'study' && selNoteId
      ? Object.keys(SUBJECT_NOTE_MAP).find(s => SUBJECT_NOTE_MAP[s].noteId === selNoteId) || null : null;
    const noteInfo = noteSubject ? SUBJECT_NOTE_MAP[noteSubject] : null;
    const h = Math.max(0, Math.min(12, Number(customH) || 0));
    const m = Math.max(0, Math.min(59, Number(customM) || 0));
    const customDur = h && m ? `${h}h${m}m` : h ? `${h}h` : `${m}m`;
    const ev = { name: modalName, time: modalTime, dur: modalDur === 'Custom' ? customDur : modalDur, cat: selCat,
      noteId: selCat === 'study' ? selNoteId : null,
      noteColor: noteInfo?.color || null, noteBg: noteInfo?.bg || null,
      noteText: noteInfo?.text || null, noteSubject };
    setEvents(prev => ({ ...prev, [modalKey]: [...(prev[modalKey] || []), ev] }));
    closeModal();
  };

  const [editEv, setEditEv]     = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [fileDragOver, setFileDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const fileIdRef    = useRef(1);
  const [reorderDragIdx, setReorderDragIdx] = useState(null);
  const [reorderOverIdx, setReorderOverIdx] = useState(null);

  const openEditEvent = (key, idx) => {
    const ev = (events[key] || [])[idx];
    if (!ev) return;
    setEditForm({
      name: ev.name || '', time: ev.time || '09:00', dur: ev.dur || '1h',
      cat: ev.cat || 'study', noteId: ev.noteId || null,
      notes: ev.notes || '',
      materials: (ev.materials || []).map(m => typeof m === 'string' ? m : (m && m.url) || ''),
      files: (ev.files || []).map(f => ({ ...f })),
      completed: !!ev.completed,
    });
    setEditEv({ key, idx });
  };
  const closeEditEvent = () => { setEditEv(null); setEditForm(null); };

  const saveEditEvent = () => {
    if (!editEv || !editForm) return;
    const { key, idx } = editEv;
    const f = editForm;
    const noteSubject = f.cat === 'study' && f.noteId
      ? Object.keys(SUBJECT_NOTE_MAP).find(s => SUBJECT_NOTE_MAP[s].noteId === f.noteId) || null : null;
    const noteInfo = noteSubject ? SUBJECT_NOTE_MAP[noteSubject] : null;
    const updated = {
      name: f.name, time: f.time, dur: f.dur, cat: f.cat,
      noteId: f.cat === 'study' ? f.noteId : null,
      noteColor: noteInfo?.color || null, noteBg: noteInfo?.bg || null,
      noteText: noteInfo?.text || null, noteSubject,
      notes: f.notes,
      materials: (f.materials || []).filter(m => m && m.trim()),
      files: f.files || [],
      completed: f.completed,
    };
    setEvents(prev => ({ ...prev, [key]: (prev[key] || []).map((e, i) => i === idx ? updated : e) }));
    closeEditEvent();
  };

  const deleteEditEvent = () => {
    if (!editEv) return;
    deleteEvent(editEv.key, editEv.idx);
    closeEditEvent();
  };

  const addMaterial    = ()       => setEditForm(f => f ? ({ ...f, materials: [...(f.materials||[]), ''] }) : f);
  const updateMaterial = (i, url) => setEditForm(f => f ? ({ ...f, materials: (f.materials||[]).map((m, j) => j === i ? url : m) }) : f);
  const removeMaterial = (i)      => setEditForm(f => f ? ({ ...f, materials: (f.materials||[]).filter((_, j) => j !== i) }) : f);

  const addEditFiles = (list) => {
    const arr = Array.from(list || []);
    if (!arr.length) return;
    setEditForm(f => {
      if (!f) return f;
      const next = [...(f.files || [])];
      arr.forEach(file => next.push({ id: fileIdRef.current++, name: file.name, size: file.size }));
      return { ...f, files: next };
    });
  };
  const removeEditFile = (id) => setEditForm(f => f ? ({ ...f, files: (f.files||[]).filter(x => x.id !== id) }) : f);
  const onFileDrop = (e) => { e.preventDefault(); setFileDragOver(false); if (e.dataTransfer && e.dataTransfer.files) addEditFiles(e.dataTransfer.files); };
  const onFilePick = (e) => { addEditFiles(e.target.files); e.target.value = ''; };
  const browseFiles = () => fileInputRef.current && fileInputRef.current.click();
  const fmtFileSize = (b) => { if (!b) return ''; if (b < 1024) return b + ' B'; if (b < 1048576) return (b/1024).toFixed(1) + ' KB'; return (b/1048576).toFixed(1) + ' MB'; };

  const handleEvClick = (ev, key, idx) => { openEditEvent(key, idx); };

  const weekLabel = () => {
    const end = calAddDays(weekStart, 6);
    if (weekStart.getMonth() === end.getMonth())
      return `${CAL_MONTHS_S[weekStart.getMonth()]} ${weekStart.getDate()}–${end.getDate()}, ${weekStart.getFullYear()}`;
    return `${CAL_MONTHS_S[weekStart.getMonth()]} ${weekStart.getDate()} – ${CAL_MONTHS_S[end.getMonth()]} ${end.getDate()}`;
  };

  const rangeLabel = view === 'week' ? weekLabel() : `${CAL_MONTHS[viewMonth]} ${viewYear}`;
  const weekDays = useMemo(() => Array.from({length:7}, (_, i) => calAddDays(weekStart, i)), [weekStart]);
  const todayDow = today.getDay(); // 0=Sun,1=Mon,...,6=Sat
  const monthGrid = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const diff = (firstOfMonth.getDay() - todayDow + 7) % 7;
    const gridStart = calAddDays(firstOfMonth, -diff);
    return Array.from({length:42}, (_, i) => calAddDays(gridStart, i));
  }, [viewMonth, viewYear]);

  const lifeBalance = useMemo(() => {
    const totals = {}; LIFE_CATS.forEach(c => { totals[c.id] = 0; });
    Array.from({length:7}, (_, i) => calAddDays(weekStart, i)).forEach(d => {
      (events[dayKey(d)] || []).forEach(ev => { totals[ev.cat] = (totals[ev.cat]||0) + durToMins(ev.dur); });
    });
    const total = Object.values(totals).reduce((a,b) => a+b, 0);
    return LIFE_CATS.map(c => ({ ...c, mins: totals[c.id], pct: total > 0 ? Math.round(totals[c.id]/total*100) : 0 }));
  }, [events, weekStart]);

  const fmtModalDate = (key) => { if (!key) return ''; const [y,m,d] = key.split('-').map(Number); return `${CAL_MONTHS_S[m-1]} ${d}, ${y}`; };
  const DAY_NAMES_ALL = ['DOM','LUN','MAR','MER','GIO','VEN','SAB'];
  const _ALL_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const _rot = (today.getDay() + 6) % 7; // Mon=0..Sun=6
  const WEEK_LABELS = [..._ALL_LABELS.slice(_rot), ..._ALL_LABELS.slice(0, _rot)];

  const renderWeek = () => {
    const hours   = Array.from({ length: 24 }, (_, i) => i);
    const now     = new Date();
    const nowFrac = now.getHours() + now.getMinutes() / 60;
    const nowY    = nowFrac * CAL_HOUR_H;
    const showNow = true;

    const timeToY  = (t) => { const [h, m] = (t || '08:00').split(':').map(Number); return Math.max(0, (h + m / 60) * CAL_HOUR_H); };
    const durToH   = (d) => Math.max(CAL_HOUR_H * 0.45, durToMins(d || '30m') / 60 * CAL_HOUR_H);
    const slotTime = (h) => `${String(h).padStart(2, '0')}:00`;

    return (
      <div style={{ border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', background:'var(--surface)' }}>
        {/* Day header row */}
        <div style={{ display:'grid', gridTemplateColumns:'50px repeat(7, 1fr)', borderBottom:'1px solid var(--border)', background:'var(--sidebar-bg)' }}>
          <div style={{ borderRight:'1px solid var(--border)' }} />
          {weekDays.map((day, i) => {
            const isToday = dayKey(day) === dayKey(today);
            return (
              <div key={i} style={{ padding:'10px 4px', textAlign:'center', borderRight: i < 6 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--gray)', letterSpacing:'0.06em', marginBottom:5 }}>{DAY_NAMES_ALL[day.getDay()]}</div>
                <div style={{ width:28, height:28, borderRadius:'50%', background: isToday ? 'var(--indigo)' : 'transparent', color: isToday ? '#fff' : 'var(--ink)', fontSize:13, fontWeight:700, display:'grid', placeItems:'center', margin:'0 auto' }}>{day.getDate()}</div>
              </div>
            );
          })}
        </div>

        {/* Scrollable time body */}
        <div ref={gridBodyRef} style={{ display:'flex', maxHeight:480, overflowY:'auto' }}>
          {/* Hour labels */}
          <div style={{ width:50, flexShrink:0, borderRight:'1px solid var(--border)' }}>
            {hours.map(h => (
              <div key={h} style={{ height:CAL_HOUR_H, display:'flex', alignItems:'flex-start', justifyContent:'flex-end', paddingRight:7, paddingTop:5, fontSize:10, fontWeight:600, color:'var(--gray)', lineHeight:1, boxSizing:'border-box', borderBottom:'1px solid var(--border)' }}>
                {h}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div style={{ flex:1, display:'grid', gridTemplateColumns:'repeat(7, 1fr)' }}>
            {weekDays.map((day, i) => {
              const key    = dayKey(day);
              const dayEvs = (events[key] || []).filter(ev => activeCats.has(ev.cat));
              const isToday = dayKey(day) === dayKey(today);
              return (
                <div key={i} style={{ position:'relative', borderRight: i < 6 ? '1px solid var(--border)' : 'none' }}>
                  {/* Clickable hour slots */}
                  {hours.map(h => (
                    <div key={h} onClick={() => openModal(key, slotTime(h))}
                      style={{ height:CAL_HOUR_H, borderBottom:'1px solid var(--border)', cursor:'pointer', boxSizing:'border-box', background: isToday ? 'rgba(55,48,232,.02)' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--lavender)'}
                      onMouseLeave={e => e.currentTarget.style.background= isToday ? 'rgba(55,48,232,.02)' : 'transparent'}
                    />
                  ))}
                  {/* Absolute events */}
                  {dayEvs.map((ev, idx) => {
                    const { color, bg, text } = resolveEventPalette(ev);
                    const top   = timeToY(ev.time);
                    const h     = durToH(ev.dur);
                    return (
                      <div key={idx}
                        onMouseDown={e => startDrag(e, ev, key, idx)}
                        onClick={e => { e.stopPropagation(); handleEvClick(ev, key, (events[key]||[]).indexOf(ev)); }}
                        style={{ position:'absolute', top, left:3, right:3, height: h - 2, borderRadius:7, background:bg, borderLeft:`3px solid ${color}`, boxShadow:`inset 0 0 0 1px ${color}22`, padding:'4px 6px', cursor:'grab', overflow:'hidden', zIndex:1, boxSizing:'border-box', opacity: drag && drag.fromKey===key && drag.fromIdx===idx ? 0.25 : ev.completed ? 0.5 : 1, userSelect:'none' }}>
                        <div style={{ fontSize:11, fontWeight:800, color:text, lineHeight:1.2, overflow:'hidden', textDecoration: ev.completed ? 'line-through' : 'none' }}>{ev.name}</div>
                        {h > 32 && <div style={{ fontSize:10, color:text, opacity:.75, marginTop:2 }}>{ev.time}{ev.dur ? ` · ${ev.dur}` : ''}</div>}
                        <button onClick={e => { e.stopPropagation(); deleteEvent(key, (events[key]||[]).indexOf(ev)); }}
                          style={{ position:'absolute', bottom:2, right:2, background:'transparent', border:'none', cursor:'pointer', padding:2, opacity:.6, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Trash size={10} color={color} />
                        </button>
                      </div>
                    );
                  })}
                  {/* Current time indicator */}
                  {isToday && showNow && (
                    <div style={{ position:'absolute', top:nowY, left:0, right:0, zIndex:2, pointerEvents:'none' }}>
                      <div style={{ position:'absolute', left:0, top:-4, width:8, height:8, borderRadius:'50%', background:'#EF4444', flexShrink:0 }} />
                      <div style={{ height:2, background:'#EF4444', marginLeft:8 }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderMonth = () => (
    <div>
      <div style={calS.monthWeekHeader}>{WEEK_LABELS.map(d => <div key={d} style={calS.monthWeekLabel}>{d}</div>)}</div>
      <div style={calS.monthGrid}>
        {monthGrid.map((day, i) => {
          const key = dayKey(day);
          const isCurrentMonth = day.getMonth() === viewMonth;
          const isToday = dayKey(day) === dayKey(today);
          const dayEvs = (events[key] || []).filter(ev => activeCats.has(ev.cat));
          const isDropTarget = monthDrag && monthDrag.toKey === key && monthDrag.fromKey !== key;
          return (
            <div key={i}
              data-month-cell={isCurrentMonth ? key : undefined}
              style={{ ...calS.monthCell, ...(isToday?calS.monthCellToday:{}), ...(isDropTarget?{ background:'var(--lavender)', border:'1.5px dashed var(--indigo)' }:{}), opacity:isCurrentMonth?1:0.35, cursor:isCurrentMonth?'pointer':'default' }}
              onClick={() => { if (monthDragMeta.current.started) return; isCurrentMonth && openDayDetail(key); }}>
              <span style={{ ...calS.monthDayNum, ...(isToday?calS.monthDayToday:{}) }}>{day.getDate()}</span>
              <div style={{ display:'flex', flexDirection:'column', gap:2, marginTop:3 }}>
                {dayEvs.slice(0,2).map((ev, idx) => {
                  const { color, bg, text } = resolveEventPalette(ev);
                  const origIdx = (events[key] || []).indexOf(ev);
                  const isDragging = monthDrag && monthDrag.fromKey === key && monthDrag.ev === ev;
                  return <div key={idx}
                    onMouseDown={e => startMonthDrag(e, ev, key, origIdx)}
                    style={{ ...calS.monthPill, background:bg, color:text, border:`1px solid ${color}33`, opacity:isDragging?0.3:(ev.completed?0.5:1), textDecoration:ev.completed?'line-through':'none', cursor:'grab', userSelect:'none' }}>{ev.name}</div>;
                })}
                {dayEvs.length > 2 && <div style={calS.monthMore}>+{dayEvs.length-2} more</div>}
              </div>
            </div>
          );
        })}
      </div>
      {monthDrag && monthDrag.started !== false && (
        <div style={{ position:'fixed', left:monthDrag.ghostX+8, top:monthDrag.ghostY+8, pointerEvents:'none', zIndex:9999, background: resolveEventPalette(monthDrag.ev).bg, color:resolveEventPalette(monthDrag.ev).text, fontSize:10, fontWeight:600, padding:'4px 8px', borderRadius:4, boxShadow:'0 4px 12px rgba(0,0,0,.2)' }}>
          {monthDrag.ev.name}
        </div>
      )}
    </div>
  );

  const renderModal = () => {
    const cat = LIFE_CATS.find(c => c.id === selCat);
    const noteInfo = selNoteId ? Object.values(SUBJECT_NOTE_MAP).find(v => v.noteId === selNoteId) : null;
    const saveBg = noteInfo ? noteInfo.color : cat?.color;
    return (
      <div style={calS.overlay} onClick={closeModal}>
        <div style={calS.modal} onClick={e => e.stopPropagation()}>
          <h3 style={calS.modalTitle}>Add activity · {fmtModalDate(modalKey)}</h3>
          <div style={calS.modalField}>
            <label style={calS.modalLabel}>What are you doing?</label>
            <input value={modalName} onChange={e => setModalName(e.target.value)} onKeyDown={e => e.key==='Enter' && addEvent()}
              placeholder="e.g. Study session, Gym, Coffee…" style={calS.modalInput} autoFocus />
          </div>
          <div style={{ display:'flex', gap:12, marginBottom:16 }}>
            <div style={{ flex:1 }}><label style={calS.modalLabel}>Start time</label><input type="time" value={modalTime} onChange={e => setModalTime(e.target.value)} style={calS.modalInput} /></div>
            <div style={{ flex:1 }}><label style={calS.modalLabel}>Duration</label>
              <select value={modalDur} onChange={e => setModalDur(e.target.value)} style={calS.modalInput}>
                {['15m','30m','45m','1h','1h30m','2h','3h','Custom'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {modalDur === 'Custom' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
                  <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--gray)', fontWeight:700 }}>
                    <input type="number" min="0" max="12" value={customH}
                      onChange={e => setCustomH(Math.max(0, Math.min(12, Number(e.target.value) || 0)))}
                      style={{ ...calS.modalInput, padding:'8px 10px', textAlign:'center' }} />h
                  </label>
                  <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--gray)', fontWeight:700 }}>
                    <input type="number" min="0" max="59" value={customM}
                      onChange={e => setCustomM(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                      style={{ ...calS.modalInput, padding:'8px 10px', textAlign:'center' }} />m
                  </label>
                </div>
              )}
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={calS.modalLabel}>Category</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
              {LIFE_CATS.map(c => (
                <button key={c.id} onClick={() => { setSelCat(c.id); if(c.id!=='study') setSelNoteId(null); }}
                  style={{ ...calS.catChip, background:selCat===c.id?c.color:c.bg, color:selCat===c.id?'#fff':c.text, border:`1.5px solid ${c.color}` }}>
                  <span style={{ ...calS.catDot, background:selCat===c.id?'#fff':c.color }} />{c.label}
                </button>
              ))}
            </div>
          </div>
          {selCat === 'study' && (
            <div style={{ marginBottom:16 }}>
              <label style={calS.modalLabel}>Which subject?</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
                {Object.entries(SUBJECT_NOTE_MAP).map(([subject, info]) => (
                  <button key={subject} onClick={() => selectSubject(subject)}
                    style={{ ...calS.catChip, background:selNoteId===info.noteId?info.color:info.bg, color:selNoteId===info.noteId?'#fff':info.text, border:`1.5px solid ${info.color}` }}>
                    {subject}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
            <button onClick={closeModal} style={calS.cancelBtn}>Cancel</button>
            <button onClick={addEvent} style={{ ...calS.saveBtn, background:saveBg }}>Add activity</button>
          </div>
        </div>
      </div>
    );
  };

  const renderEditModal = () => {
    const f = editForm;
    const cat = LIFE_CATS.find(c => c.id === f.cat);
    const noteInfo = f.noteId ? Object.values(SUBJECT_NOTE_MAP).find(v => v.noteId === f.noteId) : null;
    const saveBg = noteInfo ? noteInfo.color : cat?.color;
    const upd = (patch) => setEditForm(prev => prev ? ({ ...prev, ...patch }) : prev);
    return (
      <div style={calS.overlay} onClick={closeEditEvent}>
        <div style={{ ...calS.modal, maxHeight:'88vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
            <h3 style={{ ...calS.modalTitle, margin:0 }}>Modifica attività · {fmtModalDate(editEv.key)}</h3>
            <label style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:'var(--gray)', cursor:'pointer', userSelect:'none' }}>
              <input type="checkbox" checked={f.completed} onChange={e => upd({ completed: e.target.checked })} />
              Completata
            </label>
          </div>
          <div style={calS.modalField}>
            <label style={calS.modalLabel}>Cosa stai facendo?</label>
            <input value={f.name} onChange={e => upd({ name: e.target.value })} style={calS.modalInput} />
          </div>
          <div style={{ display:'flex', gap:12, marginBottom:16 }}>
            <div style={{ flex:1 }}><label style={calS.modalLabel}>Orario</label><input type="time" value={f.time} onChange={e => upd({ time: e.target.value })} style={calS.modalInput} /></div>
            <div style={{ flex:1 }}><label style={calS.modalLabel}>Durata</label>
              <select value={f.dur} onChange={e => upd({ dur: e.target.value })} style={calS.modalInput}>
                {['15m','30m','45m','1h','1h30m','2h','3h'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={calS.modalLabel}>Categoria</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
              {LIFE_CATS.map(c => (
                <button key={c.id} onClick={() => upd({ cat: c.id, noteId: c.id !== 'study' ? null : f.noteId })}
                  style={{ ...calS.catChip, background:f.cat===c.id?c.color:c.bg, color:f.cat===c.id?'#fff':c.text, border:`1.5px solid ${c.color}` }}>
                  <span style={{ ...calS.catDot, background:f.cat===c.id?'#fff':c.color }} />{c.label}
                </button>
              ))}
            </div>
          </div>
          {f.cat === 'study' && (
            <div style={{ marginBottom:16 }}>
              <label style={calS.modalLabel}>Quale materia?</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
                {Object.entries(SUBJECT_NOTE_MAP).map(([subject, info]) => (
                  <button key={subject} onClick={() => upd({ noteId: f.noteId === info.noteId ? null : info.noteId })}
                    style={{ ...calS.catChip, background:f.noteId===info.noteId?info.color:info.bg, color:f.noteId===info.noteId?'#fff':info.text, border:`1.5px solid ${info.color}` }}>
                    {subject}
                  </button>
                ))}
              </div>
              {f.noteId && (
                <button onClick={() => { closeEditEvent(); setTab('notes'); }}
                  style={{ marginTop:10, padding:'7px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  📖 Apri nota collegata
                </button>
              )}
            </div>
          )}
          <div style={calS.modalField}>
            <label style={calS.modalLabel}>Note / Info</label>
            <textarea value={f.notes} onChange={e => upd({ notes: e.target.value })}
              placeholder="Argomenti, obiettivi, capitoli da rivedere…"
              style={{ ...calS.modalInput, minHeight:70, resize:'vertical', fontFamily:'inherit' }} />
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={calS.modalLabel}>Materiali e link</label>
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
              {f.materials.map((m, i) => (
                <div key={i} style={{ display:'flex', gap:6 }}>
                  <input value={m} onChange={e => updateMaterial(i, e.target.value)}
                    placeholder="https://… oppure nome file / link" style={{ ...calS.modalInput, flex:1 }} />
                  <button onClick={() => removeMaterial(i)}
                    style={{ width:36, borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--gray)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Trash size={13} /></button>
                </div>
              ))}
              <button onClick={addMaterial}
                style={{ alignSelf:'flex-start', padding:'8px 12px', borderRadius:10, border:'1.5px dashed var(--border)', background:'transparent', color:'var(--gray)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                + Aggiungi materiale / link
              </button>
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={calS.modalLabel}>File allegati</label>
            <div
              onDragOver={e => { e.preventDefault(); setFileDragOver(true); }}
              onDragLeave={() => setFileDragOver(false)}
              onDrop={onFileDrop}
              style={{ marginTop:8, padding:'16px', border:`1.5px dashed ${fileDragOver ? 'var(--indigo)' : 'var(--border)'}`, borderRadius:12, background: fileDragOver ? 'var(--lavender)' : 'transparent', textAlign:'center', cursor:'pointer', transition:'background .15s, border-color .15s' }}
              onClick={browseFiles}>
              <div style={{ fontSize:22, marginBottom:4 }}>📤</div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', marginBottom:2 }}>Trascina i file qui</div>
              <div style={{ fontSize:11, color:'var(--gray)' }}>oppure clicca per selezionare</div>
              <input ref={fileInputRef} type="file" multiple onChange={onFilePick} style={{ display:'none' }} />
            </div>
            {f.files && f.files.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
                {f.files.map(file => (
                  <div key={file.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'var(--sidebar-bg)', border:'1px solid var(--border)', borderRadius:8 }}>
                    <span style={{ color:'var(--indigo)', display:'grid', placeItems:'center' }}><FileText size={14} /></span>
                    <div style={{ flex:1, minWidth:0, fontSize:12, fontWeight:600, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={file.name}>{file.name}</div>
                    <span style={{ fontSize:11, color:'var(--gray)', flexShrink:0 }}>{fmtFileSize(file.size)}</span>
                    <button onClick={() => removeEditFile(file.id)}
                      style={{ width:24, height:24, borderRadius:6, border:'none', background:'transparent', color:'var(--gray)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Trash size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'space-between', marginTop:20 }}>
            <button onClick={deleteEditEvent}
              style={{ padding:'10px 16px', borderRadius:999, border:'1px solid #EF4444', background:'transparent', color:'#EF4444', fontWeight:600, fontSize:13, cursor:'pointer' }}>
              Elimina
            </button>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={closeEditEvent} style={calS.cancelBtn}>Annulla</button>
              <button onClick={saveEditEvent} style={{ ...calS.saveBtn, background:saveBg }}>Salva</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={calS.wrap}>
      <div style={{ marginBottom:22 }}>
        <h2 style={homeS.h1}>Calendar</h2>
        <p style={homeS.sub}>Plan your week, track your life balance</p>
      </div>
      <div style={calS.header}>
        <div style={calS.navGroup}>
          <button onClick={navPrev} style={calS.navBtn}>‹</button>
          <span style={calS.rangeLabel}>{rangeLabel}</span>
          <button onClick={navNext} style={calS.navBtn}>›</button>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* View dropdown pill */}
          <div style={{ position:'relative' }}>
            <button onClick={() => setViewDropOpen(o => !o)}
              style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'8px 16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:999, fontSize:13, fontWeight:600, color:'var(--ink)', cursor:'pointer', userSelect:'none' }}>
              {view === 'week' ? 'Settimana' : 'Mese'}
              <ChevronDown size={14} color="var(--gray)" />
            </button>
            {viewDropOpen && (
              <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, boxShadow:'0 12px 32px rgba(0,0,0,.18)', zIndex:300, minWidth:160, overflow:'hidden' }}
                onMouseLeave={() => setViewDropOpen(false)}>
                {[{v:'week',label:'Settimana',key:'W'},{v:'month',label:'Mese',key:'M'}].map(({v, label, key}) => (
                  <button key={v} onClick={() => { setView(v); setViewDropOpen(false); }}
                    style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 18px', background: view===v ? 'var(--lavender)' : 'transparent', color: view===v ? 'var(--indigo)' : 'var(--ink)', fontSize:14, fontWeight: view===v ? 700 : 500, borderBottom:'1px solid var(--border)', cursor:'pointer', textAlign:'left' }}>
                    <span>{label}</span>
                    <span style={{ fontSize:11, color:'var(--gray)', fontWeight:700 }}>{key}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={onOpenPlanner} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'8px 16px', background:'var(--indigo)', color:'#fff', borderRadius:999, fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
            <Brain size={14} /> Studio AI
          </button>
        </div>
      </div>
      <div style={calS.catsRow}>
        {LIFE_CATS.map(c => (
          <button key={c.id} onClick={() => toggleCat(c.id)}
            style={{ ...calS.catChip, opacity:activeCats.has(c.id)?1:0.3, background:c.bg, color:c.text, border:`1.5px solid ${c.color}33` }}>
            <span style={{ ...calS.catDot, background:c.color }} />{c.label}
          </button>
        ))}
      </div>
      {calendarLoading && (
        <div style={calS.readModelNotice}>Loading calendar events...</div>
      )}
      {!calendarLoading && calendarError && (
        <div style={{ ...calS.readModelNotice, background:'#FEF2F2', borderColor:'#FCA5A5', color:'#991B1B' }}>{calendarError}</div>
      )}
      {!calendarLoading && !calendarError && serviceEventCount === 0 && (
        <div style={calS.readModelNotice}>No exam or study plan events yet. Add an exam date or generate a plan.</div>
      )}
      {view === 'week' ? renderWeek() : renderMonth()}
      <div style={calS.balanceSection}>
        <h4 style={calS.balanceTitle}>Life Balance — this week</h4>
        <div style={calS.balanceGrid}>
          {lifeBalance.map(b => (
            <div key={b.id} style={calS.balanceCard}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{ ...calS.catDot, background:b.color }} />
                <span style={{ fontSize:12, fontWeight:600, color:'var(--ink)' }}>{b.label}</span>
              </div>
              <div style={{ fontSize:22, fontWeight:800, color:b.color, letterSpacing:'-0.02em', marginBottom:6 }}>{b.pct}%</div>
              <div style={{ height:4, background:'#F4F5FF', borderRadius:999, overflow:'hidden', marginBottom:4 }}>
                <div style={{ width:`${b.pct}%`, height:'100%', background:b.color, borderRadius:999 }} />
              </div>
              <div style={{ fontSize:11, color:'var(--gray)' }}>{b.mins}m</div>
            </div>
          ))}
        </div>
      </div>
      {dayDetailKey && (() => {
        const key = dayDetailKey;
        const dayEvs = (events[key] || []).filter(ev => activeCats.has(ev.cat));
        const [yr, mo, dy] = key.split('-').map(Number);
        const d = new Date(yr, mo - 1, dy);
        const label = d.toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(15,16,53,.45)', display:'grid', placeItems:'center', zIndex:100 }}
            onClick={closeDayDetail}>
            <div style={{ width:'100%', maxWidth:460, maxHeight:'80vh', display:'flex', flexDirection:'column', background:'var(--surface)', borderRadius:20, border:'1px solid var(--border)', boxShadow:'0 30px 80px -20px rgba(15,16,53,.4)', overflow:'hidden' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ padding:'20px 22px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:'var(--ink)', textTransform:'capitalize' }}>{label}</div>
                  <div style={{ fontSize:12, color:'var(--gray)', marginTop:2 }}>{dayEvs.length} {dayEvs.length === 1 ? 'attività' : 'attività'}</div>
                </div>
                <button onClick={closeDayDetail} style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--gray)', fontSize:16, display:'grid', placeItems:'center', cursor:'pointer' }}>✕</button>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:'12px 22px' }}>
                {dayEvs.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'32px 0', color:'var(--gray)', fontSize:13 }}>Nessuna attività — aggiungine una!</div>
                ) : dayEvs.map((ev, idx) => {
                  const { bg, color, text } = resolveEventPalette(ev);
                  const origIdx = (events[key]||[]).indexOf(ev);
                  const isDragging = reorderDragIdx === origIdx;
                  const isDropTarget = reorderOverIdx === origIdx && reorderDragIdx !== null && reorderDragIdx !== origIdx;
                  const totalAttach = (ev.materials ? ev.materials.length : 0) + (ev.files ? ev.files.length : 0);
                  return (
                    <div key={idx}
                      draggable
                      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(origIdx)); setReorderDragIdx(origIdx); }}
                      onDragEnd={() => { setReorderDragIdx(null); setReorderOverIdx(null); }}
                      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (reorderOverIdx !== origIdx) setReorderOverIdx(origIdx); }}
                      onDrop={e => {
                        e.preventDefault();
                        const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
                        setReorderDragIdx(null); setReorderOverIdx(null);
                        if (!isNaN(from) && from !== origIdx) reorderEvent(key, from, origIdx);
                      }}
                      onClick={() => { if (reorderDragIdx !== null) return; closeDayDetail(); openEditEvent(key, origIdx); }}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:bg, border:isDropTarget ? `1.5px dashed ${color}` : `1px solid ${color}33`, marginBottom:8, opacity: isDragging ? 0.4 : (ev.completed ? 0.55 : 1), cursor:'pointer' }}>
                      <span style={{ color:text||'var(--gray)', opacity:.5, fontSize:14, lineHeight:1, cursor:'grab', userSelect:'none', flexShrink:0 }}>⋮⋮</span>
                      <div style={{ width:4, alignSelf:'stretch', borderRadius:999, background:color, flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:text||'var(--ink)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textDecoration: ev.completed ? 'line-through' : 'none' }}>{ev.name}</div>
                        <div style={{ fontSize:11, color:text||'var(--gray)', opacity:.7, display:'flex', gap:8 }}>
                          <span>🕐 {ev.time}</span><span>⏱ {ev.dur}</span>
                          {totalAttach > 0 && <span>📎 {totalAttach}</span>}
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteEvent(key, origIdx); }} style={{ color:'var(--gray-2)', padding:4, borderRadius:6, border:'none', background:'transparent', cursor:'pointer', opacity:.6, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}><Trash size={13} /></button>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)' }}>
                <button onClick={() => { closeDayDetail(); openModal(key); }} style={{ width:'100%', padding:'11px', borderRadius:12, background:'var(--indigo)', color:'#fff', fontWeight:600, fontSize:14, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  + Aggiungi attività
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {modalKey && renderModal()}
      {editEv && editForm && renderEditModal()}
      {drag && (
        <div style={{ position:'fixed', left:drag.ghostX, top:drag.ghostY, width:drag.ghostW, height:drag.ghostH,
          background:drag.bg, borderLeft:`3px solid ${drag.color}`, borderRadius:8, padding:'5px 8px',
          zIndex:9999, pointerEvents:'none', boxShadow:'0 12px 32px rgba(0,0,0,.22)',
          opacity:0.92, boxSizing:'border-box', overflow:'hidden' }}>
          <div style={{ fontSize:11, fontWeight:700, color:drag.color, lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{drag.ev.name}</div>
          <div style={{ fontSize:10, color:drag.color, opacity:.8, marginTop:3 }}>🕐 {drag.toTime}</div>
        </div>
      )}
    </div>
  );
}

const calS = {
  wrap: { display:'flex', flexDirection:'column', gap:18 },
  header: { display:'flex', alignItems:'center', justifyContent:'space-between' },
  navGroup: { display:'flex', alignItems:'center', gap:10 },
  navBtn: { width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontSize:18, display:'grid', placeItems:'center', cursor:'pointer' },
  rangeLabel: { fontSize:14, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.01em', padding:'6px 18px', border:'1px solid var(--border)', borderRadius:10, background:'var(--surface)', textAlign:'center', whiteSpace:'nowrap' },
  viewToggleGroup: { display:'flex', background:'var(--sidebar-bg)', border:'1.5px solid var(--border)', borderRadius:10, padding:3, gap:2 },
  toggleBtn: { padding:'6px 16px', borderRadius:8, fontSize:13, fontWeight:600, color:'var(--gray)', background:'transparent', border:'none', cursor:'pointer' },
  toggleBtnActive: { background:'var(--surface)', color:'var(--ink)', boxShadow:'0 1px 4px rgba(0,0,0,.15)', border:'0.5px solid var(--border)' },
  catsRow: { display:'flex', gap:8, flexWrap:'wrap' },
  catChip: { display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:999, fontSize:12, fontWeight:600, cursor:'pointer', transition:'opacity .15s' },
  catDot: { width:8, height:8, borderRadius:999, flexShrink:0 },
  readModelNotice: { margin:'0 0 12px', padding:'10px 12px', borderRadius:12, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--gray)', fontSize:13, fontWeight:700 },
  weekGrid: { display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:8 },
  weekCol: { display:'flex', flexDirection:'column', gap:6 },
  weekColHeader: { display:'flex', flexDirection:'column', alignItems:'center', gap:2, padding:'10px 8px', background:'var(--sidebar-bg)', border:'1px solid var(--border)', borderRadius:10, marginBottom:2 },
  weekDayName: { fontSize:10, fontWeight:700, color:'var(--gray-2)', letterSpacing:'0.06em' },
  weekDayNum: { fontSize:22, fontWeight:700, color:'var(--ink)', lineHeight:1, width:36, height:36, display:'grid', placeItems:'center', borderRadius:999 },
  weekDayToday: { background:'var(--indigo)', color:'#fff' },
  weekEvs: { display:'flex', flexDirection:'column', gap:6 },
  evCard: { borderRadius:10, padding:'8px 10px', display:'flex', flexDirection:'column', gap:4 },
  evName: { fontSize:12, fontWeight:600, color:'var(--ink)', lineHeight:1.3 },
  evMeta: { display:'flex', alignItems:'center', gap:4, fontSize:10, color:'var(--gray)' },
  evTrash: { color:'var(--gray-2)', padding:2, borderRadius:4, flexShrink:0, opacity:0.6 },
  noteChip: { fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:999 },
  addSlot: { border:'1.5px dashed var(--border)', borderRadius:10, padding:'7px', fontSize:12, color:'var(--gray-2)', fontWeight:600, textAlign:'center', cursor:'pointer', background:'transparent' },
  monthWeekHeader: { display:'grid', gridTemplateColumns:'repeat(7, 1fr)', marginBottom:4 },
  monthWeekLabel: { textAlign:'center', fontSize:11, fontWeight:700, color:'var(--gray)', letterSpacing:'0.04em', padding:'4px 0' },
  monthGrid: { display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2 },
  monthCell: { height:90, padding:'6px 8px', borderRadius:8, border:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden' },
  monthCellToday: { border:'1.5px solid #3730E8' },
  monthDayNum: { fontSize:12, fontWeight:600, color:'var(--ink)' },
  monthDayToday: { background:'#3730E8', color:'#fff', width:20, height:20, borderRadius:999, display:'grid', placeItems:'center', fontSize:11 },
  monthPill: { fontSize:10, fontWeight:600, color:'#fff', padding:'2px 6px', borderRadius:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  monthMore: { fontSize:10, color:'var(--gray)', fontWeight:600 },
  balanceSection: { borderTop:'1px solid var(--border)', paddingTop:18 },
  balanceTitle: { margin:'0 0 12px', fontSize:14, fontWeight:700, color:'var(--ink)' },
  balanceGrid: { display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:10 },
  balanceCard: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:14 },
  overlay: { position:'fixed', inset:0, background:'rgba(15,16,53,.4)', display:'grid', placeItems:'center', zIndex:100 },
  modal: { background:'var(--surface)', borderRadius:20, padding:28, width:'100%', maxWidth:480, boxShadow:'0 20px 60px -10px rgba(15,16,53,.2)' },
  modalTitle: { margin:'0 0 20px', fontSize:16, fontWeight:700, color:'var(--ink)' },
  modalField: { marginBottom:16 },
  modalLabel: { display:'block', fontSize:12, fontWeight:700, color:'var(--ink)', marginBottom:8 },
  modalInput: { width:'100%', padding:'10px 12px', border:'1px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--ink)', background:'var(--surface)', outline:'none', boxSizing:'border-box' },
  cancelBtn: { padding:'10px 20px', borderRadius:999, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontWeight:600, fontSize:14, cursor:'pointer' },
  saveBtn: { padding:'10px 20px', borderRadius:999, border:'none', color:'#fff', fontWeight:600, fontSize:14, cursor:'pointer' },
};
