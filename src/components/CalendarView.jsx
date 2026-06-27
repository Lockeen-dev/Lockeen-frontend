import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Brain, CalendarIcon, Check, ChevronDown, FileText, GripDots, Paperclip, Plus, Trash } from '../lib/icons';
import { getExamPalette } from '../lib/examUi';
import {
  createCalendarActivity,
  deleteCalendarActivity,
  listCalendarEvents,
  listUserCalendarActivities,
  updateCalendarActivity,
} from '../services/calendar';
import { autoRescheduleMissedStudyPlanItems, listStudyPlanItems, listStudyPlans, updateStudyPlanItem } from '../services/studyPlans';
import { localeFor, tt } from '../lib/i18n';
import useIsMobile from '../lib/useIsMobile';
import { homeS } from '../styles/dashboardStyles';
import { LIFE_CATS, applyExamPaletteToEvent, calendarKeyFromDate, dayKey, durToMins, initCalEvents, normalizeClockTime, resolveEventPalette, resolveStudyPalette, studyPlanItemToCalendarEvent } from './calendarData';
export { LIFE_CATS, dayKey, durToMins, initCalEvents, resolveEventPalette };

/* ===================== CALENDAR HELPERS ===================== */
const CAL_MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CAL_MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const getMonday  = (d) => { const r = new Date(d); const day = r.getDay(); r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day)); r.setHours(0,0,0,0); return r; };
const calAddDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const keyAddDays = (key, n) => {
  const date = dateFromCalendarKey(key);
  return date ? dayKey(calAddDays(date, n)) : key;
};
const CAL_HOUR_H = 42;
const CAL_START_H = 0;

const STUDY_PLAN_TYPE_LABELS = {
  review: 'Study',
  quiz: 'Quiz',
  flashcards: 'Flashcards',
  mock_exam: 'Mock exam',
  buffer: 'Buffer',
};

function keyToPlannerDate(key) {
  const [year, month, day] = String(key || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function inferStudyPlanType(event = {}) {
  if (event.studyType) return event.studyType;
  const name = String(event.name || '').toLowerCase();
  if (name.includes('quiz')) return 'quiz';
  if (name.includes('flashcard')) return 'flashcards';
  if (name.includes('mock')) return 'mock_exam';
  if (name.includes('review')) return 'review';
  return 'review';
}

function renameStudyPlanEvent(event = {}, studyType = 'review') {
  const label = STUDY_PLAN_TYPE_LABELS[studyType] || 'Study';
  const scope = String(event.name || '').split('—').slice(1).join('—').trim() || event.noteSubject || 'Study';
  return `${label} — ${scope}`;
}

function isStudyLikeEvent(event = {}) {
  if (!event || event.source === 'exam-service' || event.type === 'exam') return false;
  if (String(event.name || '').startsWith('📝 Exam:')) return false;
  if (event.source === 'study-plan-service') return true;
  const category = String(event.cat || event.category || '').toLowerCase();
  if (category === 'study') return true;
  const type = String(event.type || event.studyType || '').toLowerCase();
  if (['study', 'review', 'quiz', 'flashcards', 'mock_exam'].includes(type)) return true;
  if (!event.source && !category && !type) return true;
  return false;
}

function clockToMinutes(value = '09:00') {
  const [hour, minute] = normalizeClockTime(value).split(':').map(Number);
  return hour * 60 + minute;
}

function minutesToClock(minutes = 0) {
  const value = Math.max(0, Math.min(23 * 60 + 59, Number(minutes) || 0));
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function minutesToDuration(minutes = 0) {
  const value = Math.max(1, Number(minutes) || 30);
  if (value >= 60 && value % 60 === 0) return `${value / 60}h`;
  if (value > 60) return `${Math.floor(value / 60)}h${value % 60}m`;
  return `${value}m`;
}

function subjectPaletteFromText(value = '') {
  const text = String(value || '').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 360;
  const hue = ((hash % 300) + 300) % 300;
  return {
    color: `hsl(${hue}, 76%, 44%)`,
    bg: `hsl(${hue}, 80%, 93%)`,
    text: `hsl(${hue}, 75%, 30%)`,
  };
}

function makeSubjectOptionNoteId(value) {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

function buildSubjectOptionsFromContext(exams = [], events = {}) {
  const examIds = new Set((exams || []).map((exam) => String(exam.id)));
  const subjects = new Map();

  (exams || []).forEach((exam) => {
    const subject = String(exam?.subject || exam?.name || '').trim();
    if (!subject) return;
    const key = subject.toLowerCase();
    if (subjects.has(key)) return;
    const palette = getExamPalette(exam, false);
    subjects.set(key, {
      subject,
      noteId: exam.id,
      color: exam.dot || palette.dot || exam.color || '#4F46E5',
      bg: palette.bg || '#EEF2FF',
      text: palette.text || '#3730A3',
    });
  });

  Object.values(events || {}).forEach((dayEvents = []) => {
    (dayEvents || []).forEach((event) => {
      if (!event?.source) return;
      if (!examIds.has(String(event.examId || event.noteId || ''))) return;
      const subject = String(event?.noteSubject || '').trim();
      if (!subject) return;
      const key = subject.toLowerCase();
      if (subjects.has(key)) return;
      const palette = subjectPaletteFromText(subject);
      subjects.set(key, {
        subject,
        noteId: makeSubjectOptionNoteId(event.noteId || event.examId || event.serviceId || null),
        color: event.noteColor || palette.color,
        bg: event.noteBg || palette.bg,
        text: event.noteText || palette.text,
      });
    });
  });

  return Array.from(subjects.values());
}

function getEventDurationMinutes(event = {}) {
  const explicit = Number(event.durationMin);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return Math.max(15, durToMins(event.dur || '30m') || 15);
}

function buildEventRange(event = {}, overrideTime = null) {
  const start = clockToMinutes(typeof overrideTime === 'string' ? overrideTime : event.time || '09:00');
  const duration = Math.max(15, getEventDurationMinutes(event));
  return { start, end: start + duration };
}

function hasOverlappingEvent(dayEvents = [], candidateEvent = {}, candidateTime = null, { skipServiceId = null, skipIndex = null } = {}) {
  const candidate = buildEventRange(candidateEvent, candidateTime);
  if (candidateTime && (candidate.start < 0 || candidate.end > 24 * 60)) return true;
  return (dayEvents || []).some((event, index) => {
    if (candidateEvent?.serviceId && String(event?.serviceId || '') === String(candidateEvent.serviceId)) return false;
    if (skipServiceId && String(event?.serviceId || '') === String(skipServiceId)) return false;
    if (Number.isInteger(skipIndex) && skipIndex >= 0 && index === skipIndex) return false;
    const block = buildEventRange(event);
    return candidate.start < block.end && candidate.end > block.start;
  });
}

function eventTimeRange(event = {}) {
  const { start, end } = buildEventRange(event);
  return { start, end };
}

function buildEventLayouts(dayEvents = []) {
  return dayEvents.map((event, index) => {
    const { start, end } = eventTimeRange(event);
    const overlapping = dayEvents
      .map((other, otherIndex) => {
        const { start: otherStart, end: otherEnd } = eventTimeRange(other);
        return { index: otherIndex, start: otherStart, end: otherEnd };
      })
      .filter((other) => start < other.end && end > other.start)
      .sort((a, b) => a.start - b.start || a.index - b.index);
    return {
      col: Math.max(0, overlapping.findIndex((other) => other.index === index)),
      cols: Math.max(1, overlapping.length),
    };
  });
}

function formatCalendarError(error) {
  if (!error) return 'Unable to load calendar events.';
  if (error.code === 'AUTH_REQUIRED') {
    return 'Real mode requires an authenticated Supabase session.';
  }
  if (error.code === 'SUPABASE_CONFIG_MISSING') {
    return 'Supabase config is missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
  }
  return error.message || 'Unable to load calendar events.';
}

function serviceEventToCalendarEvent(event) {
  const title = String(event.title || event.name || 'Exam');
  const palette = resolveStudyPalette({
    ...event,
    title,
    name: String(event.name || title),
    subject: String(event.subject || title),
  });
  return {
    type: event.type,
    source: 'exam-service',
    serviceId: event.id,
    examId: event.examId,
    name: `📝 Exam: ${title}`,
    time: normalizeClockTime(event.time || '09:00'),
    dur: event.durationMin ? `${Math.max(1, Number(event.durationMin))}m` : '2h',
    cat: 'study',
    noteId: event.examId,
    noteColor: palette.color,
    noteBg: palette.bg,
    noteText: palette.text,
    noteSubject: palette.subject,
  };
}

function userActivityToCalendarEvent(activity = {}) {
  return {
    source: 'calendar-activity-service',
    serviceId: activity.id,
    name: activity.title || 'Activity',
    time: normalizeClockTime(activity.activityTime || '09:00'),
    dur: minutesToDuration(activity.durationMin || 60),
    cat: activity.category || 'study',
    noteId: activity.noteId || null,
    noteColor: activity.noteColor || null,
    noteBg: activity.noteBg || null,
    noteText: activity.noteText || null,
    noteSubject: activity.noteSubject || null,
    notes: activity.notes || '',
    materials: activity.materials || [],
    files: activity.files || [],
    completed: Boolean(activity.completed),
  };
}

function isServiceManagedEvent(event = {}) {
  return (
    event.source === 'exam-service' ||
    event.source === 'study-plan-service' ||
    event.source === 'calendar-activity-service' ||
    (event.cat === 'study' && String(event.name || '').startsWith('📝 Exam:'))
  );
}

function dateFromCalendarKey(key) {
  const [year, month, day] = String(key || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function examCutoffKey(exam = null) {
  if (!exam?.date) return null;
  const date = dateFromCalendarKey(calendarKeyFromDate(exam.date));
  return date ? dayKey(calAddDays(date, -1)) : null;
}

export function CalendarView({ events, setEvents, setTab, onOpenPlanner, exams = [], onStudySessionsChanged, lang = 'en' }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const isMobile = useIsMobile();
  const [view, setView]           = useState('week');
  const [weekStart, setWeekStart] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [viewYear, setViewYear]   = useState(() => new Date().getFullYear());
  const [mobileSelectedKey, setMobileSelectedKey] = useState(() => dayKey(new Date()));
  const [activeCats, setActiveCats] = useState(() => new Set(LIFE_CATS.map(c => c.id)));
  const [modalKey, setModalKey]     = useState(null);
  const [dayDetailKey, setDayDetailKey] = useState(null);
  const [selCat, setSelCat]         = useState('study');
  const [selNoteId, setSelNoteId]   = useState(null);
  const [modalName, setModalName]   = useState('');
  const [modalTime, setModalTime]   = useState('09:00');
  const [modalDur, setModalDur]     = useState('1h');
  const [customH, setCustomH]       = useState(0);
  const [customM, setCustomM]       = useState(30);
  const [drag, setDrag]             = useState(null);
  const [viewDropOpen, setViewDropOpen] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState(null);
  const [serviceEventCount, setServiceEventCount] = useState(0);
  const [rescheduleNotice, setRescheduleNotice] = useState(null);
  const [density, setDensity] = useState('compact');
  const dragMeta   = useRef({});
  const monthDragMeta = useRef({});
  const moveCalendarEventRef = useRef(null);
  const [monthDrag, setMonthDrag] = useState(null);
  const gridBodyRef = useRef(null);
  const eventWithExamPalette = useMemo(() => (event) => applyExamPaletteToEvent(event, exams), [exams]);
  const paletteForEvent = (event) => resolveEventPalette(eventWithExamPalette(event));
  const subjectOptions = useMemo(() => buildSubjectOptionsFromContext(exams, events), [exams, events]);
  const getVisibleDayEvents = (key) => (events[key] || []).map((event, index) => ({ event, index })).filter(({ event }) => activeCats.has(event.cat));

  const resolveEventIndex = (key, eventOrIdx) => {
    const dayEvents = events[key] || [];
    if (typeof eventOrIdx === 'number' && Number.isInteger(eventOrIdx) && eventOrIdx >= 0) {
      if (eventOrIdx < dayEvents.length) return eventOrIdx;
    }
    if (dayEvents.length === 0) return -1;
    const serviceId = String(eventOrIdx?.serviceId || '').trim();
    if (serviceId) {
      const byServiceId = dayEvents.findIndex((event) => String(event.serviceId || '') === serviceId);
      if (byServiceId >= 0) return byServiceId;
    }
    if (Number.isInteger(eventOrIdx?.index) && eventOrIdx.index >= 0 && eventOrIdx.index < dayEvents.length) {
      return eventOrIdx.index;
    }
    const sourceTimeKey = normalizeClockTime(eventOrIdx?.time || '09:00');
    const matchBySignature = dayEvents.findIndex((event) =>
      event.source === eventOrIdx?.source &&
      normalizeClockTime(event.time || '09:00') === sourceTimeKey &&
      (event.name || '') === (eventOrIdx?.name || '') &&
      event.cat === eventOrIdx?.cat,
    );
    return matchBySignature >= 0 ? matchBySignature : dayEvents.indexOf(eventOrIdx);
  };

  useEffect(() => {
    if (view !== 'week' || !gridBodyRef.current) return;
    const now = new Date();
    const scrollTo = (now.getHours() + now.getMinutes() / 60) * CAL_HOUR_H - 120;
    gridBodyRef.current.scrollTop = Math.max(0, scrollTo);
  }, [view]);

  useEffect(() => {
    const focusPlannedDate = (event) => {
      const target = dateFromCalendarKey(event.detail?.dateKey);
      if (!target) return;
      setView('week');
      setWeekStart(getMonday(target));
      setViewMonth(target.getMonth());
      setViewYear(target.getFullYear());
    };
    window.addEventListener('lockeen:calendar-focus', focusPlannedDate);
    return () => window.removeEventListener('lockeen:calendar-focus', focusPlannedDate);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadExamEvents() {
      setCalendarLoading(true);
      setCalendarError(null);
      setRescheduleNotice(null);
      const [examResult, planListResult, activityResult] = await Promise.all([
        listCalendarEvents(),
        listStudyPlans({ status: 'active' }),
        listUserCalendarActivities(),
      ]);
      if (cancelled) return;
      if (examResult.error) {
        setCalendarError(formatCalendarError(examResult.error));
        setServiceEventCount(0);
        setCalendarLoading(false);
        return;
      }

      const activePlans = planListResult.error ? [] : [...(planListResult.data || [])].sort((a, b) => {
        const bt = new Date(b.createdAt || 0).getTime();
        const at = new Date(a.createdAt || 0).getTime();
        return bt - at;
      });
      const latestPlan = activePlans[0] || null;
      if (latestPlan) {
        const rescheduleResult = await autoRescheduleMissedStudyPlanItems({ planId: latestPlan.id, exams });
        if (!cancelled && !rescheduleResult.error && (rescheduleResult.data?.rescheduled || rescheduleResult.data?.missed)) {
          const { rescheduled = 0, missed = 0 } = rescheduleResult.data;
          setRescheduleNotice(`${rescheduled} missed session${rescheduled === 1 ? '' : 's'} moved forward${missed ? ` · ${missed} could not fit` : ''}.`);
        }
      }
      if (cancelled) return;
      const planResult = latestPlan ? await listStudyPlanItems({ planId: latestPlan.id }) : { data: [] };
      if (cancelled) return;

      const grouped = {};
      (examResult.data || []).forEach((event) => {
        const key = calendarKeyFromDate(event.date);
        if (!key) return;
        grouped[key] = [...(grouped[key] || []), serviceEventToCalendarEvent(event)];
      });
      (planResult.error ? [] : (planResult.data || []))
        .filter((item) => item.status !== 'rescheduled' && item.status !== 'missed' && item.status !== 'skipped')
        .forEach((item) => {
        const key = calendarKeyFromDate(item.plannedDate);
        if (!key) return;
        const examIndex = exams.findIndex((entry) => String(entry.id) === String(item.examId));
        const exam = exams[examIndex];
        grouped[key] = [...(grouped[key] || []), studyPlanItemToCalendarEvent(item, exam, examIndex)];
      });

      if (activityResult.error) {
        setRescheduleNotice(activityResult.error.message || 'Could not load manual activities.');
      } else {
        (activityResult.data || []).forEach((activity) => {
          const key = calendarKeyFromDate(activity.activityDate);
          if (!key) return;
          grouped[key] = [...(grouped[key] || []), userActivityToCalendarEvent(activity)];
        });
      }

      setEvents((prev) => {
        const next = { ...(prev || {}) };
        Object.keys(next).forEach((key) => {
          const kept = (next[key] || []).filter((event) => !isServiceManagedEvent(event));
          if (kept.length) next[key] = kept;
          else delete next[key];
        });
        Object.entries(grouped).forEach(([key, value]) => {
          next[key] = [...(next[key] || []), ...value];
        });
        return next;
      });
      setServiceEventCount(
        (examResult.data || []).length
        + (planResult.error ? 0 : (planResult.data || []).length)
        + (activityResult.error ? 0 : (activityResult.data || []).length),
      );
      setCalendarLoading(false);
    }

    loadExamEvents();
    return () => { cancelled = true; };
  }, [exams, setEvents]);

  const findEventByServiceId = (dayEvents = [], search = {}) => {
    const targetServiceId = String(search?.serviceId || '').trim();
    if (!targetServiceId) return -1;
    return dayEvents.findIndex((event) => String(event?.serviceId || '').trim() === targetServiceId);
  };

  const moveCalendarEvent = (fromKey, fromRef, toKey, forcedTime, options = {}) => {
    const sourceDay = events[fromKey] || [];
    const sourceIndex = resolveEventIndex(fromKey, fromRef);
    const resolvedSourceIndex = sourceIndex >= 0 ? sourceIndex : -1;
    const target = sourceDay[resolvedSourceIndex];
    if (!target) return;

    if (target.source === 'exam-service' || target.type === 'exam') {
      setRescheduleNotice('Exam sessions are fixed and cannot be moved from calendar.');
      return;
    }

    const desiredTime = normalizeClockTime(forcedTime || target.time || '09:00');
    const preview = { ...target, time: desiredTime };
    const manualExactTime = Boolean(options.manualExactTime && forcedTime);
    const maybeTime = manualExactTime
      ? desiredTime
      : findFreeTimeForEvent(toKey, preview, fromKey, resolvedSourceIndex, target);
    if (!maybeTime) {
      setRescheduleNotice(tt(lang, 'noFreeCalendarSlot', { date: fmtModalDate(toKey), title: target.name || tt(lang, 'thatEvent') }));
      return;
    }
    const hasOverlapOnTarget = (candidateTime) => {
      return hasOverlappingEvent(
        events[toKey] || [],
        preview,
        candidateTime,
        {
          skipServiceId: fromKey === toKey ? target?.serviceId : null,
          skipIndex: fromKey === toKey ? resolvedSourceIndex : null,
        },
      );
    };
    const resolvedTime = !manualExactTime && hasOverlapOnTarget(maybeTime)
      ? findFreeTimeForEvent(toKey, { ...preview, time: normalizeClockTime(maybeTime) }, toKey, resolvedSourceIndex, target)
      : maybeTime;
    if (!resolvedTime || hasOverlapOnTarget(resolvedTime)) {
      setRescheduleNotice(tt(lang, 'noFreeCalendarSlot', { date: fmtModalDate(toKey), title: target.name || tt(lang, 'thatEvent') }));
      return;
    }
    const freeTime = resolvedTime;

    if (!manualExactTime && target.source === 'study-plan-service' && target.serviceId) {
      const exam = exams.find((entry) => String(entry.id) === String(target.examId));
      const cutoff = examCutoffKey(exam);
      if (cutoff && keyToPlannerDate(toKey) > keyToPlannerDate(cutoff)) {
        setRescheduleNotice(`Cannot move ${target.name} after ${exam?.name || 'exam'} cutoff.`);
        return;
      }
    }

    const moved = { ...target, time: freeTime, completed: target.source === 'study-plan-service' ? false : target.completed };
    if (hasOverlappingEvent(
      events[toKey] || [],
      moved,
      moved.time,
      {
        skipServiceId: fromKey === toKey ? target?.serviceId : null,
        skipIndex: fromKey === toKey ? resolvedSourceIndex : null,
      },
    )) {
      setRescheduleNotice(tt(lang, 'noFreeCalendarSlot', { date: fmtModalDate(toKey), title: target.name || tt(lang, 'thatEvent') }));
      return;
    }

    const applyMove = () => {
      let updatedEvents = null;
      setEvents((current) => {
        const next = { ...current };
        const fromArr = [...(next[fromKey] || [])];
        const targetIdx = findEventByServiceId(fromArr, target);
        const targetEvent = fromArr[targetIdx >= 0 ? targetIdx : resolvedSourceIndex];
        if (!targetEvent) return current;
        if (targetIdx >= 0) fromArr.splice(targetIdx, 1);
        else if (Number.isInteger(resolvedSourceIndex) && resolvedSourceIndex >= 0) fromArr.splice(resolvedSourceIndex, 1);
        else return current;
        if (fromArr.length) next[fromKey] = fromArr;
        else delete next[fromKey];
        next[toKey] = [...(next[toKey] || []), moved];
        updatedEvents = next;
        return next;
      });
      if (updatedEvents) onStudySessionsChanged?.(updatedEvents);
    };
    const persist = async () => {
      if (target.source === 'study-plan-service' && target.serviceId) {
        const result = await updateStudyPlanItem(target.serviceId, {
          plannedDate: keyToPlannerDate(toKey),
          plannedTime: freeTime,
          status: 'planned',
          completedAt: null,
        });
        if (result.error) {
          setRescheduleNotice(result.error.message || 'Unable to move study session.');
          return false;
        }
        return true;
      }
      if (target.source === 'calendar-activity-service' && target.serviceId) {
        const result = await updateCalendarActivity(target.serviceId, {
          activityDate: keyToPlannerDate(toKey),
          activityTime: freeTime,
        });
        if (result.error) {
          setRescheduleNotice(result.error.message || 'Unable to move activity.');
          return false;
        }
        return true;
      }
      return true;
    };
    void (async () => {
      const ok = await persist();
      if (!ok) return;
      applyMove();
    })();
  };
  moveCalendarEventRef.current = moveCalendarEvent;

  const startDrag = (e, ev, key, idx) => {
    if (!ev || ev.source === 'exam-service' || ev.type === 'exam') return;
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const { color, bg } = paletteForEvent(ev);
    const evH   = Math.max(CAL_HOUR_H * 0.45, durToMins(ev.dur || '30m') / 60 * CAL_HOUR_H) - 2;
    dragMeta.current = { active:true, ev, fromKey:key, fromIdx:idx, color, bg, evH,
      offsetY: e.clientY - rect.top, offsetX: e.clientX - rect.left,
      startX: e.clientX, startY: e.clientY,
      moved: false, wasDrag: false,
      toKey:key, toTime:ev.time, wsRef: weekStart };
    setDrag({ ev, fromKey:key, fromIdx:idx, ghostX:rect.left, ghostY:rect.top,
      ghostW:rect.width, ghostH:evH, toKey:key, toTime:ev.time, color, bg });
  };

  useEffect(() => {
    const onMove = (e) => {
      const m = dragMeta.current;
      if (!m.active) return;
      const grid = gridBodyRef.current;
      if (!grid) return;
      const moveX = e.clientX - m.startX;
      const moveY = e.clientY - m.startY;
      if (Math.abs(moveX) > 4 || Math.abs(moveY) > 4) m.moved = true;
      const rect = grid.getBoundingClientRect();
      const colsLeft  = rect.left + 50;
      const colW      = (rect.width - 50) / 7;
      const dayIdx    = Math.max(0, Math.min(6, Math.floor((e.clientX - colsLeft) / colW)));
      const relY      = e.clientY - rect.top + grid.scrollTop - m.offsetY;
      const frac      = Math.max(0, relY / CAL_HOUR_H);
      let hour        = Math.floor(frac) + CAL_START_H;
      let mins        = Math.round((frac % 1) * 4) * 15;
      if (mins >= 60) { hour++; mins = 0; }
      hour = Math.max(0, Math.min(23, hour));
      const newTime   = `${String(hour).padStart(2,'0')}:${String(mins).padStart(2,'0')}`;
      const newKey    = dayKey(calAddDays(m.wsRef, dayIdx));
      m.toKey = newKey; m.toTime = newTime;
      setDrag(prev => prev ? { ...prev,
        ghostX: e.clientX - m.offsetX,
        ghostY: e.clientY - m.offsetY,
        toKey: newKey, toTime: newTime } : null);
    };
    const onUp = () => {
      const m = dragMeta.current;
      if (!m.active) return;
      m.active = false;
      m.wasDrag = Boolean(m.moved);
      if (m.moved && m.toKey && m.toTime) {
        moveCalendarEventRef.current?.(m.fromKey, { ...m.ev, index: m.fromIdx }, m.toKey, m.toTime, { manualExactTime: true });
      }
      setDrag(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const startMonthDrag = (e, ev, key, idx) => {
    if (!ev || ev.source === 'exam-service' || ev.type === 'exam') return;
    e.preventDefault(); e.stopPropagation();
    monthDragMeta.current = { active:true, started:false, ev, fromKey:key, fromIdx:idx, toKey:key, startX:e.clientX, startY:e.clientY };
  };

  useEffect(() => {
    const onMove = (e) => {
      const m = monthDragMeta.current;
      if (!m.active) return;
      if (!m.started) {
        if (Math.abs(e.clientX - m.startX) < 4 && Math.abs(e.clientY - m.startY) < 4) return;
        m.started = true;
      }
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cell = el && el.closest && el.closest('[data-month-cell]');
      const toKey = cell ? cell.getAttribute('data-month-cell') : null;
      if (toKey) m.toKey = toKey;
      setMonthDrag({ ev:m.ev, fromKey:m.fromKey, toKey:m.toKey, ghostX:e.clientX, ghostY:e.clientY });
    };
    const onUp = () => {
      const m = monthDragMeta.current;
      if (!m.active) return;
      const wasStarted = m.started;
      m.active = false; m.started = false;
      if (wasStarted && m.toKey && m.toKey !== m.fromKey) {
        moveCalendarEventRef.current?.(m.fromKey, { ...m.ev, index: m.fromIdx }, m.toKey, m.ev.time);
      }
      setMonthDrag(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [setEvents]);

  const navPrev = () => {
    if (view === 'week') { setWeekStart(d => calAddDays(d, -7)); }
    else { setViewMonth(m => { if (m === 0) { setViewYear(y => y-1); return 11; } return m-1; }); }
  };
  const navNext = () => {
    if (view === 'week') { setWeekStart(d => calAddDays(d, 7)); }
    else { setViewMonth(m => { if (m === 11) { setViewYear(y => y+1); return 0; } return m+1; }); }
  };

  const openModal = (key, time = '09:00') => { setModalKey(key); setSelCat('study'); setSelNoteId(null); setModalName(''); setModalTime(time); setModalDur('1h'); setCustomH(0); setCustomM(30); };
  const closeModal = () => setModalKey(null);
  const openDayDetail = (key) => setDayDetailKey(key);
  const closeDayDetail = () => setDayDetailKey(null);
  const toggleCat = (id) => setActiveCats(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const isStudyActionEvent = (event) => isStudyLikeEvent(event);
  const persistEventStatus = async (event, patch) => {
    if (!event?.serviceId) return true;
    if (event?.source === 'study-plan-service' && event.serviceId) {
      const payload = {
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.type ? { type: patch.type } : {}),
        ...(patch.plannedDate ? { plannedDate: patch.plannedDate } : {}),
        ...(patch.plannedTime ? { plannedTime: patch.plannedTime } : {}),
        ...(patch.durationMin ? { durationMin: patch.durationMin } : {}),
        ...(patch.completedAt !== undefined ? { completedAt: patch.completedAt } : {}),
      };
      const result = await updateStudyPlanItem(event.serviceId, payload);
      if (result.error) {
        setRescheduleNotice(result.error.message || 'Unable to update study session.');
        return false;
      }
      return true;
    }
    if (event?.source === 'calendar-activity-service' && event.serviceId) {
      const updatePayload = {
        ...(patch.activityDate ? { activityDate: patch.activityDate } : {}),
        ...(patch.activityTime ? { activityTime: patch.activityTime } : {}),
        ...(patch.status !== undefined ? { completed: patch.status === 'done' } : {}),
        ...(patch.completed !== undefined ? { completed: !!patch.completed } : {}),
        ...(patch.durationMin ? { durationMin: patch.durationMin } : {}),
        ...(patch.name ? { title: patch.name } : {}),
        ...(patch.cat ? { category: patch.cat } : {}),
        ...(patch.noteId !== undefined ? { noteId: patch.noteId } : {}),
        ...(patch.noteSubject !== undefined ? { noteSubject: patch.noteSubject } : {}),
        ...(patch.noteColor !== undefined ? { noteColor: patch.noteColor } : {}),
        ...(patch.noteBg !== undefined ? { noteBg: patch.noteBg } : {}),
        ...(patch.noteText !== undefined ? { noteText: patch.noteText } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        ...(patch.materials !== undefined ? { materials: patch.materials || [] } : {}),
        ...(patch.files !== undefined ? { files: patch.files || [] } : {}),
      };
      const result = await updateCalendarActivity(event.serviceId, updatePayload);
      if (result.error) {
        setRescheduleNotice(result.error.message || 'Unable to update activity.');
        return false;
      }
      return true;
    }
    return true;
  };

  const findFreeTimeForEvent = (key, target, sourceKey = null, skipIdx = null, skipEvent = null) => {
    const duration = Math.max(15, getEventDurationMinutes(target));
    const preferred = Math.max(0, Math.min(24 * 60 - duration, clockToMinutes(target?.time || '09:00')));
    const blocks = (events[key] || []);
    const overlapOpts = {
      skipServiceId: sourceKey === key ? skipEvent?.serviceId || null : null,
      skipIndex: sourceKey === key ? skipIdx : null,
    };
    const hasOverlap = (minute) => hasOverlappingEvent(
      blocks,
      { ...target, durationMin: duration },
      minutesToClock(minute),
      overlapOpts,
    );
    const candidates = [];
    for (let minute = preferred; minute + duration <= 24 * 60; minute += 15) candidates.push(minute);
    for (let minute = 6 * 60; minute < preferred && minute + duration <= 24 * 60; minute += 15) candidates.push(minute);
    const free = candidates.find((minute) => !hasOverlap(minute));
    return free == null ? null : minutesToClock(free);
  };

  const toggleEventDone = async (key, idx) => {
    const currentDay = events[key] || [];
    const target = currentDay[idx];
    if (!target) return;
    const completed = !target.completed;
    const updated = { ...target, completed };

    const patch = {
      status: completed ? 'done' : 'planned',
      completed,
      completedAt: completed ? new Date().toISOString() : null,
    };
    const ok = await persistEventStatus(target, patch);
    if (!ok) return;

    const nextEvents = { ...events };
    const nextDay = [...(nextEvents[key] || [])];
    if (idx < 0 || idx >= nextDay.length) return;
    nextDay[idx] = updated;
    nextEvents[key] = nextDay;
    setEvents(nextEvents);
    onStudySessionsChanged?.(nextEvents);
  };

  const deleteEvent = (key, idx) => {
    let target = null;
    let updatedEvents = null;
    setEvents(ev => {
      target = (ev[key] || [])[idx] || null;
      if (!target) return ev;
      if (target.source === 'exam-service' || target.type === 'exam') {
        setRescheduleNotice('Exam sessions are fixed and cannot be deleted from calendar.');
        return ev;
      }
      updatedEvents = { ...ev, [key]: ev[key].filter((_, i) => i !== idx) };
      if (!updatedEvents[key].length) delete updatedEvents[key];
      if (target.source === 'calendar-activity-service' && target.serviceId) {
        void deleteCalendarActivity(target.serviceId).then((result) => {
          if (result?.error) {
            setRescheduleNotice(result.error.message || 'Unable to delete activity.');
          } else {
            onStudySessionsChanged?.(updatedEvents);
          }
        });
      } else if (target?.source === 'study-plan-service' && target.serviceId) {
        persistEventStatus(target, { status: 'skipped' }).then((ok) => {
          if (ok) onStudySessionsChanged?.(updatedEvents);
        });
      } else if (isStudyActionEvent(target)) {
        onStudySessionsChanged?.(updatedEvents);
      }
      return updatedEvents;
    });
  };

  const moveStudyEvent = (fromKey, eventRef, toKey) => {
    const dayEvents = events[fromKey] || [];
    const sourceIdx = resolveEventIndex(fromKey, eventRef);
    const target = sourceIdx >= 0 ? dayEvents[sourceIdx] : null;
    if (!target?.serviceId || !isStudyActionEvent(target)) return;
    moveCalendarEvent(fromKey, eventRef, toKey);
  };

  const markStudyEventMissed = (key, idx) => {
    const target = (events[key] || [])[idx] || null;
    if (!target?.serviceId || target.source !== 'study-plan-service') return;
    setEvents((current) => {
      const next = { ...current };
      next[key] = (next[key] || []).filter((_, eventIndex) => eventIndex !== idx);
      if (!next[key].length) delete next[key];
      return next;
    });
    persistEventStatus(target, { status: 'missed', completedAt: null });
    setRescheduleNotice(`${target.name} marked missed. Move manually or regenerate/repair later.`);
  };
  const reorderEvent = (key, fromIdx, toIdx) => setEvents(prev => {
    const arr = [...(prev[key] || [])];
    if (fromIdx < 0 || fromIdx >= arr.length || toIdx < 0 || toIdx >= arr.length || fromIdx === toIdx) return prev;
    const [m] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, m);
    return { ...prev, [key]: arr };
  });

  const selectSubject = (subject) => {
    const info = subjectOptions.find((entry) => entry.subject === subject);
    if (!info) return;
    if (selNoteId === info.noteId) {
      setSelNoteId(null);
    } else {
      setSelNoteId(info.noteId);
    }
  };

  const addEvent = async () => {
    if (!modalName.trim()) return;
    const noteOption = selCat === 'study' && selNoteId
      ? subjectOptions.find((subject) => String(subject.noteId) === String(selNoteId)) || null
      : null;
    const noteSubject = noteOption?.subject || null;
    const noteInfo = noteOption || null;
    const h = Math.max(0, Math.min(12, Number(customH) || 0));
    const m = Math.max(0, Math.min(59, Number(customM) || 0));
    const customDur = h && m ? `${h}h${m}m` : h ? `${h}h` : `${m}m`;
    const baseDur = modalDur === 'Custom' ? customDur : modalDur;

    const draft = {
      name: modalName,
      time: normalizeClockTime(modalTime || '09:00'),
      dur: baseDur,
      cat: selCat,
      noteId: selCat === 'study' ? selNoteId : null,
      noteColor: noteInfo?.color || null,
      noteBg: noteInfo?.bg || null,
      noteText: noteInfo?.text || null,
      noteSubject,
      notes: '',
      materials: [],
      files: [],
      completed: false,
    };

    const freeTime = findFreeTimeForEvent(modalKey, draft);
    const nextDraft = { ...draft, time: freeTime || draft.time };
    const payload = {
      title: nextDraft.name,
      activityDate: modalKey,
      activityTime: nextDraft.time,
      durationMin: durToMins(nextDraft.dur),
      category: nextDraft.cat,
      noteId: nextDraft.cat === 'study' ? nextDraft.noteId : null,
      noteColor: nextDraft.cat === 'study' ? (nextDraft.noteColor || null) : null,
      noteBg: nextDraft.cat === 'study' ? (nextDraft.noteBg || null) : null,
      noteText: nextDraft.cat === 'study' ? (nextDraft.noteText || null) : null,
      noteSubject: nextDraft.cat === 'study' ? noteSubject : null,
      notes: nextDraft.notes,
      materials: [],
      files: [],
      completed: false,
    };
    const result = await createCalendarActivity(payload);
    if (result.error) {
      setRescheduleNotice(result.error.message || 'Unable to create activity.');
      return;
    }
    const event = userActivityToCalendarEvent(result.data || {});
    setEvents(prev => ({ ...prev, [modalKey]: [...(prev[modalKey] || []), { ...event, source: 'calendar-activity-service', dur: nextDraft.dur, cat: nextDraft.cat, completed: false }] }));
    closeModal();
  };

  const [editEv, setEditEv]     = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [fileDragOver, setFileDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const fileIdRef    = useRef(1);
  const [reorderDragIdx, setReorderDragIdx] = useState(null);
  const [reorderOverIdx, setReorderOverIdx] = useState(null);

  useEffect(() => {
    if (!isMobile || (!modalKey && !editEv && !dayDetailKey)) return undefined;
    const previousBodyOverflowX = document.body.style.overflowX;
    const previousHtmlOverflowX = document.documentElement.style.overflowX;
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    window.scrollTo({ left: 0, top: window.scrollY });
    return () => {
      document.body.style.overflowX = previousBodyOverflowX;
      document.documentElement.style.overflowX = previousHtmlOverflowX;
      window.scrollTo({ left: 0, top: window.scrollY });
    };
  }, [dayDetailKey, editEv, isMobile, modalKey]);

  const openEditEvent = (key, idx) => {
    const ev = (events[key] || [])[idx];
    if (!ev) return;
    setEditForm({
      name: ev.name || '', time: ev.time || '09:00', dur: ev.dur || '1h',
      cat: ev.cat || 'study', noteId: ev.noteId || null,
      notes: ev.notes || '',
      studyType: inferStudyPlanType(ev),
      materials: (ev.materials || []).map(m => typeof m === 'string' ? m : (m && m.url) || ''),
      files: (ev.files || []).map(f => ({ ...f })),
      completed: !!ev.completed,
    });
    setEditEv({ key, idx });
  };
  const closeEditEvent = () => { setEditEv(null); setEditForm(null); };

  const saveEditEvent = async () => {
    if (!editEv || !editForm) return;
    const { key, idx } = editEv;
    const f = editForm;
    const noteOption = f.cat === 'study' && f.noteId
      ? (subjectOptions.find((subject) => String(subject.noteId) === String(f.noteId)) || {
          subject: f.noteSubject || null,
          color: f.noteColor || null,
          bg: f.noteBg || null,
          text: f.noteText || null,
        })
      : null;
    const noteSubject = noteOption?.subject || null;
    const noteInfo = noteOption || null;
    const current = (events[key] || [])[idx] || {};
    const isPlannerEvent = current.source === 'study-plan-service' && current.serviceId;
    const updated = {
      ...current,
      name: isPlannerEvent ? renameStudyPlanEvent(current, f.studyType) : f.name,
      time: f.time, dur: f.dur, cat: f.cat,
      noteId: isPlannerEvent ? current.noteId : (f.cat === 'study' ? f.noteId : null),
      noteColor: isPlannerEvent ? current.noteColor : (noteInfo?.color || null),
      noteBg: isPlannerEvent ? current.noteBg : (noteInfo?.bg || null),
      noteText: isPlannerEvent ? current.noteText : (noteInfo?.text || null),
      noteSubject: isPlannerEvent ? current.noteSubject : noteSubject,
      studyType: f.studyType,
      notes: f.notes,
      materials: (f.materials || []).filter(m => m && m.trim()),
      files: f.files || [],
      completed: f.completed,
    };
    const persistPatch = {
      type: isPlannerEvent ? f.studyType : current?.type,
      plannedTime: f.time,
      durationMin: durToMins(f.dur) || 30,
      status: f.completed ? 'done' : 'planned',
      completedAt: f.completed ? new Date().toISOString() : null,
      activityDate: keyToPlannerDate(key),
    };
    const ok = isPlannerEvent || current.source === 'calendar-activity-service'
      ? await (isPlannerEvent
        ? persistEventStatus(current, persistPatch)
        : persistEventStatus(current, {
          ...persistPatch,
          name: f.name,
          cat: f.cat,
          noteId: f.noteId,
          noteSubject,
          noteColor: noteInfo?.color || null,
          noteBg: noteInfo?.bg || null,
          noteText: noteInfo?.text || null,
          notes: f.notes,
          materials: (f.materials || []).filter(m => m && m.trim()),
          files: f.files || [],
          completed: f.completed,
        }))
      : true;
    if (!ok) return;

    const editedEvents = { ...events, [key]: (events[key] || []).map((e, i) => i === idx ? updated : e) };
    setEvents(editedEvents);
    if (isPlannerEvent) {
      const patchedCurrent = {
        ...updated,
        type: f.studyType,
      };
      const plannerEditedEvents = { ...events, [key]: (events[key] || []).map((e, i) => i === idx ? patchedCurrent : e) };
      setEvents(plannerEditedEvents);
      if (isStudyActionEvent(patchedCurrent)) onStudySessionsChanged?.(plannerEditedEvents);
    } else if (isStudyActionEvent(updated)) {
      onStudySessionsChanged?.(editedEvents);
    }
    closeEditEvent();
  };

  const deleteEditEvent = () => {
    if (!editEv) return;
    deleteEvent(editEv.key, editEv.idx);
    closeEditEvent();
  };

  const addMaterial    = ()       => setEditForm(f => f ? ({ ...f, materials: [...(f.materials||[]), ''] }) : f);
  const updateMaterial = (i, url) => setEditForm(f => f ? ({ ...f, materials: (f.materials||[]).map((m, j) => j === i ? url : m) }) : f);
  const removeMaterial = (i)      => setEditForm(f => f ? ({ ...f, materials: (f.materials||[]).filter((_, j) => j !== i) }) : f);

  const addEditFiles = (list) => {
    const arr = Array.from(list || []);
    if (!arr.length) return;
    setEditForm(f => {
      if (!f) return f;
      const next = [...(f.files || [])];
      arr.forEach(file => next.push({ id: fileIdRef.current++, name: file.name, size: file.size }));
      return { ...f, files: next };
    });
  };
  const removeEditFile = (id) => setEditForm(f => f ? ({ ...f, files: (f.files||[]).filter(x => x.id !== id) }) : f);
  const onFileDrop = (e) => { e.preventDefault(); setFileDragOver(false); if (e.dataTransfer && e.dataTransfer.files) addEditFiles(e.dataTransfer.files); };
  const onFilePick = (e) => { addEditFiles(e.target.files); e.target.value = ''; };
  const browseFiles = () => fileInputRef.current && fileInputRef.current.click();
  const fmtFileSize = (b) => { if (!b) return ''; if (b < 1024) return b + ' B'; if (b < 1048576) return (b/1024).toFixed(1) + ' KB'; return (b/1048576).toFixed(1) + ' MB'; };

  const handleEvClick = (ev, key, idx) => { openEditEvent(key, idx); };

  const weekLabel = () => {
    const end = calAddDays(weekStart, 6);
    const formatter = new Intl.DateTimeFormat(localeFor(lang), { month: 'short', day: 'numeric' });
    if (weekStart.getMonth() === end.getMonth())
      return `${formatter.format(weekStart)}–${end.getDate()}, ${weekStart.getFullYear()}`;
    return `${formatter.format(weekStart)} – ${formatter.format(end)}`;
  };

  const rangeLabel = view === 'week'
    ? weekLabel()
    : new Intl.DateTimeFormat(localeFor(lang), { month: 'long', year: 'numeric' }).format(new Date(viewYear, viewMonth, 1));
  const weekDays = useMemo(() => Array.from({length:7}, (_, i) => calAddDays(weekStart, i)), [weekStart]);
  const todayDow = today.getDay(); // 0=Sun,1=Mon,...,6=Sat
  const monthGrid = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const diff = (firstOfMonth.getDay() - todayDow + 7) % 7;
    const gridStart = calAddDays(firstOfMonth, -diff);
    return Array.from({length:42}, (_, i) => calAddDays(gridStart, i));
  }, [viewMonth, viewYear]);

  const lifeBalance = useMemo(() => {
    const totals = {}; LIFE_CATS.forEach(c => { totals[c.id] = 0; });
    Array.from({length:7}, (_, i) => calAddDays(weekStart, i)).forEach(d => {
      (events[dayKey(d)] || []).forEach(ev => { totals[ev.cat] = (totals[ev.cat]||0) + durToMins(ev.dur); });
    });
    const total = Object.values(totals).reduce((a,b) => a+b, 0);
    return LIFE_CATS.map(c => ({ ...c, mins: totals[c.id], pct: total > 0 ? Math.round(totals[c.id]/total*100) : 0 }));
  }, [events, weekStart]);

  const planQuality = useMemo(() => {
    const studyEvents = Object.values(events || {}).flat().filter((event) => event.source === 'study-plan-service');
    if (!studyEvents.length) return null;
    const byDay = {};
    studyEvents.forEach((event) => {
      const key = Object.entries(events || {}).find(([, arr]) => arr.includes(event))?.[0];
      if (!key) return;
      byDay[key] = (byDay[key] || 0) + 1;
    });
    const maxDay = Math.max(0, ...Object.values(byDay));
    const upcomingExams = exams.filter((exam) => {
      const key = calendarKeyFromDate(exam.date);
      if (!key) return false;
      const days = Math.ceil((dateFromCalendarKey(key) - today) / 86400000);
      return days >= 0 && days <= 3;
    });
    const pastUndone = Object.entries(events || {}).flatMap(([key, arr]) =>
      (arr || []).filter((event) => event.source === 'study-plan-service' && !event.completed && keyToPlannerDate(key) < keyToPlannerDate(dayKey(today)))
    ).length;
    if (pastUndone) return { label: 'Needs repair', tone: 'warn', text: `${pastUndone} past session${pastUndone === 1 ? '' : 's'} not done. Move them forward or mark missed.` };
    if (maxDay >= 6) return { label: 'Too packed', tone: 'warn', text: `${maxDay} study sessions on one day. Use compact view or move some sessions.` };
    if (upcomingExams.length) return { label: 'Exam close', tone: 'info', text: `${upcomingExams[0].name || 'Exam'} is within 3 days. Keep sessions light near exam day.` };
    return { label: 'Balanced', tone: 'good', text: 'Plan fits calendar without obvious overload.' };
  }, [events, exams, today]);

  const fmtModalDate = (key) => {
    if (!key) return '';
    const [y, m, d] = key.split('-').map(Number);
    return new Intl.DateTimeFormat(localeFor(lang), { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(y, m - 1, d));
  };
  const DAY_NAMES_ALL = ['DOM','LUN','MAR','MER','GIO','VEN','SAB'];
  const _ALL_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const _rot = (today.getDay() + 6) % 7; // Mon=0..Sun=6
  const WEEK_LABELS = [..._ALL_LABELS.slice(_rot), ..._ALL_LABELS.slice(0, _rot)];

  useEffect(() => {
    if (!isMobile || view !== 'week') return;
    const visibleKeys = new Set(weekDays.map(dayKey));
    if (visibleKeys.has(mobileSelectedKey)) return;
    const todayKey = dayKey(today);
    setMobileSelectedKey(visibleKeys.has(todayKey) ? todayKey : dayKey(weekDays[0]));
  }, [isMobile, mobileSelectedKey, today, view, weekDays]);

  const renderMobileEventRow = ({ event: ev, index: eventIndex }, key, idx) => {
    const { bg, color, text } = paletteForEvent(ev);
    const isStudyAction = isStudyActionEvent(ev);
    const totalAttach = (ev.materials ? ev.materials.length : 0) + (ev.files ? ev.files.length : 0);
    return (
      <div
        key={`${ev.serviceId || ev.name || idx}-${eventIndex}`}
        onClick={() => openEditEvent(key, eventIndex)}
        style={{
          display:'grid',
          gridTemplateColumns:'4px minmax(0, 1fr) auto',
          gap:12,
          alignItems:'stretch',
          padding:14,
          borderRadius:18,
          background:bg,
          border:`1px solid ${color}26`,
          boxShadow:'0 12px 30px -24px rgba(15,16,53,.4)',
          opacity:ev.completed ? 0.58 : 1,
          cursor:'pointer',
          touchAction:'manipulation',
        }}>
        <div style={{ width:4, borderRadius:999, background:color }} />
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <span style={{ fontSize:12, fontWeight:900, color:text }}>{normalizeClockTime(ev.time || '09:00')}</span>
            <span style={{ width:4, height:4, borderRadius:999, background:color, opacity:.45 }} />
            <span style={{ fontSize:12, fontWeight:800, color:text, opacity:.72 }}>{ev.dur || '30m'}</span>
            {totalAttach > 0 && <span style={{ fontSize:12, fontWeight:800, color:text, opacity:.72 }}>{totalAttach} file</span>}
          </div>
          <div style={{ fontSize:15, fontWeight:850, color:text || 'var(--ink)', lineHeight:1.25, textDecoration:ev.completed ? 'line-through' : 'none', overflowWrap:'anywhere' }}>
            {ev.name}
          </div>
          {ev.noteSubject && (
            <div style={{ marginTop:8, display:'inline-flex', maxWidth:'100%', padding:'4px 9px', borderRadius:999, background:'rgba(255,255,255,.58)', color:text, fontSize:11, fontWeight:850 }}>
              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.noteSubject}</span>
            </div>
          )}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end' }}>
          {isStudyAction && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); toggleEventDone(key, eventIndex); }}
              aria-label={ev.completed ? 'Mark planned' : 'Mark done'}
              style={{ width:44, height:44, borderRadius:14, border:`1px solid ${color}26`, background:ev.completed ? '#DCFCE7' : 'rgba(255,255,255,.7)', color:ev.completed ? '#16A34A' : color, display:'grid', placeItems:'center', cursor:'pointer' }}>
              <Check size={17} />
            </button>
          )}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); deleteEvent(key, eventIndex); }}
            aria-label="Delete event"
            style={{ width:44, height:44, borderRadius:14, border:`1px solid ${color}20`, background:'rgba(255,255,255,.56)', color, display:'grid', placeItems:'center', cursor:'pointer' }}>
            <Trash size={16} />
          </button>
        </div>
      </div>
    );
  };

  const renderMobileAgenda = (key, emptyCopy = 'No activities scheduled.') => {
    const dayEvs = getVisibleDayEvents(key).sort((a, b) => clockToMinutes(a.event.time) - clockToMinutes(b.event.time));
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {dayEvs.length ? dayEvs.map((item, idx) => renderMobileEventRow(item, key, idx)) : (
          <button
            type="button"
            onClick={() => openModal(key)}
            style={{ minHeight:112, border:'1.5px dashed var(--border)', borderRadius:20, background:'var(--surface)', color:'var(--gray)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, fontSize:14, fontWeight:800, cursor:'pointer' }}>
            <Plus size={20} />
            <span>{emptyCopy}</span>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--indigo)' }}>{tt(lang, 'addActivity')}</span>
          </button>
        )}
      </div>
    );
  };

  const renderMobileWeek = () => {
    const selectedDate = dateFromCalendarKey(mobileSelectedKey) || today;
    const selectedLabel = new Intl.DateTimeFormat(localeFor(lang), { weekday:'long', day:'numeric', month:'long' }).format(selectedDate);
    const selectedEvents = getVisibleDayEvents(mobileSelectedKey);
    return (
      <div style={calS.mobilePanel}>
        <div style={calS.mobileDayRail} aria-label="Week days">
          {weekDays.map((day) => {
            const key = dayKey(day);
            const isToday = key === dayKey(today);
            const isSelected = key === mobileSelectedKey;
            const count = getVisibleDayEvents(key).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setMobileSelectedKey(key)}
                style={{
                  ...calS.mobileDayButton,
                  ...(isSelected ? calS.mobileDayButtonActive : null),
                  borderColor:isSelected ? 'var(--indigo)' : isToday ? '#C7D2FE' : 'var(--border)',
                }}>
                <span style={{ fontSize:11, fontWeight:900, color:isSelected ? 'var(--indigo)' : 'var(--gray)', textTransform:'uppercase' }}>
                  {new Intl.DateTimeFormat(localeFor(lang), { weekday:'short' }).format(day)}
                </span>
                <span style={{ width:34, height:34, borderRadius:999, display:'grid', placeItems:'center', background:isSelected ? 'var(--indigo)' : isToday ? 'var(--lavender)' : 'transparent', color:isSelected ? '#fff' : 'var(--ink)', fontSize:16, fontWeight:900 }}>
                  {day.getDate()}
                </span>
                <span style={{ height:18, minWidth:18, padding:'0 6px', borderRadius:999, display:'inline-grid', placeItems:'center', background:count ? '#EEF2FF' : 'transparent', color:count ? 'var(--indigo)' : 'var(--gray-2)', fontSize:10, fontWeight:900 }}>
                  {count || ''}
                </span>
              </button>
            );
          })}
        </div>
        <div style={calS.mobileAgendaHeader}>
          <div>
            <div style={{ fontSize:17, fontWeight:900, color:'var(--ink)', textTransform:'capitalize' }}>{selectedLabel}</div>
            <div style={{ fontSize:12, fontWeight:800, color:'var(--gray)', marginTop:3 }}>
              {selectedEvents.length} {selectedEvents.length === 1 ? 'activity' : 'activities'}
            </div>
          </div>
          <button type="button" onClick={() => openModal(mobileSelectedKey)} style={calS.mobilePrimaryBtn}>
            <Plus size={16} /> {tt(lang, 'addActivity')}
          </button>
        </div>
        {renderMobileAgenda(mobileSelectedKey, 'No activities on this day.')}
      </div>
    );
  };

  const renderWeek = () => {
    if (isMobile) return renderMobileWeek();

    const hours   = Array.from({ length: 24 }, (_, i) => i);
    const now     = new Date();
    const nowFrac = now.getHours() + now.getMinutes() / 60;
    const nowY    = nowFrac * CAL_HOUR_H;
    const showNow = true;

    const timeToY  = (t) => { const [h, m] = (t || '08:00').split(':').map(Number); return Math.max(0, (h + m / 60) * CAL_HOUR_H); };
    const durToH   = (d) => Math.max(CAL_HOUR_H * 0.45, durToMins(d || '30m') / 60 * CAL_HOUR_H);
    const slotTime = (h) => `${String(h).padStart(2, '0')}:00`;
    const compact = density === 'compact';

    return (
      <div style={{ border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', background:'var(--surface)' }}>
        {/* Day header row */}
        <div style={{ display:'grid', gridTemplateColumns:'50px repeat(7, 1fr)', borderBottom:'1px solid var(--border)', background:'var(--sidebar-bg)' }}>
          <div style={{ borderRight:'1px solid var(--border)' }} />
          {weekDays.map((day, i) => {
            const isToday = dayKey(day) === dayKey(today);
            const key = dayKey(day);
            const dayExams = (events[key] || []).filter((event) => event.source === 'exam-service' || event.type === 'exam' || String(event.name || '').includes('Exam:'));
            return (
              <div key={i} style={{ padding:'10px 4px', textAlign:'center', borderRight: i < 6 ? '1px solid var(--border)' : 'none', minHeight: dayExams.length ? 72 : 56 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--gray)', letterSpacing:'0.06em', marginBottom:5 }}>{DAY_NAMES_ALL[day.getDay()]}</div>
                <div style={{ width:28, height:28, borderRadius:'50%', background: isToday ? 'var(--indigo)' : 'transparent', color: isToday ? '#fff' : 'var(--ink)', fontSize:13, fontWeight:700, display:'grid', placeItems:'center', margin:'0 auto' }}>{day.getDate()}</div>
                {dayExams.slice(0, 1).map((event, examIndex) => {
                  const { color, bg, text } = paletteForEvent(event);
                  return (
                    <div key={`${event.serviceId || event.name || examIndex}-header`} style={{ margin:'6px auto 0', maxWidth:'92%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', borderRadius:999, padding:'3px 7px', background:bg, color:text, border:`1px solid ${color}33`, fontSize:9, fontWeight:900 }}>
                      📝 {normalizeClockTime(event.time || '09:00')} · {String(event.name || '').replace(/^📝\s*/, '').replace(/^Exam:\s*/, '')}
                    </div>
                  );
                })}
                {dayExams.length > 1 && <div style={{ marginTop:3, fontSize:9, color:'var(--gray)', fontWeight:800 }}>+{dayExams.length - 1} exam</div>}
              </div>
            );
          })}
        </div>

        {/* Scrollable time body */}
        <div ref={gridBodyRef} style={{ display:'flex', maxHeight:480, overflowY:'auto' }}>
          {/* Hour labels */}
          <div style={{ width:50, flexShrink:0, borderRight:'1px solid var(--border)' }}>
            {hours.map(h => (
              <div key={h} style={{ height:CAL_HOUR_H, display:'flex', alignItems:'flex-start', justifyContent:'flex-end', paddingRight:7, paddingTop:5, fontSize:10, fontWeight:600, color:'var(--gray)', lineHeight:1, boxSizing:'border-box', borderBottom:'1px solid var(--border)' }}>
                {h}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div style={{ flex:1, display:'grid', gridTemplateColumns:'repeat(7, 1fr)' }}>
              {weekDays.map((day, i) => {
                const key    = dayKey(day);
                const dayEvs = getVisibleDayEvents(key);
                const eventLayouts = buildEventLayouts(dayEvs.map(({ event }) => event));
                const isToday = dayKey(day) === dayKey(today);
                return (
                <div key={i} style={{ position:'relative', borderRight: i < 6 ? '1px solid var(--border)' : 'none' }}>
                  {/* Clickable hour slots */}
                  {hours.map(h => (
                    <div key={h} onClick={() => openModal(key, slotTime(h))}
                      style={{ height:CAL_HOUR_H, borderBottom:'1px solid var(--border)', cursor:'pointer', boxSizing:'border-box', background: isToday ? 'rgba(55,48,232,.02)' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--lavender)'}
                      onMouseLeave={e => e.currentTarget.style.background= isToday ? 'rgba(55,48,232,.02)' : 'transparent'}
                    />
                  ))}
                  {/* Absolute events */}
                  {dayEvs.map(({ event: ev, index: eventIndex }, idx) => {
                    const { color, bg, text } = paletteForEvent(ev);
                    const top   = timeToY(ev.time);
                    const h     = durToH(ev.dur);
                    const layout = eventLayouts[idx] || { col: 0, cols: 1 };
                    const leftPct = (layout.col / layout.cols) * 100;
                    const widthPct = 100 / layout.cols;
                    const isDragging = drag && drag.fromKey === key && drag.fromIdx === eventIndex;
                    const isStudyAction = isStudyActionEvent(ev);
                    const actionButtonStyle = {
                      height: compact ? 16 : 18,
                      minWidth: compact ? 18 : 24,
                      padding: compact ? '0 4px' : '1px 6px',
                      borderRadius:999,
                      border:`1px solid ${color}33`,
                      background:'rgba(255,255,255,.76)',
                      color,
                      cursor:'pointer',
                      display:'inline-flex',
                      alignItems:'center',
                      justifyContent:'center',
                      fontSize:9,
                      fontWeight:900,
                      lineHeight:1,
                      flex:'0 0 auto',
                    };
                    return (
                      <div key={idx}
                        onPointerDown={e => startDrag(e, ev, key, eventIndex)}
                        onClick={e => {
                          const dragged = dragMeta.current?.wasDrag && dragMeta.current?.fromKey === key && dragMeta.current?.fromIdx === eventIndex;
                          if (dragged) {
                            dragMeta.current.wasDrag = false;
                            return;
                          }
                          e.stopPropagation();
                          handleEvClick(ev, key, eventIndex);
                        }}
                        style={{ position:'absolute', top, left:`calc(${leftPct}% + 3px)`, width:`calc(${widthPct}% - 6px)`, height: h - 2, borderRadius:7, background:bg, borderLeft:`3px solid ${color}`, boxShadow:`inset 0 0 0 1px ${color}22`, padding: compact ? '3px 5px' : '4px 6px', cursor:'grab', overflow:'hidden', zIndex:1 + layout.col, boxSizing:'border-box', opacity: isDragging ? 0.25 : ev.completed ? 0.5 : 1, userSelect:'none', touchAction:'none' }}>
                        <div style={{ fontSize: compact ? 10 : 11, fontWeight:800, color:text, lineHeight:1.15, overflow:'hidden', textDecoration: ev.completed ? 'line-through' : 'none', whiteSpace: compact ? 'nowrap' : 'normal', textOverflow:'ellipsis' }}>{ev.name}</div>
                        {!compact && h > 32 && <div style={{ fontSize:10, color:text, opacity:.75, marginTop:2 }}>{normalizeClockTime(ev.time)}{ev.dur ? ` · ${ev.dur}` : ''}</div>}
                        <div style={{ position:'absolute', right:2, bottom:2, maxWidth:'calc(100% - 4px)', display:'flex', alignItems:'center', justifyContent:'flex-end', gap:2, overflow:'hidden' }}>
                          {isStudyAction && (
                            <button
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={e => { e.stopPropagation(); toggleEventDone(key, eventIndex); }}
                              title={ev.completed ? 'Mark planned' : 'Mark done'}
                              style={{ ...actionButtonStyle, background:ev.completed ? '#DCFCE7' : actionButtonStyle.background, color:ev.completed ? '#16A34A' : color }}>
                              {ev.completed ? (compact ? '↺' : 'Done') : '✓'}
                            </button>
                          )}
                          {isStudyAction && (
                            <button
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={e => { e.stopPropagation(); moveStudyEvent(key, { ...ev, index: eventIndex }, keyAddDays(key, 1)); }}
                              title="Move tomorrow"
                              style={actionButtonStyle}>
                              +1
                            </button>
                          )}
                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); deleteEvent(key, eventIndex); }}
                            title="Delete"
                            style={{ ...actionButtonStyle, minWidth:compact ? 16 : 18, width:compact ? 16 : 18, padding:0, background:'rgba(255,255,255,.58)', opacity:.72 }}>
                            <Trash size={10} color={color} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {/* Current time indicator */}
                  {isToday && showNow && (
                    <div style={{ position:'absolute', top:nowY, left:0, right:0, zIndex:2, pointerEvents:'none' }}>
                      <div style={{ position:'absolute', left:0, top:-4, width:8, height:8, borderRadius:'50%', background:'#EF4444', flexShrink:0 }} />
                      <div style={{ height:2, background:'#EF4444', marginLeft:8 }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderMobileMonth = () => {
    const selectedDate = dateFromCalendarKey(mobileSelectedKey) || new Date(viewYear, viewMonth, 1);
    const selectedLabel = new Intl.DateTimeFormat(localeFor(lang), { weekday:'long', day:'numeric', month:'long' }).format(selectedDate);
    return (
      <div style={calS.mobilePanel}>
        <div style={calS.mobileMonthGrid}>
          {WEEK_LABELS.map(d => <div key={d} style={calS.mobileMonthWeekLabel}>{d.slice(0, 2)}</div>)}
          {monthGrid.map((day, i) => {
            const key = dayKey(day);
            const dayEvs = getVisibleDayEvents(key);
            const isCurrentMonth = day.getMonth() === viewMonth;
            const isToday = key === dayKey(today);
            const isSelected = key === mobileSelectedKey;
            return (
              <button
                key={i}
                type="button"
                disabled={!isCurrentMonth}
                onClick={() => setMobileSelectedKey(key)}
                style={{
                  ...calS.mobileMonthCell,
                  opacity:isCurrentMonth ? 1 : 0.28,
                  borderColor:isSelected ? 'var(--indigo)' : isToday ? '#C7D2FE' : 'var(--border)',
                  background:isSelected ? 'var(--lavender)' : 'var(--surface)',
                }}>
                <span style={{ width:28, height:28, borderRadius:999, display:'grid', placeItems:'center', background:isToday ? 'var(--indigo)' : 'transparent', color:isToday ? '#fff' : 'var(--ink)', fontSize:13, fontWeight:900 }}>
                  {day.getDate()}
                </span>
                <span style={{ display:'flex', gap:3, justifyContent:'center', minHeight:5 }}>
                  {dayEvs.slice(0, 3).map(({ event }, dotIndex) => (
                    <span key={dotIndex} style={{ width:5, height:5, borderRadius:999, background:paletteForEvent(event).color }} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <div style={calS.mobileAgendaHeader}>
          <div>
            <div style={{ fontSize:17, fontWeight:900, color:'var(--ink)', textTransform:'capitalize' }}>{selectedLabel}</div>
            <div style={{ fontSize:12, fontWeight:800, color:'var(--gray)', marginTop:3 }}>
              {getVisibleDayEvents(mobileSelectedKey).length} activities
            </div>
          </div>
          <button type="button" onClick={() => openModal(mobileSelectedKey)} style={calS.mobilePrimaryBtn}>
            <Plus size={16} /> {tt(lang, 'addActivity')}
          </button>
        </div>
        {renderMobileAgenda(mobileSelectedKey, 'No activities on this date.')}
      </div>
    );
  };

  const renderMonth = () => (
    isMobile ? renderMobileMonth() : <div>
      <div style={calS.monthWeekHeader}>{WEEK_LABELS.map(d => <div key={d} style={calS.monthWeekLabel}>{d}</div>)}</div>
      <div style={calS.monthGrid}>
        {monthGrid.map((day, i) => {
          const key = dayKey(day);
          const isCurrentMonth = day.getMonth() === viewMonth;
          const isToday = dayKey(day) === dayKey(today);
          const dayEvs = getVisibleDayEvents(key);
          const isDropTarget = monthDrag && monthDrag.toKey === key && monthDrag.fromKey !== key;
          return (
            <div key={i}
              data-month-cell={isCurrentMonth ? key : undefined}
              style={{ ...calS.monthCell, ...(isToday?calS.monthCellToday:{}), ...(isDropTarget?{ background:'var(--lavender)', border:'1.5px dashed var(--indigo)' }:{}), opacity:isCurrentMonth?1:0.35, cursor:isCurrentMonth?'pointer':'default' }}
              onClick={() => { if (monthDragMeta.current.started) return; isCurrentMonth && openDayDetail(key); }}>
              <span style={{ ...calS.monthDayNum, ...(isToday?calS.monthDayToday:{}) }}>{day.getDate()}</span>
              <div style={{ display:'flex', flexDirection:'column', gap:2, marginTop:3 }}>
                {dayEvs.slice(0,2).map(({ event: ev, index: eventIndex }, idx) => {
                  const { color, bg, text } = paletteForEvent(ev);
                  const isDragging = monthDrag && monthDrag.fromKey === key && monthDrag.ev === ev;
                  return <div key={idx}
                    onPointerDown={e => startMonthDrag(e, ev, key, eventIndex)}
                    style={{ ...calS.monthPill, background:bg, color:text, border:`1px solid ${color}33`, opacity:isDragging?0.3:(ev.completed?0.5:1), textDecoration:ev.completed?'line-through':'none', cursor:'grab', userSelect:'none', touchAction:'none' }}>{ev.name}</div>;
                })}
                {dayEvs.length > 2 && <div style={calS.monthMore}>+{dayEvs.length-2} more</div>}
              </div>
            </div>
          );
        })}
      </div>
      {monthDrag && monthDrag.started !== false && (
        <div style={{ position:'fixed', left:monthDrag.ghostX+8, top:monthDrag.ghostY+8, pointerEvents:'none', zIndex:9999, background: paletteForEvent(monthDrag.ev).bg, color:paletteForEvent(monthDrag.ev).text, fontSize:10, fontWeight:600, padding:'4px 8px', borderRadius:4, boxShadow:'0 4px 12px rgba(0,0,0,.2)' }}>
          {monthDrag.ev.name}
        </div>
      )}
    </div>
  );

  const renderModal = () => {
    const cat = LIFE_CATS.find(c => c.id === selCat);
    const noteInfo = selNoteId ? subjectOptions.find((subject) => String(subject.noteId) === String(selNoteId)) : null;
    return (
      <div style={{ ...calS.overlay, ...(isMobile ? calS.mobileOverlay : null) }} onClick={closeModal}>
        <div style={{ ...calS.modal, ...(isMobile ? calS.mobileModal : null) }} onClick={e => e.stopPropagation()}>
          {isMobile && <div style={calS.sheetHandle} />}
          <h3 style={{ ...calS.modalTitle, ...(isMobile ? calS.mobileModalTitle : null) }}>{tt(lang, 'addActivity')} · {fmtModalDate(modalKey)}</h3>
          <div style={calS.modalField}>
            <label style={calS.modalLabel}>{tt(lang, 'activityTitle')}</label>
            <input value={modalName} onChange={e => setModalName(e.target.value)} onKeyDown={e => e.key==='Enter' && addEvent()}
              placeholder={tt(lang, 'activityPlaceholder')} style={calS.modalInput} autoFocus={!isMobile} />
          </div>
          <div style={{ display:'flex', flexDirection:isMobile ? 'column' : 'row', gap:12, marginBottom:16 }}>
            <div style={{ flex:1, minWidth:0 }}><label style={calS.modalLabel}>{tt(lang, 'startTime')}</label><input type="time" value={modalTime} onChange={e => setModalTime(e.target.value)} style={calS.modalInput} /></div>
            <div style={{ flex:1, minWidth:0 }}><label style={calS.modalLabel}>{tt(lang, 'duration')}</label>
              <select value={modalDur} onChange={e => setModalDur(e.target.value)} style={calS.modalInput}>
                {['15m','30m','45m','1h','1h30m','2h','3h','Custom'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {modalDur === 'Custom' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
                  <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--gray)', fontWeight:700 }}>
                    <input type="number" min="0" max="12" value={customH}
                      onChange={e => setCustomH(Math.max(0, Math.min(12, Number(e.target.value) || 0)))}
                      style={{ ...calS.modalInput, padding:'8px 10px', textAlign:'center' }} />h
                  </label>
                  <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--gray)', fontWeight:700 }}>
                    <input type="number" min="0" max="59" value={customM}
                      onChange={e => setCustomM(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                      style={{ ...calS.modalInput, padding:'8px 10px', textAlign:'center' }} />m
                  </label>
                </div>
              )}
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={calS.modalLabel}>{tt(lang, 'category')}</label>
            <div style={{ ...calS.modalChipRow, ...(isMobile ? calS.mobileModalChipRow : null) }}>
              {LIFE_CATS.map(c => (
                <button key={c.id} onClick={() => { setSelCat(c.id); if(c.id!=='study') setSelNoteId(null); }}
                  style={{ ...calS.catChip, ...(isMobile ? calS.mobileModalChip : null), background:selCat===c.id?c.color:c.bg, color:selCat===c.id?'#fff':c.text, border:`1.5px solid ${c.color}` }}>
                  <span style={{ ...calS.catDot, background:selCat===c.id?'#fff':c.color }} />{tt(lang, c.id)}
                </button>
              ))}
            </div>
          </div>
          {selCat === 'study' && (
            <div style={{ marginBottom:16 }}>
              <label style={calS.modalLabel}>{tt(lang, 'whichSubject')}</label>
              <div style={{ ...calS.modalChipRow, ...(isMobile ? calS.mobileModalChipRow : null) }}>
                {subjectOptions.length > 0
                  ? subjectOptions.map((info) => (
                    <button key={`${info.noteId}-${info.subject}`} onClick={() => selectSubject(info.subject)}
                      style={{ ...calS.catChip, ...(isMobile ? calS.mobileModalChip : null), background:selNoteId===info.noteId?info.color:info.bg, color:selNoteId===info.noteId?'#fff':info.text, border:`1.5px solid ${info.color}` }}>
                      {info.subject}
                    </button>
                  ))
                  : <div style={{ fontSize:12, color:'var(--gray)', paddingTop:6 }}>{tt(lang, 'noSubjectsLoaded')}</div>}
              </div>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:isMobile ? 'column-reverse' : 'row', gap:10, justifyContent:'flex-end', marginTop:20 }}>
            <button onClick={closeModal} style={{ ...calS.cancelBtn, ...(isMobile ? calS.mobileFullBtn : null) }}>{tt(lang, 'cancel')}</button>
            <button onClick={addEvent} style={{ ...calS.saveBtn, ...(isMobile ? calS.mobileFullBtn : null) }}>{tt(lang, 'addActivity')}</button>
          </div>
        </div>
      </div>
    );
  };

  const renderEditModal = () => {
    const f = editForm;
    const currentEvent = editEv ? (events[editEv.key] || [])[editEv.idx] : null;
    const isPlannerEvent = currentEvent?.source === 'study-plan-service';
    const isStudyAction = isStudyActionEvent(currentEvent);
    const plannerExam = isPlannerEvent ? exams.find((exam) => String(exam.id) === String(currentEvent.examId)) : null;
    const plannerChapter = plannerExam?.chapters?.find((chapter) => String(chapter.id) === String(currentEvent.chapterId));
    const plannerSubject = plannerChapter?.title && plannerChapter.title !== plannerExam?.name ? plannerChapter.title : null;
    const plannerDetail = plannerSubject || (currentEvent?.noteSubject !== plannerExam?.name ? currentEvent?.noteSubject : null) || 'No chapter linked';
    const cat = LIFE_CATS.find(c => c.id === f.cat);
    const noteInfo = f.noteId
      ? (subjectOptions.find((subject) => String(subject.noteId) === String(f.noteId)) || { color: f.noteColor || null, bg: f.noteBg || null, text: f.noteText || null })
      : null;
    const upd = (patch) => setEditForm(prev => prev ? ({ ...prev, ...patch }) : prev);
    return (
      <div style={{ ...calS.overlay, ...(isMobile ? calS.mobileOverlay : null) }} onClick={closeEditEvent}>
        <div style={{ ...calS.modal, maxHeight:isMobile ? '92dvh' : '88vh', overflowY:'auto', ...(isMobile ? calS.mobileModal : null) }} onClick={e => e.stopPropagation()}>
          {isMobile && <div style={calS.sheetHandle} />}
          <div style={{ display:'flex', flexDirection:isMobile ? 'column' : 'row', alignItems:isMobile ? 'flex-start' : 'center', justifyContent:'space-between', gap:isMobile ? 10 : 0, marginBottom:18 }}>
            <h3 style={{ ...calS.modalTitle, ...(isMobile ? calS.mobileModalTitle : null), margin:0 }}>{tt(lang, 'editActivity')} · {fmtModalDate(editEv.key)}</h3>
            <label style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:'var(--gray)', cursor:'pointer', userSelect:'none' }}>
              <input type="checkbox" checked={f.completed} onChange={e => upd({ completed: e.target.checked })} />
              {tt(lang, 'completed')}
            </label>
          </div>
          <div style={calS.modalField}>
            <label style={calS.modalLabel}>{tt(lang, 'activityTitle')}</label>
            <input value={f.name} onChange={e => upd({ name: e.target.value })} readOnly={isPlannerEvent} style={{ ...calS.modalInput, ...(isPlannerEvent ? { background:'var(--sidebar-bg)', color:'var(--gray)' } : null) }} />
          </div>
          <div style={{ display:'flex', flexDirection:isMobile ? 'column' : 'row', gap:12, marginBottom:16 }}>
            <div style={{ flex:1, minWidth:0 }}><label style={calS.modalLabel}>{tt(lang, 'startTime')}</label><input type="time" value={f.time} onChange={e => upd({ time: e.target.value })} style={calS.modalInput} /></div>
            <div style={{ flex:1, minWidth:0 }}><label style={calS.modalLabel}>{tt(lang, 'duration')}</label>
              <select value={f.dur} onChange={e => upd({ dur: e.target.value })} style={calS.modalInput}>
                {['15m','30m','45m','1h','1h30m','2h','3h'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          {isPlannerEvent && (
            <div style={{ marginBottom:16 }}>
              <label style={calS.modalLabel}>Real source</label>
              <div style={calS.realSourceBox}>
                <div>
                  <strong>{plannerExam?.name || currentEvent.noteSubject || 'Study plan item'}</strong>
                  <span>{plannerDetail}</span>
                </div>
                <span>{currentEvent.examId ? 'Exam linked' : 'No exam link'}</span>
              </div>
              <label style={calS.modalLabel}>Study plan activity</label>
              <div style={{ ...calS.modalChipRow, ...(isMobile ? calS.mobileModalChipRow : null) }}>
                {Object.entries(STUDY_PLAN_TYPE_LABELS).filter(([value]) => value !== 'buffer').map(([value, label]) => (
                  <button key={value} onClick={() => upd({ studyType: value })}
                    style={{ ...calS.catChip, ...(isMobile ? calS.mobileModalChip : null), background:f.studyType===value?'var(--indigo)':'var(--lavender)', color:f.studyType===value?'#fff':'var(--indigo)', border:'1.5px solid var(--indigo)' }}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:10 }}>
                <button onClick={() => { toggleEventDone(editEv.key, editEv.idx); upd({ completed: !f.completed }); }}
                  style={{ ...calS.repairBtn, color:'#166534', borderColor:'#86EFAC', background:'#DCFCE7' }}>
                  {f.completed ? tt(lang, 'markPlanned') : tt(lang, 'markDone')}
                </button>
                <button onClick={() => { moveStudyEvent(editEv.key, { ...(events[editEv.key] || [])[editEv.idx], index: editEv.idx }, keyAddDays(editEv.key, 1)); closeEditEvent(); }}
                  style={{ ...calS.repairBtn, color:'var(--indigo)', borderColor:'#C7D2FE', background:'#EEF2FF' }}>
                  {tt(lang, 'moveTomorrow')}
                </button>
                <button onClick={() => { markStudyEventMissed(editEv.key, editEv.idx); closeEditEvent(); }}
                  style={{ ...calS.repairBtn, color:'#92400E', borderColor:'#FDE68A', background:'#FFFBEB' }}>
                  {tt(lang, 'markMissed')}
                </button>
              </div>
            </div>
          )}
          {!isPlannerEvent && isStudyAction && (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
              <button onClick={() => { toggleEventDone(editEv.key, editEv.idx); upd({ completed: !f.completed }); }}
                style={{ ...calS.repairBtn, color:'#166534', borderColor:'#86EFAC', background:'#DCFCE7' }}>
                {f.completed ? tt(lang, 'markPlanned') : tt(lang, 'markDone')}
              </button>
              <button onClick={() => { moveStudyEvent(editEv.key, { ...(events[editEv.key] || [])[editEv.idx], index: editEv.idx }, keyAddDays(editEv.key, 1)); closeEditEvent(); }}
                style={{ ...calS.repairBtn, color:'var(--indigo)', borderColor:'#C7D2FE', background:'#EEF2FF' }}>
                {tt(lang, 'moveTomorrow')}
              </button>
            </div>
          )}
          {!isPlannerEvent && (
            <>
              <div style={{ marginBottom:16 }}>
                <label style={calS.modalLabel}>{tt(lang, 'category')}</label>
                <div style={{ ...calS.modalChipRow, ...(isMobile ? calS.mobileModalChipRow : null) }}>
                  {LIFE_CATS.map(c => (
                    <button key={c.id} onClick={() => upd({ cat: c.id, noteId: c.id !== 'study' ? null : f.noteId })}
                      style={{ ...calS.catChip, ...(isMobile ? calS.mobileModalChip : null), background:f.cat===c.id?c.color:c.bg, color:f.cat===c.id?'#fff':c.text, border:`1.5px solid ${c.color}` }}>
                      <span style={{ ...calS.catDot, background:f.cat===c.id?'#fff':c.color }} />{tt(lang, c.id)}
                    </button>
                  ))}
                </div>
              </div>
              {f.cat === 'study' && (
                <div style={{ marginBottom:16 }}>
                  <label style={calS.modalLabel}>{tt(lang, 'whichSubject')}</label>
                <div style={{ ...calS.modalChipRow, ...(isMobile ? calS.mobileModalChipRow : null) }}>
                    {subjectOptions.length > 0
                      ? subjectOptions.map((subjectInfo) => (
                        <button key={`${subjectInfo.noteId}-${subjectInfo.subject}`} onClick={() => upd({ noteId: f.noteId === subjectInfo.noteId ? null : subjectInfo.noteId })}
                          style={{ ...calS.catChip, ...(isMobile ? calS.mobileModalChip : null), background:f.noteId===subjectInfo.noteId?subjectInfo.color:subjectInfo.bg, color:f.noteId===subjectInfo.noteId?'#fff':subjectInfo.text, border:`1.5px solid ${subjectInfo.color}` }}>
                          {subjectInfo.subject}
                        </button>
                      ))
                      : <span style={{ fontSize:12, color:'var(--gray)' }}>{tt(lang, 'noLinkedSubjects')}</span>
                    }
                  </div>
                  {f.noteId && (
                    <button onClick={() => { closeEditEvent(); setTab('notes'); }}
                      style={{ marginTop:10, padding:'7px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                      {tt(lang, 'openLinkedNote')}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
          <div style={calS.modalField}>
            <label style={calS.modalLabel}>{tt(lang, 'notesInfo')}</label>
            <textarea value={f.notes} onChange={e => upd({ notes: e.target.value })}
              placeholder={tt(lang, 'notesPlaceholder')}
              style={{ ...calS.modalInput, minHeight:70, resize:'vertical', fontFamily:'inherit' }} />
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={calS.modalLabel}>{tt(lang, 'materialsLinks')}</label>
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
              {f.materials.map((m, i) => (
                <div key={i} style={{ display:'flex', gap:6 }}>
                  <input value={m} onChange={e => updateMaterial(i, e.target.value)}
                    placeholder={tt(lang, 'materialPlaceholder')} style={{ ...calS.modalInput, flex:1 }} />
                  <button onClick={() => removeMaterial(i)}
                    style={{ width:36, borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--gray)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Trash size={13} /></button>
                </div>
              ))}
              <button onClick={addMaterial}
                style={{ alignSelf:'flex-start', padding:'8px 12px', borderRadius:10, border:'1.5px dashed var(--border)', background:'transparent', color:'var(--gray)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                + {tt(lang, 'addMaterialLink')}
              </button>
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={calS.modalLabel}>{tt(lang, 'attachedFiles')}</label>
            <div
              onDragOver={e => { e.preventDefault(); setFileDragOver(true); }}
              onDragLeave={() => setFileDragOver(false)}
              onDrop={onFileDrop}
              style={{ marginTop:8, padding:'16px', border:`1.5px dashed ${fileDragOver ? 'var(--indigo)' : 'var(--border)'}`, borderRadius:12, background: fileDragOver ? 'var(--lavender)' : 'transparent', textAlign:'center', cursor:'pointer', transition:'background .15s, border-color .15s' }}
              onClick={browseFiles}>
              <div style={{ fontSize:22, marginBottom:4 }}>📤</div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', marginBottom:2 }}>{tt(lang, 'dragFilesHere')}</div>
              <div style={{ fontSize:11, color:'var(--gray)' }}>{tt(lang, 'clickSelectFiles')}</div>
              <input ref={fileInputRef} type="file" multiple onChange={onFilePick} style={{ display:'none' }} />
            </div>
            {f.files && f.files.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
                {f.files.map(file => (
                  <div key={file.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'var(--sidebar-bg)', border:'1px solid var(--border)', borderRadius:8 }}>
                    <span style={{ color:'var(--indigo)', display:'grid', placeItems:'center' }}><FileText size={14} /></span>
                    <div style={{ flex:1, minWidth:0, fontSize:12, fontWeight:600, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={file.name}>{file.name}</div>
                    <span style={{ fontSize:11, color:'var(--gray)', flexShrink:0 }}>{fmtFileSize(file.size)}</span>
                    <button onClick={() => removeEditFile(file.id)}
                      style={{ width:24, height:24, borderRadius:6, border:'none', background:'transparent', color:'var(--gray)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Trash size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display:'flex', flexDirection:isMobile ? 'column' : 'row', gap:10, justifyContent:'space-between', marginTop:20 }}>
            <button onClick={deleteEditEvent}
              style={{ padding:'10px 16px', borderRadius:999, border:'1px solid #EF4444', background:'transparent', color:'#EF4444', fontWeight:600, fontSize:13, cursor:'pointer', ...(isMobile ? calS.mobileFullBtn : null) }}>
              {tt(lang, 'delete')}
            </button>
            <div style={{ display:'flex', flexDirection:isMobile ? 'column-reverse' : 'row', gap:10, width:isMobile ? '100%' : 'auto' }}>
              <button onClick={closeEditEvent} style={{ ...calS.cancelBtn, ...(isMobile ? calS.mobileFullBtn : null) }}>{tt(lang, 'cancel')}</button>
              <button onClick={saveEditEvent} style={{ ...calS.saveBtn, ...(isMobile ? calS.mobileFullBtn : null) }}>{tt(lang, 'save')}</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ ...calS.wrap, ...(isMobile ? calS.mobileWrap : null) }}>
      <div style={{ marginBottom:isMobile ? 8 : 22 }}>
        <h2 style={{ ...homeS.h1, ...(isMobile ? { fontSize:28, lineHeight:1.12 } : null) }}>{tt(lang, 'calendar')}</h2>
        <p style={homeS.sub}>{tt(lang, 'calendarSub')}</p>
      </div>
      <div style={{ ...calS.header, ...(isMobile ? calS.mobileHeader : null) }}>
        <div style={{ ...calS.navGroup, ...(isMobile ? { width:'100%', justifyContent:'space-between' } : null) }}>
          <button onClick={navPrev} style={{ ...calS.navBtn, ...(isMobile ? calS.mobileIconBtn : null) }}>‹</button>
          <span style={{ ...calS.rangeLabel, ...(isMobile ? calS.mobileRangeLabel : null) }}>{rangeLabel}</span>
          <button onClick={navNext} style={{ ...calS.navBtn, ...(isMobile ? calS.mobileIconBtn : null) }}>›</button>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, ...(isMobile ? calS.mobileToolbar : null) }}>
          <button onClick={() => setDensity((current) => current === 'compact' ? 'detailed' : 'compact')}
            style={{ display:'inline-flex', alignItems:'center', gap:7, minHeight:isMobile ? 44 : 'auto', padding:isMobile ? '0 14px' : '8px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:999, fontSize:13, fontWeight:600, color:'var(--ink)', cursor:'pointer', whiteSpace:'nowrap' }}>
            {density === 'compact' ? tt(lang, 'compact') : tt(lang, 'detailed')}
          </button>
          {/* View dropdown pill */}
          <div style={{ position:'relative' }}>
            <button onClick={() => setViewDropOpen(o => !o)}
              style={{ display:'inline-flex', alignItems:'center', gap:7, minHeight:isMobile ? 44 : 'auto', padding:isMobile ? '0 16px' : '8px 16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:999, fontSize:13, fontWeight:600, color:'var(--ink)', cursor:'pointer', userSelect:'none', whiteSpace:'nowrap' }}>
              {view === 'week' ? 'Settimana' : 'Mese'}
              <ChevronDown size={14} color="var(--gray)" />
            </button>
            {viewDropOpen && (
              <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, boxShadow:'0 12px 32px rgba(0,0,0,.18)', zIndex:300, minWidth:160, overflow:'hidden' }}
                onMouseLeave={() => setViewDropOpen(false)}>
                {[{v:'week',label:'Settimana',key:'W'},{v:'month',label:'Mese',key:'M'}].map(({v, label, key}) => (
                  <button key={v} onClick={() => { setView(v); setViewDropOpen(false); }}
                    style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 18px', background: view===v ? 'var(--lavender)' : 'transparent', color: view===v ? 'var(--indigo)' : 'var(--ink)', fontSize:14, fontWeight: view===v ? 700 : 500, borderBottom:'1px solid var(--border)', cursor:'pointer', textAlign:'left' }}>
                    <span>{label}</span>
                    <span style={{ fontSize:11, color:'var(--gray)', fontWeight:700 }}>{key}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={onOpenPlanner} style={{ display:'inline-flex', alignItems:'center', gap:7, minHeight:isMobile ? 44 : 'auto', padding:isMobile ? '0 16px' : '8px 16px', background:'var(--indigo)', color:'#fff', borderRadius:999, fontSize:13, fontWeight:600, border:'none', cursor:'pointer', whiteSpace:'nowrap' }}>
            <Brain size={14} /> Studio AI
          </button>
        </div>
      </div>
      <div style={{ ...calS.catsRow, ...(isMobile ? calS.mobileCatsRow : null) }}>
        {LIFE_CATS.map(c => (
          <button key={c.id} onClick={() => toggleCat(c.id)}
            style={{ ...calS.catChip, ...(isMobile ? { minHeight:38, flex:'0 0 auto' } : null), opacity:activeCats.has(c.id)?1:0.3, background:c.bg, color:c.text, border:`1.5px solid ${c.color}33` }}>
            <span style={{ ...calS.catDot, background:c.color }} />{c.label}
          </button>
        ))}
      </div>
      {calendarLoading && (
        <div style={calS.readModelNotice}>{tt(lang, 'loadingCalendar')}</div>
      )}
      {!calendarLoading && calendarError && (
        <div style={{ ...calS.readModelNotice, background:'#FEF2F2', borderColor:'#FCA5A5', color:'#991B1B' }}>{calendarError}</div>
      )}
      {!calendarLoading && !calendarError && rescheduleNotice && (
        <div style={{ ...calS.readModelNotice, background:'#EEF2FF', borderColor:'#C7D2FE', color:'var(--indigo)' }}>{rescheduleNotice}</div>
      )}
      {!calendarLoading && !calendarError && serviceEventCount === 0 && (
        <div style={calS.readModelNotice}>No exam or study plan events yet. Add an exam date or generate a plan.</div>
      )}
      {planQuality && (
        <div style={{ ...calS.qualityNotice, ...(isMobile ? { alignItems:'flex-start', flexDirection:'column', gap:4 } : null), ...(planQuality.tone === 'good' ? calS.qualityGood : planQuality.tone === 'warn' ? calS.qualityWarn : calS.qualityInfo) }}>
          <strong>{planQuality.label}</strong>
          <span>{planQuality.text}</span>
        </div>
      )}
      {view === 'week' ? renderWeek() : renderMonth()}
      <div style={calS.balanceSection}>
        <h4 style={calS.balanceTitle}>Life Balance — this week</h4>
        <div style={{ ...calS.balanceGrid, ...(isMobile ? calS.mobileBalanceGrid : null) }}>
          {lifeBalance.map(b => (
            <div key={b.id} style={{ ...calS.balanceCard, ...(isMobile ? { padding:12, borderRadius:12 } : null) }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{ ...calS.catDot, background:b.color }} />
                <span style={{ fontSize:12, fontWeight:600, color:'var(--ink)' }}>{b.label}</span>
              </div>
              <div style={{ fontSize:22, fontWeight:800, color:b.color, letterSpacing:'-0.02em', marginBottom:6 }}>{b.pct}%</div>
              <div style={{ height:4, background:'#F4F5FF', borderRadius:999, overflow:'hidden', marginBottom:4 }}>
                <div style={{ width:`${b.pct}%`, height:'100%', background:b.color, borderRadius:999 }} />
              </div>
              <div style={{ fontSize:11, color:'var(--gray)' }}>{b.mins}m</div>
            </div>
          ))}
        </div>
      </div>
      {dayDetailKey && (() => {
        const key = dayDetailKey;
        const dayEvs = getVisibleDayEvents(key);
        const [yr, mo, dy] = key.split('-').map(Number);
        const d = new Date(yr, mo - 1, dy);
        const label = d.toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(15,16,53,.45)', display:'grid', placeItems:isMobile ? 'end center' : 'center', zIndex:100, padding:isMobile ? '0 10px' : 0 }}
            onClick={closeDayDetail}>
            <div style={{ width:'100%', maxWidth:isMobile ? 'none' : 460, maxHeight:isMobile ? '88dvh' : '80vh', display:'flex', flexDirection:'column', background:'var(--surface)', borderRadius:isMobile ? '24px 24px 0 0' : 20, border:'1px solid var(--border)', boxShadow:'0 30px 80px -20px rgba(15,16,53,.4)', overflow:'hidden' }}
              onClick={e => e.stopPropagation()}>
              {isMobile && <div style={{ ...calS.sheetHandle, marginTop:10, marginBottom:4 }} />}
              <div style={{ padding:isMobile ? '14px 18px 14px' : '20px 22px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:'var(--ink)', textTransform:'capitalize' }}>{label}</div>
                  <div style={{ fontSize:12, color:'var(--gray)', marginTop:2 }}>{dayEvs.length} {dayEvs.length === 1 ? 'attività' : 'attività'}</div>
                </div>
                <button onClick={closeDayDetail} style={{ width:isMobile ? 40 : 30, height:isMobile ? 40 : 30, borderRadius:isMobile ? 12 : 8, border:'1px solid var(--border)', background:'transparent', color:'var(--gray)', fontSize:16, display:'grid', placeItems:'center', cursor:'pointer', flexShrink:0 }}>✕</button>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:isMobile ? '12px 18px' : '12px 22px' }}>
                {dayEvs.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'32px 0', color:'var(--gray)', fontSize:13 }}>Nessuna attività — aggiungine una!</div>
                ) : dayEvs.map(({ event: ev, index: eventIndex }, idx) => {
                  const { bg, color, text } = paletteForEvent(ev);
                  const isDragging = reorderDragIdx === eventIndex;
                  const isDropTarget = reorderOverIdx === eventIndex && reorderDragIdx !== null && reorderDragIdx !== eventIndex;
                  const totalAttach = (ev.materials ? ev.materials.length : 0) + (ev.files ? ev.files.length : 0);
                  return (
                    <div key={idx}
                      draggable
                      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(eventIndex)); setReorderDragIdx(eventIndex); }}
                      onDragEnd={() => { setReorderDragIdx(null); setReorderOverIdx(null); }}
                      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (reorderOverIdx !== eventIndex) setReorderOverIdx(eventIndex); }}
                      onDrop={e => {
                        e.preventDefault();
                        const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
                        setReorderDragIdx(null); setReorderOverIdx(null);
                        if (!isNaN(from) && from !== eventIndex) reorderEvent(key, from, eventIndex);
                      }}
                      onClick={() => { if (reorderDragIdx !== null) return; closeDayDetail(); openEditEvent(key, eventIndex); }}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:isMobile ? '12px' : '10px 12px', minHeight:isMobile ? 64 : 'auto', borderRadius:isMobile ? 14 : 10, background:bg, border:isDropTarget ? `1.5px dashed ${color}` : `1px solid ${color}33`, marginBottom:8, opacity: isDragging ? 0.4 : (ev.completed ? 0.55 : 1), cursor:'pointer' }}>
                      <span style={{ color:text||'var(--gray)', opacity:.5, fontSize:14, lineHeight:1, cursor:'grab', userSelect:'none', flexShrink:0 }}>⋮⋮</span>
                      <div style={{ width:4, alignSelf:'stretch', borderRadius:999, background:color, flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:text||'var(--ink)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textDecoration: ev.completed ? 'line-through' : 'none' }}>{ev.name}</div>
                        <div style={{ fontSize:11, color:text||'var(--gray)', opacity:.7, display:'flex', gap:8 }}>
                          <span>🕐 {normalizeClockTime(ev.time)}</span><span>⏱ {ev.dur}</span>
                          {totalAttach > 0 && <span>📎 {totalAttach}</span>}
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteEvent(key, eventIndex); }} style={{ color:'var(--gray-2)', width:isMobile ? 36 : 'auto', height:isMobile ? 36 : 'auto', padding:4, borderRadius:10, border:'none', background:'transparent', cursor:'pointer', opacity:.6, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}><Trash size={13} /></button>
                      {isStudyActionEvent(ev) && (
                        <button onClick={e => { e.stopPropagation(); toggleEventDone(key, eventIndex); }} style={{ color:ev.completed ? '#16A34A' : 'var(--gray-2)', width:isMobile ? 36 : 'auto', height:isMobile ? 36 : 'auto', padding:4, borderRadius:10, border:'none', background:ev.completed ? '#DCFCE7' : 'transparent', cursor:'pointer', opacity:.9, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}><Check size={13} /></button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ padding:isMobile ? '14px 18px calc(14px + env(safe-area-inset-bottom, 0px))' : '14px 22px', borderTop:'1px solid var(--border)' }}>
                <button onClick={() => { closeDayDetail(); openModal(key); }} style={{ width:'100%', minHeight:isMobile ? 46 : 'auto', padding:'11px', borderRadius:12, background:'var(--indigo)', color:'#fff', fontWeight:600, fontSize:14, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  + Aggiungi attività
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {modalKey && renderModal()}
      {editEv && editForm && renderEditModal()}
      {drag && (
        <div style={{ position:'fixed', left:drag.ghostX, top:drag.ghostY, width:drag.ghostW, height:drag.ghostH,
          background:drag.bg, borderLeft:`3px solid ${drag.color}`, borderRadius:8, padding:'5px 8px',
          zIndex:9999, pointerEvents:'none', boxShadow:'0 12px 32px rgba(0,0,0,.22)',
          opacity:0.92, boxSizing:'border-box', overflow:'hidden' }}>
          <div style={{ fontSize:11, fontWeight:700, color:drag.color, lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{drag.ev.name}</div>
          <div style={{ fontSize:10, color:drag.color, opacity:.8, marginTop:3 }}>🕐 {drag.toTime}</div>
        </div>
      )}
    </div>
  );
}

const calS = {
  wrap: { display:'flex', flexDirection:'column', gap:18 },
  mobileWrap: { gap:14, paddingBottom:18 },
  header: { display:'flex', alignItems:'center', justifyContent:'space-between' },
  mobileHeader: { flexDirection:'column', alignItems:'stretch', gap:12 },
  navGroup: { display:'flex', alignItems:'center', gap:10 },
  navBtn: { width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontSize:18, display:'grid', placeItems:'center', cursor:'pointer' },
  mobileIconBtn: { width:44, height:44, borderRadius:14, fontSize:22, flexShrink:0 },
  rangeLabel: { fontSize:14, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.01em', padding:'6px 18px', border:'1px solid var(--border)', borderRadius:10, background:'var(--surface)', textAlign:'center', whiteSpace:'nowrap' },
  mobileRangeLabel: { flex:1, minWidth:0, minHeight:44, display:'grid', placeItems:'center', padding:'0 12px', borderRadius:14, fontSize:13, overflow:'hidden', textOverflow:'ellipsis' },
  mobileToolbar: { width:'100%', display:'flex', flexWrap:'wrap', overflowX:'visible', paddingBottom:4 },
  viewToggleGroup: { display:'flex', background:'var(--sidebar-bg)', border:'1.5px solid var(--border)', borderRadius:10, padding:3, gap:2 },
  toggleBtn: { padding:'6px 16px', borderRadius:8, fontSize:13, fontWeight:600, color:'var(--gray)', background:'transparent', border:'none', cursor:'pointer' },
  toggleBtnActive: { background:'var(--surface)', color:'var(--ink)', boxShadow:'0 1px 4px rgba(0,0,0,.15)', border:'0.5px solid var(--border)' },
  catsRow: { display:'flex', gap:8, flexWrap:'wrap' },
  mobileCatsRow: { display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:8, overflowX:'visible', margin:0, padding:'0 0 4px' },
  catChip: { display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:999, fontSize:12, fontWeight:600, cursor:'pointer', transition:'opacity .15s' },
  catDot: { width:8, height:8, borderRadius:999, flexShrink:0 },
  readModelNotice: { margin:'0 0 12px', padding:'10px 12px', borderRadius:12, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--gray)', fontSize:13, fontWeight:700 },
  qualityNotice: { margin:'0 0 12px', padding:'10px 12px', borderRadius:12, border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, fontSize:13, fontWeight:700 },
  qualityGood: { background:'#DCFCE7', borderColor:'#86EFAC', color:'#166534' },
  qualityWarn: { background:'#FFFBEB', borderColor:'#FDE68A', color:'#92400E' },
  qualityInfo: { background:'#EEF2FF', borderColor:'#C7D2FE', color:'var(--indigo)' },
  weekGrid: { display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:8 },
  weekCol: { display:'flex', flexDirection:'column', gap:6 },
  weekColHeader: { display:'flex', flexDirection:'column', alignItems:'center', gap:2, padding:'10px 8px', background:'var(--sidebar-bg)', border:'1px solid var(--border)', borderRadius:10, marginBottom:2 },
  weekDayName: { fontSize:10, fontWeight:700, color:'var(--gray-2)', letterSpacing:'0.06em' },
  weekDayNum: { fontSize:22, fontWeight:700, color:'var(--ink)', lineHeight:1, width:36, height:36, display:'grid', placeItems:'center', borderRadius:999 },
  weekDayToday: { background:'var(--indigo)', color:'#fff' },
  weekEvs: { display:'flex', flexDirection:'column', gap:6 },
  evCard: { borderRadius:10, padding:'8px 10px', display:'flex', flexDirection:'column', gap:4 },
  evName: { fontSize:12, fontWeight:600, color:'var(--ink)', lineHeight:1.3 },
  evMeta: { display:'flex', alignItems:'center', gap:4, fontSize:10, color:'var(--gray)' },
  evTrash: { color:'var(--gray-2)', padding:2, borderRadius:4, flexShrink:0, opacity:0.6 },
  noteChip: { fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:999 },
  addSlot: { border:'1.5px dashed var(--border)', borderRadius:10, padding:'7px', fontSize:12, color:'var(--gray-2)', fontWeight:600, textAlign:'center', cursor:'pointer', background:'transparent' },
  monthWeekHeader: { display:'grid', gridTemplateColumns:'repeat(7, 1fr)', marginBottom:4 },
  monthWeekLabel: { textAlign:'center', fontSize:11, fontWeight:700, color:'var(--gray)', letterSpacing:'0.04em', padding:'4px 0' },
  monthGrid: { display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2 },
  monthCell: { height:90, padding:'6px 8px', borderRadius:8, border:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden' },
  monthCellToday: { border:'1.5px solid #3730E8' },
  monthDayNum: { fontSize:12, fontWeight:600, color:'var(--ink)' },
  monthDayToday: { background:'#3730E8', color:'#fff', width:20, height:20, borderRadius:999, display:'grid', placeItems:'center', fontSize:11 },
  monthPill: { fontSize:10, fontWeight:600, color:'#fff', padding:'2px 6px', borderRadius:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  monthMore: { fontSize:10, color:'var(--gray)', fontWeight:600 },
  balanceSection: { borderTop:'1px solid var(--border)', paddingTop:18 },
  balanceTitle: { margin:'0 0 12px', fontSize:14, fontWeight:700, color:'var(--ink)' },
  balanceGrid: { display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:10 },
  mobileBalanceGrid: { gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:8 },
  balanceCard: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:14 },
  overlay: { position:'fixed', inset:0, background:'rgba(15,16,53,.4)', display:'grid', placeItems:'center', zIndex:2600, overflow:'hidden' },
  mobileOverlay: { placeItems:'end center', padding:'0', overflowX:'hidden' },
  modal: { background:'var(--surface)', borderRadius:20, padding:28, width:'100%', maxWidth:480, boxShadow:'0 20px 60px -10px rgba(15,16,53,.2)', boxSizing:'border-box', overflowX:'hidden' },
  mobileModal: { width:'100%', maxWidth:'100%', borderRadius:'24px 24px 0 0', padding:'12px 16px calc(18px + env(safe-area-inset-bottom, 0px))', maxHeight:'92dvh', overflowY:'auto', overflowX:'hidden', overscrollBehavior:'contain' },
  sheetHandle: { width:42, height:4, borderRadius:999, background:'#D1D5DB', margin:'0 auto 14px' },
  modalTitle: { margin:'0 0 20px', fontSize:16, fontWeight:700, color:'var(--ink)' },
  mobileModalTitle: { fontSize:18, lineHeight:1.25, overflowWrap:'anywhere' },
  modalField: { marginBottom:16 },
  modalLabel: { display:'block', fontSize:12, fontWeight:700, color:'var(--ink)', marginBottom:8 },
  modalInput: { width:'100%', padding:'10px 12px', border:'1px solid var(--border)', borderRadius:10, fontSize:16, color:'var(--ink)', background:'var(--surface)', outline:'none', boxSizing:'border-box' },
  modalChipRow: { display:'flex', gap:8, flexWrap:'wrap', marginTop:8, maxWidth:'100%' },
  mobileModalChipRow: { display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:8 },
  mobileModalChip: { width:'100%', minWidth:0, justifyContent:'center', overflow:'hidden', textOverflow:'ellipsis' },
  realSourceBox: { margin:'0 0 12px', padding:'11px 13px', borderRadius:12, border:'1px solid var(--border)', background:'var(--sidebar-bg)', color:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, fontSize:12, fontWeight:800 },
  cancelBtn: { padding:'10px 20px', borderRadius:999, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontWeight:600, fontSize:14, cursor:'pointer' },
  saveBtn: { padding:'10px 20px', borderRadius:999, border:'none', background:'var(--indigo)', color:'#fff', fontWeight:600, fontSize:14, cursor:'pointer' },
  mobileFullBtn: { width:'100%', minHeight:46 },
  repairBtn: { padding:'8px 12px', borderRadius:999, border:'1px solid', fontSize:12, fontWeight:800, cursor:'pointer' },
  mobilePanel: { display:'flex', flexDirection:'column', gap:16 },
  mobileDayRail: { display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:8, overflowX:'visible', margin:0, padding:'2px 0 4px' },
  mobileDayButton: { minHeight:82, minWidth:0, borderRadius:18, border:'1px solid var(--border)', background:'var(--surface)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:5, cursor:'pointer', padding:'8px 4px', WebkitTapHighlightColor:'transparent' },
  mobileDayButtonActive: { background:'var(--lavender)', borderColor:'var(--indigo)', boxShadow:'0 12px 26px -22px rgba(55,48,232,.55)' },
  mobileAgendaHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 },
  mobilePrimaryBtn: { minHeight:46, padding:'0 15px', borderRadius:15, border:'none', background:'var(--indigo)', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7, fontSize:12, fontWeight:900, cursor:'pointer', whiteSpace:'nowrap', boxShadow:'0 12px 24px -18px rgba(55,48,232,.7)' },
  mobileMonthGrid: { display:'grid', gridTemplateColumns:'repeat(7, minmax(0, 1fr))', gap:5 },
  mobileMonthWeekLabel: { textAlign:'center', fontSize:10, fontWeight:900, color:'var(--gray)', padding:'0 0 4px' },
  mobileMonthCell: { minHeight:48, borderRadius:14, border:'1px solid var(--border)', background:'var(--surface)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, padding:3, cursor:'pointer' },
};
