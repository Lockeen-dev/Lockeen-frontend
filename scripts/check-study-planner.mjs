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
      5: { minutes: 90, startTime: '18:00' },
      6: { minutes: 120, startTime: '10:00' },
      0: false,
      1: { minutes: 75, startTime: '18:00' },
      2: { minutes: 75, startTime: '18:00' },
      3: { minutes: 75, startTime: '18:00' },
      4: { minutes: 75, startTime: '18:00' },
    },
  },
});

const errors = [];

if (result.plan.title !== 'Finance plan') errors.push('plan title mismatch');
if (result.plan.startDate !== '2026-06-12') errors.push('startDate mismatch');
if (result.plan.endDate !== '2026-06-20') errors.push('endDate should use selected exam date');
if (!result.items.length) errors.push('planner generated no items');
if (result.items.some((item) => !item.plannedDate || !item.durationMin || item.status !== 'planned')) errors.push('invalid item shape');
if (!result.items.some((item) => item.materialPending)) errors.push('expected materialPending item for processing material');
if (result.items.some((item) => item.plannedDate < '2026-06-12' || item.plannedDate > '2026-06-20')) errors.push('item outside range');

const dateTimeKeys = result.items.map((item) => `${item.plannedDate} ${item.plannedTime}`);
if (new Set(dateTimeKeys).size !== dateTimeKeys.length) errors.push('items should not share same date/time slot');

const missed = markMissedStudyPlanItems([
  { id: 'old', status: 'planned', plannedDate: '2026-06-11' },
  { id: 'today', status: 'planned', plannedDate: '2026-06-12' },
], '2026-06-12');

if (missed[0].status !== 'missed') errors.push('old planned item should be missed');
if (missed[1].status !== 'planned') errors.push('today planned item should stay planned');

if (errors.length) {
  console.error('Study planner check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Study planner check OK: ${result.items.length} items, ${result.stats.totalMinutes} planned minutes.`);
