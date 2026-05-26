import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import AuthModal from './components/AuthModal';
import Dashboard from './components/Dashboard';
import { AuthProvider, useAuth } from './context/AuthContext';

/* ===================== ROOT APP ===================== */
function AuthShell() {
  const { user, status, error: authError, authEvent, isAuthenticated, isLoading, refreshSession } = useAuth();
  const [modal, setModal] = useState(null);
  const [lang, setLang] = useState(() => localStorage.getItem('lockeen-lang') || 'en');
  const [pageAppEl, setPageAppEl] = useState(null);

  useEffect(() => {
    setPageAppEl(document.getElementById('page-app'));
    localStorage.removeItem('lockeen-theme');
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  useEffect(() => {
    window.openAuth = (m) => setModal(m === 'signup' ? 'signup' : 'signin');
    window.closeAuth = () => setModal(null);
    window.signOut = () => {
      setModal(null);
      if (window.showPage) window.showPage('page-landing');
    };
    return () => {
      window.openAuth = undefined;
      window.closeAuth = undefined;
      window.signOut = undefined;
    };
  }, []);

  useEffect(() => {
    if (authEvent === 'PASSWORD_RECOVERY') {
      setModal('reset');
    }
  }, [authEvent]);

  useEffect(() => {
    if (isAuthenticated && pageAppEl) {
      if (window.showPage) window.showPage('page-app');
    } else if (status === 'anonymous') {
      if (window.showPage) window.showPage('page-landing');
    }
  }, [isAuthenticated, pageAppEl, status]);

  useEffect(() => {
    function onLang(e) {
      const next = e.detail?.lang || localStorage.getItem('lockeen-lang') || 'en';
      setLang(next);
    }
    window.addEventListener('lockeen-language', onLang);
    return () => window.removeEventListener('lockeen-language', onLang);
  }, []);

  function changeLang(next) {
    setLang(next);
    if (window.setLockeenLanguage) window.setLockeenLanguage(next);
    else localStorage.setItem('lockeen-lang', next);
  }

  const handleAuth = () => {
    setModal(null);
    if (window.showPage) window.showPage('page-app');
  };

  const handleLogout = () => {
    setModal(null);
    if (window.showPage) window.showPage('page-landing');
  };

  return (
    <React.Fragment>
      {isLoading && <div style={runtimeS.state}>Loading session...</div>}
      {status === 'error' && (
        <div style={runtimeS.state}>
          <strong>Authentication unavailable</strong>
          <span>{authError?.message || 'Unable to restore your session.'}</span>
          <button onClick={refreshSession} style={runtimeS.button}>Retry</button>
          <button onClick={() => setModal('signin')} style={runtimeS.button}>Login</button>
        </div>
      )}
      {modal && (
        <AuthModal
          initialMode={modal}
          onAuth={handleAuth}
          onClose={() => setModal(null)}
          darkMode={false}
        />
      )}
      {isAuthenticated && pageAppEl && createPortal(
        <Dashboard user={user} onLogout={handleLogout} darkMode={false} lang={lang} onLangChange={changeLang} />,
        pageAppEl
      )}
    </React.Fragment>
  );
}

export default function LockeenRuntime() {
  return (
    <AuthProvider>
      <AuthShell />
    </AuthProvider>
  );
}

const runtimeS = {
  state: { position: 'fixed', inset: 0, zIndex: 1200, display: 'grid', placeItems: 'center', gap: 10, alignContent: 'center', background: 'rgba(255,255,255,.92)', color: 'var(--ink)', fontSize: 14, textAlign: 'center' },
  button: { padding: '9px 14px', borderRadius: 10, background: 'var(--indigo)', color: '#fff', fontWeight: 700 },
};
