const DEFAULT_AVAILABILITY = {
  1: { minutes: 90, startTime: '17:00' },
  2: { minutes: 90, startTime: '17:00' },
  3: { minutes: 90, startTime: '17:00' },
  4: { minutes: 90, startTime: '17:00' },
  5: { minutes: 75, startTime: '17:00' },
  6: { minutes: 120, startTime: '10:00' },
  0: { minutes: 60, startTime: '10:00' },
};

const TASK_DURATIONS = {
  review: 30,
  quiz: 20,
  flashcards: 15,
  mock_exam: 60,
  buffer: 30,
};

const MODE_DEFAULT_DAYS = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function parseDate(value) {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function diffDays(from, to) {
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function addMinutesToTime(time = '09:00', minutes = 0) {
  const [hour, minute] = String(time).split(':').map(Number);
  const total = Math.max(0, (hour || 0) * 60 + (minute || 0) + minutes);
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

function todayString() {
  return formatDate(new Date());
}

function getRange(options = {}, exams = []) {
  const startDate = parseDate(options.startDate) || parseDate(todayString());
  const mode = options.mode || 'until_exam';
  const selectedExamIds = new Set((options.examIds || []).map(String));
  const selectedExamDates = exams
    .filter((exam) => !selectedExamIds.size || selectedExamIds.has(String(exam.id)))
    .map((exam) => parseDate(exam.date))
    .filter(Boolean)
    .sort((a, b) => a - b);

  let endDate = parseDate(options.endDate);
  if (!endDate && mode === 'until_exam' && selectedExamDates.length) {
    endDate = selectedExamDates[0];
  }
  if (!endDate) {
    endDate = addDays(startDate, MODE_DEFAULT_DAYS[mode] || 14);
  }
  if (endDate < startDate) endDate = startDate;

  return {
    startDate,
    endDate,
    startDateString: formatDate(startDate),
    endDateString: formatDate(endDate),
  };
}

function normalizeAvailability(availability = {}) {
  const merged = { ...DEFAULT_AVAILABILITY, ...availability };
  return Object.fromEntries(Object.entries(merged).map(([day, value]) => {
    if (value === false || value === null) return [day, { minutes: 0, startTime: '09:00' }];
    if (typeof value === 'number') return [day, { minutes: value, startTime: DEFAULT_AVAILABILITY[day]?.startTime || '09:00' }];
    return [day, {
      minutes: Math.max(0, Number(value?.minutes || 0)),
      startTime: value?.startTime || DEFAULT_AVAILABILITY[day]?.startTime || '09:00',
    }];
  }));
}

function buildSlots({ startDate, endDate, availability, bufferRatio = 0.85, maxItemsPerDay = 4 }) {
  const normalizedAvailability = normalizeAvailability(availability);
  const slots = [];
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    const day = date.getUTCDay();
    const config = normalizedAvailability[day] || { minutes: 0, startTime: '09:00' };
    const minutes = Math.floor(Number(config.minutes || 0) * bufferRatio);
    if (minutes <= 0) continue;
    slots.push({
      date: formatDate(date),
      startTime: config.startTime || '09:00',
      remaining: minutes,
      used: 0,
      itemCount: 0,
      maxItems: maxItemsPerDay,
    });
  }
  return slots;
}

function getMaterialsForChapter(materials = [], chapterId) {
  return materials.filter((material) => String(material.chapterId) === String(chapterId));
}

function getScoreForChapter(quizRuns = [], examId, chapterId) {
  const runs = (quizRuns || []).filter((run) =>
    String(run.examId) === String(examId) &&
    (!chapterId || String(run.chapterId) === String(chapterId)),
  );
  if (!runs.length) return null;
  const score = runs.reduce((sum, run) => sum + Number(run.score || 0), 0) / runs.length;
  return Math.round(score);
}

function getDoneSignatures(existingItems = []) {
  return new Set((existingItems || [])
    .filter((item) => item.status === 'done')
    .map((item) => [item.examId || 'none', item.chapterId || 'all', item.type].join(':')));
}

function getExamUrgency(startDate, examDate) {
  if (!examDate) return 20;
  const days = diffDays(startDate, examDate);
  if (days <= 0) return 100;
  if (days <= 3) return 90;
  if (days <= 7) return 75;
  if (days <= 14) return 55;
  if (days <= 30) return 35;
  return 20;
}

function getIntensityMultiplier(intensity = 'normal') {
  if (intensity === 'light') return 0.75;
  if (intensity === 'intensive') return 1.35;
  return 1;
}

function createTask({
  exam,
  chapter = null,
  material = null,
  type,
  durationMin,
  priority,
  materialPending = false,
  reason,
}) {
  return {
    examId: exam.id,
    chapterId: chapter?.id || null,
    materialId: material?.id || null,
    type,
    durationMin,
    priority,
    materialPending,
    reason,
    title: chapter?.title || exam.name,
  };
}

function buildTasks({ exams = [], materials = [], quizRuns = [], existingItems = [], options = {}, startDate }) {
  const selectedExamIds = new Set((options.examIds || []).map(String));
  const doneSignatures = getDoneSignatures(existingItems);
  const multiplier = getIntensityMultiplier(options.intensity);
  const preferences = new Set(options.preferences || ['review', 'quiz', 'flashcards', 'mock_exam']);
  const tasks = [];

  for (const exam of exams) {
    if (selectedExamIds.size && !selectedExamIds.has(String(exam.id))) continue;
    if (exam.status && exam.status !== 'active') continue;

    const examDate = parseDate(exam.date);
    const urgency = getExamUrgency(startDate, examDate);
    const chapters = exam.chapters?.length ? exam.chapters : [{ id: null, title: exam.name }];

    for (const chapter of chapters) {
      const chapterMaterials = chapter.id ? getMaterialsForChapter(materials, chapter.id) : [];
      const readyMaterials = chapterMaterials.filter((material) => material.processingStatus === 'ready' && material.extractedText);
      const pendingMaterials = chapterMaterials.filter((material) => ['uploaded', 'processing'].includes(material.processingStatus));
      const score = getScoreForChapter(quizRuns, exam.id, chapter.id);
      const weakness = score == null ? 20 : clamp(75 - score, 0, 55);
      const workload = Math.min(20, Number(chapter.pages || chapter.pageCount || chapter.files || 1) * 2);
      const basePriority = urgency + weakness + workload;
      const materialPending = pendingMaterials.length > 0 || (chapterMaterials.length > 0 && readyMaterials.length === 0);
      const reasonBits = [
        exam.date ? `exam ${exam.date}` : 'no exam date',
        score == null ? 'no quiz score yet' : `quiz score ${score}%`,
        materialPending ? 'material pending' : readyMaterials.length ? 'material ready' : 'no material',
      ];

      const taskTypes = [
        ['review', TASK_DURATIONS.review, 6],
        ['quiz', TASK_DURATIONS.quiz, 12],
        ['flashcards', TASK_DURATIONS.flashcards, 10],
      ];

      for (const [type, baseDuration, boost] of taskTypes) {
        if (!preferences.has(type)) continue;
        const signature = [exam.id || 'none', chapter.id || 'all', type].join(':');
        if (doneSignatures.has(signature)) continue;
        tasks.push(createTask({
          exam,
          chapter,
          material: readyMaterials[0] || pendingMaterials[0] || null,
          type,
          durationMin: Math.max(10, Math.round(baseDuration * multiplier)),
          priority: basePriority + boost,
          materialPending,
          reason: reasonBits.join(' · '),
        }));
      }
    }

    if (preferences.has('mock_exam') && examDate && diffDays(startDate, examDate) <= 14) {
      const signature = [exam.id || 'none', 'all', 'mock_exam'].join(':');
      if (!doneSignatures.has(signature)) {
        tasks.push(createTask({
          exam,
          type: 'mock_exam',
          durationMin: Math.round(TASK_DURATIONS.mock_exam * multiplier),
          priority: urgency + 30,
          reason: `exam ${exam.date} · final practice`,
        }));
      }
    }
  }

  return tasks.sort((a, b) => b.priority - a.priority || a.durationMin - b.durationMin);
}

function scheduleTasks(tasks = [], slots = []) {
  const items = [];
  const unscheduled = [];

  for (const task of tasks) {
    const slot = slots.find((candidate) =>
      candidate.remaining >= task.durationMin &&
      candidate.itemCount < candidate.maxItems,
    );
    if (!slot) {
      unscheduled.push(task);
      continue;
    }

    items.push({
      examId: task.examId,
      chapterId: task.chapterId,
      materialId: task.materialId,
      type: task.type,
      plannedDate: slot.date,
      plannedTime: addMinutesToTime(slot.startTime, slot.used),
      durationMin: task.durationMin,
      status: 'planned',
      source: 'generated',
      materialPending: task.materialPending,
      reason: task.reason,
    });
    slot.remaining -= task.durationMin;
    slot.used += task.durationMin;
    slot.itemCount += 1;
  }

  return { items, unscheduled };
}

export function generateStudyPlan(input = {}) {
  const exams = input.exams || [];
  const materials = input.materials || [];
  const quizRuns = input.quizRuns || [];
  const existingItems = input.existingItems || [];
  const options = input.options || {};
  const range = getRange(options, exams);
  const availability = options.availability || {};
  const slots = buildSlots({
    startDate: range.startDate,
    endDate: range.endDate,
    availability,
    bufferRatio: options.bufferRatio ?? 0.85,
    maxItemsPerDay: options.maxItemsPerDay || 4,
  });

  const tasks = buildTasks({
    exams,
    materials,
    quizRuns,
    existingItems,
    options,
    startDate: range.startDate,
  });
  const { items, unscheduled } = scheduleTasks(tasks, slots);

  const selectedExamIds = new Set((options.examIds || []).map(String));
  const selectedExams = exams.filter((exam) => !selectedExamIds.size || selectedExamIds.has(String(exam.id)));

  return {
    plan: {
      title: options.title || 'Study plan',
      mode: options.mode || 'until_exam',
      startDate: range.startDateString,
      endDate: range.endDateString,
      status: 'active',
      settings: {
        availability,
        intensity: options.intensity || 'normal',
        preferences: options.preferences || ['review', 'quiz', 'flashcards', 'mock_exam'],
        bufferRatio: options.bufferRatio ?? 0.85,
        maxItemsPerDay: options.maxItemsPerDay || 4,
      },
    },
    items,
    warnings: [
      ...(slots.length ? [] : ['No available study slots in selected range.']),
      ...(unscheduled.length ? [`${unscheduled.length} tasks could not fit in available time.`] : []),
      ...(selectedExams.some((exam) => !exam.date) ? ['Some selected exams have no date. Planner used default urgency.'] : []),
    ],
    stats: {
      totalItems: items.length,
      totalMinutes: items.reduce((sum, item) => sum + item.durationMin, 0),
      unscheduledItems: unscheduled.length,
      startDate: range.startDateString,
      endDate: range.endDateString,
    },
  };
}

export function markMissedStudyPlanItems(items = [], today = todayString()) {
  return items.map((item) => {
    if (item.status !== 'planned') return item;
    if (String(item.plannedDate) >= String(today)) return item;
    return {
      ...item,
      status: 'missed',
    };
  });
}
