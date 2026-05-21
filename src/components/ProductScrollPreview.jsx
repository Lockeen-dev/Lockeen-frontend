import { BookOpen, Calendar, CreditCard, LayoutDashboard, MessageSquare, Star, Zap } from 'lucide-react';
import { ContainerScroll } from './ui/container-scroll-animation';

const navItems = [
  { icon: Zap, label: 'Dashboard', active: true },
  { icon: BookOpen, label: 'My Exams' },
  { icon: CreditCard, label: 'Flashcards' },
  { icon: Star, label: 'Quiz' },
  { icon: MessageSquare, label: 'AI Tutor' },
  { icon: LayoutDashboard, label: 'Analytics' },
  { icon: Calendar, label: 'Calendar' },
];

function Sidebar() {
  return (
    <aside className="hidden w-[260px] shrink-0 flex-col justify-between border-r border-[#E4E7F0] bg-[#F7F8FC] p-5 lg:flex">
      <div className="space-y-2">
        {navItems.map(({ icon: Icon, label, active }) => (
          <div
            key={label}
            className={
              active
                ? 'flex items-center gap-3 rounded-[16px] bg-[#332BFF] px-5 py-4 text-sm font-bold text-white shadow-[0_12px_24px_rgba(51,43,255,0.24)]'
                : 'flex items-center gap-3 rounded-[16px] px-5 py-4 text-sm font-semibold text-[#70778A]'
            }
          >
            <Icon size={20} strokeWidth={2.2} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="rounded-[18px] border border-[#DFE3F2] bg-gradient-to-br from-white to-[#ECEBFF] p-5">
        <p className="text-sm font-medium text-[#565B73]">Weekly Goal</p>
        <p className="mt-3 text-4xl font-extrabold tracking-normal text-[#332BFF]">78%</p>
        <div className="mt-4 h-2 rounded-full bg-[#DCDDF4]">
          <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-[#332BFF] to-[#8A5CF6]" />
        </div>
      </div>
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
    <div className="grid grid-cols-[4px_64px_1fr_auto] items-center gap-4 rounded-[14px] border border-[#E8EAF4] bg-white px-4 py-3">
      <span className="h-9 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-sm font-bold text-[#9AA1B2]">{time}</span>
      <span className="min-w-0 truncate text-sm font-bold text-[#151733] sm:text-base">{title}</span>
      <span className="hidden rounded-full bg-[#EEF0FF] px-3 py-1 text-xs font-bold text-[#4B43FF] sm:block">
        {tag}
      </span>
    </div>
  );
}

function RecommendationCard({ tone, label, title, meta, cta }) {
  const isPurple = tone === 'purple';

  return (
    <div
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
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="h-full overflow-hidden rounded-[22px] bg-white">
      <BrowserChrome />
      <div className="flex h-[calc(100%-3.5rem)]">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-hidden p-5 sm:p-8 lg:p-10">
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold tracking-normal text-[#12142F] sm:text-3xl">
              Buongiorno, Alex
            </h2>
            <p className="mt-2 text-sm font-medium text-[#9AA1B2] sm:text-base">
              Pronto a continuare il tuo percorso?
            </p>
          </div>

          <section className="rounded-[18px] border border-[#E5E8F5] bg-[#F8F9FE] p-4 sm:p-5">
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
          </section>

          <div className="mt-6 flex items-center gap-2 text-sm font-extrabold tracking-wide text-[#9AA1B2]">
            <Star size={20} className="fill-[#FFD966] text-[#F5B400]" />
            CONSIGLIATI OGGI
          </div>

          <section className="mt-4 grid gap-4 md:grid-cols-2">
            <RecommendationCard tone="blue" label="Media" title="Biology Quiz" meta="15 questions • 20 min" cta="Start Quiz" />
            <RecommendationCard tone="purple" label="Practice" title="Chemistry Flash" meta="48 cards • Review" cta="Review Cards" />
          </section>

          <section className="mt-4 rounded-[18px] border border-[#A8F0C7] bg-gradient-to-br from-white to-[#EDFFFA] p-4 sm:p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#4DBE82] text-white">
                <MessageSquare size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-[#151733]">AI Study Assistant</h3>
                <p className="truncate text-sm font-medium text-[#9AA1B2]">Explain photosynthesis in simple terms</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
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
