import React, { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'lockeen.practiceBackground.v1';

const BACKGROUNDS = [
  { id: 'clean', label: 'Clean', swatch: ['#F8FAFC', '#EEF2FF'] },
  { id: 'aurora', label: 'Aurora', swatch: ['#E0F2FE', '#F5D0FE'] },
  { id: 'lines', label: 'Focus lines', swatch: ['#ECFDF5', '#DBEAFE'] },
  { id: 'dots', label: 'Dotted field', swatch: ['#FFF7ED', '#E0E7FF'] },
];

function getInitialBackground() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return BACKGROUNDS.some((bg) => bg.id === stored) ? stored : 'clean';
  } catch {
    return 'clean';
  }
}

export function usePracticeBackground() {
  const [background, setBackground] = useState(getInitialBackground);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, background);
    } catch {
      // Visual preference only; practice remains fully usable without storage.
    }
  }, [background]);

  return [background, setBackground];
}

function PracticeBackgroundStyles() {
  return (
    <style>{`
      @keyframes practiceDrift {
        from { transform: translate3d(-2%, -1%, 0) rotate(0deg); }
        to { transform: translate3d(2%, 1%, 0) rotate(1deg); }
      }
      @keyframes practiceSlide {
        from { background-position: 0 0; }
        to { background-position: 72px 72px; }
      }
      @media (prefers-reduced-motion: reduce) {
        .practice-bg-layer { animation: none !important; }
      }
    `}</style>
  );
}

function layersFor(background) {
  if (background === 'aurora') {
    return [
      { background: 'linear-gradient(125deg, rgba(14,165,233,.18), transparent 34%, rgba(168,85,247,.16) 58%, transparent 78%)', animation: 'practiceDrift 9s ease-in-out infinite alternate' },
      { background: 'repeating-linear-gradient(100deg, rgba(255,255,255,.34) 0 1px, transparent 1px 30px)', animation: 'practiceSlide 18s linear infinite' },
    ];
  }
  if (background === 'lines') {
    return [
      { background: 'repeating-linear-gradient(135deg, rgba(47,43,255,.1) 0 2px, transparent 2px 24px)', animation: 'practiceSlide 20s linear infinite' },
      { background: 'linear-gradient(140deg, rgba(16,185,129,.14), transparent 44%, rgba(59,130,246,.12))', animation: 'practiceDrift 11s ease-in-out infinite alternate' },
    ];
  }
  if (background === 'dots') {
    return [
      { background: 'radial-gradient(circle at center, rgba(47,43,255,.16) 0 1.2px, transparent 1.4px)', backgroundSize: '24px 24px', animation: 'practiceSlide 24s linear infinite' },
      { background: 'linear-gradient(120deg, rgba(245,158,11,.12), transparent 44%, rgba(99,102,241,.12))', animation: 'practiceDrift 12s ease-in-out infinite alternate' },
    ];
  }
  return [];
}

function backgroundStyle(background) {
  if (background === 'aurora') return 'linear-gradient(135deg, #F8FAFC 0%, #EEF9FF 48%, #FAF5FF 100%)';
  if (background === 'lines') return 'linear-gradient(135deg, #F8FAFC 0%, #F0FDF4 50%, #EFF6FF 100%)';
  if (background === 'dots') return 'linear-gradient(135deg, #FFFBEB 0%, #F8FAFC 48%, #EEF2FF 100%)';
  return 'transparent';
}

export function PracticeBackgroundSelector({ value, onChange, compact = false }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: 5, borderRadius: 999, border: '1px solid var(--border)', background: 'rgba(255,255,255,.82)', boxShadow: '0 10px 28px rgba(15,23,42,.08)', backdropFilter: 'blur(12px)' }}>
      {BACKGROUNDS.map((bg) => {
        const active = value === bg.id;
        return (
          <button
            key={bg.id}
            type="button"
            onClick={() => onChange(bg.id)}
            title={bg.label}
            aria-label={`Practice background: ${bg.label}`}
            aria-pressed={active}
            style={{
              width: compact ? 28 : 34,
              height: compact ? 28 : 34,
              borderRadius: 999,
              border: active ? '2px solid var(--indigo)' : '1px solid var(--border)',
              background: `linear-gradient(135deg, ${bg.swatch[0]}, ${bg.swatch[1]})`,
              cursor: 'pointer',
              boxShadow: active ? '0 0 0 3px rgba(47,43,255,.14)' : 'none',
            }}
          />
        );
      })}
    </div>
  );
}

export function PracticeBackgroundFrame({ background, onBackgroundChange, children }) {
  const layers = useMemo(() => layersFor(background), [background]);

  return (
    <div style={{ position: 'relative', minHeight: 520, margin: '-8px -8px 0', padding: '18px 8px 28px', borderRadius: 24, overflow: 'hidden', background: backgroundStyle(background), isolation: 'isolate' }}>
      <PracticeBackgroundStyles />
      {layers.map((layer, index) => (
        <div
          key={`${background}-${index}`}
          className="practice-bg-layer"
          aria-hidden="true"
          style={{ position: 'absolute', inset: '-12%', opacity: .78, zIndex: -2, pointerEvents: 'none', ...layer }}
        />
      ))}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: -1, background: background === 'clean' ? 'transparent' : 'linear-gradient(180deg, rgba(255,255,255,.68), rgba(255,255,255,.9))', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', maxWidth: 560, margin: '0 auto 12px', padding: '0 2px' }}>
        <PracticeBackgroundSelector value={background} onChange={onBackgroundChange} compact />
      </div>
      {children}
    </div>
  );
}
