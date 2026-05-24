import { motion } from 'framer-motion';
import { BarChart3, BookOpen, CalendarIcon, Layers, MsgCircle, SidebarPanel, Sparkles, ZapSolid } from '../lib/icons';
import { tt } from '../lib/i18n';

/* ===================== SIDEBAR ===================== */
export default function Sidebar({ tab, setTab, lang = 'en', collapsed = false, onToggleCollapsed }) {
  const items = [
    { id: 'dashboard', label: tt(lang, 'dashboard'), Icon: ZapSolid },
    { id: 'notes',     label: tt(lang, 'myExams'),  Icon: BookOpen },
    { id: 'flashcards', label: tt(lang, 'flashcards'), Icon: Layers },
    { id: 'quiz', label: tt(lang, 'quiz'), Icon: Sparkles },
    { id: 'tutor',     label: tt(lang, 'aiTutor'),  Icon: MsgCircle },
    { id: 'analytics', label: tt(lang, 'analytics'), Icon: BarChart3 },
    { id: 'calendar',  label: tt(lang, 'calendar'),  Icon: CalendarIcon },
  ];
  return (
    <aside style={{ ...sideS.wrap, ...(collapsed ? sideS.wrapCollapsed : null) }}>
      <div>
        <div style={{ ...sideS.topRow, justifyContent: collapsed ? 'center' : 'flex-end' }}>
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={sideS.collapseBtn}
          >
            <SidebarPanel size={16} sw={2} />
          </button>
        </div>
        <nav style={{ ...sideS.nav, ...(collapsed ? sideS.navCollapsed : null) }}>
        {items.map(({ id, label, Icon: I }) => {
          const active = id === tab;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              title={collapsed ? label : undefined}
              style={{ ...sideS.item, ...(collapsed ? sideS.itemCollapsed : null), position: 'relative', background: 'transparent', boxShadow: 'none' }}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active-pill"
                  style={{ ...sideS.itemActiveBg, borderRadius: collapsed ? 999 : 999 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 28, mass: 0.95 }}
                  layout
                />
              )}
              <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', color: active ? '#ffffff' : '#6B7280' }}>
                <I size={18} muted={!active} />
              </span>
              <motion.span
                animate={{ opacity: collapsed ? 0 : 1, x: collapsed ? -8 : 0, width: collapsed ? 0 : 'auto' }}
                transition={{ duration: collapsed ? 0.14 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                style={{ position: 'relative', zIndex: 1, color: active ? '#ffffff' : '#6B7280', overflow: 'hidden', whiteSpace: 'nowrap', display: 'inline-block' }}
              >
                {label}
              </motion.span>
            </button>
          );
        })}
        </nav>
      </div>

      {!collapsed && <div style={sideS.goalCard}>
        <div style={sideS.goalLabel}>{tt(lang, 'weeklyGoal')}</div>
        <div style={sideS.goalValue}>78%</div>
        <div style={sideS.goalBarTrack}>
          <div style={sideS.goalBarFill} />
        </div>
      </div>}
    </aside>
  );
}

const sideS = {
  wrap: { position: 'relative', background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)', padding: '52px 16px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'visible', transition: 'width .38s cubic-bezier(.22,1,.36,1), padding .38s cubic-bezier(.22,1,.36,1)' },
  wrapCollapsed: { padding: '52px 8px 24px', alignItems: 'center' },
  topRow: { position: 'absolute', top: 14, right: 10, zIndex: 20, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0 },
  collapseBtn: { width: 30, height: 30, borderRadius: 9, border: '1.5px solid var(--indigo)', background: 'var(--surface)', color: 'var(--indigo)', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 8px 22px -12px rgba(55,48,232,.55)' },
  nav: { display: 'flex', flexDirection: 'column', gap: 6, transition: 'align-items .38s cubic-bezier(.22,1,.36,1)' },
  navCollapsed: { alignItems: 'center' },
  item: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 42, padding: '11px 14px', borderRadius: 999, color: 'var(--gray)', fontWeight: 600, fontSize: 14, textAlign: 'left', cursor: 'pointer', border: 'none', overflow: 'hidden', transition: 'width .38s cubic-bezier(.22,1,.36,1), min-height .38s cubic-bezier(.22,1,.36,1), padding .38s cubic-bezier(.22,1,.36,1), gap .28s cubic-bezier(.22,1,.36,1), border-radius .38s cubic-bezier(.22,1,.36,1)' },
  itemCollapsed: { width: 42, height: 42, minHeight: 42, justifyContent: 'center', padding: 0, borderRadius: 999, gap: 0 },
  itemActiveBg: { position: 'absolute', inset: 0, borderRadius: 999, background: 'var(--indigo)', boxShadow: '0 12px 28px -12px rgba(55,48,232,.72)', willChange: 'transform, width, height, border-radius' },
  goalCard: { background: 'var(--lavender)', borderRadius: 16, padding: 16, marginTop: 24 },
  goalLabel: { fontSize: 12, color: 'var(--gray)', fontWeight: 600 },
  goalValue: { fontSize: 26, fontWeight: 800, color: 'var(--indigo)', marginTop: 4, marginBottom: 10, letterSpacing: '-0.02em' },
  goalBarTrack: { height: 6, background: '#E5E7FF', borderRadius: 999, overflow: 'hidden' },
  goalBarFill: { width: '78%', height: '100%', background: 'linear-gradient(90deg, var(--indigo), var(--purple))', borderRadius: 999 },
};
