import React from 'react';

import { ArrowRight, Layers, Sparkles, XMark } from '../lib/icons';
import { tt } from '../lib/i18n';

function PracticeConfigModal({ config, onClose, onStart, lang = 'en' }) {
  const { exam } = config;
  const chapters = exam.chapters || [];
  const isIt = lang === 'it';
  const startMode = (mode) => onStart({
    ...config,
    mode,
    scopeId: 'all',
    difficulty: 'medium',
    difficulties: ['easy', 'medium', 'hard'],
    count: mode === 'quiz' ? 10 : 20,
    timerOn: true,
    timerSecs: 30,
  });
  const modes = [
    {
      id: 'flashcards',
      title: tt(lang, 'flashcards'),
      sub: isIt ? 'Ripassa le carte generate dai materiali.' : 'Review cards generated from your materials.',
      Icon: Layers,
    },
    {
      id: 'quiz',
      title: tt(lang, 'quiz'),
      sub: isIt ? 'Domande pronte sull’esame selezionato.' : 'Questions ready for the selected exam.',
      Icon: Sparkles,
    },
  ];

  return (
    <div style={practiceS.overlay} role="dialog" aria-modal="true" aria-label={tt(lang, 'configurePractice')}>
      <div style={practiceS.modal}>
        <button type="button" onClick={onClose} style={practiceS.close} aria-label={tt(lang, 'close')}><XMark size={24} /></button>
        <div style={practiceS.kicker}>{isIt ? 'Scegli pratica' : 'Choose practice'}</div>
        <h2 style={practiceS.title}>{exam.name}</h2>
        <p style={practiceS.subtitle}>
          {isIt
            ? `Vai direttamente a quiz o flashcard per questo esame. ${chapters.length ? `${chapters.length} ${chapters.length === 1 ? 'capitolo disponibile' : 'capitoli disponibili'}.` : ''}`
            : `Jump straight into quiz or flashcards for this exam. ${chapters.length ? `${chapters.length} ${chapters.length === 1 ? 'chapter' : 'chapters'} available.` : ''}`}
        </p>

        <div style={practiceS.modeGrid}>
          {modes.map(({ id, title, sub, Icon: ModeIcon }) => {
            return (
              <button
                key={id}
                type="button"
                onClick={() => startMode(id)}
                style={practiceS.modeCard}
              >
                <span style={{ ...practiceS.modeIcon, color: 'var(--indigo)', background: '#EEF2FF' }}><ModeIcon size={28} /></span>
                <span style={practiceS.modeCopy}>
                  <span style={practiceS.modeTitle}>{title}</span>
                  <span style={practiceS.modeSub}>{sub}</span>
                </span>
                <span style={practiceS.modeArrow}><ArrowRight size={20} /></span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const practiceS = {
  overlay: { position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(23,18,56,.34)', backdropFilter: 'blur(10px)', WebkitBackdropFilter:'blur(10px)', display: 'grid', placeItems: 'center', padding: 18 },
  modal: { position: 'relative', width: 'min(660px, 96vw)', maxHeight: '90vh', overflowY: 'auto', background: 'var(--clay-surface)', border: '1px solid rgba(255,255,255,.74)', borderRadius: 30, boxShadow: 'var(--clay-shadow)', padding: '26px 26px 24px', boxSizing: 'border-box' },
  close: { position: 'absolute', top: 18, right: 18, width: 38, height: 38, borderRadius: 999, border: '1px solid rgba(255,255,255,.74)', background: 'linear-gradient(145deg,#FFFFFF,#F2ECFF)', color: '#6B7280', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow:'var(--clay-shadow-sm)' },
  kicker: { color: 'var(--indigo)', fontSize: 12, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 14 },
  title: { margin: 0, color: 'var(--ink)', fontSize: 25, lineHeight: 1, fontWeight: 900, letterSpacing: '-0.04em' },
  subtitle: { margin: '16px 0 20px', color: '#6B7280', fontSize: 15, lineHeight: 1.35, fontWeight: 600 },
  modeGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 },
  modeCard: { position: 'relative', minHeight: 162, border: '1px solid rgba(255,255,255,.74)', borderRadius: 24, background: 'linear-gradient(145deg,#FFFFFF,#F4EEFF)', padding: 18, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, boxShadow: 'var(--clay-shadow-sm)' },
  modeIcon: { width: 50, height: 50, borderRadius: 16, display: 'grid', placeItems: 'center' },
  modeCopy: { display: 'grid', gap: 7, minWidth: 0 },
  modeTitle: { color: 'var(--ink)', fontSize: 19, fontWeight: 900, lineHeight: 1 },
  modeSub: { color: '#6B7280', fontSize: 13, fontWeight: 800, lineHeight: 1.35 },
  modeArrow: { position: 'absolute', right: 14, top: 14, width: 34, height: 34, borderRadius: 14, background: 'linear-gradient(145deg,var(--indigo),var(--purple))', color: '#fff', display: 'grid', placeItems: 'center', boxShadow:'10px 12px 22px -14px rgba(76,59,255,.72)' },
};

export default PracticeConfigModal;
