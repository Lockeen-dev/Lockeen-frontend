import React from 'react';

function GradeValue({ value, color, size = 20 }) {
  const grade = Number(value || 27);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: size, fontWeight: 800, color }}>{grade}</span>
      <span style={{ fontSize: Math.max(9, size - 12), color: 'var(--gray-2)', fontWeight: 700 }}>/30</span>
    </span>
  );
}

const PRIORITY_OPTIONS = [
  { v: 1, label: 'Bassa',      short: 'Low',       desc: 'Tranquillo', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
  { v: 2, label: 'Media',      short: 'Medium',    desc: 'Normale',    color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  { v: 3, label: 'Alta',       short: 'High',      desc: 'Priorità',   color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  { v: 4, label: 'Molto alta', short: 'Very high', desc: 'Urgente',    color: '#F97316', bg: '#FFF7ED', border: '#FED7AA' },
  { v: 5, label: 'Critica',    short: 'Critical',  desc: 'Massima',    color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
];

const getPriorityMeta = (value) => PRIORITY_OPTIONS.find((p) => p.v === Number(value)) || PRIORITY_OPTIONS[2];

function PrioritySelector({ value, onChange }) {
  return (
    <div style={priorityS.grid}>
      {PRIORITY_OPTIONS.map((p) => {
        const active = Number(value) === p.v;
        return (
          <button
            key={p.v}
            type="button"
            onClick={() => onChange(p.v)}
            style={{
              ...priorityS.option,
              background: active ? p.bg : 'var(--surface)',
              borderColor: active ? p.color : 'var(--border)',
              boxShadow: active ? `0 10px 24px -18px ${p.color}` : 'none',
            }}
          >
            <span style={{ ...priorityS.num, background: active ? p.color : 'var(--sidebar-bg)', color: active ? '#fff' : 'var(--gray)' }}>{p.v}</span>
            <span style={{ ...priorityS.text, color: active ? 'var(--ink)' : 'var(--gray)' }}>{p.label}</span>
            <span style={{ ...priorityS.desc, color: active ? p.color : 'var(--gray-2)' }}>{p.desc}</span>
          </button>
        );
      })}
    </div>
  );
}


const EMOJI_PICKER = [
  '📚','📖','📝','✏️','📐','📏','🔬','🧬','⚗️','🧪',
  '⚛️','🔭','📊','📈','💰','🏛️','🌍','🗺️','🎨','🎭',
  '🎵','💻','🤖','🧠','🔐','📜','⚔️','🏺','🎓','🌿',
  '🌊','🔥','❄️','☀️','🌙','⭐','🦁','🦋','🏔️','🌋',
  '🍎','🧲','⚙️','🔑','💡','🌐','🏋️','🎯','🚀','🧩',
];



function EmojiPickerButton({ emoji, dot, bg, size = 60, onPick, title = 'Cambia emoji' }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  return (
    <div ref={ref} style={{ position:'relative', display:'inline-block' }}>
      <button type="button" onClick={(event) => { event.stopPropagation(); setOpen(v => !v); }}
        title={title}
        aria-label={title}
        style={{ position:'relative', width:size, height:size, borderRadius:size*0.27, background: bg || (dot+'22'), border:`2px solid ${dot}40`, display:'grid', placeItems:'center', cursor:'pointer', transition:'transform .15s', fontSize:size*0.48, lineHeight:1 }}
        onMouseEnter={e => e.currentTarget.style.transform='scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
        {emoji}
      </button>
      {open && (
        <div style={{ position:'fixed', zIndex:9999, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,.18)', padding:12, width:248,
          top: (() => { const r = ref.current?.getBoundingClientRect(); if (!r) return 0; return r.bottom + 8 + 200 > window.innerHeight ? r.top - 210 : r.bottom + 8; })(),
          left: (() => { const r = ref.current?.getBoundingClientRect(); if (!r) return 0; return Math.max(8, Math.min(r.left - 80, window.innerWidth - 256)); })()
        }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--gray)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>Scegli emoji</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(10,1fr)', gap:2 }}>
            {EMOJI_PICKER.map(e => (
              <button key={e} type="button" onClick={(event) => { event.stopPropagation(); onPick(e); setOpen(false); }}
                style={{ fontSize:17, padding:'5px 2px', borderRadius:6, border:'none', background: e===emoji ? dot+'22' : 'transparent', cursor:'pointer', transition:'background .1s' }}
                onMouseEnter={ev => ev.currentTarget.style.background=dot+'22'}
                onMouseLeave={ev => ev.currentTarget.style.background= e===emoji ? dot+'22' : 'transparent'}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}




const priorityS = {
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(92px, 1fr))', gap:8 },
  option: { minHeight:72, padding:'10px 9px', borderRadius:14, border:'1.5px solid var(--border)', display:'flex', flexDirection:'column', alignItems:'flex-start', justifyContent:'center', gap:4, cursor:'pointer', transition:'background .15s, border-color .15s, box-shadow .15s, transform .15s' },
  num: { width:22, height:22, borderRadius:999, display:'grid', placeItems:'center', fontSize:11, fontWeight:800, lineHeight:1 },
  text: { fontSize:12, fontWeight:800, lineHeight:1.1 },
  desc: { fontSize:10, fontWeight:700, lineHeight:1.1 },
};


const gradeS = {
  lodeBadge: { background: 'linear-gradient(90deg,#F59E0B,#EF4444)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 20, lineHeight: 1.2 },
  sliderRow: { display: 'flex', alignItems: 'center', gap: 14 },
  sliderValue: { minWidth: 92, display: 'flex', alignItems: 'center' },
  sliderTrackCol: { flex: 1, display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 },
  range: { width: '100%', height: 8, borderRadius: 999, outline: 'none', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' },
  ticks: { display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--gray-2)' },
  cardTarget: { display: 'flex', alignItems: 'center', gap: 6, margin: '-4px 0 14px' },
  cardTargetLabel: { fontSize: 11, color: 'var(--gray)', fontWeight: 700 },
  section: { marginTop: 22 },
  sectionHead: { marginBottom: 16 },
  sectionTitle: { margin: 0, fontSize: 16, fontWeight: 750, color: 'var(--ink)' },
  sectionSub: { margin: '4px 0 0', fontSize: 13, color: 'var(--gray)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 18, boxShadow: '0 10px 28px -26px rgba(15,16,53,.28)' },
  cardHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 18 },
  noteName: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--ink)', minWidth: 0 },
  noteDot: { width: 8, height: 8, borderRadius: 999, flexShrink: 0, opacity: .85 },
  examDate: { fontSize: 12, color: 'var(--gray)', whiteSpace: 'nowrap' },
  barWrap: { position: 'relative', height: 48, marginBottom: 12 },
  track: { position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: '100%', height: 7, background: 'var(--chart-track)', borderRadius: 999 },
  fill: { position: 'absolute', top: '50%', transform: 'translateY(-50%)', height: 7, borderRadius: 999, background: 'linear-gradient(90deg, var(--indigo), var(--indigo-2))' },
  point: { position: 'absolute', top: '50%', transform: 'translate(-50%,-50%)', width: 16, height: 16, borderRadius: '50%', border: '3px solid var(--surface)', boxShadow: '0 6px 14px rgba(15,16,53,.14)' },
  pointPred: { background: 'var(--indigo)' },
  pointTarget: { background: 'var(--surface)', borderColor: '#9CA3AF' },
  pointGood: { background: '#10B981' },
  pointLabel: { position: 'absolute', top: -20, left: -3, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' },
  pointLabelPred: { color: 'var(--indigo)' },
  pointLabelTarget: { color: 'var(--gray)' },
  pointLabelGood: { color: '#047857' },
  minLabel: { position: 'absolute', left: 0, bottom: 0, fontSize: 9, color: 'var(--gray-2)' },
  maxLabel: { position: 'absolute', right: 0, bottom: 0, fontSize: 9, color: 'var(--gray-2)' },
  nums: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 },
  num: { fontSize: 20, fontWeight: 800, lineHeight: 1 },
  numPred: { color: 'var(--ink)' },
  numTarget: { color: 'var(--gray)' },
  numLabel: { marginTop: 4, fontSize: 10, color: 'var(--gray)', lineHeight: 1.25 },
  message: { borderRadius: 10, padding: '10px 12px', fontSize: 12, lineHeight: 1.5, border: '1px solid var(--border)', marginBottom: 8 },
  msgEmpty: { background: 'var(--sidebar-bg)', borderColor: 'var(--border)', color: 'var(--gray)' },
  msgWarn: { background: 'var(--sidebar-bg)', borderColor: 'var(--border)', color: 'var(--ink)' },
  msgAlmost: { background: 'var(--sidebar-bg)', borderColor: 'var(--border)', color: 'var(--ink)' },
  msgGood: { background: 'var(--sidebar-bg)', borderColor: 'var(--border)', color: 'var(--ink)' },
  quizBtn: { width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)', fontSize: 12, fontWeight: 700 },
};

export { GradeValue, PRIORITY_OPTIONS, getPriorityMeta, PrioritySelector, EmojiPickerButton, gradeS };
