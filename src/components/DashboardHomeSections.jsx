import React from 'react';

import {
  ArrowRight,
  Check,
  Clock,
  FileText,
  Layers,
  MsgCircle,
  Sparkles,
} from '../lib/icons';
import { tt } from '../lib/i18n';
import { LIFE_CATS, resolveEventPalette } from './calendarData';

export function IconTile({ children, tone = 'indigo', s }) {
  const tones = {
    indigo: ['#EEF2FF', '#3730E8'],
    purple: ['#F5F3FF', '#7C3AED'],
    cyan: ['#ECFEFF', '#0891B2'],
    green: ['#ECFDF5', '#059669'],
    red: ['#FEF2F2', '#DC2626'],
  };
  const [bg, color] = tones[tone] || tones.indigo;
  return <span style={{ ...s.iconTile, background: bg, color }}>{children}</span>;
}

export function EmptyState({ title, text, s, action = null }) {
  return (
    <div style={s.empty}>
      <strong>{title}</strong>
      <span>{text}</span>
      {action && (
        <button type="button" style={s.emptyAction} onClick={action.onClick}>
          {action.label} <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
}

export function DashboardHero({
  s,
  isMobile,
  heroDate,
  user,
  totalToday,
  completedToday,
  nextEvent,
  nextExam,
  nextExamDays,
  setTab,
  heroProgress,
  heroProgressText,
  lang = 'en',
}) {
  const remainingToday = Math.max(0, totalToday - completedToday);
  const ringRadius = 44;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (Math.max(0, Math.min(100, heroProgress)) / 100) * ringCircumference;
  return (
    <section
      style={{
        ...s.hero,
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? 16 : s.hero.gap,
        padding: isMobile ? 22 : 26,
        position: isMobile ? 'relative' : s.hero.position,
      }}
    >
      <div style={s.heroText}>
        <div style={s.kicker}>{heroDate}</div>
        <h1 style={s.heroTitle}>{tt(lang, 'goodMorning')}, {user.name || 'Alex'}</h1>
        <p style={s.heroSub}>
          {totalToday > 0
            ? tt(lang, nextEvent?.time ? 'activitiesLeftWithNext' : 'activitiesLeftToday', { count: remainingToday, time: nextEvent?.time })
            : nextExam
              ? tt(lang, nextExamDays !== null ? 'nextExamInDays' : 'nextExamLabel', { name: nextExam.name, days: nextExamDays })
              : tt(lang, 'createExamsMaterials')}
        </p>
        <div style={{ ...s.heroActions, ...(isMobile ? s.mobileHeroActions : null) }}>
          <button style={{ ...s.heroButton, ...(isMobile ? s.mobileHeroButton : null) }} onClick={() => nextExam ? setTab('quiz') : setTab('notes')}>
            {nextExam ? tt(lang, 'startPractice') : tt(lang, 'createExam')}
          </button>
          {nextExam && (
            <span style={{ ...s.heroPill, ...(isMobile ? s.mobileHeroPill : null) }}>
              <Clock size={15} />
              <span style={s.heroPillText}>{nextExam.name}{nextExamDays !== null ? ` · ${tt(lang, 'daysShort', { count: nextExamDays })}` : ''}</span>
            </span>
          )}
        </div>
      </div>
      <div
        style={{
          ...s.progressRing,
          width: isMobile ? 82 : s.progressRing.width,
          height: isMobile ? 82 : s.progressRing.height,
          ...(isMobile ? s.mobileProgressRing : null),
        }}
        aria-label={tt(lang, 'todayProgressAria', { progress: heroProgressText })}
      >
        <svg style={s.progressSvg} viewBox="0 0 100 100" aria-hidden="true">
          <circle style={s.progressTrack} cx="50" cy="50" r={ringRadius} />
          <circle
            style={{
              ...s.progressArc,
              strokeDasharray: ringCircumference,
              strokeDashoffset: ringOffset,
            }}
            cx="50"
            cy="50"
            r={ringRadius}
          />
        </svg>
        <div style={s.progressInner}>
          <strong style={s.progressValue}>{heroProgressText}</strong>
          <span style={s.progressLabel}>{tt(lang, 'today').toUpperCase()}</span>
        </div>
      </div>
    </section>
  );
}

export function TodaySchedule({ s, todayEvents, completedToday, totalToday, isEventDone, toggleEventDone, setTab, lang = 'en' }) {
  return (
    <section style={s.panel}>
      <div style={s.panelHead}>
        <h2 style={s.panelTitle}>{tt(lang, 'todaySchedule')}</h2>
        <div style={s.panelActions}>
          <span style={s.countBadge}>{tt(lang, 'completedCounter', { completed: completedToday, total: totalToday || 0 })}</span>
          <button type="button" style={s.linkButton} onClick={() => setTab('calendar')}>
            {tt(lang, 'calendar')} <ArrowRight size={13} />
          </button>
        </div>
      </div>
      {todayEvents.length === 0 ? (
        <EmptyState
          s={s}
          title={tt(lang, 'noEventsToday')}
          text={tt(lang, 'scheduleStudyHint')}
          action={{ label: lang === 'it' ? 'Programma lo studio' : 'Plan study', onClick: () => setTab('calendar') }}
        />
      ) : (
        <div style={s.scheduleList}>
          {todayEvents.map((ev, idx) => {
            const cat = LIFE_CATS.find((item) => item.id === ev.cat);
            const palette = resolveEventPalette(ev);
            const accent = palette.color || cat?.color || '#3730E8';
            const done = isEventDone(ev, idx);
            return (
              <button
                key={`${ev.time}-${ev.name}-${idx}`}
                type="button"
                aria-pressed={done}
                onClick={() => toggleEventDone(ev, idx)}
                style={{ ...s.scheduleItem, opacity: done ? .68 : 1, background: done ? '#fff' : '#F8F9FF' }}
              >
                <span style={{ ...s.itemAccent, background: accent }} />
                <span style={s.itemTime}>{ev.time || '--:--'}</span>
                <span style={s.itemMain}>
                  <strong style={{ ...s.itemTitle, textDecoration: done ? 'line-through' : 'none' }}>{ev.name}</strong>
                  <small style={{ ...s.itemMeta, textDecoration: done ? 'line-through' : 'none' }}>{ev.noteSubject || (cat ? tt(lang, cat.id) : tt(lang, 'study'))}{ev.dur ? ` - ${ev.dur}` : ''}</small>
                </span>
                <span style={{ ...s.checkBox, background: done ? '#3730E8' : '#fff', borderColor: done ? '#3730E8' : '#DDE1EF' }}>
                  {done && <Check size={13} color="#fff" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function RecentActivity({ s, loading, latestActivity, totalExams = 0, setTab, scoreFromActivity, activityCopy, relativeTime, lang = 'en', expanded = false, onToggleExpanded }) {
  const hasNoExams = Number(totalExams || 0) === 0;
  const activityLimit = 5;
  const visibleActivity = expanded ? latestActivity : latestActivity.slice(0, activityLimit);
  const hasMoreActivity = latestActivity.length > activityLimit;
  const moreLabel = lang === 'it'
    ? expanded ? 'Mostra meno' : `Mostra altre ${latestActivity.length - activityLimit}`
    : expanded ? 'Show less' : `Show ${latestActivity.length - activityLimit} more`;
  return (
    <section style={s.panel}>
      <div style={s.panelHead}>
        <h2 style={s.panelTitle}>{tt(lang, 'recentActivity')}</h2>
        <button style={s.linkButton} onClick={() => setTab('analytics')}>{tt(lang, 'analytics')} <ArrowRight size={14} /></button>
      </div>
      {loading ? (
        <EmptyState s={s} title={tt(lang, 'loading')} text={tt(lang, 'readingDashboardData')} />
      ) : latestActivity.length === 0 ? (
        <EmptyState
          s={s}
          title={tt(lang, hasNoExams ? 'noExamsYet' : 'noRecentPractice')}
          text={tt(lang, hasNoExams ? 'createFirstExam' : 'recentPracticeHint')}
          action={{
            label: hasNoExams ? tt(lang, 'newExam') : tt(lang, 'startPractice'),
            onClick: () => setTab(hasNoExams ? 'notes' : 'quiz'),
          }}
        />
      ) : (
        <div style={s.activityStack}>
          <div style={s.activityList}>
            {visibleActivity.map((activity) => {
              const score = scoreFromActivity(activity);
              const tone = activity.type === 'quiz_attempt' ? 'cyan' : activity.type === 'flashcard_review' ? 'purple' : 'indigo';
              return (
                <div key={activity.id} style={s.activityItem}>
                  <span style={{ ...s.activityIcon, background: tone === 'cyan' ? '#ECFEFF' : tone === 'purple' ? '#F5F3FF' : '#EEF2FF', color: tone === 'cyan' ? '#0891B2' : tone === 'purple' ? '#7C3AED' : '#3730E8' }}>
                    {activity.type === 'flashcard_review' ? <Layers size={16} /> : activity.type === 'quiz_attempt' ? <Sparkles size={16} /> : <FileText size={16} />}
                  </span>
                  <div style={s.activityText}>
                    <strong style={s.activityTitle}>{activityCopy(activity)} - {activity.title}</strong>
                    <span style={s.activityMeta}>{relativeTime(activity.at)}</span>
                  </div>
                  {score !== null && <span style={{ ...s.scoreBadge, background: score >= 70 ? '#DCFCE7' : '#FEE2E2', color: score >= 70 ? '#047857' : '#DC2626' }}>{score}%</span>}
                </div>
              );
            })}
          </div>
          {hasMoreActivity && (
            <button type="button" style={s.activityMoreButton} onClick={onToggleExpanded}>
              <span>{moreLabel}</span>
              <span style={{ ...s.activityMoreChevron, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>⌄</span>
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function QuickAction({ s, icon, label, onClick }) {
  return (
    <button style={s.quickAction} onClick={onClick}>
      <IconTile s={s}>{icon}</IconTile>
      <strong>{label}</strong>
    </button>
  );
}

export function QuickActionsPanel({ s, nextExam, startExamQuiz, setTab, onStartTimer, lang = 'en' }) {
  const flashLabel = lang === 'it' ? 'Nuova flashcard' : 'New flashcard';
  return (
    <section style={{ ...s.panel, ...(s.quickPanel || {}) }}>
      <h2 style={s.panelTitle}>{tt(lang, 'quickActions')}</h2>
      <div style={s.quickGrid}>
        <QuickAction s={s} icon={<Sparkles size={20} />} label={tt(lang, 'newQuiz')} onClick={() => setTab('quiz')} />
        <QuickAction s={s} icon={<FileText size={20} />} label={tt(lang, 'uploadNotes')} onClick={() => setTab('notes')} />
        <QuickAction s={s} icon={<Layers size={20} />} label={flashLabel} onClick={() => setTab('flashcards')} />
        <QuickAction s={s} icon={<Clock size={20} />} label={tt(lang, 'startTimer')} onClick={() => onStartTimer && onStartTimer(25)} />
      </div>
    </section>
  );
}

export function RecommendationsPanel({ s, recommendations, totalExams, daysUntil, formatDate, lang, startExamQuiz, onOpenExam, setTab }) {
  const hasNoExams = Number(totalExams || 0) === 0;
  return (
    <section style={s.panel}>
      <div style={s.panelHead}>
        <h2 style={s.panelTitle}>{tt(lang, 'recommended')}</h2>
        <span style={s.countBadge}>{tt(lang, 'usefulCount', { count: recommendations.length || totalExams })}</span>
      </div>
      {recommendations.length === 0 ? (
        <div style={s.recoEmpty}>
          <strong>{tt(lang, hasNoExams ? 'noExamsYet' : 'noRecommendedQuiz')}</strong>
          <span>{tt(lang, hasNoExams ? 'createFirstExam' : 'recommendedHint')}</span>
          <button style={s.outlineButton} onClick={() => setTab('notes')}>{tt(lang, hasNoExams ? 'newExam' : 'goToMyExams')}</button>
        </div>
      ) : (
        <div style={s.recoList}>
          {recommendations.map(({ exam, source, event }, index) => {
            const days = daysUntil(exam.date);
            const isPrimary = index === 0;
            const recommendationKey = [
              source || 'recommendation',
              exam.id || exam.name || index,
              event?.serviceId || event?.id || '',
              event?.time || '',
              event?.name || '',
            ].map((part) => String(part).trim()).join(':');
            return (
              <article key={recommendationKey} style={{ ...s.recoCard, background: isPrimary ? '#F4F6FF' : '#FFF7FC' }}>
                <div style={s.recoTop}>
                  <IconTile s={s} tone={isPrimary ? 'indigo' : 'purple'}>{isPrimary ? <Sparkles size={18} /> : <Layers size={18} />}</IconTile>
                  <span style={s.recoTag}>{days <= 7 ? tt(lang, 'priority') : tt(lang, 'daysLeft', { count: days })}</span>
                </div>
                <p style={s.recoEyebrow}>{tt(lang, isPrimary ? 'recommendedQuiz' : 'recommendedReview')}</p>
                <h3 style={s.recoTitle}>{exam.subject || exam.name}</h3>
                <p style={s.recoMeta}>
                  {source === 'today'
                    ? tt(lang, event?.time ? 'todayEventAt' : 'todayEvent', { title: event?.name || exam.name, time: event?.time })
                    : `${exam.name} - ${formatDate(exam.date, lang)}${days !== null ? ` - ${tt(lang, 'daysLeft', { count: days })}` : ''}`}
                </p>
                <button style={isPrimary ? s.primaryButton : s.outlineButton} onClick={() => isPrimary ? startExamQuiz(exam) : (onOpenExam ? onOpenExam(exam.id) : setTab('notes'))}>
                  {isPrimary ? tt(lang, 'startQuiz') : tt(lang, 'openExam')}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function AssistantPanel({ s, setTab, lang = 'en' }) {
  return (
    <section style={s.assistant}>
      <IconTile s={s} tone="green"><MsgCircle size={18} /></IconTile>
      <div>
        <h2 style={s.panelTitle}>{tt(lang, 'aiStudyAssistant')}</h2>
        <p style={s.assistantText}>{tt(lang, 'aiStudyAssistantHint')}</p>
      </div>
      <button style={s.outlineButton} onClick={() => setTab('tutor')}>{tt(lang, 'openAiTutor')}</button>
    </section>
  );
}
