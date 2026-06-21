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

const DIFFICULTY_WEIGHTS = {
  easy: 0.85,
  medium: 1.1,
  hard: 1.45,
};

const TYPE_LOAD = {
  mock_exam: 3,
  study: 2,
  quiz: 1.5,
  review: 1,
  flashcards: 1,
};

const MIN_SESSION_MINUTES = 15;
const MAX_QUIZ_SESSION_MINUTES = 45;
const MAX_FLASHCARD_SESSION_MINUTES = 30;
const EXAM_DAY_PREP_BUFFER_MIN = 120;
const EXAM_DAY_RECOVERY_BUFFER_MIN = 120;
const STREAK_MAX_PER_WINDOW = 2;

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

function studyCutoffDateString(examDateValue) {
  const examDate = parseDate(examDateValue);
  if (!examDate) return null;
  return formatDate(addDays(examDate, -1));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function addMinutesToTime(time = '09:00', minutes = 0) {
  const [hour, minute] = String(time).split(':').map(Number);
  const total = Math.max(0, (hour || 0) * 60 + (minute || 0) + minutes);
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

function timeToMinutes(time = '09:00') {
  const [hour, minute] = String(time).split(':').map(Number);
  return Math.max(0, (hour || 0) * 60 + (minute || 0));
}

function todayString() {
  return formatDate(new Date());
}

function isExamSchedulableFrom(exam, startDate) {
  const cutoffDate = parseDate(studyCutoffDateString(exam?.date));
  if (!cutoffDate) return true;
  return cutoffDate >= startDate;
}

function getRange(options = {}, exams = []) {
  const startDate = parseDate(options.startDate) || parseDate(todayString());
  const mode = options.mode || 'until_exam';
  const selectedExamIds = new Set((options.examIds || []).map(String));
  const selectedExamDates = exams
    .filter((exam) => !selectedExamIds.size || selectedExamIds.has(String(exam.id)))
    .map((exam) => parseDate(studyCutoffDateString(exam.date)))
    .filter(Boolean)
    .sort((a, b) => a - b);
  const futureSelectedExamDates = selectedExamDates.filter((date) => date >= startDate);

  let endDate = parseDate(options.endDate);
  if (!endDate && mode === 'until_exam' && selectedExamDates.length) {
    endDate = futureSelectedExamDates[futureSelectedExamDates.length - 1] || selectedExamDates[selectedExamDates.length - 1];
  }
  if (!endDate) {
    endDate = addDays(startDate, (MODE_DEFAULT_DAYS[mode] || 14) - 1);
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
    if (Array.isArray(value?.windows)) {
      return [day, {
        windows: value.windows.map((window) => ({
          minutes: Math.max(0, Number(window?.minutes || 0)),
          startTime: window?.startTime || DEFAULT_AVAILABILITY[day]?.startTime || '09:00',
          endTime: window?.endTime || null,
        })).filter((window) => window.minutes > 0),
      }];
    }
    return [day, {
      minutes: Math.max(0, Number(value?.minutes || 0)),
      startTime: value?.startTime || DEFAULT_AVAILABILITY[day]?.startTime || '09:00',
      endTime: value?.endTime || null,
    }];
  }));
}

function buildSlots({
  startDate,
  endDate,
  availability,
  bufferRatio = 0.85,
  maxItemsPerDay = null,
  sessionMinutes = 30,
}) {
  const normalizedAvailability = normalizeAvailability(availability);
  const slots = [];
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    const day = date.getUTCDay();
    const config = normalizedAvailability[day] || { minutes: 0, startTime: '09:00' };
    const windows = Array.isArray(config.windows) && config.windows.length ? config.windows : [config];
    windows.forEach((window, index) => {
      const minutes = Math.floor(Number(window.minutes || 0) * bufferRatio);
      if (minutes <= 0) return;
      const computedMaxItems = maxItemsPerDay != null
        ? Number(maxItemsPerDay)
        : Math.max(1, Math.ceil(minutes / Math.max(1, Number(sessionMinutes || 30)) * 1.2));
      slots.push({
        date: formatDate(date),
        windowIndex: index,
        startTime: window.startTime || config.startTime || '09:00',
        endTime: window.endTime || config.endTime || null,
        remaining: minutes,
        studyTarget: minutes,
        studyUsed: 0,
        used: 0,
        itemCount: 0,
        maxItems: Math.max(1, Number.isFinite(computedMaxItems) ? Math.floor(computedMaxItems) : 4),
      });
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
  if (days <= 0) return 130;
  return clamp(Math.pow(15 / Math.max(1, days), 1.45) * 20, 10, 130);
}

function normalizeDifficulty(value) {
  return DIFFICULTY_WEIGHTS.hasOwnProperty(value?.toLowerCase?.() || '')
    ? value.toLowerCase()
    : 'medium';
}

function getDifficultyWeight(difficulty) {
  return DIFFICULTY_WEIGHTS[normalizeDifficulty(difficulty)] || DIFFICULTY_WEIGHTS.medium;
}

function getTargetGradeWeight(targetGrade) {
  const grade = Number(targetGrade);
  if (!Number.isFinite(grade)) return 1;
  const score = clamp((grade - 18) / 12, 0, 1);
  return 1 + score * 0.7;
}

function getPriorityWeight(priority) {
  const p = clamp(Math.round(Number(priority || 3)), 1, 5);
  return 0.7 + (p - 1) * 0.15;
}

function getMinSessionDuration(task, method) {
  const base = Math.max(MIN_SESSION_MINUTES, Number(method?.sessionMinutes || 30));
  if (task.type === 'quiz') return Math.min(MAX_QUIZ_SESSION_MINUTES, base);
  if (task.type === 'flashcards') return Math.min(MAX_FLASHCARD_SESSION_MINUTES, Math.max(MIN_SESSION_MINUTES, Math.round(base * 0.55)));
  if (task.type === 'mock_exam') return Math.min(Math.max(60, base), 180);
  return base;
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
    examDate: exam.date || null,
    studyCutoffDate: studyCutoffDateString(exam.date),
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
    if (!isExamSchedulableFrom(exam, startDate)) continue;

    const examDate = parseDate(exam.date);
    const urgency = getExamUrgency(startDate, examDate);
    const examPriorityMultiplier = getPriorityWeight(exam.priority);
    const examDifficultyWeight = getDifficultyWeight(exam.difficulty);
    const examTargetWeight = getTargetGradeWeight(exam.targetGrade);
    const examBasePriority = urgency * examPriorityMultiplier * examDifficultyWeight * examTargetWeight;
    const chapters = exam.chapters?.length ? exam.chapters : [{ id: null, title: exam.name }];

    for (const chapter of chapters) {
      const chapterMaterials = chapter.id ? getMaterialsForChapter(materials, chapter.id) : [];
      const readyMaterials = chapterMaterials.filter((material) => material.processingStatus === 'ready' && material.extractedText);
      const pendingMaterials = chapterMaterials.filter((material) => ['uploaded', 'processing'].includes(material.processingStatus));
      const score = getScoreForChapter(quizRuns, exam.id, chapter.id);
      const weakness = score == null ? 18 : clamp(75 - score, 0, 45);
      const workload = Math.min(20, Number(chapter.pages || chapter.pageCount || chapter.files || 1) * 2);
      const materialPenalty = score == null ? 8 : 0;
      const basePriority = examBasePriority + weakness + workload + materialPenalty;
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
          durationMin: Math.max(MIN_SESSION_MINUTES, Math.round(baseDuration * multiplier)),
          priority: basePriority + boost,
          materialPending,
          reason: reasonBits.join(' · '),
        }));
      }
    }

    if (preferences.has('mock_exam') && examDate && diffDays(startDate, examDate) <= 14) {
      const studyQueueExists = tasks.some((task) => String(task.examId) === String(exam.id) && task.type !== 'mock_exam');
      if (!studyQueueExists) continue;
      const signature = [exam.id || 'none', 'all', 'mock_exam'].join(':');
      if (!doneSignatures.has(signature)) {
        const daysToExam = diffDays(startDate, examDate);
        if (daysToExam >= 4) {
          tasks.push(createTask({
            exam,
            type: 'mock_exam',
            durationMin: Math.max(60, Math.round(TASK_DURATIONS.mock_exam * multiplier)),
            priority: examBasePriority + 25,
            materialPending: false,
            reason: `exam ${exam.date} · final practice`,
          }));
        }
      }
    }
  }

  return tasks.sort((a, b) => b.priority - a.priority || a.durationMin - b.durationMin);
}

function buildExamDayProtectionBlocks(exams = [], options = {}) {
  const selectedExamIds = new Set((options.examIds || []).map(String));
  return (exams || [])
    .filter((exam) => !selectedExamIds.size || selectedExamIds.has(String(exam.id)))
    .filter((exam) => exam?.date)
    .map((exam) => {
      const examStart = timeToMinutes(exam.time || exam.examTime || '09:00');
      const examDuration = Math.max(1, Number(exam.durationMin || exam.examDurationMin || 120));
      const blockStart = Math.max(0, examStart - EXAM_DAY_PREP_BUFFER_MIN);
      const blockEnd = examStart + examDuration + EXAM_DAY_RECOVERY_BUFFER_MIN;
      return {
        id: `exam-day-protection-${exam.id || exam.date}`,
        examId: exam.id,
        plannedDate: formatDate(parseDate(exam.date)),
        plannedTime: addMinutesToTime('00:00', blockStart),
        durationMin: Math.max(1, blockEnd - blockStart),
        status: 'planned',
        source: 'exam-day-protection',
      };
    });
}

function scheduleTasks(tasks = [], slots = []) {
  const items = [];
  const unscheduled = [];
  const canScheduleTaskOnDate = (task, dateString) => !task.studyCutoffDate || String(dateString) <= String(task.studyCutoffDate);

  for (const task of tasks) {
    const slot = slots.find((candidate) =>
      candidate.remaining >= task.durationMin &&
      candidate.itemCount < candidate.maxItems &&
      canScheduleTaskOnDate(task, candidate.date),
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

function getPhaseThresholds(task, options = {}) {
  const startDate = parseDate(options.startDate);
  const examDate = parseDate(task?.examDate);
  const planTotalDays = Math.max(1, Number(options.planTotalDays || 0));
  const examTotalDays = startDate && examDate ? Math.max(1, diffDays(startDate, examDate)) : planTotalDays;
  const totalDays = Math.max(1, Math.min(planTotalDays || examTotalDays, examTotalDays));
  if (totalDays <= 3) return { dayBefore: 1, finalReview: 1, practice: 2 };
  if (totalDays <= 6) return { dayBefore: 1, finalReview: 2, practice: 3 };
  if (totalDays <= 10) return { dayBefore: 1, finalReview: 3, practice: 5 };
  return { dayBefore: 1, finalReview: 3, practice: 7 };
}

function getTaskPhase(task, dateString, options = {}) {
  if (!task?.examDate) return 'normal';
  const date = parseDate(dateString);
  const examDate = parseDate(task.examDate);
  if (!date || !examDate) return 'normal';
  const daysToExam = diffDays(date, examDate);
  const thresholds = getPhaseThresholds(task, options);
  if (daysToExam <= thresholds.dayBefore) return 'day_before';
  if (daysToExam <= thresholds.finalReview) return 'final_review';
  if (daysToExam <= thresholds.practice) return 'practice';
  return 'normal';
}

function phaseAllowsTask(phase, task) {
  if (phase === 'day_before') return ['review', 'quiz', 'flashcards'].includes(task.type);
  if (phase === 'final_review') return task.type !== 'mock_exam';
  if (phase === 'normal') return task.type !== 'mock_exam';
  return true;
}

function phaseTypeBoost(phase, type) {
  if (phase === 'day_before') {
    if (type === 'flashcards') return 14;
    if (type === 'review') return 10;
    if (type === 'quiz') return 6;
    return -60;
  }
  if (phase === 'final_review') {
    if (type === 'quiz') return 12;
    if (type === 'flashcards') return 10;
    if (type === 'review') return 7;
    return -50;
  }
  if (phase === 'practice') {
    if (type === 'quiz') return 11;
    if (type === 'flashcards') return 8;
    if (type === 'mock_exam') return 7;
    if (type === 'review') return 2;
  }
  if (type === 'review') return 12;
  if (type === 'quiz') return -2;
  if (type === 'flashcards') return -4;
  if (type === 'mock_exam') return -60;
  return 0;
}

function getSessionDurationForTask(task, method, remaining) {
  const base = Math.max(MIN_SESSION_MINUTES, Number(method?.sessionMinutes || 30));
  const available = Math.max(0, Number(remaining || 0));
  return Math.min(getMinSessionDuration(task, { ...method, sessionMinutes: base }), available);
}

function getSlotStudyMode(slot) {
  const start = timeToMinutes(slot.startTime || '09:00');
  if (start >= 21 * 60) return 'night';
  if (start >= 19 * 60) return 'late_evening';
  return 'normal';
}

function slotAllowsTask(slot, task) {
  const mode = getSlotStudyMode(slot);
  if (mode === 'night') return ['review', 'flashcards'].includes(task.type);
  if (mode === 'late_evening') return task.type !== 'mock_exam';
  return true;
}

function slotTypeBoost(slot, type) {
  const mode = getSlotStudyMode(slot);
  if (mode === 'night') {
    if (type === 'flashcards') return 10;
    if (type === 'review') return 6;
    return -30;
  }
  if (mode === 'late_evening') {
    if (type === 'flashcards') return 4;
    if (type === 'review') return 2;
    if (type === 'mock_exam') return -20;
  }
  return 0;
}

function findNextAvailableStart(slot, durationMin) {
  if (durationMin < MIN_SESSION_MINUTES) return null;
  const blocks = slot.blocks || [];
  const hardEnd = slot.endTime ? timeToMinutes(slot.endTime) : Infinity;
  let offset = slot.used;
  while (offset + durationMin <= slot.capacity) {
    const start = timeToMinutes(slot.startTime) + offset;
    const end = start + durationMin;
    if (end > hardEnd) return null;
    const overlaps = blocks.some((block) => start < block.end && end > block.start);
    if (!overlaps) return offset;
    offset += 5;
  }
  return null;
}

function scheduleRepeatingSessions(tasks = [], slots = [], options = {}) {
  const items = [];
  const unscheduled = [];
  if (!tasks.length) return { items, unscheduled };

  const methods = (Array.isArray(options.studyMethods) && options.studyMethods.length ? options.studyMethods : [{
    value: options.studyMethod || 'default',
    sessionMinutes: options.sessionMinutes || 30,
    breakMinutes: options.breakMinutes || 0,
    label: options.studyMethod || 'Study',
    sub: options.studyMethod || '',
  }]).map((method) => ({
    value: method.value || 'study',
    label: method.label || 'Study',
    sub: method.sub || '',
    sessionMinutes: Math.max(10, Number(method.sessionMinutes || options.sessionMinutes || 30)),
    breakMinutes: Math.max(0, Number(method.breakMinutes || 0)),
  }));
  const maxBreakMin = Math.max(...methods.map((method) => method.breakMinutes), 0);
  const methodByValue = new Map(methods.map((method) => [String(method.value), method]));
  const examSettings = options.examSettings || {};
  slots.forEach((slot) => {
    slot.capacity = (slot.studyTarget || slot.remaining || 0) + (slot.maxItems * maxBreakMin);
  });
  const byExam = new Map();
  tasks.forEach((task) => {
    const key = String(task.examId || 'none');
    byExam.set(key, [...(byExam.get(key) || []), task]);
  });
  const queues = [...byExam.values()].filter((queue) => queue.length);
  const examMethodById = new Map([...byExam.keys()].map((examId, index) => {
    const configured = examSettings[examId]?.studyMethod;
    return [examId, methodByValue.get(String(configured)) || methods[index % methods.length]];
  }));
  let examIndex = 0;
  const loadCap = Math.max(300, Math.round(5 * 60 * (options.intensity === 'intensive' ? 1.4 : options.intensity === 'light' ? 0.8 : 1)));
  const dayWeightedLoad = new Map();
  const selectionCounts = new Map();
  const dayExamMinutes = new Map();
  const dayTypeCounts = new Map();
  const windowState = new Map();

  const canScheduleTaskOnDate = (task, dateString) => {
    if (!task?.studyCutoffDate) return true;
    return String(dateString) <= String(task.studyCutoffDate);
  };

  const nextTask = (slot) => {
    const dateString = slot.date;
    const windowKey = `${dateString}:${slot.windowIndex || 0}`;
    const activeQueues = queues.filter((queue) => queue.length);
    if (!activeQueues.length) return null;
    const state = windowState.get(windowKey) || {
      currentExam: null,
      streak: 0,
      switched: new Set(),
      lastTypeByExam: new Map(),
      switchedCount: 0,
      seenExams: new Set(),
    };
    windowState.set(windowKey, state);
    let best = null;
    for (let tries = 0; tries < activeQueues.length; tries += 1) {
      const queue = activeQueues[examIndex % activeQueues.length];
      examIndex += 1;
      if (!queue.length) continue;
      for (let index = 0; index < queue.length; index += 1) {
        const task = queue[index];
        const phase = getTaskPhase(task, dateString, options);
        if (!canScheduleTaskOnDate(task, dateString) || !phaseAllowsTask(phase, task) || !slotAllowsTask(slot, task)) continue;
        const key = [task.examId || 'none', task.chapterId || 'all', task.type].join(':');
        const dayExamKey = `${dateString}:${task.examId || 'none'}`;
        const dayTypeKey = `${dateString}:${task.type}`;
        const sameExamMinutes = dayExamMinutes.get(dayExamKey) || 0;
        const sameTypeCount = dayTypeCounts.get(dayTypeKey) || 0;
        const examId = String(task.examId || 'none');
        const dayLoadKey = `load:${dateString}`;
        const currentLoad = dayWeightedLoad.get(dayLoadKey) || 0;
        const estimatedLoad = TYPE_LOAD[task.type] || 1;
        const projectedLoad = currentLoad + estimatedLoad;
        if (projectedLoad > loadCap && activeQueues.length > 1) continue;
        const lastExamId = state.currentExam;
        const examBatchBoost = lastExamId ? (lastExamId === examId ? 42 : -30) : 0;
        const sameDayCarryPenalty = !lastExamId && sameExamMinutes > 0 && byExam.size > 1 ? 52 : 0;
        const sameExamFatigue = Math.max(0, Math.floor((sameExamMinutes - 180) / 45)) * 14;
        const sameTypeLastPenalty = (state.lastTypeByExam.get(examId) === task.type) ? 16 : 0;
        const windowDominancePenalty = (lastExamId === examId && state.streak >= STREAK_MAX_PER_WINDOW && byExam.size > 1) ? 30 : 0;
        const dominancePenalty = (sameExamMinutes / 60) > 3 && byExam.size > 1 ? 24 : 0;
        const revisitPenalty = state.switched.has(examId) && lastExamId !== examId ? 12 : 0;
        const score = task.priority
          + phaseTypeBoost(phase, task.type)
          + slotTypeBoost(slot, task.type)
          + examBatchBoost
          + (state.switchedCount > 1 ? -18 : 0)
          - revisitPenalty
          - sameTypeLastPenalty
          - windowDominancePenalty
          - dominancePenalty
          - ((selectionCounts.get(key) || 0) * 24)
          - sameDayCarryPenalty
          - sameExamFatigue
          - sameTypeCount * 12;
        if (!best || score > best.score) best = { task, score, queue, index };
      }
    }
    if (!best) return null;
    state.seenExams.add(String(best.task.examId || 'none'));
    const key = [best.task.examId || 'none', best.task.chapterId || 'all', best.task.type].join(':');
    selectionCounts.set(key, (selectionCounts.get(key) || 0) + 1);
    best.queue.splice(best.index, 1);
    best.queue.push(best.task);
    return best.task;
  };

  for (const slot of slots) {
    while (slot.itemCount < slot.maxItems && slot.studyUsed < slot.studyTarget) {
      const task = nextTask(slot);
      if (!task) break;
      const method = examMethodById.get(String(task.examId || 'none')) || methods[0];
      const durationMin = getSessionDurationForTask(task, method, slot.studyTarget - slot.studyUsed);
      if (durationMin < MIN_SESSION_MINUTES) break;
      const breakMin = method.breakMinutes;
      const nextOffset = findNextAvailableStart(slot, durationMin);
      if (nextOffset == null) break;
      const phase = getTaskPhase(task, slot.date, options);

      items.push({
        examId: task.examId,
        chapterId: task.chapterId,
        materialId: task.materialId,
        type: task.type,
        plannedDate: slot.date,
        plannedTime: addMinutesToTime(slot.startTime, nextOffset),
        durationMin,
        studyMethod: method.value,
        studyMethodLabel: method.sub || method.label,
        status: 'planned',
        source: 'generated',
        materialPending: task.materialPending,
        reason: [task.reason, phase !== 'normal' ? phase.replace('_', ' ') : null].filter(Boolean).join(' · '),
        phase,
      });

      const start = timeToMinutes(slot.startTime) + nextOffset;
      const end = start + durationMin;
      slot.blocks.push({ start, end });
      slot.used = nextOffset + durationMin + breakMin;
      slot.studyUsed += durationMin;
      slot.remaining = Math.max(0, slot.studyTarget - slot.studyUsed);
      slot.itemCount += 1;
      const dayExamKey = `${slot.date}:${task.examId || 'none'}`;
      const dayTypeKey = `${slot.date}:${task.type}`;
      const examId = String(task.examId || 'none');
      const windowKey = `${slot.date}:${slot.windowIndex || 0}`;
      const state = windowState.get(windowKey) || {
        currentExam: null,
        streak: 0,
        switched: new Set(),
        lastTypeByExam: new Map(),
        switchedCount: 0,
        seenExams: new Set(),
      };
      const lastExamId = state.currentExam;
      if (lastExamId && lastExamId !== examId) {
        state.switched.add(lastExamId);
        state.switchedCount += 1;
        state.streak = 1;
      }
      if (!state.seenExams.has(examId)) {
        state.seenExams.add(examId);
      }
      state.currentExam = examId;
      if (lastExamId === examId) state.streak += 1;
      else if (!lastExamId) state.streak = 1;
      state.lastTypeByExam.set(examId, task.type);
      windowState.set(windowKey, state);
      dayExamMinutes.set(dayExamKey, (dayExamMinutes.get(dayExamKey) || 0) + durationMin);
      dayTypeCounts.set(dayTypeKey, (dayTypeCounts.get(dayTypeKey) || 0) + 1);
      const dayLoadKey = `load:${slot.date}`;
      dayWeightedLoad.set(dayLoadKey, (dayWeightedLoad.get(dayLoadKey) || 0) + (TYPE_LOAD[task.type] || 1));
    }
  }

  if (!items.length) unscheduled.push(...tasks);
  return { items, unscheduled };
}

function applyExistingBlocks(slots = [], existingItems = []) {
  const byDate = new Map();
  for (const item of existingItems || []) {
    if (!item?.plannedDate || !item?.plannedTime || item.status === 'done' || item.status === 'skipped') continue;
    const start = timeToMinutes(item.plannedTime);
    const end = start + Math.max(1, Number(item.durationMin || 30));
    byDate.set(item.plannedDate, [...(byDate.get(item.plannedDate) || []), { start, end }]);
  }
  return slots.map((slot) => ({
    ...slot,
    capacity: slot.capacity || slot.remaining,
    blocks: byDate.get(slot.date) || [],
  }));
}

export function generateStudyPlan(input = {}) {
  const exams = input.exams || [];
  const materials = input.materials || [];
  const quizRuns = input.quizRuns || [];
  const existingItems = input.existingItems || [];
  const options = input.options || {};
  const range = getRange(options, exams);
  const defaultSessionMinutes = Math.max(
    10,
    Math.round(
      (Array.isArray(options.studyMethods) && options.studyMethods.length
        ? options.studyMethods[0]?.sessionMinutes
        : options.sessionMinutes) || 30,
    ),
  );
  const plannerOptions = {
    ...options,
    startDate: range.startDateString,
    planTotalDays: diffDays(range.startDate, range.endDate) + 1,
  };
  const availability = options.availability || {};
  const slots = buildSlots({
    startDate: range.startDate,
    endDate: range.endDate,
    availability,
    bufferRatio: options.bufferRatio ?? 0.85,
    maxItemsPerDay: options.maxItemsPerDay ?? null,
    sessionMinutes: defaultSessionMinutes,
  });
  const protectiveBlocks = buildExamDayProtectionBlocks(exams, plannerOptions);
  const blockedSlots = applyExistingBlocks(slots, [...existingItems, ...protectiveBlocks]);

  const tasks = buildTasks({
    exams,
    materials,
    quizRuns,
    existingItems,
    options: plannerOptions,
    startDate: range.startDate,
  });
  const { items, unscheduled } = plannerOptions.sessionMinutes
    ? scheduleRepeatingSessions(tasks, blockedSlots, plannerOptions)
    : scheduleTasks(tasks, blockedSlots);

  const selectedExamIds = new Set((options.examIds || []).map(String));
  const selectedExams = exams.filter((exam) => !selectedExamIds.size || selectedExamIds.has(String(exam.id)));
  const expiredSelectedExams = selectedExams.filter((exam) => !isExamSchedulableFrom(exam, range.startDate));

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
        preferences: plannerOptions.preferences || ['review', 'quiz', 'flashcards', 'mock_exam'],
        bufferRatio: plannerOptions.bufferRatio ?? 0.85,
        maxItemsPerDay: plannerOptions.maxItemsPerDay ?? null,
        sessionMinutes: plannerOptions.sessionMinutes || null,
        breakMinutes: plannerOptions.breakMinutes || 0,
        studyMethod: plannerOptions.studyMethod || null,
        studyMethods: plannerOptions.studyMethods || null,
        examSettings: plannerOptions.examSettings || null,
      },
    },
    items,
    warnings: [
      ...(slots.length ? [] : ['No available study slots in selected range.']),
      ...(selectedExams.length && selectedExams.length === expiredSelectedExams.length ? ['Selected exams are already past or have no study day left. Pick a future exam date.'] : []),
      ...(expiredSelectedExams.length && expiredSelectedExams.length < selectedExams.length ? [`${expiredSelectedExams.length} selected exam${expiredSelectedExams.length === 1 ? ' is' : 's are'} already past and were skipped.`] : []),
      ...(unscheduled.length ? [`${unscheduled.length} tasks could not fit in available time.`] : []),
      ...(selectedExams.some((exam) => !exam.date) ? ['Some selected exams have no date. Planner used default urgency.'] : []),
    ],
    insights: [
      'Study stops the day before each exam.',
      'Final days avoid mock exams and prefer review, quiz, and flashcards.',
      plannerOptions.examSettings && Object.keys(plannerOptions.examSettings).length ? 'Per-exam study methods are applied when selected.' : (plannerOptions.studyMethods?.length > 1 ? 'Selected study methods rotate across exams.' : 'Selected study method is applied to every session.'),
      'Calendar times stay inside selected study windows.',
      'Exam days block 2h before the exam through 2h after the exam.',
      'Night sessions stay light: review or flashcards only.',
      'Planner batches the same exam together before switching subjects.',
      existingItems.length ? `${existingItems.length} existing calendar commitments are protected from overlap.` : 'Existing calendar commitments are protected when present.',
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
