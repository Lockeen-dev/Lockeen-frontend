import { listExams } from './exams';

function ok(data) {
  return { data: structuredClone(data), error: null };
}

function failFrom(error) {
  return {
    data: null,
    error: error || {
      code: 'CALENDAR_READ_MODEL_ERROR',
      message: 'Calendar read model failed.',
    },
  };
}

function hasValidDate(value) {
  if (!value) return false;

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function sortEventsByDateAsc(a, b) {
  return new Date(a.date).getTime() - new Date(b.date).getTime();
}

function examToCalendarEvent(exam) {
  return {
    id: `exam-${exam.id}`,
    type: 'exam',
    title: exam.name,
    date: exam.date,
    examId: exam.id,
    subject: exam.subject || null,
    color: exam.color || null,
  };
}

export async function listExamEvents() {
  const result = await listExams();

  if (result.error) return failFrom(result.error);

  const events = (result.data || [])
    .filter((exam) => hasValidDate(exam.date))
    .map(examToCalendarEvent)
    .sort(sortEventsByDateAsc);

  return ok(events);
}

export async function listCalendarEvents() {
  return listExamEvents();
}
