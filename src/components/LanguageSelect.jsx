import React from 'react';

import { LANG_OPTIONS } from '../lib/i18n';

function LanguageSelect({ lang, onChange, compact = false }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const current = LANG_OPTIONS.find(l => l.value === lang) || LANG_OPTIONS[0];

  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} translate="no" style={{ position:'relative', display:'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        translate="no"
        style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 12px', borderRadius:12, border:'1.5px solid var(--border)', background:'var(--surface)', cursor:'pointer', fontSize:13, fontWeight:600, color:'var(--ink)', whiteSpace:'nowrap', userSelect:'none' }}
      >
        <span translate="no">{current.flag} {current.label}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div translate="no" style={{ position:'absolute', top:'calc(100% + 6px)', right:0, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,.12)', zIndex:9999, minWidth:80, overflow:'hidden' }}>
          {LANG_OPTIONS.map(l => (
            <button key={l.value} type="button" translate="no"
              onClick={() => { onChange(l.value); setOpen(false); }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:7, padding:'9px 14px', background: l.value === lang ? 'var(--lavender)' : 'transparent', color: l.value === lang ? 'var(--indigo)' : 'var(--ink)', fontWeight: l.value === lang ? 700 : 500, fontSize:13, cursor:'pointer', border:'none', textAlign:'left', whiteSpace:'nowrap' }}>
              <span translate="no">{l.flag} {l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSelect;
