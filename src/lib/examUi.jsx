import { getSubjectPalette } from '../data/mockData';

export const SUBJECT_EMOJI = {
  Biology: '🧬', Chemistry: '⚗️', Math: '📐', History: '📜',
  Literature: '📖', Physics: '⚛️', Economics: '📊', default: '📚'
};

export const EXAM_COLOR_PALETTE = [
  { name: 'Soft Blue', bg: '#BFDBFE', dot: '#60A5FA', text: '#1D4ED8', border: '#93C5FD' },
  { name: 'Sky', bg: '#BAE6FD', dot: '#38BDF8', text: '#0369A1', border: '#7DD3FC' },
  { name: 'Aqua', bg: '#99F6E4', dot: '#2DD4BF', text: '#0F766E', border: '#5EEAD4' },
  { name: 'Mint', bg: '#A7F3D0', dot: '#34D399', text: '#047857', border: '#6EE7B7' },
  { name: 'Fresh Lime', bg: '#D9F99D', dot: '#A3E635', text: '#4D7C0F', border: '#BEF264' },
  { name: 'Bright Yellow', bg: '#FDE68A', dot: '#FDE047', text: '#92400E', border: '#FACC15' },
  { name: 'Peach', bg: '#FED7AA', dot: '#FDBA74', text: '#9A3412', border: '#FB923C' },
  { name: 'Coral Rose', bg: '#FECDD3', dot: '#FB7185', text: '#BE123C', border: '#FDA4AF' },
  { name: 'Pink', bg: '#FBCFE8', dot: '#F472B6', text: '#BE185D', border: '#F9A8D4' },
  { name: 'Orchid', bg: '#F5D0FE', dot: '#E879F9', text: '#A21CAF', border: '#F0ABFC' },
  { name: 'Lavender', bg: '#E9D5FF', dot: '#C084FC', text: '#7E22CE', border: '#D8B4FE' },
  { name: 'Violet', bg: '#DDD6FE', dot: '#A78BFA', text: '#6D28D9', border: '#C4B5FD' },
  { name: 'Periwinkle', bg: '#C7D2FE', dot: '#818CF8', text: '#4338CA', border: '#A5B4FC' },
  { name: 'Cyan', bg: '#A5F3FC', dot: '#22D3EE', text: '#0E7490', border: '#67E8F9' },
  { name: 'Green', bg: '#BBF7D0', dot: '#4ADE80', text: '#15803D', border: '#86EFAC' },
  { name: 'Soft Red', bg: '#FECACA', dot: '#F87171', text: '#B91C1C', border: '#FCA5A5' },
];

export function getExamEmoji(exam) {
  if (exam.emoji) return exam.emoji;
  return SUBJECT_EMOJI[exam.subject] || SUBJECT_EMOJI.default;
}

export function getExamPalette(exam = {}, darkMode = false) {
  const direct = EXAM_COLOR_PALETTE.find((item) => item.bg === exam.color || item.dot === exam.dot);
  if (direct) return direct;
  if (exam.dot || exam.color) {
    const dot = exam.dot || '#4F46E5';
    return {
      bg: exam.color || `${dot}24`,
      dot,
      text: exam.text || dot,
      border: exam.border || `${dot}55`,
    };
  }
  return getSubjectPalette(exam.subject, exam, darkMode);
}

export function getNextExamPalette(index = 0) {
  return EXAM_COLOR_PALETTE[index % EXAM_COLOR_PALETTE.length];
}

export function SubjectIcon({ subject, size = 44, radius = 12, dot }) {
  const emoji = SUBJECT_EMOJI[subject] || SUBJECT_EMOJI.default;
  return (
    <div style={{ width:size, height:size, borderRadius:radius, background: dot + '18', border:`1.5px solid ${dot}30`, display:'grid', placeItems:'center', flexShrink:0 }}>
      <span style={{ fontSize: size * 0.42, lineHeight:1 }}>{emoji}</span>
    </div>
  );
}
