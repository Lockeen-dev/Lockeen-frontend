import { getSubjectPalette, inferSubjectFromName } from '../data/mockData';

export const LIFE_CATS = [
  { id: 'study', label: 'Study', color: '#3730E8', bg: '#EEF2FF', text: '#3730E8' },
  { id: 'fitness', label: 'Fitness', color: '#10B981', bg: '#DCFCE7', text: '#065F46' },
  { id: 'social', label: 'Social', color: '#F59E0B', bg: '#FEF3C7', text: '#92400E' },
  { id: 'rest', label: 'Rest', color: '#8B5CF6', bg: '#F5F3FF', text: '#5B21B6' },
  { id: 'other', label: 'Other', color: '#6B7280', bg: '#F3F4F6', text: '#374151' },
];

export const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
export const durToMins = (s) => { let m = 0; const h = s.match(/(\d+)h/); const mn = s.match(/(\d+)m/); if (h) m += parseInt(h[1]) * 60; if (mn) m += parseInt(mn[1]); return m || 0; };

function minutesToDuration(minutes) {
  const value = Math.max(1, Number(minutes) || 30);
  if (value >= 60 && value % 60 === 0) return `${value / 60}h`;
  if (value > 60) return `${Math.floor(value / 60)}h${value % 60}m`;
  return `${value}m`;
}

export const SUBJECT_NOTE_MAP = {
  Biology: { noteId: 1, bg: '#EEF2FF', color: '#3730E8', text: '#3730E8' },
  Chemistry: { noteId: 2, bg: '#FDF2F8', color: '#8B5CF6', text: '#8B5CF6' },
  History: { noteId: 3, bg: '#FEF3C7', color: '#F59E0B', text: '#92400E' },
  Math: { noteId: 4, bg: '#ECFEFF', color: '#06B6D4', text: '#0E7490' },
  Economics: { noteId: 5, bg: '#DCFCE7', color: '#10B981', text: '#065F46' },
  Finance: { noteId: 5, bg: '#DCFCE7', color: '#10B981', text: '#065F46' },
  Literature: { noteId: 6, bg: '#FEE2E2', color: '#EF4444', text: '#991B1B' },
};

const NEUTRAL_EXAM_COLORS = new Set(['#374151', '#6B7280', '#9CA3AF', '#94A3B8', '#F3F4F6', '#E5E7EB']);

function isNeutralExamColor(color) {
  return color ? NEUTRAL_EXAM_COLORS.has(String(color).trim().toUpperCase()) : true;
}

const calSeedNotes = [
  { id: 1, title: 'Cellular Respiration' }, { id: 2, title: 'Organic Chemistry Reactions' },
  { id: 3, title: 'World War II Timeline' }, { id: 4, title: 'Calculus — Derivatives' },
  { id: 5, title: 'Macroeconomics Notes' }, { id: 6, title: 'Shakespeare — Hamlet' },
];

const calAddDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

export const initCalEvents = () => {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const ev = {};
  const set = (d, arr) => { ev[dayKey(d)] = arr; };
  set(t, [
    { name: 'Biology — Cellular Respiration', time: '09:00', dur: '1h30m', cat: 'study', noteId: 1, noteColor: '#3730E8', noteBg: '#EEF2FF', noteText: '#3730E8', noteSubject: 'Biology' },
    { name: 'Gym', time: '17:00', dur: '1h', cat: 'fitness', noteId: null, noteColor: null, noteBg: null, noteText: null, noteSubject: null },
  ]);
  set(calAddDays(t, 1), [
    { name: 'Chemistry — Organic Chemistry', time: '10:00', dur: '1h', cat: 'study', noteId: 2, noteColor: '#8B5CF6', noteBg: '#FDF2F8', noteText: '#8B5CF6', noteSubject: 'Chemistry' },
    { name: 'Coffee with Sara', time: '15:00', dur: '1h30m', cat: 'social', noteId: null, noteColor: null, noteBg: null, noteText: null, noteSubject: null },
  ]);
  set(calAddDays(t, 2), [
    { name: 'Math — Calculus Derivatives', time: '08:00', dur: '45m', cat: 'study', noteId: 4, noteColor: '#06B6D4', noteBg: '#ECFEFF', noteText: '#0E7490', noteSubject: 'Math' },
    { name: 'Rest & recover', time: '20:00', dur: '30m', cat: 'rest', noteId: null, noteColor: null, noteBg: null, noteText: null, noteSubject: null },
  ]);
  set(calAddDays(t, 3), [
    { name: 'History — WWII Timeline', time: '11:00', dur: '2h', cat: 'study', noteId: 3, noteColor: '#F59E0B', noteBg: '#FEF3C7', noteText: '#92400E', noteSubject: 'History' },
  ]);
  set(calAddDays(t, -1), [
    { name: 'Physics revision', time: '14:00', dur: '1h', cat: 'study', noteId: null, noteColor: null, noteBg: null, noteText: null, noteSubject: null },
    { name: 'Morning run', time: '07:00', dur: '40m', cat: 'fitness', noteId: null, noteColor: null, noteBg: null, noteText: null, noteSubject: null },
  ]);
  return ev;
};

export function resolveStudyPalette(input = {}) {
  const subject = input.noteSubject || input.subject || input.title || input.name || 'Study';
  const inferred = inferSubjectFromName(subject);
  const note = calSeedNotes.find((item) => String(item.id) === String(input.noteId));
  const subjectInfo = SUBJECT_NOTE_MAP[input.noteSubject] || SUBJECT_NOTE_MAP[inferred];
  const palette = getSubjectPalette(input.examId || input.noteId || note?.id || subject);
  const inputColor = input.noteColor || input.color;
  const useInferredPalette = inferred !== 'General';
  const color = useInferredPalette || isNeutralExamColor(inputColor) ? (subjectInfo?.color || palette.dot || '#3730E8') : inputColor;
  return {
    subject,
    color,
    bg: useInferredPalette || isNeutralExamColor(input.noteBg) ? (subjectInfo?.bg || palette.bg || '#EEF2FF') : input.noteBg,
    text: useInferredPalette || isNeutralExamColor(input.noteText) ? (subjectInfo?.text || palette.text || color) : input.noteText,
  };
}

export function resolveEventPalette(ev = {}) {
  const cat = LIFE_CATS.find((c) => c.id === ev.cat);
  if (ev.cat === 'study' || ev.noteSubject || ev.noteId || String(ev.name || '').toLowerCase().includes('exam')) {
    return resolveStudyPalette(ev);
  }
  return {
    subject: ev.noteSubject || cat?.label || 'Task',
    color: ev.noteColor || cat?.color || '#3730E8',
    bg: ev.noteBg || cat?.bg || '#EEF2FF',
    text: ev.noteText || cat?.text || ev.noteColor || cat?.color || '#3730E8',
  };
}

export function studyPlanItemToCalendarEvent(item = {}, exam = null) {
  const title = exam?.name || 'Study';
  const chapter = exam?.chapters?.find((entry) => String(entry.id) === String(item.chapterId));
  const scope = chapter?.title || title;
  const typeLabel = {
    review: 'Review',
    quiz: 'Quiz',
    flashcards: 'Flashcards',
    mock_exam: 'Mock exam',
    buffer: 'Buffer',
  }[item.type] || 'Study';

  return {
    name: `${typeLabel} — ${scope}`,
    time: item.plannedTime || '09:00',
    dur: minutesToDuration(item.durationMin),
    cat: 'study',
    source: 'study-plan-service',
    serviceId: item.id,
    planId: item.planId,
    examId: item.examId,
    chapterId: item.chapterId,
    materialId: item.materialId,
    noteId: null,
    noteSubject: exam?.subject || title,
    notes: item.reason || '',
    materialPending: item.materialPending,
  };
}

export const initialWeekData = [
  { day: 'Mon', mins: 45 },
  { day: 'Tue', mins: 80 },
  { day: 'Wed', mins: 60 },
  { day: 'Thu', mins: 110 },
  { day: 'Fri', mins: 90 },
  { day: 'Sat', mins: 140 },
  { day: 'Sun', mins: 75 },
];
