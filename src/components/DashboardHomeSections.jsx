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

export function EmptyState({ title, text, s }) {
  return (
    <div style={s.empty}>
      <strong>{title}</strong>
      <span>{text}</span>
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
  startExamQuiz,
  setTab,
  onOpenExam,
  heroProgress,
  heroProgressText,
}) {
  return (
    <section style={{ ...s.hero, padding: isMobile ? 22 : 32 }}>
      <div style={s.heroText}>
        <div style={s.kicker}>{heroDate}</div>
        <h1 style={s.heroTitle}>Buongiorno, {user.name || 'Alex'}</h1>
        <p style={s.heroSub}>
          {totalToday > 0
            ? `Hai ${Math.max(0, totalToday - completedToday)} attivita rimaste oggi${nextEvent?.time ? `, prossima alle ${nextEvent.time}` : ''}.`
            : nextExam
              ? `Prossimo esame: ${nextExam.name}${nextExamDays !== null ? ` tra ${nextExamDays} giorni` : ''}.`
              : 'Crea esami e materiali per costruire il piano studio.'}
        </p>
        <div style={s.heroActions}>
          <button style={s.heroButton} onClick={() => nextExam ? startExamQuiz(nextExam) : setTab('notes')}>
            {nextExam ? 'Inizia pratica' : 'Crea esame'}
          </button>
          {nextExam && (
            <button style={s.heroPill} onClick={() => onOpenExam ? onOpenExam(nextExam.id) : setTab('notes')}>
              <Clock size={15} /> {nextExam.name}{nextExamDays !== null ? ` tra ${nextExamDays}g` : ''}
            </button>
          )}
        </div>
      </div>
      <div style={s.progressRing} aria-label={`${heroProgressText} today completed`}>
        <div style={{ ...s.progressArc, background: `conic-gradient(#fff ${heroProgress * 3.6}deg, rgba(255,255,255,.25) 0deg)` }} />
        <div style={s.progressInner}>
          <strong style={s.progressValue}>{heroProgressText}</strong>
          <span style={s.progressLabel}>OGGI</span>
        </div>
      </div>
    </section>
  );
}

export function TodaySchedule({ s, todayEvents, completedToday, totalToday, isEventDone, toggleEventDone }) {
  return (
    <section style={s.panel}>
      <div style={s.panelHead}>
        <h2 style={s.panelTitle}>Programma di oggi</h2>
        <span style={s.countBadge}>{completedToday}/{totalToday || 0} completate</span>
      </div>
      {todayEvents.length === 0 ? (
        <EmptyState s={s} title="Nessun evento oggi" text="Apri calendario o planner per programmare studio." />
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
                  <small style={{ ...s.itemMeta, textDecoration: done ? 'line-through' : 'none' }}>{ev.noteSubject || cat?.label || 'Study'}{ev.dur ? ` - ${ev.dur}` : ''}</small>
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

export function RecentActivity({ s, loading, latestActivity, setTab, scoreFromActivity, activityCopy, relativeTime }) {
  return (
    <section style={s.panel}>
      <div style={s.panelHead}>
        <h2 style={s.panelTitle}>Attivita recenti</h2>
        <button style={s.linkButton} onClick={() => setTab('analytics')}>Analytics <ArrowRight size={14} /></button>
      </div>
      {loading ? (
        <EmptyState s={s} title="Caricamento..." text="Leggo i dati della dashboard." />
      ) : latestActivity.length === 0 ? (
        <EmptyState s={s} title="Nessuna pratica recente" text="Quiz completati e flashcard ripassate appariranno qui." />
      ) : (
        <div style={s.activityList}>
          {latestActivity.map((activity) => {
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

export function QuickActionsPanel({ s, nextExam, startExamQuiz, setTab, onStartTimer }) {
  return (
    <section style={s.panel}>
      <h2 style={s.panelTitle}>Azioni rapide</h2>
      <div style={s.quickGrid}>
        <QuickAction s={s} icon={<Sparkles size={20} />} label="Nuovo quiz" onClick={() => nextExam ? startExamQuiz(nextExam) : setTab('quiz')} />
        <QuickAction s={s} icon={<FileText size={20} />} label="Carica note" onClick={() => setTab('notes')} />
        <QuickAction s={s} icon={<Layers size={20} />} label="Flashcards" onClick={() => setTab('flashcards')} />
        <QuickAction s={s} icon={<Clock size={20} />} label="Avvia timer" onClick={() => onStartTimer && onStartTimer(25)} />
      </div>
    </section>
  );
}

export function RecommendationsPanel({ s, recommendations, totalExams, daysUntil, formatDate, lang, startExamQuiz, onOpenExam, setTab }) {
  return (
    <section style={s.panel}>
      <div style={s.panelHead}>
        <h2 style={s.panelTitle}>Consigliati oggi</h2>
        <span style={s.countBadge}>{recommendations.length || totalExams} utili</span>
      </div>
      {recommendations.length === 0 ? (
        <div style={s.recoEmpty}>
          <strong>Nessun quiz consigliato</strong>
          <span>Aggiungi un'attivita studio oggi o una data futura a un esame.</span>
          <button style={s.outlineButton} onClick={() => setTab('notes')}>Vai ai miei esami</button>
        </div>
      ) : (
        <div style={s.recoList}>
          {recommendations.map(({ exam, source, event }, index) => {
            const days = daysUntil(exam.date);
            const isPrimary = index === 0;
            return (
              <article key={exam.id || exam.name} style={{ ...s.recoCard, background: isPrimary ? '#F4F6FF' : '#FFF7FC' }}>
                <div style={s.recoTop}>
                  <IconTile s={s} tone={isPrimary ? 'indigo' : 'purple'}>{isPrimary ? <Sparkles size={18} /> : <Layers size={18} />}</IconTile>
                  <span style={s.recoTag}>{days <= 7 ? 'Priorita' : `${days} giorni`}</span>
                </div>
                <p style={s.recoEyebrow}>{isPrimary ? 'Quiz consigliato' : 'Ripasso consigliato'}</p>
                <h3 style={s.recoTitle}>{exam.subject || exam.name}</h3>
                <p style={s.recoMeta}>
                  {source === 'today'
                    ? `${event?.name || exam.name} - oggi${event?.time ? ` alle ${event.time}` : ''}`
                    : `${exam.name} - ${formatDate(exam.date, lang)}${days !== null ? ` - tra ${days} giorni` : ''}`}
                </p>
                <button style={isPrimary ? s.primaryButton : s.outlineButton} onClick={() => isPrimary ? startExamQuiz(exam) : (onOpenExam ? onOpenExam(exam.id) : setTab('notes'))}>
                  {isPrimary ? 'Inizia quiz' : 'Apri esame'}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function AssistantPanel({ s, setTab }) {
  return (
    <section style={s.assistant}>
      <IconTile s={s} tone="green"><MsgCircle size={18} /></IconTile>
      <div>
        <h2 style={s.panelTitle}>AI Study Assistant</h2>
        <p style={s.assistantText}>Chiedi aiuto su esami, materiali e piano studio.</p>
      </div>
      <button style={s.outlineButton} onClick={() => setTab('tutor')}>Open AI Tutor</button>
    </section>
  );
}
