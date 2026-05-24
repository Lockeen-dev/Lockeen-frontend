import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, GripDots, Pause, Play, RefreshCw, Stop } from '../lib/icons';

/* ===================== STUDY TIMER ===================== */
export default function StudyTimer({ onSessionSaved, startTrigger }) {
  const PS = 1500;
  const PB = 300;
  const CIRC = 376.99;
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning] = useState(false);
  const [mode, setMode_] = useState('free');
  const [elapsed, setElapsed] = useState(0);
  const [pomoElapsed, setPomoEl] = useState(0);
  const [pomoPhase, setPomoPhase] = useState('study');
  const [sessionCount, setSessN] = useState(1);
  const [sessions, setSessions] = useState([]);
  const [showToast, setShowToast] = useState(null);
  const [customInputMins, setCustomInputMins] = useState('25');
  const timerRef = useRef(null);
  const fwRef = useRef(null);
  const elapsedRef = useRef(0);
  const pomoRef = useRef(0);
  const modeRef = useRef('free');
  const phaseRef = useRef('study');
  const customDurRef = useRef(1500);
  const dragRef = useRef({ active: false, offsetX: 0, offsetY: 0 });

  const fmt = (s) => {
    const n = Math.max(0, s);
    return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
  };
  const customMinsFromInput = (value) => {
    if (String(value).trim() === '') return 0;
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(240, Math.floor(n)));
  };

  const playDing = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const freqs = [880, 1100, 880];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.22;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.35, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        osc.start(t); osc.stop(t + 0.4);
      });
    } catch (_) {}
  };

  const addSession = (mins) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSessions(prev => [...prev, { mins, time }]);
  };

  const saveSession = (mins) => {
    if (mins < 1) return;
    addSession(mins);
    onSessionSaved && onSessionSaved(mins);
    setShowToast(mins);
  };

  const clearTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const tick = () => {
    if (modeRef.current === 'free') {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      return;
    }
    if (modeRef.current === 'custom') {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= customDurRef.current) {
        clearInterval(timerRef.current); timerRef.current = null;
        setRunning(false);
        playDing();
        saveSession(Math.round(customDurRef.current / 60));
        elapsedRef.current = 0;
        setElapsed(0);
        setSessN(n => n + 1);
      }
      return;
    }
    pomoRef.current += 1;
    setPomoEl(pomoRef.current);
    if (phaseRef.current === 'study' && pomoRef.current >= PS) {
      playDing();
      saveSession(25);
      setSessN(n => n + 1);
      phaseRef.current = 'break';
      setPomoPhase('break');
      pomoRef.current = 0;
      setPomoEl(0);
    } else if (phaseRef.current === 'break' && pomoRef.current >= PB) {
      phaseRef.current = 'study';
      setPomoPhase('study');
      pomoRef.current = 0;
      setPomoEl(0);
    }
  };

  const toggleRun = () => {
    if (running) {
      clearTimer();
      setRunning(false);
      return;
    }
    if (modeRef.current === 'custom') {
      const mins = customMinsFromInput(customInputMins);
      if (mins <= 0) return;
      customDurRef.current = mins * 60;
    }
    setRunning(true);
    timerRef.current = setInterval(tick, 1000);
  };

  const doReset = () => {
    clearTimer();
    setRunning(false);
    elapsedRef.current = 0;
    pomoRef.current = 0;
    phaseRef.current = 'study';
    setElapsed(0);
    setPomoEl(0);
    setPomoPhase('study');
  };

  const stopSession = () => {
    clearTimer();
    setRunning(false);
    const mins = modeRef.current === 'custom'
      ? Math.round(elapsedRef.current / 60)
      : modeRef.current === 'free'
        ? Math.round(elapsedRef.current / 60)
        : phaseRef.current === 'study'
          ? Math.round(pomoRef.current / 60)
          : 0;
    saveSession(mins);
    elapsedRef.current = 0;
    pomoRef.current = 0;
    phaseRef.current = 'study';
    setElapsed(0);
    setPomoEl(0);
    setPomoPhase('study');
    setSessN(n => n + 1);
  };

  const setMode = (m) => {
    if (running) return;
    doReset();
    modeRef.current = m;
    setMode_(m);
  };

  const onHandleDown = (e) => {
    const fw = fwRef.current;
    if (!fw) return;
    const rect = fw.getBoundingClientRect();
    dragRef.current = { active: true, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
    fw.style.cursor = 'grabbing';
    e.preventDefault();
  };

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { phaseRef.current = pomoPhase; }, [pomoPhase]);

  useEffect(() => {
    if (!startTrigger) return;
    const mins = startTrigger.mins || 25;
    clearTimer();
    elapsedRef.current = 0; pomoRef.current = 0; phaseRef.current = 'study';
    setElapsed(0); setPomoEl(0); setPomoPhase('study'); setRunning(false);
    modeRef.current = 'custom';
    setMode_('custom');
    customDurRef.current = mins * 60;
    setCustomInputMins(String(mins));
    setExpanded(true);
  }, [startTrigger]);

  useEffect(() => {
    const onMove = (e) => {
      const drag = dragRef.current;
      const fw = fwRef.current;
      if (!drag.active || !fw) return;
      const left = Math.min(Math.max(e.clientX - drag.offsetX, 0), window.innerWidth - fw.offsetWidth);
      const top = Math.min(Math.max(e.clientY - drag.offsetY, 0), window.innerHeight - fw.offsetHeight);
      fw.style.left = `${left}px`;
      fw.style.top = `${top}px`;
      fw.style.right = 'auto';
      fw.style.bottom = 'auto';
    };
    const onUp = () => {
      dragRef.current.active = false;
      if (fwRef.current) fwRef.current.style.cursor = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  useEffect(() => {
    if (!showToast) return undefined;
    const t = setTimeout(() => setShowToast(null), 2500);
    return () => clearTimeout(t);
  }, [showToast]);

  const isPomo = mode === 'pomodoro';
  const isCustom = mode === 'custom';
  const phaseDur = pomoPhase === 'study' ? PS : PB;
  const customInputSeconds = customMinsFromInput(customInputMins) * 60;
  const customDisplayTotal = running || elapsed > 0 ? customDurRef.current : customInputSeconds;
  const displaySeconds = isPomo ? phaseDur - pomoElapsed : isCustom ? Math.max(0, customDisplayTotal - elapsed) : elapsed;
  const progress = isPomo ? Math.min(pomoElapsed / phaseDur, 1) : isCustom ? (customDisplayTotal > 0 ? Math.min(elapsed / customDisplayTotal, 1) : 0) : (elapsed % 3600) / 3600;
  const ringColor = isPomo && pomoPhase === 'break' ? '#10B981' : isCustom ? '#8B5CF6' : 'var(--indigo)';
  const dashOffset = CIRC * (1 - progress);
  const disabledStop = elapsed === 0 && pomoElapsed === 0 && !running;
  const totalStudy = sessions.reduce((sum, s) => sum + s.mins, 0);

  if (!expanded) {
    return (
      <button style={timerS.pill} onClick={() => setExpanded(true)} aria-label="Open study timer">
        <span style={{ ...timerS.pillDot, animation: running ? 'timer-pulse 1.2s infinite' : 'none' }} />
        <span style={timerS.pillTime}>{fmt(displaySeconds)}</span>
        {isPomo && <span style={timerS.pillPhase}>{pomoPhase === 'study' ? 'Study' : 'Break'}</span>}
        <ChevronUp size={15} color="rgba(255,255,255,.7)" />
      </button>
    );
  }

  return (
    <React.Fragment>
      {showToast && (
        <div style={timerS.toast}>
          <Check size={14} />
          <span>{showToast}m aggiunti ad Analytics!</span>
        </div>
      )}
      <div ref={fwRef} style={timerS.card}>
        <div style={timerS.header}>
          <div onMouseDown={onHandleDown} style={timerS.dragHandle}>
            <GripDots size={12} color="var(--gray)" style={{ opacity: .4 }} />
            <span style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Study Timer</span>
          </div>
          <button style={timerS.closeBtn} onClick={() => setExpanded(false)} aria-label="Minimize timer">
            <ChevronDown size={15} />
          </button>
        </div>

        <div style={timerS.toggle}>
          <button style={{ ...timerS.tab, ...(mode === 'free' ? timerS.tabActive : null) }} onClick={() => setMode('free')}>Free</button>
          <button style={{ ...timerS.tab, ...(mode === 'pomodoro' ? timerS.tabActive : null) }} onClick={() => setMode('pomodoro')}>🍅</button>
          <button style={{ ...timerS.tab, ...(mode === 'custom' ? { ...timerS.tabActive, background: '#8B5CF6' } : null) }} onClick={() => setMode('custom')}>Custom</button>
        </div>
        {isPomo && <div style={timerS.pomoHint}>25 min studio · 5 min pausa automatica</div>}
        {isCustom && !running && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number" min="0" max="240" value={customInputMins}
              onChange={e => {
                const next = e.target.value;
                setCustomInputMins(next);
                if (!running) {
                  const nextSeconds = customMinsFromInput(next) * 60;
                  customDurRef.current = nextSeconds;
                  elapsedRef.current = 0;
                  setElapsed(0);
                }
              }}
              style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--sidebar-bg)', color: 'var(--ink)', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', textAlign: 'center', outline: 'none' }}
              placeholder="25"
            />
            <span style={{ fontSize: 12, color: 'var(--gray)', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>minuti</span>
          </div>
        )}

        <div style={timerS.ringWrap}>
          <svg width="140" height="140" viewBox="0 0 140 140" style={timerS.ringSvg}>
            <circle cx="70" cy="70" r="60" fill="none" stroke="var(--border)" strokeWidth="8" />
            <circle cx="70" cy="70" r="60" fill="none" stroke={ringColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={dashOffset} style={timerS.ringFill} />
          </svg>
          <div style={timerS.ringCenter}>
            <div style={timerS.ringTime}>{fmt(displaySeconds)}</div>
            {isPomo && <div style={timerS.ringPhase}>{pomoPhase === 'study' ? 'Studio' : 'Pausa'}</div>}
            {isCustom && <div style={timerS.ringPhase}>Custom</div>}
            {!isPomo && !isCustom && <div style={timerS.ringPhase}>INIZIA ORA</div>}
          </div>
          <div style={timerS.session}>Sessione {sessionCount}</div>
        </div>

        <div style={timerS.controls}>
          <button style={{ ...timerS.playBtn, ...(running ? timerS.pauseBtn : (elapsed > 0 || pomoElapsed > 0) ? timerS.resumeBtn : null) }} onClick={toggleRun}>
            {running ? <Pause size={15} /> : <Play size={15} />}
            <span>{running ? 'Pausa' : (elapsed > 0 || pomoElapsed > 0) ? 'Riprendi' : 'Avvia'}</span>
          </button>
          <button style={{ ...timerS.stopBtn, opacity: disabledStop ? .3 : 1 }} disabled={disabledStop} onClick={stopSession} aria-label="Stop session">
            <Stop size={15} />
          </button>
          <button style={timerS.resetBtn} onClick={doReset} aria-label="Reset timer">
            <RefreshCw size={15} />
          </button>
        </div>

        {sessions.length > 0 && (
          <div style={timerS.log}>
            <div style={timerS.logTitle}>SESSIONI DI OGGI</div>
            <div style={timerS.logList}>
              {sessions.map((s, i) => (
                <div key={`${s.time}-${i}`} style={timerS.logRow}>
                  <span style={timerS.logDot} />
                  <span style={timerS.logTime}>{s.time}</span>
                  <span style={timerS.logMins}>{s.mins}m</span>
                </div>
              ))}
            </div>
            <div style={timerS.totalRow}>
              <span>Totale studio</span>
              <span style={{ color: 'var(--indigo)', fontWeight: 700 }}>{totalStudy}m</span>
            </div>
          </div>
        )}
      </div>
    </React.Fragment>
  );
}

const timerS = {
  pill: { position: 'fixed', bottom: 24, right: 24, zIndex: 999, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'var(--indigo)', borderRadius: 999, cursor: 'pointer', boxShadow: '0 8px 32px rgba(55,48,232,.45)', color: '#fff', fontFamily: 'inherit' },
  pillDot: { width: 8, height: 8, borderRadius: '50%', background: '#fff', flexShrink: 0 },
  pillTime: { fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'inherit' },
  pillPhase: { fontSize: 10, color: 'rgba(255,255,255,.7)', fontFamily: 'inherit' },
  card: { position: 'fixed', bottom: 76, right: 24, zIndex: 999, background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--border)', padding: '20px 20px 16px', width: 268, boxShadow: '0 24px 64px rgba(15,16,53,.28)', fontFamily: 'inherit' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  dragHandle: { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink)', fontSize: 13, fontWeight: 700, cursor: 'grab', userSelect: 'none', fontFamily: 'inherit' },
  closeBtn: { width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'var(--gray)', background: 'var(--sidebar-bg)', border: '1px solid var(--border)' },
  toggle: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3, background: 'var(--sidebar-bg)', borderRadius: 10, padding: 3 },
  tab: { borderRadius: 7, padding: '7px 6px', background: 'transparent', color: 'var(--gray)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'inherit', letterSpacing: '0.04em', textAlign: 'center' },
  tabActive: { background: 'var(--indigo)', color: '#fff' },
  pomoHint: { marginTop: 8, fontSize: 11, color: 'var(--gray)', textAlign: 'center', fontFamily: 'inherit' },
  ringWrap: { position: 'relative', display: 'grid', placeItems: 'center', margin: '16px 0 14px' },
  ringSvg: { transform: 'rotate(-90deg)' },
  ringFill: { transition: 'stroke-dashoffset .95s linear, stroke .3s' },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  ringTime: { fontSize: 30, fontWeight: 800, color: 'var(--ink)', lineHeight: 1, fontFamily: 'inherit', letterSpacing: '-0.02em' },
  ringPhase: { marginTop: 5, fontSize: 10, color: 'var(--gray)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'inherit' },
  session: { marginTop: 6, fontSize: 11, color: 'var(--gray)', fontFamily: 'inherit', fontWeight: 500 },
  controls: { display: 'grid', gridTemplateColumns: '1fr 38px 38px', gap: 6 },
  playBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, padding: '11px 10px', background: 'var(--indigo)', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' },
  pauseBtn: { background: 'var(--sidebar-bg)', border: '1.5px solid var(--border)', color: 'var(--ink)' },
  resumeBtn: { background: 'var(--lavender)', color: 'var(--indigo)' },
  stopBtn: { width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', background: '#FEE2E2', color: '#991B1B' },
  resetBtn: { width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--sidebar-bg)', border: '1px solid var(--border)', color: 'var(--gray)' },
  log: { marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 },
  logTitle: { fontSize: 10, letterSpacing: '.08em', color: 'var(--gray)', fontWeight: 700, marginBottom: 9, fontFamily: 'inherit' },
  logList: { display: 'flex', flexDirection: 'column', gap: 7 },
  logRow: { display: 'grid', gridTemplateColumns: '12px 1fr auto', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: 'inherit' },
  logDot: { width: 7, height: 7, borderRadius: '50%', background: 'var(--indigo)' },
  logTime: { color: 'var(--gray)', fontFamily: 'inherit' },
  logMins: { fontWeight: 700, color: 'var(--ink)', fontFamily: 'inherit' },
  totalRow: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10, fontSize: 12, color: 'var(--gray)', fontWeight: 600, fontFamily: 'inherit' },
  toast: { position: 'fixed', top: 24, right: 24, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 7, background: 'var(--msg-good-bg)', border: '1px solid var(--msg-good-border)', color: 'var(--msg-good-text)', borderRadius: 12, padding: '9px 16px', fontSize: 13, fontWeight: 600, boxShadow: '0 10px 30px rgba(22,101,52,.15)', fontFamily: 'inherit' },
};
