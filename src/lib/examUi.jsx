import { getSubjectPalette } from '../data/mockData';

export const SUBJECT_EMOJI = {
  Biology: '🧬', Chemistry: '⚗️', Math: '📐', History: '📜',
  Literature: '📖', Physics: '⚛️', Economics: '📊', default: '📚'
};

export const EXAM_COLOR_PALETTE = [
  { name: 'Sapphire', bg: '#EEF4FF', dot: '#3157E8', text: '#203B9A', border: '#BFD0FF' },
  { name: 'Amethyst', bg: '#F3EEFF', dot: '#7A3FF2', text: '#5426B8', border: '#D7C8FF' },
  { name: 'Aqua', bg: '#E8FAFF', dot: '#0E92B5', text: '#075E78', border: '#B7EAF4' },
  { name: 'Jade', bg: '#EAFBF4', dot: '#07845F', text: '#075F46', border: '#B7E8D5' },
  { name: 'Forest', bg: '#EFF8E8', dot: '#4D8F10', text: '#315F0D', border: '#CEE8B7' },
  { name: 'Gold', bg: '#FFF7DF', dot: '#B97800', text: '#765000', border: '#F2D99A' },
  { name: 'Coral', bg: '#FFF0EA', dot: '#E15A2A', text: '#9A3519', border: '#F6C4B1' },
  { name: 'Ruby', bg: '#FFF0F3', dot: '#CF244F', text: '#8F1837', border: '#F3BCCB' },
  { name: 'Plum', bg: '#F9EDFF', dot: '#B62DCC', text: '#7B1C8D', border: '#E9BDF2' },
  { name: 'Graphite', bg: '#F4F6FA', dot: '#475569', text: '#263241', border: '#CBD3DF' },
  { name: 'Copper', bg: '#FFF4E8', dot: '#C86418', text: '#82400F', border: '#EEC6A2' },
  { name: 'Mint', bg: '#EAFBF8', dot: '#0A8F86', text: '#075F59', border: '#B8E8E1' },
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
