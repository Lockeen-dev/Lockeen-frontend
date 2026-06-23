import { motion } from 'framer-motion';
import { BarChart3, BookOpen, CalendarIcon, Coins, Layers, MsgCircle, SidebarPanel, Sparkles, ZapSolid } from '../lib/icons';
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
    { id: 'earn', label: 'Ambassador', Icon: Coins },
  ];
  return (
    <aside style={{ ...sideS.wrap, ...(collapsed ? sideS.wrapCollapsed : null) }}>
      <div>
        <div style={{ ...sideS.topRow, justifyContent: collapsed ? 'center' : 'flex-end' }}>
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapsed ? tt(lang, 'expandSidebar') : tt(lang, 'collapseSidebar')}
            aria-label={collapsed ? tt(lang, 'expandSidebar') : tt(lang, 'collapseSidebar')}
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
                  style={{ ...sideS.itemActiveBg }}
                  transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.8 }}
                  layout="position"
                />
              )}
              <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', color: active ? '#ffffff' : '#6B7280' }}>
                <I size={18} muted={!active} />
              </span>
              {!collapsed && <span style={{ position: 'relative', zIndex: 1, color: active ? '#ffffff' : '#6B7280' }}>{label}</span>}
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
  wrap: { position: 'relative', background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)', padding: '52px 16px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'visible', transition: 'width .2s ease, padding .2s ease' },
  wrapCollapsed: { padding: '52px 8px 24px', alignItems: 'center' },
  topRow: { position: 'absolute', top: 14, right: 10, zIndex: 20, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0 },
  collapseBtn: { width: 30, height: 30, borderRadius: 9, border: '1.5px solid var(--indigo)', background: 'var(--surface)', color: 'var(--indigo)', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 8px 22px -12px rgba(55,48,232,.55)' },
  nav: { display: 'flex', flexDirection: 'column', gap: 6 },
  navCollapsed: { alignItems: 'center' },
  item: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 999, color: 'var(--gray)', fontWeight: 600, fontSize: 14, textAlign: 'left', cursor: 'pointer', border: 'none' },
  itemCollapsed: { width: 42, height: 42, justifyContent: 'center', padding: 0, borderRadius: 14, gap: 0 },
  itemActiveBg: { position: 'absolute', inset: 0, borderRadius: 999, background: 'var(--indigo)', boxShadow: '0 8px 22px -10px rgba(55,48,232,.6)' },
  goalCard: { background: 'var(--lavender)', borderRadius: 16, padding: 16, marginTop: 24 },
  goalLabel: { fontSize: 12, color: 'var(--gray)', fontWeight: 600 },
  goalValue: { fontSize: 26, fontWeight: 800, color: 'var(--indigo)', marginTop: 4, marginBottom: 10, letterSpacing: '-0.02em' },
  goalBarTrack: { height: 6, background: '#E5E7FF', borderRadius: 999, overflow: 'hidden' },
  goalBarFill: { width: '78%', height: '100%', background: 'linear-gradient(90deg, var(--indigo), var(--purple))', borderRadius: 999 },
};
