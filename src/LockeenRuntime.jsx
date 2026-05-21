import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import AuthModal from './components/AuthModal';
import Dashboard from './components/Dashboard';

/* ===================== ROOT APP ===================== */
export default function LockeenRuntime() {
  const [authed, setAuthed] = useState(() => localStorage.getItem('lockeen-authed') === '1');
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lockeen-user')) || { name: 'Alex', email: 'alex@lockeen.com' }; }
    catch { return { name: 'Alex', email: 'alex@lockeen.com' }; }
  });
  const [modal, setModal] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem('lockeen-lang') || 'en');
  const [pageAppEl, setPageAppEl] = useState(null);

  useEffect(() => {
    setPageAppEl(document.getElementById('page-app'));
    const saved = localStorage.getItem('lockeen-theme');
    if (saved === 'dark') {
      setDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    // Restore session: if user was logged in, skip landing page
    if (localStorage.getItem('lockeen-authed') === '1') {
      if (window.showPage) window.showPage('page-app');
    }
  }, []);

  useEffect(() => {
    window.openAuth = (m) => setModal(m === 'signup' ? 'signup' : 'signin');
    window.closeAuth = () => setModal(null);
    window.signOut = () => {
      setAuthed(false);
      setModal(null);
      localStorage.removeItem('lockeen-authed');
      localStorage.removeItem('lockeen-user');
      if (window.showPage) window.showPage('page-landing');
    };
    return () => {
      window.openAuth = undefined;
      window.closeAuth = undefined;
      window.signOut = undefined;
    };
  }, []);

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

  const handleAuth = (u) => {
    setUser(u);
    setAuthed(true);
    setModal(null);
    localStorage.setItem('lockeen-authed', '1');
    localStorage.setItem('lockeen-user', JSON.stringify(u));
    if (window.showPage) window.showPage('page-app');
  };

  const handleLogout = () => {
    setAuthed(false);
    setModal(null);
    localStorage.removeItem('lockeen-authed');
    localStorage.removeItem('lockeen-user');
    if (window.showPage) window.showPage('page-landing');
  };

  function toggleDark() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('lockeen-theme', next ? 'dark' : 'light');
  }

  return (
    <React.Fragment>
      {modal && (
        <AuthModal
          initialMode={modal}
          onAuth={handleAuth}
          onClose={() => setModal(null)}
          darkMode={darkMode}
        />
      )}
      {authed && pageAppEl && createPortal(
        <Dashboard user={user} onLogout={handleLogout} darkMode={darkMode} toggleDark={toggleDark} lang={lang} onLangChange={changeLang} />,
        pageAppEl
      )}
    </React.Fragment>
  );
}

