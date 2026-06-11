import React from 'react';

import { Layers, Sparkles, XMark } from '../lib/icons';

function SectionLabel({ children, compact = false }) {
  return <div style={{ ...practiceS.sectionLabel, ...(compact ? { marginBottom: 0 } : null) }}>{children}</div>;
}

function PracticeConfigModal({ config, onChange, onClose, onStart }) {
  const { exam, mode, scopeId, difficulty, count, timerOn = true, timerSecs = 30 } = config;
  const chapters = exam.chapters || [];
  const setField = (key, value) => onChange({ ...config, [key]: value });
  const scopeOptions = [
    { id: 'all', label: 'Whole exam', count: Math.max(12, chapters.reduce((sum, chapter) => sum + (chapter.questions?.length || chapter.cards?.length || 0), 0) || 12) },
    ...chapters.map((chapter) => ({
      id: chapter.id,
      label: chapter.title || chapter.name || 'Chapter',
      count: Math.max(1, chapter.questions?.length || chapter.cards?.length || 6),
    })),
  ];
  const modes = [
    { id: 'quiz', title: 'Quiz', sub: 'Questions + Timer', Icon: Sparkles },
    { id: 'flashcards', title: 'Flashcards', sub: 'Review practice', Icon: Layers },
  ];
  const difficulties = [
    { id: 'easy', title: 'Easy', sub: 'Warm-up' },
    { id: 'medium', title: 'Medium', sub: 'Balanced' },
    { id: 'hard', title: 'Hard', sub: 'Exam mode' },
    { id: 'extreme', title: 'Extreme', sub: 'Deep reasoning' },
  ];
  const counts = [10, 20, 30, 50];
  const timerOptions = [15, 30, 60, 90];

  return (
    <div style={practiceS.overlay} role="dialog" aria-modal="true" aria-label="Configure practice">
      <div style={practiceS.modal}>
        <button type="button" onClick={onClose} style={practiceS.close} aria-label="Close"><XMark size={24} /></button>
        <div style={practiceS.kicker}>CONFIGURE PRACTICE</div>
        <h2 style={practiceS.title}>{exam.name}</h2>
        <p style={practiceS.subtitle}>Prediction based on quiz, flashcards, and target grade</p>

        <div style={practiceS.modeGrid}>
          {modes.map(({ id, title, sub, Icon: ModeIcon }) => {
            const active = mode === id;
            return (
              <button key={id} type="button" onClick={() => setField('mode', id)} style={{ ...practiceS.modeCard, ...(active ? practiceS.modeCardActive : null) }}>
                <span style={{ ...practiceS.modeIcon, color: 'var(--indigo)', background: '#EEF2FF' }}><ModeIcon size={26} /></span>
                <span style={practiceS.modeTitle}>{title}</span>
                <span style={practiceS.modeSub}>{sub}</span>
              </button>
            );
          })}
        </div>

        <div style={practiceS.divider} />
        <SectionLabel>Scope</SectionLabel>
        <div style={practiceS.scopeRow}>
          {scopeOptions.map((option) => {
            const active = String(scopeId) === String(option.id);
            return (
              <button key={option.id} type="button" onClick={() => setField('scopeId', option.id)} style={{ ...practiceS.scopePill, ...(active ? practiceS.scopePillActive : null) }}>
                <span>{option.label}</span>
                <span style={{ ...practiceS.countBadge, ...(active ? practiceS.countBadgeActive : null) }}>{option.count}</span>
              </button>
            );
          })}
        </div>

        <div style={practiceS.divider} />
        <SectionLabel>Difficulty</SectionLabel>
        <div style={practiceS.difficultyGrid}>
          {difficulties.map((option) => {
            const active = difficulty === option.id;
            return (
              <button key={option.id} type="button" onClick={() => setField('difficulty', option.id)} style={{ ...practiceS.difficultyCard, ...(active ? practiceS.difficultyCardActive : null) }}>
                <span style={practiceS.diffTitle}>{option.title}</span>
                <span style={practiceS.diffSub}>{option.sub}</span>
              </button>
            );
          })}
        </div>

        <div style={practiceS.divider} />
        <SectionLabel>{mode === 'flashcards' ? 'Cards' : 'Questions'}</SectionLabel>
        <div style={practiceS.countGrid}>
          {counts.map((value) => {
            const active = count === value;
            return (
              <button key={value} type="button" onClick={() => setField('count', value)} style={{ ...practiceS.countButton, ...(active ? practiceS.countButtonActive : null) }}>
                {value}
              </button>
            );
          })}
        </div>

        {mode === 'quiz' && (
          <>
            <div style={practiceS.divider} />
            <div style={practiceS.timerHead}>
              <div>
                <SectionLabel compact>Timer</SectionLabel>
                <div style={practiceS.timerSub}>Seconds per question</div>
              </div>
              <button type="button" onClick={() => setField('timerOn', !timerOn)} style={{ ...practiceS.timerSwitch, ...(timerOn ? practiceS.timerSwitchOn : null) }} aria-pressed={timerOn}>
                <span style={{ ...practiceS.timerKnob, transform: timerOn ? 'translateX(34px)' : 'translateX(0)' }} />
              </button>
            </div>
            {timerOn && (
              <div style={practiceS.timerGrid}>
                {timerOptions.map((value) => {
                  const active = Number(timerSecs) === value;
                  return (
                    <button key={value} type="button" onClick={() => setField('timerSecs', value)} style={{ ...practiceS.countButton, ...(active ? practiceS.countButtonActive : null) }}>
                      {value}s
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        <div style={practiceS.actions}>
          <button type="button" onClick={onClose} style={practiceS.cancelBtn}>Cancel</button>
          <button type="button" onClick={() => onStart(config)} style={practiceS.startBtn}>Start practice</button>
        </div>
      </div>
    </div>
  );
}

const practiceS = {
  overlay: { position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(15,16,53,.42)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', padding: 18 },
  modal: { position: 'relative', width: 'min(660px, 96vw)', maxHeight: '90vh', overflowY: 'auto', background: '#fff', border: '1px solid #DDE1EA', borderRadius: 24, boxShadow: '0 28px 80px rgba(15,16,53,.28)', padding: '26px 26px 24px', boxSizing: 'border-box' },
  close: { position: 'absolute', top: 18, right: 18, width: 38, height: 38, borderRadius: 999, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', display: 'grid', placeItems: 'center', cursor: 'pointer' },
  kicker: { color: 'var(--indigo)', fontSize: 12, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 14 },
  title: { margin: 0, color: 'var(--ink)', fontSize: 25, lineHeight: 1, fontWeight: 900, letterSpacing: '-0.04em' },
  subtitle: { margin: '16px 0 20px', color: '#6B7280', fontSize: 15, lineHeight: 1.35, fontWeight: 600 },
  modeGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 },
  modeCard: { minHeight: 122, border: '1.5px solid #E5E7EB', borderRadius: 18, background: '#fff', padding: 18, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 9 },
  modeCardActive: { border: '2px solid var(--indigo)', background: '#EEF2FF' },
  modeIcon: { width: 44, height: 44, borderRadius: 14, display: 'grid', placeItems: 'center' },
  modeTitle: { color: 'var(--ink)', fontSize: 19, fontWeight: 900, lineHeight: 1 },
  modeSub: { color: '#6B7280', fontSize: 13, fontWeight: 800 },
  divider: { height: 1, background: '#E5E7EB', margin: '18px 0 15px' },
  sectionLabel: { color: '#6B7280', fontSize: 12, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 },
  scopeRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  scopePill: { minHeight: 40, borderRadius: 999, border: '1.5px solid #E5E7EB', background: '#fff', padding: '0 13px', color: '#6B7280', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 900, cursor: 'pointer' },
  scopePillActive: { border: '2px solid var(--indigo)', background: '#EEF2FF', color: 'var(--indigo)' },
  countBadge: { minWidth: 24, height: 24, borderRadius: 999, background: '#F1F5F9', color: '#6B7280', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900, padding: '0 7px' },
  countBadgeActive: { background: 'var(--indigo)', color: '#fff' },
  difficultyGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 9 },
  difficultyCard: { minHeight: 68, borderRadius: 16, border: '1.5px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', gap: 5, padding: 12 },
  difficultyCardActive: { border: '2px solid var(--indigo)', background: '#EEF2FF', color: 'var(--indigo)' },
  diffTitle: { color: 'inherit', fontSize: 17, fontWeight: 900, lineHeight: 1 },
  diffSub: { color: 'inherit', fontSize: 12, fontWeight: 900, opacity: .86 },
  countGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 9 },
  timerGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 9 },
  timerHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  timerSub: { marginTop: 8, color: '#6B7280', fontSize: 14, fontWeight: 900 },
  timerSwitch: { position: 'relative', width: 64, height: 34, borderRadius: 999, border: '1px solid #D1D5DB', background: '#E5E7EB', padding: 2, cursor: 'pointer', transition: 'background .15s, border-color .15s', flexShrink: 0 },
  timerSwitchOn: { background: 'var(--indigo)', borderColor: 'var(--indigo)' },
  timerKnob: { position: 'absolute', left: 3, top: 3, width: 26, height: 26, borderRadius: 999, background: '#fff', boxShadow: '0 1px 4px rgba(15,23,42,.2)', transition: 'transform .15s ease' },
  countButton: { height: 46, borderRadius: 14, border: '1.5px solid #E5E7EB', background: '#fff', color: '#A1A6B5', fontSize: 17, fontWeight: 900, cursor: 'pointer' },
  countButtonActive: { border: '2px solid var(--indigo)', background: '#EEF2FF', color: 'var(--indigo)', boxShadow: 'none' },
  actions: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 18 },
  cancelBtn: { height: 50, borderRadius: 16, border: '1px solid #E5E7EB', background: '#F8FAFC', color: '#6B7280', fontSize: 15, fontWeight: 900, cursor: 'pointer' },
  startBtn: { height: 50, borderRadius: 16, border: 'none', background: 'var(--indigo)', color: '#fff', fontSize: 15, fontWeight: 900, cursor: 'pointer' },
};

export default PracticeConfigModal;
