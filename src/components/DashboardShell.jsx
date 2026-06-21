import React from 'react';

import { BarChart3, Bell, BookOpen, CalendarIcon, Layers, LogOut, Pencil, Sparkles, ZapSolid } from '../lib/icons';
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
    { id: 'analytics', label: tt(lang, 'stats'), Icon: BarChart3 },
  ];

  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {items.map(({ id, label, Icon: I }) => {
        const active = id === tab;
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, border: 'none', background: 'none', padding: '7px 0 5px', color: active ? 'var(--indigo)' : 'var(--gray)', cursor: 'pointer', minHeight: 54 }}
          >
            <I size={19} />
            <span style={{ fontSize: 9, fontWeight: 600, lineHeight: 1, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
            {active && <span style={{ position: 'absolute', bottom: 0, width: 24, height: 3, borderRadius: 999, background: 'var(--indigo)', marginTop: 2 }} />}
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
    <header style={{ ...shellS.header, padding: isMobile ? '0 12px 12px' : 0 }}>
      <div style={shellS.headerInner}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: '#3730E8', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/Lockeen-2.png" alt="Lockeen logo" style={{ width: 58, height: 58, maxWidth: 'none' }} />
          </div>
          <span style={shellS.brand}>Lockeen</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LanguageSelect lang={lang} onChange={onLangChange} compact />
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
  return (
    <div
      className="outerCard"
      style={{
        ...shellS.outerCard,
        background: '#fff',
        boxShadow: '0 30px 60px -30px rgba(55,48,232,.25)',
        borderRadius: isMobile ? 0 : 24,
        border: isMobile ? 'none' : '2px solid var(--indigo)',
      }}
    >
      <div style={{ ...shellS.grid, gridTemplateColumns: isMobile ? '1fr' : sidebarCollapsed ? '64px 1fr' : '220px 1fr', transition: 'grid-template-columns .2s ease' }}>
        {!isMobile && <Sidebar tab={tab} setTab={setTab} lang={lang} collapsed={sidebarCollapsed} onToggleCollapsed={onToggleCollapsed} />}
        <div style={{ ...shellS.main, padding: isMobile ? '16px 14px' : '32px clamp(28px, 3vw, 56px)', overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export const shellS = {
  wrap: { minHeight: '100vh', width: '100%', margin: '0 auto', padding: '24px clamp(18px, 2.4vw, 40px) 40px', boxSizing: 'border-box', overflowX: 'hidden' },
  header: { marginBottom: 20 },
  headerInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontSize: 18, fontWeight: 800, color: 'var(--indigo)' },
  iconBtn: { width: 38, height: 38, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)', display: 'grid', placeItems: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 999, background: 'linear-gradient(135deg, var(--indigo), var(--purple))', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 },
  outerCard: { width: '100%', maxWidth: '100%', border: '2px solid var(--indigo)', borderRadius: 24, background: 'var(--surface)', overflow: 'hidden', boxShadow: '0 30px 60px -30px rgba(55,48,232,.25)' },
  grid: { display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 'calc(100vh - 132px)', width: '100%', minWidth: 0 },
  main: { padding: '32px clamp(28px, 3vw, 56px)', width: '100%', minWidth: 0, maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' },
};
