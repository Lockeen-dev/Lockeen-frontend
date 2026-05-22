import { listExams } from './exams';

function ok(data) {
  return { data: structuredClone(data), error: null };
}

function failFrom(error) {
  return {
    data: null,
    error: error || {
      code: 'DASHBOARD_READ_MODEL_ERROR',
      message: 'Dashboard read model failed.',
    },
  };
}

function parseDate(value) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sortByDateAsc(a, b) {
  const aDate = parseDate(a.date);
  const bDate = parseDate(b.date);

  if (!aDate && !bDate) return 0;
  if (!aDate) return 1;
  if (!bDate) return -1;

  return aDate.getTime() - bDate.getTime();
}

function isUpcomingExam(exam, now = new Date()) {
  const examDate = parseDate(exam.date);
  if (!examDate) return false;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  return examDate >= today;
}

export async function listUpcomingExams(limit = 5) {
  const result = await listExams();

  if (result.error) return failFrom(result.error);

  const upcomingExams = (result.data || [])
    .filter((exam) => isUpcomingExam(exam))
    .sort(sortByDateAsc)
    .slice(0, limit);

  return ok(upcomingExams);
}

export async function getDashboardSummary() {
  const result = await listExams();

  if (result.error) return failFrom(result.error);

  const exams = result.data || [];
  const upcomingExams = exams.filter((exam) => isUpcomingExam(exam)).sort(sortByDateAsc);
  const examsWithoutDate = exams.filter((exam) => !exam.date);

  return ok({
    totalExams: exams.length,
    upcomingExams: upcomingExams.slice(0, 5),
    nextExam: upcomingExams[0] || null,
    examsWithoutDate,
  });
}
