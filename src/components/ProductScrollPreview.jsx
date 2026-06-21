import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  Clock3,
  CreditCard,
  Flame,
  LayoutDashboard,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Send,
  Star,
  Trash2,
  Trophy,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ContainerScroll } from './ui/container-scroll-animation';

const copy = {
  en: {
    title: 'A workspace designed for',
    highlight: 'modern learners',
    subtitle: 'Clean, intuitive, and packed with intelligent features',
    nav: {
      dashboard: 'Dashboard',
      myExams: 'My Exams',
      flashcards: 'Flashcards',
      quiz: 'Quiz',
      aiTutor: 'AI Tutor',
      analytics: 'Analytics',
      calendar: 'Calendar',
    },
    weeklyGoal: 'Weekly Goal',
    dashboard: {
      greeting: 'Good morning, Alex',
      ready: 'Ready to continue your learning path?',
      schedule: "Today's schedule",
      completed: '0/2 completed',
      rows: [
        { time: '09:00', title: 'Cellular respiration', tag: 'Biology', color: '#4B43FF' },
        { time: '14:00', title: 'Limits and continuity', tag: 'Mathematics', color: '#8B3EF5' },
      ],
      recommended: 'RECOMMENDED TODAY',
      quiz: 'Biology Quiz',
      flash: 'Chemistry Flash',
      quizMeta: '15 questions • 20 min',
      flashMeta: '48 cards • Review',
      startQuiz: 'Start Quiz',
      reviewCards: 'Review Cards',
      assistant: 'AI Study Assistant',
      assistantPrompt: 'Explain photosynthesis in simple terms',
    },
    exams: {
      title: 'My Exams',
      subtitle: 'Your next goals, materials, and target grades',
      open: 'Open Exam',
      cards: [
        { name: 'Biology', date: '24 Jun', meta: '6 chapters', target: '28/30', tone: 'cyan' },
        { name: 'Mathematics', date: '2 Jul', meta: '4 chapters', target: '27/30', tone: 'violet' },
        { name: 'Economics', date: '9 Jul', meta: '8 chapters', target: '29/30', tone: 'emerald' },
      ],
    },
    flashcards: {
      title: 'Flashcards',
      subtitle: 'Review the concepts that matter most',
      known: 'Known',
      review: 'Review',
      cards: [
        { front: 'What is ATP synthase?', back: 'The enzyme that produces ATP using a proton gradient.' },
        { front: 'Define opportunity cost', back: 'The value of the best alternative you give up.' },
        { front: 'What is elasticity?', back: 'How strongly demand or supply reacts to a price change.' },
      ],
    },
    quiz: {
      title: 'Quiz',
      subtitle: 'Practice with exam-style questions',
      question: 'Where does glycolysis occur in the cell?',
      progress: 'Question 3 of 10',
      answers: ['Cytoplasm', 'Mitochondria', 'Nucleus', 'Ribosome'],
      explanation: 'Glycolysis takes place in the cytoplasm before the Krebs cycle begins.',
    },
    tutor: {
      title: 'AI Tutor',
      subtitle: 'Ask anything about your notes',
      prompt: 'Why does the Krebs cycle happen in mitochondria?',
      answer:
        'Because the enzymes and substrates needed for the cycle are concentrated in the mitochondrial matrix, where acetyl-CoA is processed efficiently.',
      input: 'Ask anything about your notes...',
    },
    analytics: {
      title: 'Analytics',
      subtitle: 'Track progress across every exam',
      study: 'Study time',
      score: 'Avg. quiz score',
      mastery: 'Exam mastery',
      prediction: 'Predicted grade',
    },
    calendar: {
      title: 'Calendar',
      subtitle: 'Plan your week and protect study time',
      week: 'Jun 17-23',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      events: [
        { day: 'Tue', time: '09:00', title: 'Biology review' },
        { day: 'Thu', time: '14:00', title: 'Math quiz' },
        { day: 'Sat', time: '10:30', title: 'Economics flashcards' },
      ],
    },
  },
  it: {
    title: 'Uno spazio progettato per',
    highlight: 'studenti moderni',
    subtitle: 'Pulito, intuitivo e pieno di funzioni intelligenti',
    nav: {
      dashboard: 'Dashboard',
      myExams: 'I miei esami',
      flashcards: 'Flashcard',
      quiz: 'Quiz',
      aiTutor: 'Tutor AI',
      analytics: 'Analytics',
      calendar: 'Calendario',
    },
    weeklyGoal: 'Obiettivo settimanale',
    dashboard: {
      greeting: 'Buongiorno, Alex',
      ready: 'Pronto a continuare il tuo percorso?',
      schedule: 'Programma di oggi',
      completed: '0/2 completati',
      rows: [
        { time: '09:00', title: 'Respirazione cellulare', tag: 'Biologia', color: '#4B43FF' },
        { time: '14:00', title: 'Limiti e continuità', tag: 'Matematica', color: '#8B3EF5' },
      ],
      recommended: 'CONSIGLIATI OGGI',
      quiz: 'Quiz di biologia',
      flash: 'Flashcard di chimica',
      quizMeta: '15 domande • 20 min',
      flashMeta: '48 carte • Ripasso',
      startQuiz: 'Inizia quiz',
      reviewCards: 'Ripassa carte',
      assistant: 'Assistente AI',
      assistantPrompt: 'Spiega la fotosintesi in modo semplice',
    },
    exams: {
      title: 'I miei esami',
      subtitle: 'Obiettivi, materiali e voti target',
      open: 'Apri esame',
      cards: [
        { name: 'Biologia', date: '24 giu', meta: '6 capitoli', target: '28/30', tone: 'cyan' },
        { name: 'Matematica', date: '2 lug', meta: '4 capitoli', target: '27/30', tone: 'violet' },
        { name: 'Economia', date: '9 lug', meta: '8 capitoli', target: '29/30', tone: 'emerald' },
      ],
    },
    flashcards: {
      title: 'Flashcard',
      subtitle: 'Ripassa i concetti più importanti',
      known: 'Conosciute',
      review: 'Ripasso',
      cards: [
        { front: 'Che cos’è ATP sintasi?', back: 'L’enzima che produce ATP usando un gradiente di protoni.' },
        { front: 'Definisci costo opportunità', back: 'Il valore della migliore alternativa a cui rinunci.' },
        { front: 'Che cos’è l’elasticità?', back: 'Quanto domanda o offerta reagiscono a una variazione di prezzo.' },
      ],
    },
    quiz: {
      title: 'Quiz',
      subtitle: 'Allenati con domande in stile esame',
      question: 'Dove avviene la glicolisi nella cellula?',
      progress: 'Domanda 3 di 10',
      answers: ['Citoplasma', 'Mitocondrio', 'Nucleo', 'Ribosoma'],
      explanation: 'La glicolisi avviene nel citoplasma prima dell’inizio del ciclo di Krebs.',
    },
    tutor: {
      title: 'Tutor AI',
      subtitle: 'Chiedi qualsiasi cosa sui tuoi appunti',
      prompt: 'Perché il ciclo di Krebs avviene nei mitocondri?',
      answer:
        'Perché enzimi e substrati necessari al ciclo sono concentrati nella matrice mitocondriale, dove l’acetil-CoA viene elaborato in modo efficiente.',
      input: 'Chiedi qualcosa sui tuoi appunti...',
    },
    analytics: {
      title: 'Analytics',
      subtitle: 'Misura i progressi su ogni esame',
      study: 'Tempo studio',
      score: 'Media quiz',
      mastery: 'Padronanza esami',
      prediction: 'Voto previsto',
    },
    calendar: {
      title: 'Calendario',
      subtitle: 'Organizza la settimana e proteggi lo studio',
      week: '17-23 giu',
      days: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven'],
      events: [
        { day: 'Mar', time: '09:00', title: 'Ripasso biologia' },
        { day: 'Gio', time: '14:00', title: 'Quiz matematica' },
        { day: 'Sab', time: '10:30', title: 'Flashcard economia' },
      ],
    },
  },
};

const viewIds = ['dashboard', 'myExams', 'flashcards', 'quiz', 'aiTutor', 'analytics', 'calendar'];

function useMarketingLang() {
  const [lang, setLang] = useState(() => {
    if (typeof window === 'undefined') return 'en';
    return localStorage.getItem('lockeen-lang') === 'it' ? 'it' : 'en';
  });

  useEffect(() => {
    const onLanguage = (event) => setLang(event?.detail?.lang === 'it' ? 'it' : 'en');
    window.addEventListener('lockeen-language', onLanguage);
    return () => window.removeEventListener('lockeen-language', onLanguage);
  }, []);

  return lang;
}

function getNavItems(t) {
  return [
    { id: 'dashboard', icon: Zap, label: t.nav.dashboard },
    { id: 'myExams', icon: BookOpen, label: t.nav.myExams },
    { id: 'flashcards', icon: CreditCard, label: t.nav.flashcards },
    { id: 'quiz', icon: Star, label: t.nav.quiz },
    { id: 'aiTutor', icon: MessageSquare, label: t.nav.aiTutor },
    { id: 'analytics', icon: LayoutDashboard, label: t.nav.analytics },
    { id: 'calendar', icon: Calendar, label: t.nav.calendar },
  ];
}

function Sidebar({ activeView, onSelect, t }) {
  return (
    <aside className="hidden w-[210px] shrink-0 flex-col justify-between border-r border-[#E4E7F0] bg-[#F7F8FC] p-4 md:flex lg:w-[260px] lg:p-5">
      <div className="space-y-2">
        {getNavItems(t).map(({ id, icon: Icon, label }, index) => {
          const active = activeView === id;
          return (
            <motion.button
              key={id}
              type="button"
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.35, delay: index * 0.035, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ x: active ? 0 : 4 }}
              onClick={() => onSelect(id)}
              className={
                active
                  ? 'flex w-full items-center gap-3 rounded-[16px] bg-[#332BFF] px-4 py-3 text-left text-sm font-bold text-white shadow-[0_12px_24px_rgba(51,43,255,0.24)] lg:px-5 lg:py-4'
                  : 'flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-sm font-semibold text-[#70778A] transition-colors hover:bg-white hover:text-[#332BFF] lg:px-5 lg:py-4'
              }
            >
              <Icon size={20} strokeWidth={2.2} />
              <span className="min-w-0 truncate">{label}</span>
            </motion.button>
          );
        })}
      </div>

      <motion.div
        className="rounded-[18px] border border-[#DFE3F2] bg-gradient-to-br from-white to-[#ECEBFF] p-5"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, delay: 0.2 }}
      >
        <p className="text-sm font-medium text-[#565B73]">{t.weeklyGoal}</p>
        <p className="mt-3 text-4xl font-extrabold tracking-normal text-[#332BFF]">78%</p>
        <div className="mt-4 h-2 rounded-full bg-[#DCDDF4]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#332BFF] to-[#8A5CF6]"
            initial={{ width: '18%' }}
            whileInView={{ width: '78%' }}
            viewport={{ once: false, amount: 0.6 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </motion.div>
    </aside>
  );
}

function BrowserChrome() {
  return (
    <div className="flex h-14 items-center border-b border-[#E4E7F0] bg-[#F3F4F8] px-4 sm:px-6">
      <div className="flex gap-2">
        <span className="h-3 w-3 rounded-full bg-[#FF6159]" />
        <span className="h-3 w-3 rounded-full bg-[#FFC447]" />
        <span className="h-3 w-3 rounded-full bg-[#4CCB5A]" />
      </div>
      <div className="mx-auto rounded-full bg-[#E7E9EF] px-5 py-1.5 text-xs font-semibold text-[#A1A7B5]">
        app.lockeen.app
      </div>
    </div>
  );
}

function ScreenShell({ title, subtitle, children }) {
  return (
    <motion.main
      key={title}
      className="min-w-0 flex-1 overflow-hidden p-5 sm:p-8 lg:p-10"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold tracking-normal text-[#12142F] sm:text-3xl">{title}</h2>
        <p className="mt-2 text-sm font-medium text-[#9AA1B2] sm:text-base">{subtitle}</p>
      </div>
      {children}
    </motion.main>
  );
}

function ScheduleRow({ time, title, color, tag }) {
  return (
    <motion.div
      className="grid grid-cols-[4px_64px_1fr_auto] items-center gap-4 rounded-[14px] border border-[#E8EAF4] bg-white px-4 py-3"
      whileHover={{ x: 4, borderColor: color }}
      transition={{ duration: 0.18 }}
    >
      <span className="h-9 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-sm font-bold text-[#9AA1B2]">{time}</span>
      <span className="min-w-0 truncate text-sm font-bold text-[#151733] sm:text-base">{title}</span>
      <span className="hidden rounded-full bg-[#EEF0FF] px-3 py-1 text-xs font-bold text-[#4B43FF] sm:block">
        {tag}
      </span>
    </motion.div>
  );
}

function RecommendationCard({ tone, label, title, meta, cta }) {
  const isPurple = tone === 'purple';

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.012 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.18 }}
      className={
        isPurple
          ? 'rounded-[18px] border border-[#E7D6FF] bg-gradient-to-br from-white to-[#FFF7FF] p-4 sm:p-5'
          : 'rounded-[18px] border border-[#DDE4FF] bg-gradient-to-br from-white to-[#F2F5FF] p-4 sm:p-5'
      }
    >
      <div className="mb-5 flex items-center gap-3">
        <span className={isPurple ? 'h-3 w-3 rounded-full bg-[#8B3EF5]' : 'h-3 w-3 rounded-full bg-[#4B43FF]'} />
        <span className={isPurple ? 'text-sm font-bold text-[#8B3EF5]' : 'text-sm font-bold text-[#4B43FF]'}>
          {label}
        </span>
      </div>
      <h3 className="text-lg font-extrabold tracking-normal text-[#11132D]">{title}</h3>
      <p className="mt-1 text-sm font-medium text-[#9AA1B2]">{meta}</p>
      <button
        className={
          isPurple
            ? 'mt-7 h-11 w-full rounded-[14px] border border-[#E1E4EE] bg-white text-sm font-extrabold text-[#262A42]'
            : 'mt-7 h-11 w-full rounded-[14px] bg-[#4A43E8] text-sm font-extrabold text-white'
        }
      >
        {cta}
      </button>
    </motion.div>
  );
}

function DashboardScreen({ t }) {
  return (
    <ScreenShell title={t.dashboard.greeting} subtitle={t.dashboard.ready}>
      <motion.section
        className="rounded-[18px] border border-[#E5E8F5] bg-[#F8F9FE] p-4 sm:p-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-base font-extrabold text-[#20233E]">
            <Calendar size={18} className="text-[#4B43FF]" />
            {t.dashboard.schedule}
          </div>
          <span className="text-sm font-bold text-[#A0A5B5]">{t.dashboard.completed}</span>
        </div>
        <div className="space-y-3">
          {t.dashboard.rows.map((row) => (
            <ScheduleRow key={row.time} time={row.time} title={row.title} color={row.color} tag={row.tag} />
          ))}
        </div>
      </motion.section>

      <div className="mt-6 flex items-center gap-2 text-sm font-extrabold tracking-wide text-[#9AA1B2]">
        <Star size={20} className="fill-[#FFD966] text-[#F5B400]" />
        {t.dashboard.recommended}
      </div>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <RecommendationCard tone="blue" label="Media" title={t.dashboard.quiz} meta={t.dashboard.quizMeta} cta={t.dashboard.startQuiz} />
        <RecommendationCard tone="purple" label="Practice" title={t.dashboard.flash} meta={t.dashboard.flashMeta} cta={t.dashboard.reviewCards} />
      </section>
    </ScreenShell>
  );
}

function ExamsScreen({ t }) {
  const it = t.nav.myExams === 'I miei esami';
  const exams = it
    ? [
        { name: 'Biologia', date: '24 Giu 2026', left: '5 giorni', chapters: '6 capitoli', priority: 'Alta', target: '28/30', bg: '#EAFBFF', dot: '#0E95B7', icon: '📚' },
        { name: 'Matematica', date: '2 Lug 2026', left: '13 giorni', chapters: '4 capitoli', priority: 'Media', target: '27/30', bg: '#F2EDFF', dot: '#7147E8', icon: '📐' },
        { name: 'Economia', date: '9 Lug 2026', left: '20 giorni', chapters: '8 capitoli', priority: 'Alta', target: '29/30', bg: '#EEFFF6', dot: '#10A464', icon: '📊' },
      ]
    : [
        { name: 'Biology', date: '24 Jun 2026', left: '5 days', chapters: '6 chapters', priority: 'High', target: '28/30', bg: '#EAFBFF', dot: '#0E95B7', icon: '📚' },
        { name: 'Mathematics', date: '2 Jul 2026', left: '13 days', chapters: '4 chapters', priority: 'Medium', target: '27/30', bg: '#F2EDFF', dot: '#7147E8', icon: '📐' },
        { name: 'Economics', date: '9 Jul 2026', left: '20 days', chapters: '8 chapters', priority: 'High', target: '29/30', bg: '#EEFFF6', dot: '#10A464', icon: '📊' },
      ];

  return (
    <ScreenShell title={t.exams.title} subtitle={t.exams.subtitle}>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 flex-1 items-center gap-3 rounded-[14px] border border-[#E2E5EF] bg-white px-4 text-sm font-semibold text-[#A1A7B5]">
          <Search size={18} />
          {it ? 'Cerca esami...' : 'Search exams...'}
        </div>
        <button className="hidden h-12 items-center gap-2 rounded-[14px] bg-[#332BFF] px-5 text-sm font-extrabold text-white sm:flex">
          <Plus size={18} />
          {it ? 'Nuovo esame' : 'New Exam'}
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {exams.map((exam, index) => (
          <motion.article
            key={exam.name}
            className="overflow-hidden rounded-[18px] border border-[#E1E5EF] bg-white"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.28 }}
          >
            <div className="relative h-24 px-4 py-3" style={{ background: exam.bg }}>
              <div className="flex items-center justify-between">
                <span className="rounded-[10px] bg-white px-3 py-1 text-xs font-extrabold text-[#14162F] shadow-sm">{exam.date}</span>
                <span className="rounded-[10px] bg-white px-3 py-1 text-xs font-extrabold text-[#332BFF] shadow-sm">{exam.left}</span>
              </div>
              <div className="absolute bottom-[-24px] left-1/2 grid h-16 w-16 -translate-x-1/2 place-items-center rounded-[18px] border-2 bg-white text-3xl shadow-sm" style={{ borderColor: `${exam.dot}33` }}>
                {exam.icon}
              </div>
            </div>
            <div className="p-4 pt-9">
              <div className="mb-3 inline-flex items-center gap-1 rounded-full border border-[#F7D48D] px-2 py-1 text-[11px] font-extrabold text-[#D28A00]">
                <span className="h-2 w-2 rounded-full bg-[#F6B23B]" />
                {exam.priority}
              </div>
              <h3 className="truncate text-lg font-extrabold text-[#12142F]">{exam.name}</h3>
              <p className="mt-1 text-sm font-bold text-[#7B8296]">{exam.chapters}</p>
              <div className="mt-5 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold text-[#71798D]">
                  <span className="h-2 w-2 rounded-full" style={{ background: exam.dot }} />
                  Target
                </span>
                <span className="text-xl font-extrabold" style={{ color: exam.dot }}>{exam.target}</span>
              </div>
              <div className="mt-5 grid grid-cols-[1fr_42px_42px] gap-2">
                <button className="h-11 rounded-[13px] bg-[#332BFF] text-sm font-extrabold text-white">{t.exams.open}</button>
                <button className="grid h-11 place-items-center rounded-[13px] border border-[#E2E5EF] text-[#7B8296]"><Pencil size={17} /></button>
                <button className="grid h-11 place-items-center rounded-[13px] border border-[#FFB6B6] text-[#F04444]"><Trash2 size={17} /></button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </ScreenShell>
  );
}

function FlashcardsScreen({ t }) {
  const it = t.nav.myExams === 'I miei esami';
  const decks = it
    ? [
        { title: 'Respirazione cellulare', exam: 'Biologia', cards: 42, score: '86%', dot: '#0E95B7' },
        { title: 'Limiti e continuità', exam: 'Matematica', cards: 28, score: '72%', dot: '#7147E8' },
        { title: 'Elasticità e mercato', exam: 'Economia', cards: 36, score: '91%', dot: '#10A464' },
      ]
    : [
        { title: 'Cellular respiration', exam: 'Biology', cards: 42, score: '86%', dot: '#0E95B7' },
        { title: 'Limits and continuity', exam: 'Mathematics', cards: 28, score: '72%', dot: '#7147E8' },
        { title: 'Elasticity and markets', exam: 'Economics', cards: 36, score: '91%', dot: '#10A464' },
      ];

  return (
    <ScreenShell title={t.flashcards.title} subtitle={t.flashcards.subtitle}>
      <div className="grid gap-5 md:grid-cols-[0.95fr_1.15fr]">
        <motion.section className="rounded-[20px] border border-[#E4E7F2] bg-white p-5" whileHover={{ y: -3 }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#8D94A7]">{it ? 'Sessione attiva' : 'Active deck'}</p>
              <h3 className="mt-1 text-lg font-extrabold text-[#12142F]">{decks[0].title}</h3>
            </div>
            <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-extrabold text-[#047857]">{decks[0].score}</span>
          </div>
          <div className="rounded-[18px] border border-[#E5E8F5] bg-[#F8F9FE] p-6">
            <p className="text-sm font-bold text-[#71798D]">{it ? 'Che cos’è ATP sintasi?' : 'What is ATP synthase?'}</p>
            <p className="mt-5 text-xl font-extrabold leading-snug text-[#11132D]">
              {it ? 'L’enzima che produce ATP usando un gradiente di protoni.' : 'The enzyme that produces ATP using a proton gradient.'}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="h-11 rounded-[12px] border border-[#E2E5EF] bg-white text-sm font-extrabold text-[#6D7489]">{it ? 'Ripeti' : 'Again'}</button>
            <button className="h-11 rounded-[12px] bg-[#10B981] text-sm font-extrabold text-white">{t.flashcards.known}</button>
          </div>
        </motion.section>
        <div className="space-y-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#8D94A7]">{it ? 'Mazzi per esame' : 'Decks by exam'}</p>
          {decks.map((deck, index) => (
            <motion.div
              key={deck.title}
              className="rounded-[16px] border border-[#E6E9F3] bg-white p-4"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-[12px] text-white" style={{ background: deck.dot }}>
                  <CreditCard size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-[#151733]">{deck.title}</p>
                  <p className="mt-1 text-xs font-bold text-[#8A91A5]">{deck.exam} · {deck.cards} {it ? 'carte' : 'cards'}</p>
                </div>
                <span className="rounded-full bg-[#F2F4FB] px-3 py-1 text-xs font-extrabold text-[#6F768A]">{deck.score}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-[#EFF1F8]">
                <div className="h-full rounded-full" style={{ width: deck.score, background: deck.dot }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </ScreenShell>
  );
}

function QuizScreen({ t }) {
  const it = t.nav.myExams === 'I miei esami';
  const options = it
    ? [
        ['A', 'Avviene nel citoplasma e produce piruvato.'],
        ['B', 'Richiede direttamente la membrana mitocondriale interna.'],
        ['C', 'Serve solo per immagazzinare ossigeno nei muscoli.'],
        ['D', 'Trasforma ATP in glucosio durante la fotosintesi.'],
      ]
    : [
        ['A', 'It happens in the cytoplasm and produces pyruvate.'],
        ['B', 'It directly requires the inner mitochondrial membrane.'],
        ['C', 'It only stores oxygen inside muscle tissue.'],
        ['D', 'It turns ATP into glucose during photosynthesis.'],
      ];

  return (
    <ScreenShell title={t.quiz.title} subtitle={t.quiz.subtitle}>
      <section className="mx-auto max-w-[620px]">
        <div className="mb-2 flex items-center justify-between">
          <span className="rounded-full border border-[#BEEAD5] bg-[#ECFDF5] px-3 py-1 text-xs font-extrabold text-[#126B45]">
            {it ? 'Biologia' : 'Biology'}
          </span>
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#697287]">
            <Clock3 size={15} />
            <span>26s</span>
          </div>
        </div>
        <div className="mb-2 flex items-center justify-between text-xs font-extrabold text-[#697287]">
          <span>{it ? 'Domanda 3 di 10' : 'Question 3 of 10'}</span>
          <span>{it ? '2 corrette' : '2 correct'}</span>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#E7EAF2]">
          <motion.div
            className="h-full rounded-full bg-[#16A34A]"
            initial={{ width: '18%' }}
            animate={{ width: '30%' }}
            transition={{ duration: 0.45 }}
          />
        </div>
        <div className="rounded-[20px] border border-[#E2E6F0] bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#6F778A]">{it ? 'Domanda 3' : 'Question 3'}</p>
            <span className="rounded-full border border-[#BEEAD5] bg-[#ECFDF5] px-3 py-1 text-xs font-extrabold text-[#10A464]">Easy</span>
          </div>
          <h3 className="text-[20px] font-extrabold leading-tight text-[#11132D]">
            {it
              ? 'Perché la glicolisi è importante nella respirazione cellulare?'
              : 'Why is glycolysis important in cellular respiration?'}
          </h3>
          <div className="mt-4 space-y-2">
            {options.map(([letter, text], index) => {
              const selected = index === 0;
              return (
                <button
                  key={letter}
                  className={selected
                    ? 'flex w-full items-center gap-3 rounded-[14px] border-2 border-[#86EFAC] bg-[#DCFCE7] px-4 py-2.5 text-left text-[#166534]'
                    : 'flex w-full items-center gap-3 rounded-[14px] border border-[#E3E6EF] bg-[#FAFBFF] px-4 py-2.5 text-left text-[#12142F]'}
                >
                  <span className={selected
                    ? 'grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-[#72B78F] text-sm font-extrabold'
                    : 'grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-[#A8AFC0] text-sm font-extrabold text-[#6F778A]'}
                  >
                    {letter}
                  </span>
                  <span className="text-sm font-extrabold leading-snug">{text}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 rounded-[14px] bg-[#DCFCE7] px-4 py-3 text-xs font-semibold leading-relaxed text-[#166534]">
            ✓ {it
              ? 'La glicolisi avvia la degradazione del glucosio e fornisce energia utilizzabile dalla cellula.'
              : 'Glycolysis starts glucose breakdown and provides usable energy for the cell.'}
          </div>
        </div>
        <button className="mt-3 h-10 w-full rounded-[14px] bg-[#332BFF] text-sm font-extrabold text-white">
          {it ? 'Prossima domanda' : 'Next question'}
        </button>
      </section>
    </ScreenShell>
  );
}

function TutorScreen({ t }) {
  const it = t.nav.myExams === 'I miei esami';
  const recent = it ? ['Nuova conversazione', 'Spiegami la forza lavoro', 'Riassumi il PDF'] : ['New conversation', 'Explain labor force', 'Summarize the PDF'];

  return (
    <ScreenShell title={t.tutor.title} subtitle={t.tutor.subtitle}>
      <section className="grid min-h-[360px] grid-cols-[180px_1fr] overflow-hidden rounded-[20px] border border-[#E5E8F5] bg-white">
        <aside className="border-r border-[#E5E8F5] bg-[#FBFCFF] p-4">
          <button className="mb-4 h-11 w-full rounded-[13px] bg-[#332BFF] text-sm font-extrabold text-white">+ {it ? 'Nuova chat' : 'New chat'}</button>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#9AA1B2]">Recent</p>
          <div className="space-y-2">
            {recent.map((item, index) => (
              <div key={item} className={index === 0 ? 'rounded-[12px] border border-[#C9CEFF] bg-[#EEF1FF] p-3' : 'p-3'}>
                <p className="truncate text-sm font-extrabold text-[#12142F]">{item}</p>
                <p className="mt-1 text-xs font-bold text-[#8D94A7]">17 Jun</p>
              </div>
            ))}
          </div>
        </aside>
        <div className="flex min-w-0 flex-col p-5">
          <div className="flex items-center gap-3 border-b border-[#E5E8F5] pb-4">
            <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-[#6D48F2] text-white">
              <MessageSquare size={22} />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-[#11132D]">{t.tutor.title}</h3>
              <p className="text-sm font-bold text-[#737B90]">● {it ? 'Online · Alimentato da Lockeen AI' : 'Online · Powered by Lockeen AI'}</p>
            </div>
          </div>
          <div className="flex-1 pt-5">
            <div className="ml-auto max-w-[78%] rounded-[18px] bg-[#332BFF] p-4 text-sm font-bold text-white">
              {t.tutor.prompt}
            </div>
            <div className="mt-4 max-w-[82%] rounded-[18px] bg-[#F3F5FF] p-4 text-sm font-semibold text-[#252940]">
              {t.tutor.answer}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-[16px] border border-[#E4E7F2] bg-white px-4 py-3 text-sm font-semibold text-[#9AA1B2]">
            <Paperclip size={18} />
            <span className="flex-1">{t.tutor.input}</span>
            <button className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#332BFF] text-white"><Send size={18} /></button>
          </div>
        </div>
      </section>
    </ScreenShell>
  );
}

function AnalyticsScreen({ t }) {
  const it = t.nav.myExams === 'I miei esami';
  const bars = [0, 100, 378, 389, 135, 384, 0];
  const max = 389;
  const mastery = [
    ['Biologia', 82, '#0E95B7'],
    ['Matematica', 68, '#7147E8'],
    ['Economia', 91, '#10A464'],
  ];

  return (
    <ScreenShell title={t.analytics.title} subtitle={t.analytics.subtitle}>
      <div className="grid gap-3 md:grid-cols-5">
        {[
          [t.analytics.study, '23h 6m', Clock3, '#EEF1FF', '#332BFF'],
          [it ? 'Serie attuale' : 'Current streak', '3 days', Flame, '#FFF7ED', '#F07A2F'],
          [t.analytics.score, '84%', TrendingUp, '#ECFDF5', '#10A464'],
          [it ? 'Flash mastery' : 'Flash mastery', '91%', Trophy, '#FFF9C7', '#CC940E'],
          [t.analytics.prediction, '27.4', Trophy, '#EEF1FF', '#332BFF'],
        ].map(([label, value, Icon, bg, color]) => (
          <div key={label} className="rounded-[18px] p-4" style={{ background: bg }}>
            <Icon size={18} style={{ color }} />
            <p className="mt-4 text-2xl font-extrabold" style={{ color }}>{value}</p>
            <p className="mt-1 text-xs font-extrabold" style={{ color, opacity: 0.72 }}>{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-[1.25fr_0.9fr]">
        <section className="rounded-[20px] border border-[#E6E9F3] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-[#11132D]">{it ? 'Tempo studio settimanale' : 'Weekly study time'}</h3>
              <p className="text-sm font-bold text-[#7B8296]">{it ? 'Minuti studiati al giorno' : 'Minutes spent studying per day'}</p>
            </div>
            <span className="text-xs font-extrabold text-[#332BFF]">■ mins</span>
          </div>
          <div className="flex h-40 items-end justify-between gap-3">
            {bars.map((mins, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-bold text-[#7B8296]">{mins}m</span>
                <div className="flex h-28 w-full max-w-9 items-end rounded-full bg-[#F0F1FB]">
                  <motion.div
                    className="w-full rounded-full bg-gradient-to-t from-[#7C55F2] to-[#332BFF]"
                    initial={{ height: 6 }}
                    animate={{ height: mins ? `${Math.max(12, (mins / max) * 100)}%` : 0 }}
                    transition={{ delay: index * 0.04, duration: 0.35 }}
                  />
                </div>
                <span className="text-xs font-bold text-[#8D94A7]">{(it ? ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])[index]}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-[20px] border border-[#E6E9F3] bg-white p-5">
          <h3 className="text-lg font-extrabold text-[#11132D]">{it ? 'Padronanza esami' : 'Exam mastery'}</h3>
          <p className="mb-5 text-sm font-bold text-[#7B8296]">{it ? 'Progressi per esame attivo' : 'Progress by active exam'}</p>
          <div className="space-y-5">
            {mastery.map(([name, value, color]) => (
              <div key={name}>
                <div className="mb-2 flex justify-between text-sm font-extrabold text-[#151733]">
                  <span>{name}</span>
                  <span className="text-[#7B8296]">{value}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#F0F1FB]">
                  <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <h3 className="mt-6 text-2xl font-extrabold text-[#11132D]">{it ? 'Predizione voto' : 'Grade Predictor'}</h3>
      <div className="mt-3 rounded-[18px] border border-[#E6E9F3] bg-white p-4">
        <div className="grid grid-cols-[1fr_auto_auto_1.4fr] items-center gap-4">
          <div>
            <p className="text-base font-extrabold text-[#12142F]">Biologia</p>
            <p className="text-xs font-bold text-[#7B8296]">24 Jun 2026 · {it ? 'Alta confidenza' : 'High confidence'}</p>
          </div>
          <div><p className="text-2xl font-extrabold text-[#11132D]">28</p><p className="text-[10px] font-extrabold text-[#8D94A7]">TARGET</p></div>
          <div><p className="text-2xl font-extrabold text-[#11132D]">27.4</p><p className="text-[10px] font-extrabold text-[#8D94A7]">{it ? 'PREVISIONE' : 'PREDICTION'}</p></div>
          <div>
            <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-extrabold text-[#047857]">{it ? 'In linea' : 'On track'}</span>
            <div className="mt-3 h-2 rounded-full bg-[#F0F1FB]"><div className="h-full w-[88%] rounded-full bg-[#10B981]" /></div>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}

function CalendarScreen({ t }) {
  const it = t.nav.myExams === 'I miei esami';
  const days = it ? ['Lun 17', 'Mar 18', 'Mer 19', 'Gio 20', 'Ven 21', 'Sab 22', 'Dom 23'] : ['Mon 17', 'Tue 18', 'Wed 19', 'Thu 20', 'Fri 21', 'Sat 22', 'Sun 23'];
  const hours = ['8:00', '9:00', '10:00', '11:00', '12:00'];
  const events = [
    { day: 1, row: 0, title: it ? 'Studio — Biologia' : 'Study — Biology', bg: '#EAFBFF', color: '#0D7289' },
    { day: 2, row: 1, title: it ? 'Quiz — Matematica' : 'Quiz — Math', bg: '#F3EFFF', color: '#7147E8' },
    { day: 4, row: 2, title: it ? 'Esame: Biologia' : 'Exam: Biology', bg: '#FFF0F2', color: '#C92B58', tall: true },
    { day: 5, row: 0, title: it ? 'Flashcard — Economia' : 'Flashcards — Economics', bg: '#F0FFE8', color: '#4A8F0D' },
  ];

  return (
    <ScreenShell title={t.calendar.title} subtitle={t.calendar.subtitle}>
      <section className="rounded-[20px] border border-[#E5E8F5] bg-white p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button className="grid h-10 w-10 place-items-center rounded-[12px] border border-[#E2E5EF] text-[#12142F]">‹</button>
            <span className="rounded-[14px] border border-[#E2E5EF] px-5 py-2 text-base font-extrabold text-[#11132D]">{t.calendar.week}</span>
            <button className="grid h-10 w-10 place-items-center rounded-[12px] border border-[#E2E5EF] text-[#12142F]">›</button>
          </div>
          <div className="flex gap-2">
            {(it ? ['Studio', 'Fitness', 'Riposo'] : ['Study', 'Fitness', 'Rest']).map((label, index) => (
              <span key={label} className="rounded-full border px-3 py-1 text-xs font-extrabold" style={{ borderColor: ['#BFC0FF', '#B8EFCB', '#D8CCFF'][index], color: ['#332BFF', '#159B62', '#7147E8'][index], background: ['#F1F2FF', '#ECFDF5', '#F6F1FF'][index] }}>
                ● {label}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] overflow-hidden rounded-[18px] border border-[#E2E5EF]">
          <div className="bg-[#F7F8FC]" />
          {days.map((day) => (
            <div key={day} className="border-l border-[#E2E5EF] bg-[#F7F8FC] p-3 text-center text-xs font-extrabold text-[#737B90]">{day}</div>
          ))}
          {hours.map((hour, row) => (
            <Fragment key={hour}>
              <div className="border-t border-[#E2E5EF] bg-white p-3 text-right text-xs font-extrabold text-[#737B90]">{hour}</div>
              {days.map((day, dayIndex) => {
                const event = events.find((item) => item.day === dayIndex && item.row === row);
                return (
                  <div key={`${hour}-${day}`} className="relative min-h-16 border-l border-t border-[#E2E5EF] bg-white p-1">
                    {event && (
                      <div className={event.tall ? 'absolute inset-x-1 top-1 h-[120px] rounded-[10px] border-l-4 p-2 text-xs font-extrabold' : 'rounded-[10px] border-l-4 p-2 text-xs font-extrabold'} style={{ background: event.bg, borderColor: event.color, color: event.color }}>
                        {event.title}
                      </div>
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </section>
    </ScreenShell>
  );
}

function PreviewContent({ activeView, t }) {
  const screens = {
    dashboard: <DashboardScreen t={t} />,
    myExams: <ExamsScreen t={t} />,
    flashcards: <FlashcardsScreen t={t} />,
    quiz: <QuizScreen t={t} />,
    aiTutor: <TutorScreen t={t} />,
    analytics: <AnalyticsScreen t={t} />,
    calendar: <CalendarScreen t={t} />,
  };

  return <AnimatePresence mode="wait">{screens[activeView] || screens.dashboard}</AnimatePresence>;
}

function DashboardPreview({ t }) {
  const [activeView, setActiveView] = useState('dashboard');
  const [isManual, setIsManual] = useState(false);

  const cycleViews = useMemo(() => viewIds, []);

  useEffect(() => {
    if (isManual) return undefined;
    const interval = window.setInterval(() => {
      setActiveView((current) => cycleViews[(cycleViews.indexOf(current) + 1) % cycleViews.length]);
    }, 6000);
    return () => window.clearInterval(interval);
  }, [cycleViews, isManual]);

  const handleSelect = (viewId) => {
    setIsManual(true);
    setActiveView(viewId);
  };

  return (
    <motion.div
      className="relative h-full overflow-hidden rounded-[22px] bg-white"
      initial={{ opacity: 0.96 }}
      whileHover={{ opacity: 1 }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-white/60 to-transparent" />
      <BrowserChrome />
      <div className="flex h-[calc(100%-3.5rem)]">
        <Sidebar activeView={activeView} onSelect={handleSelect} t={t} />
        <PreviewContent activeView={activeView} t={t} />
      </div>
    </motion.div>
  );
}

export default function ProductScrollPreview() {
  const lang = useMarketingLang();
  const t = copy[lang] || copy.en;

  return (
    <ContainerScroll
      titleComponent={
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-4xl font-bold tracking-normal text-[#080A2B] md:text-5xl lg:text-6xl" style={{ lineHeight: 1.08 }}>
            {t.title}
            <br />
            <span className="bg-gradient-to-r from-[#332BFF] to-[#8B5CF6] bg-clip-text text-transparent">
              {t.highlight}
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg font-medium text-[#62677A] md:text-xl">
            {t.subtitle}
          </p>
        </div>
      }
    >
      <DashboardPreview t={t} />
    </ContainerScroll>
  );
}
