import { getSubjectPalette } from '../data/mockData';

export const SUBJECT_EMOJI = {
  Biology: '🧬', Chemistry: '⚗️', Math: '📐', History: '📜',
  Literature: '📖', Physics: '⚛️', Economics: '📊', default: '📚'
};

export const EXAM_COLOR_PALETTE = [
  { name: 'Indigo', bg: '#EEF2FF', dot: '#4F46E5', text: '#3730A3', border: '#C7D2FE' },
  { name: 'Violet', bg: '#F5F3FF', dot: '#7C3AED', text: '#5B21B6', border: '#DDD6FE' },
  { name: 'Rose', bg: '#FFF1F2', dot: '#E11D48', text: '#9F1239', border: '#FFE4E6' },
  { name: 'Amber', bg: '#FFFBEB', dot: '#D97706', text: '#92400E', border: '#FDE68A' },
  { name: 'Emerald', bg: '#ECFDF5', dot: '#059669', text: '#065F46', border: '#A7F3D0' },
  { name: 'Cyan', bg: '#ECFEFF', dot: '#0891B2', text: '#155E75', border: '#A5F3FC' },
  { name: 'Blue', bg: '#EFF6FF', dot: '#2563EB', text: '#1D4ED8', border: '#BFDBFE' },
  { name: 'Fuchsia', bg: '#FDF4FF', dot: '#C026D3', text: '#86198F', border: '#F5D0FE' },
  { name: 'Lime', bg: '#F7FEE7', dot: '#65A30D', text: '#3F6212', border: '#D9F99D' },
  { name: 'Orange', bg: '#FFF7ED', dot: '#EA580C', text: '#9A3412', border: '#FED7AA' },
  { name: 'Teal', bg: '#F0FDFA', dot: '#0D9488', text: '#115E59', border: '#99F6E4' },
  { name: 'Sky', bg: '#F0F9FF', dot: '#0284C7', text: '#075985', border: '#BAE6FD' },
  { name: 'Pink', bg: '#FDF2F8', dot: '#DB2777', text: '#9D174D', border: '#FBCFE8' },
  { name: 'Slate', bg: '#F8FAFC', dot: '#475569', text: '#334155', border: '#CBD5E1' },
  { name: 'Red', bg: '#FEF2F2', dot: '#DC2626', text: '#991B1B', border: '#FECACA' },
  { name: 'Yellow', bg: '#FEFCE8', dot: '#CA8A04', text: '#854D0E', border: '#FEF08A' },
  { name: 'Green', bg: '#F0FDF4', dot: '#16A34A', text: '#166534', border: '#BBF7D0' },
  { name: 'Purple', bg: '#FAF5FF', dot: '#9333EA', text: '#6B21A8', border: '#E9D5FF' },
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
      bg: exam.color || `${dot}16`,
      dot,
      text: exam.text || dot,
      border: exam.border || `${dot}40`,
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
