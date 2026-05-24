import { BookOpen, Calendar, CreditCard, LayoutDashboard, MessageSquare, Star, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { ContainerScroll } from './ui/container-scroll-animation';
import { useEffect, useState } from 'react';

const PREVIEW_T = {
  en: { dashboard:'Dashboard', exams:'My Exams', flashcards:'Flashcards', quiz:'Quiz', tutor:'AI Tutor', analytics:'Analytics', calendar:'Calendar', weeklyGoal:'Weekly Goal', greeting:'Good morning, Alex', ready:'Ready to continue your learning journey?', schedule:'Today schedule', completed:'0/2 completed', recommended:'RECOMMENDED TODAY', media:'Medium', practice:'Practice', qMeta:'15 questions • 20 min', startQuiz:'Start Quiz', flashMeta:'48 cards • Review', reviewCards:'Review Cards', assistant:'AI Study Assistant', assistantPrompt:'Explain photosynthesis in simple terms', title:'A workspace designed for', titleAccent:'modern learners', sub:'Clean, intuitive, and packed with intelligent features' },
  it: { dashboard:'Dashboard', exams:'I miei esami', flashcards:'Flashcard', quiz:'Quiz', tutor:'Tutor AI', analytics:'Analytics', calendar:'Calendario', weeklyGoal:'Obiettivo settimanale', greeting:'Buongiorno, Alex', ready:'Pronto a continuare il tuo percorso?', schedule:'Programma di oggi', completed:'0/2 completati', recommended:'CONSIGLIATI OGGI', media:'Media', practice:'Pratica', qMeta:'15 domande • 20 min', startQuiz:'Inizia Quiz', flashMeta:'48 carte • Ripasso', reviewCards:'Rivedi carte', assistant:'Assistente studio AI', assistantPrompt:'Spiega la fotosintesi in parole semplici', title:'Uno spazio pensato per', titleAccent:'studenti moderni', sub:'Pulito, intuitivo e pieno di funzioni intelligenti' },
  de: { dashboard:'Dashboard', exams:'Meine Prüfungen', flashcards:'Karten', quiz:'Quiz', tutor:'KI-Tutor', analytics:'Analytics', calendar:'Kalender', weeklyGoal:'Wochenziel', greeting:'Guten Morgen, Alex', ready:'Bereit, weiterzulernen?', schedule:'Heutiger Plan', completed:'0/2 erledigt', recommended:'HEUTE EMPFOHLEN', media:'Mittel', practice:'Übung', qMeta:'15 Fragen • 20 min', startQuiz:'Quiz starten', flashMeta:'48 Karten • Wiederholen', reviewCards:'Karten wiederholen', assistant:'KI-Lernassistent', assistantPrompt:'Erkläre Photosynthese einfach', title:'Ein Workspace für', titleAccent:'moderne Lernende', sub:'Klar, intuitiv und voller intelligenter Funktionen' },
  es: { dashboard:'Dashboard', exams:'Mis exámenes', flashcards:'Tarjetas', quiz:'Quiz', tutor:'Tutor IA', analytics:'Analíticas', calendar:'Calendario', weeklyGoal:'Objetivo semanal', greeting:'Buenos días, Alex', ready:'¿Listo para seguir aprendiendo?', schedule:'Programa de hoy', completed:'0/2 completados', recommended:'RECOMENDADO HOY', media:'Medio', practice:'Práctica', qMeta:'15 preguntas • 20 min', startQuiz:'Empezar quiz', flashMeta:'48 tarjetas • Repaso', reviewCards:'Repasar tarjetas', assistant:'Asistente de estudio IA', assistantPrompt:'Explica la fotosíntesis simple', title:'Un espacio diseñado para', titleAccent:'estudiantes modernos', sub:'Limpio, intuitivo y lleno de funciones inteligentes' },
  fr: { dashboard:'Dashboard', exams:'Mes examens', flashcards:'Cartes', quiz:'Quiz', tutor:'Tuteur IA', analytics:'Analytics', calendar:'Calendrier', weeklyGoal:'Objectif hebdo', greeting:'Bonjour, Alex', ready:'Prêt à continuer ?', schedule:'Planning du jour', completed:'0/2 terminés', recommended:'RECOMMANDÉ AUJOURD’HUI', media:'Moyen', practice:'Pratique', qMeta:'15 questions • 20 min', startQuiz:'Lancer quiz', flashMeta:'48 cartes • Révision', reviewCards:'Réviser cartes', assistant:'Assistant étude IA', assistantPrompt:'Explique la photosynthèse simplement', title:'Un espace conçu pour', titleAccent:'les étudiants modernes', sub:'Clair, intuitif et rempli de fonctions intelligentes' },
  pt: { dashboard:'Dashboard', exams:'Meus exames', flashcards:'Flashcards', quiz:'Quiz', tutor:'Tutor IA', analytics:'Analytics', calendar:'Calendário', weeklyGoal:'Meta semanal', greeting:'Bom dia, Alex', ready:'Pronto para continuar?', schedule:'Agenda de hoje', completed:'0/2 concluídos', recommended:'RECOMENDADO HOJE', media:'Médio', practice:'Prática', qMeta:'15 perguntas • 20 min', startQuiz:'Iniciar quiz', flashMeta:'48 cartões • Revisão', reviewCards:'Rever cartões', assistant:'Assistente de estudo IA', assistantPrompt:'Explica a fotossíntese simples', title:'Um workspace feito para', titleAccent:'estudantes modernos', sub:'Limpo, intuitivo e cheio de recursos inteligentes' },
};
function usePreviewCopy() {
  const [lang, setLang] = useState(() => localStorage.getItem('lockeen-lang') || 'en');
  useEffect(() => {
    const onLang = (e) => setLang(e.detail?.lang || localStorage.getItem('lockeen-lang') || 'en');
    window.addEventListener('lockeen-language', onLang);
    return () => window.removeEventListener('lockeen-language', onLang);
  }, []);
  return PREVIEW_T[lang] || PREVIEW_T.en;
}

function Sidebar({ t }) {
  const navItems = [
    { icon: Zap, label: t.dashboard, active: true },
    { icon: BookOpen, label: t.exams },
    { icon: CreditCard, label: t.flashcards },
    { icon: Star, label: t.quiz },
    { icon: MessageSquare, label: t.tutor },
    { icon: LayoutDashboard, label: t.analytics },
    { icon: Calendar, label: t.calendar },
  ];
  return (
    <aside className="hidden w-[260px] shrink-0 flex-col justify-between border-r border-[#E4E7F0] bg-[#F7F8FC] p-5 lg:flex">
      <div className="space-y-2">
        {navItems.map(({ icon: Icon, label, active }, index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.35, delay: index * 0.035, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ x: active ? 0 : 4 }}
            className={
              active
                ? 'flex items-center gap-3 rounded-[16px] bg-[#332BFF] px-5 py-4 text-sm font-bold text-white shadow-[0_12px_24px_rgba(51,43,255,0.24)]'
                : 'flex items-center gap-3 rounded-[16px] px-5 py-4 text-sm font-semibold text-[#70778A]'
            }
          >
            <Icon size={20} strokeWidth={2.2} />
            <span>{label}</span>
          </motion.div>
        ))}
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

function DashboardPreview() {
  const t = usePreviewLang();
  return (
    <motion.div
      className="relative h-full overflow-hidden rounded-[22px] bg-white"
      initial={{ opacity: 0.96 }}
      whileHover={{ opacity: 1 }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-white/60 to-transparent" />
      <BrowserChrome />
      <div className="flex h-[calc(100%-3.5rem)]">
        <Sidebar t={t} />
        <main className="min-w-0 flex-1 overflow-hidden p-5 sm:p-8 lg:p-10">
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold tracking-normal text-[#12142F] sm:text-3xl">
              Buongiorno, Alex
            </h2>
            <p className="mt-2 text-sm font-medium text-[#9AA1B2] sm:text-base">
              Pronto a continuare il tuo percorso?
            </p>
          </div>

          <motion.section
            className="rounded-[18px] border border-[#E5E8F5] bg-[#F8F9FE] p-4 sm:p-5"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-base font-extrabold text-[#20233E]">
                <Calendar size={18} className="text-[#4B43FF]" />
                Programma di oggi
              </div>
              <span className="text-sm font-bold text-[#A0A5B5]">0/2 completati</span>
            </div>
            <div className="space-y-3">
              <ScheduleRow time="09:00" title="Respirazione cellulare" color="#4B43FF" tag="Biologia" />
              <ScheduleRow time="14:00" title="Limiti e continuità" color="#8B3EF5" tag="Matematica" />
            </div>
          </motion.section>

          <div className="mt-6 flex items-center gap-2 text-sm font-extrabold tracking-wide text-[#9AA1B2]">
            <Star size={20} className="fill-[#FFD966] text-[#F5B400]" />
            CONSIGLIATI OGGI
          </div>

          <section className="mt-4 grid gap-4 md:grid-cols-2">
            <RecommendationCard tone="blue" label="Media" title="Biology Quiz" meta="15 questions • 20 min" cta="Start Quiz" />
            <RecommendationCard tone="purple" label="Practice" title="Chemistry Flash" meta="48 cards • Review" cta="Review Cards" />
          </section>

          <motion.section
            className="mt-4 rounded-[18px] border border-[#A8F0C7] bg-gradient-to-br from-white to-[#EDFFFA] p-4 sm:p-5"
            whileHover={{ y: -3, boxShadow: '0 18px 50px rgba(16,185,129,0.12)' }}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#4DBE82] text-white">
                <MessageSquare size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-[#151733]">AI Study Assistant</h3>
                <p className="truncate text-sm font-medium text-[#9AA1B2]">Explain photosynthesis in simple terms</p>
              </div>
            </div>
          </motion.section>
        </main>
      </div>
    </motion.div>
  );
}

export default function ProductScrollPreview() {
  return (
    <ContainerScroll
      titleComponent={
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-4xl font-bold tracking-normal text-[#080A2B] md:text-5xl lg:text-6xl" style={{ lineHeight: 1.08 }}>
            A workspace designed for
            <br />
            <span className="bg-gradient-to-r from-[#332BFF] to-[#8B5CF6] bg-clip-text text-transparent">
              modern learners
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg font-medium text-[#62677A] md:text-xl">
            Clean, intuitive, and packed with intelligent features
          </p>
        </div>
      }
    >
      <DashboardPreview />
    </ContainerScroll>
  );
}
