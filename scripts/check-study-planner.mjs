import { generateStudyPlan, markMissedStudyPlanItems } from '../src/services/studyPlanner.js';

const result = generateStudyPlan({
  exams: [
    {
      id: 'exam-1',
      name: 'Corporate Finance',
      status: 'active',
      date: '2026-06-20',
      chapters: [
        { id: 'chapter-1', title: 'Valuation', pages: 18 },
        { id: 'chapter-2', title: 'Risk', pages: 8 },
      ],
    },
  ],
  materials: [
    { id: 'material-1', chapterId: 'chapter-1', processingStatus: 'ready', extractedText: 'DCF notes' },
    { id: 'material-2', chapterId: 'chapter-2', processingStatus: 'processing' },
  ],
  quizRuns: [
    { examId: 'exam-1', chapterId: 'chapter-1', score: 52 },
  ],
  options: {
    title: 'Finance plan',
    mode: 'until_exam',
    startDate: '2026-06-12',
    examIds: ['exam-1'],
    availability: {
      5: { minutes: 90, startTime: '18:00', endTime: '21:00' },
      6: { minutes: 120, startTime: '10:00', endTime: '12:00' },
      0: false,
      1: { minutes: 75, startTime: '18:00', endTime: '21:00' },
      2: { minutes: 75, startTime: '18:00', endTime: '21:00' },
      3: { minutes: 75, startTime: '18:00', endTime: '21:00' },
      4: { minutes: 75, startTime: '18:00', endTime: '21:00' },
    },
    sessionMinutes: 50,
    breakMinutes: 10,
    studyMethods: [{ value: 'pomodoro_50', label: 'Pomodoro', sub: '50 / 10', sessionMinutes: 50, breakMinutes: 10 }],
    bufferRatio: 1,
    maxItemsPerDay: 2,
  },
});

const errors = [];

if (result.plan.title !== 'Finance plan') errors.push('plan title mismatch');
if (result.plan.startDate !== '2026-06-12') errors.push('startDate mismatch');
if (result.plan.endDate !== '2026-06-19') errors.push('endDate should stop day before selected exam date');
if (!result.items.length) errors.push('planner generated no items');
if (result.items.some((item) => !item.plannedDate || !item.durationMin || item.status !== 'planned')) errors.push('invalid item shape');
if (!result.items.some((item) => item.materialPending)) errors.push('expected materialPending item for processing material');
if (result.items.some((item) => item.plannedDate < '2026-06-12' || item.plannedDate > '2026-06-19')) errors.push('item outside range');
if (result.items.some((item) => item.plannedDate === '2026-06-20')) errors.push('item should not be planned on exam day');
if (result.items.some((item) => item.plannedDate === '2026-06-19' && item.type === 'mock_exam')) errors.push('day-before exam should not include mock exam');
if (!result.items.some((item) => item.phase === 'day_before' || item.phase === 'final_review')) errors.push('expected final review phase near exam');

const dateTimeKeys = result.items.map((item) => `${item.plannedDate} ${item.plannedTime}`);
if (new Set(dateTimeKeys).size !== dateTimeKeys.length) errors.push('items should not share same date/time slot');
if (result.items.some((item) => {
  const time = item.plannedTime;
  return !((time >= '10:00' && time < '12:00') || (time >= '18:00' && time < '21:00'));
})) errors.push('item outside configured study windows');

const missed = markMissedStudyPlanItems([
  { id: 'old', status: 'planned', plannedDate: '2026-06-11' },
  { id: 'today', status: 'planned', plannedDate: '2026-06-12' },
], '2026-06-12');

if (missed[0].status !== 'missed') errors.push('old planned item should be missed');
if (missed[1].status !== 'planned') errors.push('today planned item should stay planned');

const expiredOnly = generateStudyPlan({
  exams: [{ id: 'expired', name: 'Old exam', status: 'active', date: '2026-06-10', chapters: [{ id: 'old-chapter', title: 'Old' }] }],
  options: {
    mode: 'until_exam',
    startDate: '2026-06-12',
    examIds: ['expired'],
    availability: { 5: { minutes: 120, startTime: '10:00', endTime: '12:00' } },
    sessionMinutes: 50,
    studyMethods: [{ value: 'pomodoro_50', label: 'Pomodoro', sub: '50 / 10', sessionMinutes: 50, breakMinutes: 10 }],
  },
});

if (expiredOnly.items.length) errors.push('expired exam should not generate study sessions');
if (!expiredOnly.warnings.some((warning) => warning.includes('already past'))) errors.push('expired exam should show clear warning');

const blockedResult = generateStudyPlan({
  exams: [{ id: 'exam-block', name: 'Blocked exam', status: 'active', date: '2026-06-20', chapters: [{ id: 'block-chapter', title: 'Blocked' }] }],
  existingItems: [{ id: 'busy', plannedDate: '2026-06-12', plannedTime: '18:00', durationMin: 60, status: 'planned' }],
  options: {
    mode: 'daily',
    startDate: '2026-06-12',
    examIds: ['exam-block'],
    availability: { 5: { minutes: 120, startTime: '18:00', endTime: '21:00' } },
    sessionMinutes: 50,
    studyMethods: [{ value: 'pomodoro_50', label: 'Pomodoro', sub: '50 / 10', sessionMinutes: 50, breakMinutes: 10 }],
    bufferRatio: 1,
    maxItemsPerDay: 2,
  },
});

if (blockedResult.items.some((item) => item.plannedDate === '2026-06-12' && item.plannedTime < '19:00')) {
  errors.push('planner should avoid existing calendar blocks');
}

const examDayBuffer = generateStudyPlan({
  exams: [{ id: 'exam-buffer', name: 'Buffer exam', status: 'active', date: '2026-06-20', chapters: [{ id: 'buffer-chapter', title: 'Buffer' }] }],
  existingItems: [{ id: 'exam-event', plannedDate: '2026-06-12', plannedTime: '09:00', durationMin: 240, status: 'planned' }],
  options: {
    mode: 'daily',
    startDate: '2026-06-12',
    examIds: ['exam-buffer'],
    availability: { 5: { minutes: 240, startTime: '09:00', endTime: '17:00' } },
    sessionMinutes: 50,
    studyMethods: [{ value: 'pomodoro_50', label: 'Pomodoro', sub: '50 / 10', sessionMinutes: 50, breakMinutes: 10 }],
    bufferRatio: 1,
    maxItemsPerDay: 4,
  },
});

if (examDayBuffer.items.some((item) => item.plannedDate === '2026-06-12' && item.plannedTime < '13:00')) {
  errors.push('planner should keep recovery buffer after exam blocks');
}

const preExamProtection = generateStudyPlan({
  exams: [
    { id: 'exam-morning', name: 'Morning exam', status: 'active', date: '2026-06-12', time: '09:00', durationMin: 120, chapters: [{ id: 'morning-chapter', title: 'Morning' }] },
    { id: 'exam-later', name: 'Later exam', status: 'active', date: '2026-06-20', chapters: [{ id: 'later-chapter', title: 'Later' }] },
  ],
  options: {
    mode: 'daily',
    startDate: '2026-06-12',
    examIds: ['exam-morning', 'exam-later'],
    availability: { 5: { minutes: 300, startTime: '07:00', endTime: '17:00' } },
    sessionMinutes: 50,
    studyMethods: [{ value: 'pomodoro_50', label: 'Pomodoro', sub: '50 / 10', sessionMinutes: 50, breakMinutes: 10 }],
    bufferRatio: 1,
    maxItemsPerDay: 4,
  },
});

if (preExamProtection.items.some((item) => item.plannedDate === '2026-06-12' && item.plannedTime < '13:00')) {
  errors.push('planner should not schedule any study before a same-day exam and recovery window');
}

const nightPlan = generateStudyPlan({
  exams: [{ id: 'exam-night', name: 'Night exam', status: 'active', date: '2026-06-20', chapters: [{ id: 'night-chapter', title: 'Night' }] }],
  options: {
    mode: 'daily',
    startDate: '2026-06-12',
    examIds: ['exam-night'],
    availability: { 5: { minutes: 120, startTime: '21:00', endTime: '24:00' } },
    sessionMinutes: 50,
    studyMethods: [{ value: 'pomodoro_50', label: 'Pomodoro', sub: '50 / 10', sessionMinutes: 50, breakMinutes: 10 }],
    bufferRatio: 1,
    maxItemsPerDay: 3,
  },
});

if (nightPlan.items.some((item) => ['quiz', 'mock_exam'].includes(item.type))) {
  errors.push('night sessions should stay light');
}

const mixedTypes = new Set(result.items.filter((item) => item.plannedDate === '2026-06-12').map((item) => item.type));
if (mixedTypes.size < 2) errors.push('planner should mix activity types in a day when possible');

const batchPlan = generateStudyPlan({
  exams: [
    { id: 'exam-a', name: 'A', status: 'active', date: '2026-06-30', chapters: [{ id: 'a1', title: 'A1' }] },
    { id: 'exam-b', name: 'B', status: 'active', date: '2026-06-30', chapters: [{ id: 'b1', title: 'B1' }] },
    { id: 'exam-c', name: 'C', status: 'active', date: '2026-06-30', chapters: [{ id: 'c1', title: 'C1' }] },
  ],
  options: {
    mode: 'daily',
    startDate: '2026-06-12',
    examIds: ['exam-a', 'exam-b', 'exam-c'],
    availability: { 5: { minutes: 240, startTime: '08:00', endTime: '13:00' } },
    preferences: ['review', 'quiz', 'flashcards'],
    sessionMinutes: 30,
    studyMethods: [{ value: 'short', label: 'Short', sub: '30', sessionMinutes: 30, breakMinutes: 0 }],
    bufferRatio: 1,
    maxItemsPerDay: 4,
  },
});

const byDate = batchPlan.items.reduce((acc, item) => {
  acc[item.plannedDate] = [...(acc[item.plannedDate] || []), item.examId];
  return acc;
}, {});
for (const [date, examIds] of Object.entries(byDate)) {
  const seenDone = new Set();
  let current = examIds[0];
  for (const examId of examIds.slice(1)) {
    if (examId !== current) {
      seenDone.add(current);
      if (seenDone.has(examId)) errors.push(`planner should avoid subject ping-pong on ${date}`);
      current = examId;
    }
  }
}

const splitWindowPlan = generateStudyPlan({
  exams: [
    { id: 'split-a', name: 'Split A', status: 'active', date: '2026-06-30', chapters: [{ id: 'split-a1', title: 'Split A1' }] },
    { id: 'split-b', name: 'Split B', status: 'active', date: '2026-06-30', chapters: [{ id: 'split-b1', title: 'Split B1' }] },
  ],
  options: {
    mode: 'daily',
    startDate: '2026-06-12',
    examIds: ['split-a', 'split-b'],
    availability: {
      5: {
        windows: [
          { minutes: 180, startTime: '08:00', endTime: '12:00' },
          { minutes: 180, startTime: '14:00', endTime: '18:00' },
        ],
      },
    },
    preferences: ['review', 'quiz', 'flashcards'],
    sessionMinutes: 50,
    studyMethods: [{ value: 'pomodoro_50', label: 'Pomodoro', sub: '50 / 10', sessionMinutes: 50, breakMinutes: 10 }],
    bufferRatio: 1,
    maxItemsPerDay: 3,
  },
});

const morningExamIds = new Set(splitWindowPlan.items.filter((item) => item.plannedTime < '12:00').map((item) => item.examId));
const afternoonExamIds = new Set(splitWindowPlan.items.filter((item) => item.plannedTime >= '14:00').map((item) => item.examId));
if (morningExamIds.size > 1) errors.push('morning window should batch one exam instead of ping-ponging');
if (afternoonExamIds.size > 1) errors.push('afternoon window should batch one exam instead of ping-ponging');
if (morningExamIds.size && afternoonExamIds.size && [...morningExamIds][0] === [...afternoonExamIds][0]) {
  errors.push('separate day windows should switch exam when another selected exam has work');
}

const longMethodPlan = generateStudyPlan({
  exams: [
    { id: 'long-a', name: 'Long A', status: 'active', date: '2026-06-30', chapters: [{ id: 'long-a1', title: 'Long A1' }] },
  ],
  options: {
    mode: 'daily',
    startDate: '2026-06-12',
    examIds: ['long-a'],
    availability: { 5: { minutes: 300, startTime: '08:00', endTime: '14:00' } },
    preferences: ['review', 'quiz', 'flashcards'],
    sessionMinutes: 100,
    studyMethods: [{ value: 'custom', label: 'Custom', sub: '100 / 10', sessionMinutes: 100, breakMinutes: 10 }],
    bufferRatio: 1,
    maxItemsPerDay: 5,
  },
});

if (longMethodPlan.items.some((item) => item.type === 'quiz' && item.durationMin > 45)) {
  errors.push('quiz sessions should be capped below long study session length');
}
if (longMethodPlan.items.some((item) => item.type === 'flashcards' && item.durationMin > 30)) {
  errors.push('flashcard sessions should be capped below long study session length');
}
if (!longMethodPlan.items.some((item) => item.type === 'review' && item.durationMin >= 90)) {
  errors.push('long custom method should still allow long study sessions');
}

if (errors.length) {
  console.error('Study planner check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Study planner check OK: ${result.items.length} items, ${result.stats.totalMinutes} planned minutes.`);
