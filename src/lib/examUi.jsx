export const SUBJECT_EMOJI = {
  Biology: '🧬', Chemistry: '⚗️', Math: '📐', History: '📜',
  Literature: '📖', Physics: '⚛️', Economics: '📊', default: '📚'
};

export function getExamEmoji(exam) {
  if (exam.emoji) return exam.emoji;
  return SUBJECT_EMOJI[exam.subject] || SUBJECT_EMOJI.default;
}

export function SubjectIcon({ subject, size = 44, radius = 12, dot }) {
  const emoji = SUBJECT_EMOJI[subject] || SUBJECT_EMOJI.default;
  return (
    <div style={{ width:size, height:size, borderRadius:radius, background: dot + '18', border:`1.5px solid ${dot}30`, display:'grid', placeItems:'center', flexShrink:0 }}>
      <span style={{ fontSize: size * 0.42, lineHeight:1 }}>{emoji}</span>
    </div>
  );
}
