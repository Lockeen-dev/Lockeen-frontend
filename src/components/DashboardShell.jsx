import React from 'react';

import { BarChart3, Bell, BookOpen, CalendarIcon, Coins, Layers, LogOut, MsgCircle, Pencil, Sparkles, ZapSolid } from '../lib/icons';
import { tt } from '../lib/i18n';
import LanguageSelect from './LanguageSelect';
import Sidebar from './Sidebar';

export function BottomNav({ tab, setTab, lang = 'en' }) {
  const items = [
    { id: 'dashboard', label: tt(lang, 'home'), Icon: ZapSolid },
    { id: 'notes', label: tt(lang, 'exams'), Icon: BookOpen },
    { id: 'calendar', label: tt(lang, 'calendar'), Icon: CalendarIcon },
    { id: 'flashcards', label: tt(lang, 'flash'), Icon: Layers },
    { id: 'quiz', label: tt(lang, 'quiz'), Icon: Sparkles },
    { id: 'analytics', label: tt(lang, 'analytics'), Icon: BarChart3 },
    { id: 'tutor', label: tt(lang, 'aiTutor'), Icon: MsgCircle },
  ];

  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, background: 'rgba(255,253,251,.86)', borderTop: '1px solid rgba(255,255,255,.82)', display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: 1, padding: '6px 6px calc(6px + env(safe-area-inset-bottom, 0px))', boxShadow: '0 -18px 44px -24px rgba(91,74,148,.34), inset 0 1px 0 rgba(255,255,255,.9)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}>
      {items.map(({ id, label, Icon: I }) => {
        const active = id === tab;
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{ position: 'relative', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, border: 'none', borderRadius: 16, background: active ? 'linear-gradient(145deg,#FFFFFF,#ECE7FF)' : 'transparent', padding: '7px 1px 6px', color: active ? 'var(--indigo)' : 'var(--gray)', cursor: 'pointer', minHeight: 58, boxShadow: active ? 'var(--clay-shadow-sm)' : 'none', WebkitTapHighlightColor: 'transparent' }}
            aria-current={active ? 'page' : undefined}
          >
            <I size={active ? 19 : 18} strokeWidth={active ? 2.6 : 2.2} />
            <span style={{ fontSize: 8.6, fontWeight: 900, lineHeight: 1, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function DashboardHeader({
  user,
  lang,
  onLangChange,
  isMobile,
  notifRef,
  profileRef,
  notifications,
  unreadCount,
  showNotifPanel,
  showProfileMenu,
  setShowNotifPanel,
  setShowProfileMenu,
  markAllRead,
  clearAll,
  handleLogout,
  setTab,
}) {
  return (
    <header style={{ ...shellS.header, padding: isMobile ? '0 12px 12px' : shellS.header.padding }}>
      <div style={shellS.headerInner}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, background: 'linear-gradient(145deg,var(--indigo),var(--purple))', borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '10px 12px 24px rgba(76,59,255,.22), inset 0 1px 0 rgba(255,255,255,.28)' }}>
            <img src="/Lockeen-2.png" alt="Lockeen logo" style={{ width: 58, height: 58, maxWidth: 'none' }} />
          </div>
          <span style={shellS.brand}>Lockeen</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LanguageSelect lang={lang} onChange={onLangChange} compact />
          {user?.isAdmin && !isMobile && (
            <button
              type="button"
              onClick={() => setTab('earn')}
              style={shellS.adminAmbassadorBtn}
            >
              <Coins size={15} /> Ambassador
            </button>
          )}
          {!isMobile && (
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                type="button"
                style={{ ...shellS.iconBtn, position: 'relative', cursor: 'pointer' }}
                aria-label={tt(lang, 'notifications')}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotifPanel((p) => {
                    const next = !p;
                    if (next) setTimeout(() => markAllRead(), 1200);
                    return next;
                  });
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)', boxSizing: 'border-box' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifPanel && <NotificationsPanel notifications={notifications} clearAll={clearAll} lang={lang} />}
            </div>
          )}
          <ProfileMenu
            user={user}
            lang={lang}
            profileRef={profileRef}
            showProfileMenu={showProfileMenu}
            setShowProfileMenu={setShowProfileMenu}
            setTab={setTab}
            handleLogout={handleLogout}
          />
        </div>
      </div>
      {!isMobile && <div style={shellS.headerRule} />}
    </header>
  );
}

function NotificationsPanel({ notifications, clearAll, lang = 'en' }) {
  return (
    <div style={{ position: 'absolute', top: 46, right: 0, width: 340, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 16px 40px -8px rgba(15,16,53,.25)', zIndex: 9999, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{tt(lang, 'notifications')}</span>
        {notifications.length > 0 && (
          <button onClick={clearAll} style={{ fontSize: 11, color: 'var(--gray)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>{tt(lang, 'clearAll')}</button>
        )}
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--gray)', fontSize: 13 }}>{tt(lang, 'noNotifications')}</div>
        ) : notifications.map((n) => <NotificationItem key={n.id} notification={n} />)}
      </div>
    </div>
  );
}

function NotificationItem({ notification: n }) {
  const icons = { quiz: '🎯', flash: '🃏', timer: '⏱️', plan: '📅', done: '✅', info: '💡' };
  const ago = (() => {
    const s = Math.floor((Date.now() - n.ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  })();

  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: n.read ? 'transparent' : 'var(--lavender)' }}>
      <span style={{ fontSize: 16, flexShrink: 0, lineHeight: '20px' }}>{icons[n.type] || '💡'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.4 }}>{n.text}</div>
        <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>{ago}</div>
      </div>
    </div>
  );
}

function ProfileMenu({ user, lang, profileRef, showProfileMenu, setShowProfileMenu, setTab, handleLogout }) {
  return (
    <div ref={profileRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowProfileMenu((p) => !p);
        }}
        style={{ ...shellS.avatar, border: 'none', cursor: 'pointer' }}
        aria-label="Profile menu"
      >
        {user.name?.[0]?.toUpperCase() || 'A'}
      </button>
      {showProfileMenu && (
        <div style={{ position: 'absolute', top: 48, right: 0, minWidth: 210, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 16px 40px -12px rgba(15,16,53,.25)', padding: 8, zIndex: 9999 }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{user.name || 'Alex'}</div>
            <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>{user.email || 'alex@lockeen.com'}</div>
          </div>
          <button onClick={() => { setTab('earn'); setShowProfileMenu(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>
            <Coins size={15} /> Ambassador
          </button>
          <button onClick={() => { setTab('account'); setShowProfileMenu(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>
            <Pencil size={15} /> {tt(lang, 'accountSettings')}
          </button>
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>
            <LogOut size={15} /> {tt(lang, 'signOut')}
          </button>
        </div>
      )}
    </div>
  );
}

export function DashboardCard({ isMobile, sidebarCollapsed, tab, setTab, lang, children, onToggleCollapsed }) {
  const tutorLocked = tab === 'tutor';
  const gridHeight = tutorLocked
    ? isMobile
      ? 'calc(100dvh - 154px - env(safe-area-inset-bottom, 0px))'
      : 'calc(100dvh - 150px)'
    : undefined;
  const mainPadding = tutorLocked
    ? isMobile
      ? '14px 12px calc(12px + env(safe-area-inset-bottom, 0px))'
      : '24px clamp(24px, 2.8vw, 48px) 24px'
    : isMobile
      ? '16px 14px calc(18px + env(safe-area-inset-bottom, 0px))'
      : '30px clamp(28px, 3vw, 56px) 42px';

  return (
    <div
      className="outerCard"
      style={{
        ...shellS.outerCard,
        background: 'transparent',
        boxShadow: 'none',
        borderRadius: 0,
        border: 'none',
      }}
    >
      <div style={{
        ...shellS.grid,
        gridTemplateColumns: isMobile ? '1fr' : sidebarCollapsed ? '64px 1fr' : '220px 1fr',
        minHeight: tutorLocked ? 'auto' : shellS.grid.minHeight,
        height: gridHeight,
        transition: 'grid-template-columns .2s ease',
      }}>
        {!isMobile && <Sidebar tab={tab} setTab={setTab} lang={lang} collapsed={sidebarCollapsed} onToggleCollapsed={onToggleCollapsed} />}
        <div style={{ ...shellS.main, height: tutorLocked ? '100%' : undefined, padding: mainPadding, overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export const shellS = {
  wrap: { minHeight: '100vh', width: '100%', maxWidth: '100%', margin: '0 auto', padding: '22px clamp(24px, 3vw, 48px) 38px', boxSizing: 'border-box', overflowX: 'hidden', background: 'transparent' },
  header: { position: 'relative', marginBottom: 18, padding: '4px 4px 12px' },
  headerRule: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, background: '#E8EBF4', borderRadius: 999 },
  headerInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 },
  brand: { fontSize: 18, fontWeight: 800, color: 'var(--indigo)' },
  iconBtn: { width: 38, height: 38, borderRadius: 14, background: 'var(--clay-surface)', border: '1px solid rgba(255,255,255,.72)', color: 'var(--ink)', display: 'grid', placeItems: 'center', boxShadow: 'var(--clay-shadow-sm)' },
  adminAmbassadorBtn: { height: 38, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 13px', borderRadius: 14, background: 'var(--clay-tint)', border: '1px solid rgba(255,255,255,.72)', color: 'var(--indigo)', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: 'var(--clay-shadow-sm)' },
  avatar: { width: 38, height: 38, borderRadius: 999, background: 'linear-gradient(145deg, var(--indigo), var(--purple))', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, boxShadow: '10px 12px 24px rgba(76,59,255,.2), inset 0 1px 0 rgba(255,255,255,.28)' },
  outerCard: { width: '100%', maxWidth: '100%', border: 'none', borderRadius: 0, background: 'transparent', overflow: 'visible', boxShadow: 'none' },
  grid: { display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 'calc(100vh - 108px)', width: '100%', minWidth: 0, gap: 14 },
  main: { padding: '30px clamp(28px, 3vw, 56px) 42px', width: '100%', minWidth: 0, maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box', background: 'transparent' },
};
