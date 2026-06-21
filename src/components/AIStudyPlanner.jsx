import React, { useEffect, useMemo, useState } from 'react';

import { BookOpen, Brain, CalendarIcon, Check, Clock, Layers, Sparkles, XMark } from '../lib/icons';
import { listMaterials } from '../services/materials';
import { createStudyPlan, createStudyPlanItem, listStudyPlans, updateStudyPlan } from '../services/studyPlans';
import { generateStudyPlan } from '../services/studyPlanner';
import { calendarKeyFromDate, durToMins, getExamCalendarPalette, normalizeClockTime, studyPlanItemToCalendarEvent } from './calendarData';

const MODE_OPTIONS = [
  { value: 'daily', label: 'Daily', hint: '1 day' },
  { value: 'weekly', label: 'Weekly', hint: '7 days' },
  { value: 'monthly', label: 'Monthly', hint: '30 days' },
  { value: 'until_exam', label: 'Until exam', hint: 'to exam date' },
];

const TIME_WINDOWS = [
  { id: 'morning', label: 'Morning', range: '06:00 - 12:00', startTime: '08:00', endTime: '12:00', emoji: '🌅' },
  { id: 'afternoon', label: 'Afternoon', range: '12:00 - 17:00', startTime: '14:00', endTime: '17:00', emoji: '☀️' },
  { id: 'evening', label: 'Evening', range: '17:00 - 21:00', startTime: '17:00', endTime: '21:00', emoji: '🌇' },
  { id: 'night', label: 'Night', range: '21:00 - 24:00', startTime: '21:00', endTime: '24:00', emoji: '🌙' },
];

const INTENSITY_OPTIONS = [
  { value: 'light', label: 'Light', sub: '75% load', emoji: '🌱' },
  { value: 'normal', label: 'Normal', sub: '100% load', emoji: '⚡' },
  { value: 'intensive', label: 'Intensive', sub: '135% load', emoji: '🔥' },
];

const STUDY_METHODS = [
  { value: 'pomodoro_25', label: 'Pomodoro', sub: '25 / 5', sessionMinutes: 25, breakMinutes: 5 },
  { value: 'pomodoro_50', label: 'Pomodoro', sub: '50 / 10', sessionMinutes: 50, breakMinutes: 10 },
  { value: 'deep_work', label: 'Deep work', sub: '60 / 10', sessionMinutes: 60, breakMinutes: 10 },
  { value: 'continuous', label: 'Continuous', sub: 'no break', sessionMinutes: 90, breakMinutes: 0 },
  { value: 'custom', label: 'Custom', sub: '90 / 10', sessionMinutes: 90, breakMinutes: 10 },
];

const ACTIVITY_OPTIONS = [
  { value: 'review', label: 'Study', Icon: BookOpen },
  { value: 'quiz', label: 'Quiz', Icon: Sparkles },
  { value: 'flashcards', label: 'Flashcards', Icon: Layers },
  { value: 'mock_exam', label: 'Mock exam', Icon: CalendarIcon },
];

function formatPlannerError(error, fallback = 'Unable to generate study plan.') {
  if (!error) return fallback;
  if (error.code === 'AUTH_REQUIRED') return 'Real mode requires an authenticated Supabase session.';
  if (error.code === 'SUPABASE_CONFIG_MISSING') return 'Supabase config is missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
  return error.message || fallback;
}

function timeToMinutes(value = '00:00') {
  const [hour, minute] = String(value).split(':').map(Number);
  return Math.max(0, (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0));
}

function getWindowCapacityMinutes(window, customStartTime, useCustomStart) {
  const start = timeToMinutes(useCustomStart ? customStartTime : window.startTime);
  const end = timeToMinutes(window.endTime);
  return Math.max(0, end - start);
}

function getWindowStartTime(window, customStartTime, useCustomStart) {
  return useCustomStart ? customStartTime : window.startTime;
}

function buildAvailability(hoursPerDay, windows, startTime) {
  const selectedWindows = windows.length ? windows : [TIME_WINDOWS[2]];
  const totalMinutes = Math.round(Number(hoursPerDay || 1) * 60);
  const capacities = selectedWindows.map((window) => ({
    window,
    startTime: getWindowStartTime(window, startTime, selectedWindows.length === 1),
    remaining: getWindowCapacityMinutes(window, startTime, selectedWindows.length === 1),
    minutes: 0,
  }));
  let remainingTarget = totalMinutes;
  while (remainingTarget > 0 && capacities.some((entry) => entry.remaining > 0)) {
    for (const entry of capacities) {
      if (remainingTarget <= 0) break;
      if (entry.remaining <= 0) continue;
      entry.minutes += 1;
      entry.remaining -= 1;
      remainingTarget -= 1;
    }
  }
  return [0, 1, 2, 3, 4, 5, 6].reduce((acc, day) => {
    acc[day] = {
      windows: capacities
        .filter((entry) => entry.minutes > 0)
        .map((entry) => ({ minutes: entry.minutes, startTime: entry.startTime, endTime: entry.window.endTime })),
    };
    return acc;
  }, {});
}

function getCapacitySummary(hoursPerDay, windows, startTime) {
  const selectedWindows = windows.length ? windows : [];
  const requested = Math.round(Number(hoursPerDay || 1) * 60);
  const available = selectedWindows.reduce((sum, window) => (
    sum + getWindowCapacityMinutes(window, startTime, selectedWindows.length === 1)
  ), 0);
  return { requested, available, ok: requested <= available };
}

function maxSessionsPerDay(hoursPerDay, methods) {
  const available = Math.round(Number(hoursPerDay || 1) * 60);
  const shortestSession = Math.min(...methods.map((method) => Math.max(1, Number(method.sessionMinutes || 30))));
  const session = Number.isFinite(shortestSession) ? shortestSession : 30;
  return Math.max(1, Math.ceil(available / session));
}

function parseDate(value) {
  const [year, month, day] = String(value || '').slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayString() {
  return formatDate(new Date());
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getStudyCutoffDate(exam) {
  const date = parseDate(exam?.date);
  if (!date) return null;
  return formatDate(addDays(date, -1));
}

function isExamSchedulable(exam, startDate = todayString()) {
  const cutoff = getStudyCutoffDate(exam);
  return !cutoff || cutoff >= startDate;
}

function formatShortDate(value) {
  const date = parseDate(value);
  if (!date) return value || '';
  return new Intl.DateTimeFormat('en', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date);
}

function formatHours(minutes = 0) {
  const hours = minutes / 60;
  if (hours >= 1) return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
  return `${minutes}m`;
}

function groupItemsByDate(items = []) {
  return items.reduce((acc, item) => {
    acc[item.plannedDate] = [...(acc[item.plannedDate] || []), item];
    return acc;
  }, {});
}

function getPlanQuality(result = null, capacity = null) {
  if (!result) return null;
  const unscheduled = Number(result.stats?.unscheduledItems || 0);
  const totalItems = Number(result.stats?.totalItems || 0);
  const totalMinutes = Number(result.stats?.totalMinutes || 0);
  const requested = Number(capacity?.requested || 0);
  const available = Number(capacity?.available || 0);
  const grouped = groupItemsByDate(result.items || []);
  const maxDayItems = Math.max(0, ...Object.values(grouped).map((items) => items.length));
  if (!totalItems) return { label: 'Need more hours', tone: 'warn', helper: 'No sessions fit. Add study windows, lower hours, or reduce activities.' };
  if (unscheduled > 0) return { label: 'Too packed', tone: 'warn', helper: `${unscheduled} task${unscheduled === 1 ? '' : 's'} could not fit. Add time or select fewer activities.` };
  if (maxDayItems >= 6) return { label: 'Too packed', tone: 'warn', helper: `${maxDayItems} sessions on one day. Add windows, lower hours, or use longer sessions.` };
  if (requested > available && available > 0) return { label: 'Too packed', tone: 'warn', helper: 'Requested hours are above selected window capacity. Add time or reduce hours.' };
  if (totalMinutes < requested * 0.6) return { label: 'Light plan', tone: 'info', helper: 'Plan fits, but has space left. Add activities if you want stronger prep.' };
  return { label: 'Balanced', tone: 'good', helper: 'Sessions fit selected windows, avoid exam conflicts, and stop before exam day.' };
}

function normalizeCalendarDateKey(key) {
  const [year, month, day] = String(key || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function calendarEventsToPlannerBlocks(calEvents = {}, exams = []) {
  const blocks = [];
  const seen = new Set();
  const pushBlock = ({ date, time = '09:00', durationMin = 30, source = 'calendar', examId = null, name = '' }) => {
    const plannedDate = normalizeCalendarDateKey(date) || calendarKeyFromDate(date);
    if (!plannedDate || !time || durationMin <= 0) return;
    const plannedTime = normalizeClockTime(time);
    const key = `${plannedDate}:${plannedTime}:${durationMin}:${source}:${examId || name}`;
    if (seen.has(key)) return;
    seen.add(key);
    blocks.push({
      id: `block-${key}`,
      examId,
      type: 'calendar_block',
      plannedDate,
      plannedTime,
      durationMin,
      status: 'planned',
      source,
    });
  };

  Object.entries(calEvents || {}).forEach(([dateKey, events]) => {
    (events || []).forEach((event) => {
      if (!event || event.source === 'study-plan-service') return;
      pushBlock({
        date: dateKey,
        time: event.time || '09:00',
        durationMin: durToMins(event.dur || '30m') || 30,
        source: event.source || event.cat || 'calendar',
        examId: event.examId || null,
        name: event.name || event.title || '',
      });
    });
  });

  (exams || []).forEach((exam) => {
    if (!exam?.date) return;
    const examDuration = Number(exam.durationMin || exam.examDurationMin || 120);
    pushBlock({
      date: exam.date,
      time: exam.time || exam.examTime || '09:00',
      durationMin: examDuration + 120,
      source: 'exam',
      examId: exam.id,
      name: exam.name,
    });
  });

  return blocks;
}

function AIStudyPlanner({ onClose, onPlanAdded, onPlanCleared, exams = [], quizRuns = [], calEvents = {} }) {
  const datedExams = useMemo(() => (exams || []).filter((exam) => exam.status !== 'archived'), [exams]);
  const schedulableExams = useMemo(() => datedExams.filter((exam) => isExamSchedulable(exam)), [datedExams]);
  const defaultExamIds = useMemo(() => schedulableExams.map((exam) => exam.id), [schedulableExams]);
  const [selectedExamIds, setSelectedExamIds] = useState(() => new Set(defaultExamIds));
  const [mode, setMode] = useState('until_exam');
  const [selectedWindowIds, setSelectedWindowIds] = useState(() => new Set());
  const [startTime, setStartTime] = useState('17:00');
  const [hoursPerDay, setHoursPerDay] = useState(2.5);
  const [intensity, setIntensity] = useState('normal');
  const [studyMethodIds, setStudyMethodIds] = useState(() => new Set(['pomodoro_50']));
  const [customSessionMinutes, setCustomSessionMinutes] = useState(90);
  const [customBreakMinutes, setCustomBreakMinutes] = useState(10);
  const [preferences, setPreferences] = useState(['review', 'quiz', 'flashcards', 'mock_exam']);
  const [step, setStep] = useState('form');
  const [materials, setMaterials] = useState([]);
  const [activePlans, setActivePlans] = useState([]);
  const [loadingContext, setLoadingContext] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [added, setAdded] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, []);

  useEffect(() => {
    setSelectedExamIds(new Set(defaultExamIds));
  }, [defaultExamIds]);

  useEffect(() => {
    let cancelled = false;
    async function loadContext() {
      setLoadingContext(true);
      const [materialsResult, plansResult] = await Promise.all([
        listMaterials(),
        listStudyPlans({ status: 'active' }),
      ]);
      if (cancelled) return;
      setMaterials(materialsResult.error ? [] : (materialsResult.data || []));
      setActivePlans(plansResult.error ? [] : (plansResult.data || []));
      setLoadingContext(false);
    }
    loadContext();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (selectedWindowIds.size !== 1) return;
    const [windowId] = [...selectedWindowIds];
    const windowOption = TIME_WINDOWS.find((entry) => entry.id === windowId);
    if (windowOption) setStartTime(windowOption.startTime);
  }, [selectedWindowIds]);

  const selectedExams = datedExams.filter((exam) => selectedExamIds.has(exam.id));
  const selectedSchedulableExams = schedulableExams.filter((exam) => selectedExamIds.has(exam.id));
  const selectedWindows = TIME_WINDOWS.filter((entry) => selectedWindowIds.has(entry.id));
  const selectedWindow = selectedWindows[0] || TIME_WINDOWS[2];
  const studyMethods = STUDY_METHODS.map((method) => (
    method.value === 'custom'
      ? { ...method, sub: `${customSessionMinutes} / ${customBreakMinutes}`, sessionMinutes: customSessionMinutes, breakMinutes: customBreakMinutes }
      : method
  ));
  const selectedMethods = studyMethods.filter((entry) => studyMethodIds.has(entry.value));
  const capacitySummary = getCapacitySummary(hoursPerDay, selectedWindows, startTime);
  const hasActivePlan = activePlans.length > 0;
  const groupedResultItems = result ? groupItemsByDate(result.items) : {};
  const resultDays = Object.keys(groupedResultItems).sort();
  const planQuality = getPlanQuality(result, capacitySummary);
  const calendarBlocks = useMemo(() => calendarEventsToPlannerBlocks(calEvents, datedExams), [calEvents, datedExams]);

  const toggleExam = (id) => {
    const exam = datedExams.find((entry) => entry.id === id);
    if (exam && !isExamSchedulable(exam)) {
      setError(`${exam.name} is past or has no study day left. Move its exam date to the future to include it.`);
      return;
    }
    setError('');
    setSelectedExamIds((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const togglePreference = (preference) => {
    setPreferences((current) => current.includes(preference) ? current.filter((item) => item !== preference) : [...current, preference]);
  };

  const toggleStudyMethod = (methodValue) => {
    setStudyMethodIds((current) => {
      const next = new Set(current);
      if (next.has(methodValue) && next.size > 1) next.delete(methodValue);
      else next.add(methodValue);
      return next;
    });
  };

  const selectWindow = (windowOption) => {
    setSelectedWindowIds((current) => {
      const next = new Set(current);
      if (next.has(windowOption.id) && next.size > 1) next.delete(windowOption.id);
      else next.add(windowOption.id);
      setStartTime(windowOption.startTime);
      return next;
    });
  };

  const preview = () => generateStudyPlan({
    exams: datedExams,
    materials,
    quizRuns,
    existingItems: calendarBlocks,
    options: {
      title: selectedExams.length ? `${selectedExams.map((exam) => exam.name).join(', ')} study plan` : 'Study plan',
      mode,
      examIds: [...selectedExamIds],
      intensity,
      preferences,
      availability: buildAvailability(hoursPerDay, selectedWindows, startTime),
      maxItemsPerDay: maxSessionsPerDay(hoursPerDay, selectedMethods.length ? selectedMethods : [STUDY_METHODS[1]]),
      sessionMinutes: selectedMethods[0]?.sessionMinutes || STUDY_METHODS[1].sessionMinutes,
      breakMinutes: selectedMethods[0]?.breakMinutes || STUDY_METHODS[1].breakMinutes,
      studyMethod: selectedMethods[0]?.value || STUDY_METHODS[1].value,
      studyMethods: selectedMethods.length ? selectedMethods : [STUDY_METHODS[1]],
      bufferRatio: 1,
    },
  });
  const draftQuality = (
    step === 'form' &&
    !loadingContext &&
    selectedSchedulableExams.length > 0 &&
    selectedWindowIds.size > 0 &&
    preferences.length > 0 &&
    capacitySummary.ok
  ) ? getPlanQuality(preview(), capacitySummary) : null;

  const generate = () => {
    setError('');
    if (!selectedExamIds.size) {
      setError('Select at least one exam.');
      return;
    }
    if (!selectedSchedulableExams.length) {
      setError('Select a future exam. Past exams have no study days left.');
      return;
    }
    if (!preferences.length) {
      setError('Select at least one activity type.');
      return;
    }
    if (!selectedWindowIds.size) {
      setError('Select at least one study window.');
      return;
    }
    if (!capacitySummary.ok) {
      setError(`Selected windows have ${formatHours(capacitySummary.available)} available, but you asked for ${formatHours(capacitySummary.requested)}. Select another time window or reduce hours.`);
      return;
    }
    const nextResult = preview();
    setResult(nextResult);
    setStep('result');
  };

  const addToCalendar = async () => {
    if (!result?.items?.length || savingPlan) return;
    setError('');
    setSavingPlan(true);
    try {
      const activePlansResult = await listStudyPlans({ status: 'active' });
      if (activePlansResult.error) {
        setError(formatPlannerError(activePlansResult.error, 'Unable to check existing study plans.'));
        return;
      }
      for (const plan of activePlansResult.data || []) {
        const archiveResult = await updateStudyPlan(plan.id, { status: 'archived' });
        if (archiveResult.error) {
          setError(formatPlannerError(archiveResult.error, 'Unable to archive existing study plan.'));
          return;
        }
      }

      const planResult = await createStudyPlan(result.plan);
      if (planResult.error) {
        setError(formatPlannerError(planResult.error, 'Unable to save study plan.'));
        return;
      }

      const savedItems = [];
      for (const item of result.items) {
        const itemResult = await createStudyPlanItem({ ...item, planId: planResult.data.id });
        if (itemResult.error) {
          setError(formatPlannerError(itemResult.error, 'Unable to save study plan item.'));
          return;
        }
        savedItems.push(itemResult.data);
      }

      const eventsToAdd = savedItems
        .map((item) => {
          const examIndex = datedExams.findIndex((entry) => String(entry.id) === String(item.examId));
          const exam = datedExams[examIndex];
          return { dateKey: calendarKeyFromDate(item.plannedDate), event: studyPlanItemToCalendarEvent(item, exam, examIndex) };
        })
        .filter((entry) => entry.dateKey);

      onPlanAdded(eventsToAdd);
      setAdded(true);
      setTimeout(() => onClose(), 900);
    } finally {
      setSavingPlan(false);
    }
  };

  const clearExistingPlan = async () => {
    setError('');
    const plansResult = await listStudyPlans({ status: 'active' });
    if (plansResult.error) {
      setError(formatPlannerError(plansResult.error, 'Unable to load existing study plan.'));
      return;
    }
    for (const plan of plansResult.data || []) {
      const archiveResult = await updateStudyPlan(plan.id, { status: 'archived' });
      if (archiveResult.error) {
        setError(formatPlannerError(archiveResult.error, 'Unable to delete existing study plan.'));
        return;
      }
    }
    setActivePlans([]);
    setResult(null);
    setStep('form');
    onPlanCleared && onPlanCleared();
  };

  const overlayClick = (e) => { if (!savingPlan && e.target === e.currentTarget && step === 'form') onClose(); };

  return (
    <div style={plannerS.overlay} onClick={overlayClick}>
      <div style={{ ...plannerS.card, maxWidth: step === 'result' ? 820 : 780 }}>
        <div style={plannerS.header}>
          <div style={plannerS.headerLeft}>
            <div style={plannerS.brainBox}><Brain size={28} style={{ color:'#fff' }} /></div>
            <div>
              <div style={plannerS.title}>Study Plan Generator</div>
              <div style={plannerS.sub}>Deterministic calendar plan, no fake AI dates</div>
            </div>
          </div>
          <button onClick={onClose} disabled={savingPlan} style={{ ...plannerS.closeBtn, opacity: savingPlan ? .55 : 1, cursor: savingPlan ? 'not-allowed' : 'pointer' }}><XMark size={22} /></button>
        </div>

        {step === 'form' && (
          <div style={plannerS.body}>
            {loadingContext && <div style={plannerS.notice}>Loading exams and materials...</div>}
            {!loadingContext && !datedExams.length && <div style={plannerS.error}>Create an exam first, then generate a study plan.</div>}
            {!loadingContext && Boolean(datedExams.length) && !schedulableExams.length && <div style={plannerS.warning}>All exams are past. Add a future exam date to generate a plan.</div>}
            {hasActivePlan && (
              <div style={plannerS.planNotice}>
                <div>
                  <b>Existing plan active</b>
                  <span>Generate again replaces it. Or delete it now.</span>
                </div>
                <button type="button" onClick={clearExistingPlan} style={plannerS.deletePlanBtn}>Delete plan</button>
              </div>
            )}

            <section style={plannerS.section}>
              <h3 style={plannerS.sectionTitle}>Exams</h3>
              <div style={plannerS.examGrid}>
                {datedExams.map((exam, index) => {
                  const selected = selectedExamIds.has(exam.id);
                  const disabled = !isExamSchedulable(exam);
                  const color = getExamCalendarPalette(exam, index);
                  return (
                    <button
                      key={exam.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleExam(exam.id)}
                      style={{
                        ...plannerS.examChip,
                        background: color.chipBg,
                        borderColor: selected ? color.border : `${color.border}66`,
                        color: color.text || color.chipText,
                        boxShadow: selected ? `0 12px 28px ${color.border}33` : 'none',
                        opacity: disabled ? .45 : 1,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <span style={plannerS.checkDot}>{selected ? <Check size={14} /> : null}</span>
                      <span>{exam.name}</span>
                      <small>{disabled ? 'Past exam' : (exam.date || 'No date')}</small>
                    </button>
                  );
                })}
              </div>
            </section>

            <section style={plannerS.section}>
              <h3 style={plannerS.sectionTitle}>Schedule</h3>
              <div style={plannerS.fieldLabel}>Mode</div>
              <div style={plannerS.modeGrid}>
                {MODE_OPTIONS.map((option) => (
                  <button key={option.value} type="button" onClick={() => setMode(option.value)} style={{ ...plannerS.modePill, ...(mode === option.value ? plannerS.modePillActive : null) }}>
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <section style={plannerS.section}>
              <h3 style={plannerS.sectionTitle}>When do you study?</h3>
              <div style={plannerS.timeGrid}>
                {TIME_WINDOWS.map((option) => {
                  const active = selectedWindowIds.has(option.id);
                  return (
                    <button key={option.id} type="button" onClick={() => selectWindow(option)} style={{ ...plannerS.timeCard, ...(active ? plannerS.timeCardActive : null) }}>
                      <span style={plannerS.timeEmoji}>{option.emoji}</span>
                      <b>{option.label}</b>
                      <span>{option.range}</span>
                    </button>
                  );
                })}
              </div>
              <div style={plannerS.startBox}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}><Clock size={18} /> Start time</div>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={plannerS.timeInput} />
              </div>
              {!capacitySummary.ok && (
                <div style={plannerS.warning}>
                  {selectedWindowIds.size
                    ? `Selected windows give ${formatHours(capacitySummary.available)}. You asked ${formatHours(capacitySummary.requested)}. Add another window or lower hours.`
                    : 'Select at least one study window.'}
                </div>
              )}
            </section>

            <section style={plannerS.section}>
              <h3 style={plannerS.sectionTitle}>Hours per study day</h3>
              <div style={plannerS.sliderRow}>
                <div style={plannerS.hoursBig}>{hoursPerDay}h<span style={plannerS.hoursLabel}>per day</span></div>
                <div style={{ flex:1 }}>
                  <input type="range" min="1" max="8" step="0.5" value={hoursPerDay} onChange={(e) => setHoursPerDay(Number(e.target.value))} style={plannerS.range} />
                  <div style={plannerS.rangeMarks}>{[1,2,3,4,5,6,7,8].map((hour) => <span key={hour}>{hour}h</span>)}</div>
                </div>
              </div>
            </section>

            <section style={plannerS.section}>
              <h3 style={plannerS.sectionTitle}>Intensity</h3>
              <div style={plannerS.cardGrid3}>
                {INTENSITY_OPTIONS.map((option) => {
                  const active = intensity === option.value;
                  return (
                    <button key={option.value} type="button" onClick={() => setIntensity(option.value)} style={{ ...plannerS.optionCard, ...(active ? plannerS.optionCardActive : null) }}>
                      <span style={plannerS.optionEmoji}>{option.emoji}</span>
                      <b>{option.label}</b>
                      <span>{option.sub}</span>
                    </button>
                  );
                })}
              </div>
              <div style={plannerS.notice}>Intensity changes generated task size: Light 75%, Normal 100%, Intensive 135%.</div>
            </section>

            <section style={plannerS.section}>
              <h3 style={plannerS.sectionTitle}>Study method</h3>
              <div style={plannerS.methodRow}>
                {studyMethods.map((method) => (
                    <button key={method.value} type="button" onClick={() => toggleStudyMethod(method.value)} style={{ ...plannerS.methodPill, ...(studyMethodIds.has(method.value) ? plannerS.methodPillActive : null) }}>
                    <b>{method.label}</b>
                    <span>{method.sub}</span>
                  </button>
                ))}
              </div>
              {studyMethodIds.has('custom') && (
                <div style={plannerS.customMethodBox}>
                  <label style={plannerS.customMethodField}>
                    <span>Session</span>
                    <input
                      type="number"
                      min="15"
                      max="180"
                      step="5"
                      value={customSessionMinutes}
                      onChange={(event) => setCustomSessionMinutes(Math.max(15, Math.min(180, Number(event.target.value) || 90)))}
                      style={plannerS.numberInput}
                    />
                  </label>
                  <label style={plannerS.customMethodField}>
                    <span>Break</span>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      step="5"
                      value={customBreakMinutes}
                      onChange={(event) => setCustomBreakMinutes(Math.max(0, Math.min(60, Number(event.target.value) || 0)))}
                      style={plannerS.numberInput}
                    />
                  </label>
                  <span style={plannerS.customMethodHint}>Minutes. Example: 90 session + 10 break.</span>
                </div>
              )}
            </section>

            <section style={plannerS.section}>
              <h3 style={plannerS.sectionTitle}>Activities</h3>
              <div style={plannerS.activityRow}>
                {ACTIVITY_OPTIONS.map((activity) => {
                  const active = preferences.includes(activity.value);
                  const Icon = activity.Icon;
                  return (
                    <button key={activity.value} type="button" onClick={() => togglePreference(activity.value)} style={{ ...plannerS.activityPill, ...(active ? plannerS.activityPillActive : null) }}>
                      <Icon size={18} /> {activity.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {draftQuality && (
              <div style={{ ...plannerS.qualityBox, ...(draftQuality.tone === 'good' ? plannerS.qualityGood : draftQuality.tone === 'warn' ? plannerS.qualityWarn : plannerS.qualityInfo) }}>
                <b>{draftQuality.label}</b>
                <span>{draftQuality.helper}</span>
              </div>
            )}
            {error && <div style={plannerS.error}>{error}</div>}
          </div>
        )}

        {step === 'result' && result && (
          <div style={plannerS.body}>
            <section style={plannerS.section}>
              <h3 style={plannerS.sectionTitle}>Your plan</h3>
              <p style={plannerS.planMeta}>{MODE_OPTIONS.find((option) => option.value === mode)?.label} plan · {selectedWindows.map((entry) => entry.label.toLowerCase()).join(' + ') || selectedWindow.label.toLowerCase()} · {intensity} intensity</p>
              <div style={plannerS.statGrid}>
                <div style={plannerS.statCard}><b>{result.stats.totalItems}</b><span>Sessions</span></div>
                <div style={plannerS.statCard}><b>{formatHours(result.stats.totalMinutes)}</b><span>Total study</span></div>
                <div style={plannerS.statCard}><b>{resultDays.length}</b><span>Study days</span></div>
              </div>
              {planQuality && (
                <div style={{ ...plannerS.qualityBox, ...(planQuality.tone === 'good' ? plannerS.qualityGood : planQuality.tone === 'warn' ? plannerS.qualityWarn : plannerS.qualityInfo) }}>
                  <b>{planQuality.label}</b>
                  <span>{planQuality.helper}</span>
                </div>
              )}
            </section>

            <section style={plannerS.section}>
              <h3 style={plannerS.sectionTitle}>Schedule by day</h3>
              <div style={plannerS.dragHint}><Layers size={16} /> Drag later will let you move sessions between days.</div>
              {resultDays.length === 0 ? (
                <div style={plannerS.emptyResult}>
                  <b>No sessions generated</b>
                  <span>Increase hours, select fewer activities, or delete old plan then regenerate.</span>
                </div>
              ) : (
                <div style={plannerS.dayList}>
                  {resultDays.map((date) => (
                  <div key={date} style={plannerS.dayRow}>
                    <div style={plannerS.dayLabel}>
                      <b>{formatShortDate(date)}</b>
                      <span>{groupedResultItems[date].length} session{groupedResultItems[date].length === 1 ? '' : 's'}</span>
                    </div>
                    <div style={plannerS.sessionList}>
                      {groupedResultItems[date].map((item, index) => {
                        const exam = datedExams.find((entry) => String(entry.id) === String(item.examId));
                        const examIndex = Math.max(0, datedExams.findIndex((entry) => String(entry.id) === String(item.examId)));
                        const examColor = getExamCalendarPalette(exam, examIndex);
                        const activity = ACTIVITY_OPTIONS.find((entry) => entry.value === item.type) || ACTIVITY_OPTIONS[0];
                        const Icon = activity.Icon;
                        return (
                          <div key={`${date}-${item.plannedTime}-${index}`} style={{ ...plannerS.sessionCard, borderLeftColor: examColor.border }}>
                            <span style={plannerS.dragDots}>::</span>
                            <span style={{ ...plannerS.sessionDot, background: examColor.border }} />
                            <b>{exam?.name || 'Study'}</b>
                            <span style={plannerS.methodBadge}>{item.studyMethodLabel || selectedMethods[0]?.sub || STUDY_METHODS[1].sub}</span>
                            <span style={plannerS.sessionTime}>{item.plannedTime} · {item.durationMin}m</span>
                            <span style={{ ...plannerS.typeBadge, color: examColor.text, background: examColor.bg }}><Icon size={14} /> {activity.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  ))}
                </div>
              )}
            </section>

            {result.warnings.map((warning) => <div key={warning} style={plannerS.notice}>{warning}</div>)}
            {Boolean(result.insights?.length) && (
              <div style={plannerS.logicBox}>
                <b>Plan logic</b>
                {result.insights.map((insight) => <span key={insight}>{insight}</span>)}
              </div>
            )}
            {error && <div style={plannerS.error}>{error}</div>}
            {savingPlan && <div style={plannerS.savingNotice}><span style={plannerS.spinnerDark} /> Saving plan to calendar...</div>}
            {added && <div style={plannerS.success}><Check size={16} /> Added to Calendar</div>}
          </div>
        )}

        <div style={plannerS.footer}>
          {step === 'form' && <button onClick={generate} disabled={loadingContext || !schedulableExams.length || !selectedWindowIds.size || !capacitySummary.ok} style={{ ...plannerS.generateBtn, opacity: loadingContext || !schedulableExams.length || !selectedWindowIds.size || !capacitySummary.ok ? .55 : 1, cursor: loadingContext || !schedulableExams.length || !selectedWindowIds.size || !capacitySummary.ok ? 'not-allowed' : 'pointer' }}><Sparkles size={20} /> {hasActivePlan ? 'Regenerate plan' : 'Generate plan'}</button>}
          {step === 'result' && !added && (
            <div style={plannerS.footerActions}>
              <button onClick={() => { setStep('form'); setError(''); }} disabled={savingPlan} style={{ ...plannerS.secondaryBtn, opacity: savingPlan ? .55 : 1, cursor: savingPlan ? 'not-allowed' : 'pointer' }}>Back</button>
              <button onClick={addToCalendar} disabled={!result.items.length || savingPlan} style={{ ...plannerS.generateBtn, opacity: result.items.length && !savingPlan ? 1 : .55, cursor: result.items.length && !savingPlan ? 'pointer' : 'not-allowed' }}>
                {savingPlan ? <><span style={plannerS.spinnerLight} /> Saving plan...</> : <><CalendarIcon size={20} /> Save to calendar</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const plannerS = {
  overlay: { position:'fixed', inset:0, background:'rgba(15,23,42,.48)', zIndex:200, display:'grid', placeItems:'center', padding:24, overflow:'hidden' },
  card: { background:'#fff', borderRadius:18, border:'1px solid #E5E7EB', width:'100%', maxHeight:'calc(100dvh - 48px)', minHeight:0, overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 70px rgba(15,23,42,.24)' },
  header: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 22px', borderBottom:'1px solid #E5E7EB', background:'#fff', flexShrink:0 },
  headerLeft: { display:'flex', alignItems:'center', gap:12 },
  brainBox: { width:44, height:44, borderRadius:12, background:'linear-gradient(135deg, #3730E8, #7C3AED)', display:'grid', placeItems:'center', boxShadow:'0 12px 20px rgba(55,48,232,.18)', flexShrink:0 },
  title: { fontSize:21, lineHeight:1.1, fontWeight:900, color:'#0F172A', letterSpacing:0 },
  sub: { fontSize:13, color:'#64748B', marginTop:3, fontWeight:700 },
  closeBtn: { width:42, height:42, borderRadius:999, background:'#F8FAFC', border:'1px solid #E5E7EB', color:'#64748B', display:'grid', placeItems:'center', cursor:'pointer' },
  body: { padding:'18px 22px', display:'flex', flexDirection:'column', gap:16, flex:'1 1 auto', minHeight:0, overflowY:'auto', overscrollBehavior:'contain' },
  section: { display:'flex', flexDirection:'column', gap:10 },
  sectionTitle: { margin:0, fontSize:16, fontWeight:900, color:'#0F172A', letterSpacing:0 },
  fieldLabel: { fontSize:12, fontWeight:900, color:'#94A3B8' },
  examGrid: { display:'flex', flexWrap:'wrap', gap:10 },
  examChip: { display:'inline-flex', alignItems:'center', gap:7, border:'1.5px solid', borderRadius:999, padding:'8px 13px', cursor:'pointer', fontSize:13, fontWeight:900, transition:'all .16s' },
  checkDot: { width:15, height:15, borderRadius:999, display:'grid', placeItems:'center', background:'rgba(255,255,255,.25)', flexShrink:0 },
  modeGrid: { display:'flex', gap:8, flexWrap:'wrap' },
  modePill: { border:'1.5px solid #E5E7EB', background:'#F8FAFC', color:'#475569', borderRadius:11, padding:'9px 14px', cursor:'pointer', fontSize:13, fontWeight:900 },
  modePillActive: { borderColor:'#3730E8', background:'#EEF2FF', color:'#3730E8' },
  timeGrid: { display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:8 },
  timeCard: { minHeight:76, border:'1.5px solid #E5E7EB', borderRadius:13, background:'#fff', color:'#475569', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', gap:4, cursor:'pointer', fontSize:12, fontWeight:900 },
  timeCardActive: { borderColor:'#3730E8', background:'#EEF2FF', color:'#3730E8', boxShadow:'0 12px 22px rgba(55,48,232,.1)' },
  timeEmoji: { fontSize:19, lineHeight:1 },
  startBox: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, border:'1.5px solid #E5E7EB', background:'#F8FAFC', borderRadius:13, padding:'10px 13px', color:'#64748B', fontSize:13, fontWeight:900 },
  timeInput: { border:'1.5px solid #E5E7EB', background:'#fff', color:'#3730E8', borderRadius:11, padding:'8px 10px', fontSize:14, fontWeight:900 },
  sliderRow: { display:'flex', alignItems:'center', gap:18 },
  hoursBig: { minWidth:76, color:'#3730E8', fontSize:30, fontWeight:900, lineHeight:1, letterSpacing:0, display:'flex', flexDirection:'column', gap:4 },
  hoursLabel: { color:'#64748B', fontSize:12, fontWeight:900, letterSpacing:0 },
  range: { width:'100%', accentColor:'#3730E8' },
  rangeMarks: { display:'flex', justifyContent:'space-between', marginTop:5, color:'#94A3B8', fontSize:11, fontWeight:900 },
  cardGrid3: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:9 },
  optionCard: { border:'1.5px solid #E5E7EB', borderRadius:13, background:'#fff', color:'#475569', minHeight:72, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', gap:4, cursor:'pointer', fontSize:13, fontWeight:900 },
  optionCardActive: { borderColor:'#3730E8', background:'#EEF2FF', color:'#3730E8', boxShadow:'0 12px 22px rgba(55,48,232,.1)' },
  optionEmoji: { fontSize:19, lineHeight:1 },
  methodRow: { display:'flex', flexWrap:'wrap', gap:8 },
  methodPill: { border:'1.5px solid #E5E7EB', borderRadius:11, background:'#F8FAFC', color:'#0F172A', padding:'9px 14px', display:'flex', flexDirection:'column', gap:1, cursor:'pointer', fontSize:12, fontWeight:900, minWidth:104, textAlign:'left' },
  methodPillActive: { borderColor:'#3730E8', background:'#EEF2FF', color:'#3730E8' },
  customMethodBox: { display:'flex', alignItems:'center', flexWrap:'wrap', gap:10, border:'1.5px solid #C7D2FE', borderRadius:13, background:'#EEF2FF', padding:'10px 12px' },
  customMethodField: { display:'flex', alignItems:'center', gap:8, color:'#3730E8', fontSize:12, fontWeight:900 },
  customMethodHint: { color:'#64748B', fontSize:12, fontWeight:800 },
  numberInput: { width:74, border:'1.5px solid #C7D2FE', borderRadius:10, background:'#fff', color:'#0F172A', padding:'7px 9px', fontSize:13, fontWeight:900 },
  examSettingsList: { display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:8 },
  examSettingRow: { display:'grid', gridTemplateColumns:'1fr 170px', alignItems:'center', gap:10, border:'1px solid #E5E7EB', borderLeft:'3px solid #3730E8', borderRadius:11, background:'#F8FAFC', padding:'8px 10px', fontSize:12, fontWeight:900 },
  examMethodSelect: { width:'100%', border:'1px solid #E5E7EB', borderRadius:9, background:'#fff', color:'#0F172A', padding:'7px 9px', fontSize:12, fontWeight:800 },
  activityRow: { display:'flex', flexWrap:'wrap', gap:8 },
  activityPill: { display:'inline-flex', alignItems:'center', gap:7, border:'1.5px solid #E5E7EB', borderRadius:999, background:'#fff', color:'#475569', padding:'9px 14px', cursor:'pointer', fontSize:13, fontWeight:900 },
  activityPillActive: { borderColor:'#3730E8', background:'#3730E8', color:'#fff', boxShadow:'0 12px 22px rgba(55,48,232,.16)' },
  notice: { padding:'10px 12px', borderRadius:12, border:'1px solid #E5E7EB', background:'#F8FAFC', color:'#64748B', fontSize:13, fontWeight:800 },
  logicBox: { padding:'10px 12px', borderRadius:12, border:'1px solid #E5E7EB', background:'#F8FAFC', color:'#64748B', display:'flex', flexDirection:'column', gap:5, fontSize:12, fontWeight:800 },
  warning: { padding:'10px 12px', borderRadius:12, border:'1px solid #FDE68A', background:'#FFFBEB', color:'#92400E', fontSize:12, fontWeight:900 },
  planNotice: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'10px 12px', borderRadius:13, border:'1px solid #C7D2FE', background:'#EEF2FF', color:'#3730E8', fontSize:12, fontWeight:900 },
  deletePlanBtn: { border:'1.5px solid #FCA5A5', background:'#FEF2F2', color:'#991B1B', borderRadius:10, padding:'8px 11px', fontSize:12, fontWeight:900, cursor:'pointer', flexShrink:0 },
  emptyResult: { display:'flex', flexDirection:'column', gap:6, padding:'18px 20px', borderRadius:16, border:'1.5px dashed #CBD5E1', background:'#F8FAFC', color:'#64748B', fontSize:15, fontWeight:900 },
  error: { padding:'12px 14px', borderRadius:14, border:'1px solid #FCA5A5', background:'#FEF2F2', color:'#991B1B', fontSize:14, fontWeight:900 },
  success: { display:'flex', alignItems:'center', gap:8, padding:'12px 14px', borderRadius:14, border:'1px solid #86EFAC', background:'#DCFCE7', color:'#166534', fontSize:14, fontWeight:900 },
  savingNotice: { display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:14, border:'1px solid #C7D2FE', background:'#EEF2FF', color:'#3730E8', fontSize:14, fontWeight:900 },
  spinnerLight: { width:18, height:18, borderRadius:999, border:'2px solid rgba(255,255,255,.45)', borderTopColor:'#fff', animation:'spin-once .8s linear infinite', flexShrink:0 },
  spinnerDark: { width:18, height:18, borderRadius:999, border:'2px solid rgba(55,48,232,.18)', borderTopColor:'#3730E8', animation:'spin-once .8s linear infinite', flexShrink:0 },
  qualityBox: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'12px 14px', borderRadius:14, fontSize:13, fontWeight:900 },
  qualityGood: { border:'1px solid #86EFAC', background:'#DCFCE7', color:'#166534' },
  qualityWarn: { border:'1px solid #FDE68A', background:'#FFFBEB', color:'#92400E' },
  qualityInfo: { border:'1px solid #C7D2FE', background:'#EEF2FF', color:'#3730E8' },
  planMeta: { margin:0, color:'#64748B', fontSize:15, fontWeight:900 },
  statGrid: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 },
  statCard: { border:'1.5px solid #E5E7EB', borderRadius:16, background:'#F8FAFC', textAlign:'center', padding:'18px 10px', color:'#3730E8', display:'flex', flexDirection:'column', alignItems:'center', gap:4 },
  dragHint: { display:'flex', alignItems:'center', gap:8, color:'#94A3B8', fontSize:15, fontWeight:900 },
  dayList: { display:'flex', flexDirection:'column', gap:18 },
  dayRow: { display:'grid', gridTemplateColumns:'120px 1fr', gap:16, alignItems:'start' },
  dayLabel: { display:'flex', flexDirection:'column', gap:3, paddingTop:8, color:'#0F172A', fontSize:14, fontWeight:900 },
  sessionList: { display:'flex', flexDirection:'column', gap:10 },
  sessionCard: { minHeight:50, display:'grid', gridTemplateColumns:'18px 12px 1fr auto auto auto', alignItems:'center', gap:10, border:'1.5px solid #E5E7EB', borderLeft:'2px solid #3730E8', borderRadius:15, background:'#fff', padding:'9px 15px', boxShadow:'0 8px 18px rgba(15,23,42,.06)', color:'#0F172A', fontSize:14, fontWeight:900 },
  dragDots: { color:'#CBD5E1', letterSpacing:1 },
  sessionDot: { width:11, height:11, borderRadius:999, background:'#2563EB' },
  methodBadge: { borderRadius:999, background:'#F1F5F9', color:'#94A3B8', padding:'5px 11px', fontSize:14 },
  sessionTime: { color:'#64748B', fontSize:15 },
  typeBadge: { display:'inline-flex', alignItems:'center', gap:6, borderRadius:999, background:'#EEF2FF', color:'#3730E8', padding:'7px 12px', fontSize:15 },
  footer: { padding:'14px 22px', borderTop:'1px solid #E5E7EB', background:'#fff', flexShrink:0 },
  footerActions: { display:'grid', gridTemplateColumns:'140px 1fr', gap:12 },
  generateBtn: { width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:9, padding:'12px 14px', borderRadius:13, background:'#3730E8', color:'#fff', fontSize:15, fontWeight:900, border:'none', cursor:'pointer', boxShadow:'0 14px 24px rgba(55,48,232,.16)' },
  secondaryBtn: { padding:'12px 14px', borderRadius:13, background:'#fff', color:'#475569', fontSize:14, fontWeight:900, border:'1.5px solid #E5E7EB', cursor:'pointer' },
};

export default AIStudyPlanner;
