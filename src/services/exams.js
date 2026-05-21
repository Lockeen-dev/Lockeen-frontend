import { seedExams } from '../data/mockData';
import { isMockMode } from '../lib/apiClient';

const mockExams = structuredClone(seedExams || []);

function ok(data) {
  return { data: structuredClone(data), error: null };
}

function fail(message, code = 'UNKNOWN_ERROR') {
  return { data: null, error: { code, message } };
}

function findExam(id) {
  return mockExams.find((exam) => String(exam.id) === String(id));
}

function requireMockMode() {
  if (!isMockMode()) {
    return fail('Real API mode is not implemented yet.', 'REAL_MODE_NOT_IMPLEMENTED');
  }

  return null;
}

export async function listExams() {
  const modeError = requireMockMode();
  if (modeError) return modeError;

  return ok(mockExams);
}

export async function getExam(id) {
  const modeError = requireMockMode();
  if (modeError) return modeError;

  const exam = findExam(id);
  if (!exam) return fail('Exam not found.', 'EXAM_NOT_FOUND');

  return ok(exam);
}

export async function createExam(input) {
  const modeError = requireMockMode();
  if (modeError) return modeError;

  if (!input?.name) {
    return fail('Exam name is required.', 'VALIDATION_ERROR');
  }

  const exam = {
    id: crypto.randomUUID(),
    chapters: [],
    ...input,
  };

  mockExams.push(exam);

  return ok(exam);
}

export async function updateExam(id, patch) {
  const modeError = requireMockMode();
  if (modeError) return modeError;

  const index = mockExams.findIndex((exam) => String(exam.id) === String(id));
  if (index === -1) return fail('Exam not found.', 'EXAM_NOT_FOUND');

  mockExams[index] = {
    ...mockExams[index],
    ...patch,
    id: mockExams[index].id,
  };

  return ok(mockExams[index]);
}

export async function deleteExam(id) {
  const modeError = requireMockMode();
  if (modeError) return modeError;

  const index = mockExams.findIndex((exam) => String(exam.id) === String(id));
  if (index === -1) return fail('Exam not found.', 'EXAM_NOT_FOUND');

  const [deletedExam] = mockExams.splice(index, 1);

  return ok(deletedExam);
}

export async function listChapters(examId) {
  const modeError = requireMockMode();
  if (modeError) return modeError;

  const exam = findExam(examId);
  if (!exam) return fail('Exam not found.', 'EXAM_NOT_FOUND');

  return ok(exam.chapters || []);
}

export async function createChapter(examId, input) {
  const modeError = requireMockMode();
  if (modeError) return modeError;

  const exam = findExam(examId);
  if (!exam) return fail('Exam not found.', 'EXAM_NOT_FOUND');

  const chapter = {
    id: crypto.randomUUID(),
    ...input,
  };

  exam.chapters = [...(exam.chapters || []), chapter];

  return ok(chapter);
}

export async function updateChapter(examId, chapterId, patch) {
  const modeError = requireMockMode();
  if (modeError) return modeError;

  const exam = findExam(examId);
  if (!exam) return fail('Exam not found.', 'EXAM_NOT_FOUND');

  const chapters = exam.chapters || [];
  const index = chapters.findIndex((chapter) => String(chapter.id) === String(chapterId));
  if (index === -1) return fail('Chapter not found.', 'CHAPTER_NOT_FOUND');

  chapters[index] = {
    ...chapters[index],
    ...patch,
    id: chapters[index].id,
  };

  exam.chapters = chapters;

  return ok(chapters[index]);
}

export async function deleteChapter(examId, chapterId) {
  const modeError = requireMockMode();
  if (modeError) return modeError;

  const exam = findExam(examId);
  if (!exam) return fail('Exam not found.', 'EXAM_NOT_FOUND');

  const chapters = exam.chapters || [];
  const index = chapters.findIndex((chapter) => String(chapter.id) === String(chapterId));
  if (index === -1) return fail('Chapter not found.', 'CHAPTER_NOT_FOUND');

  const [deletedChapter] = chapters.splice(index, 1);
  exam.chapters = chapters;

  return ok(deletedChapter);
}
