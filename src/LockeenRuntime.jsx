import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import AuthModal from './components/AuthModal';
import Dashboard from './components/Dashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { normalizeLang, tt } from './lib/i18n';
import { isFreePlan } from './lib/planLimits';
import { openBillingPortal, startCheckout } from './services/billing';

const BILLING_INTENT_STORAGE_KEY = 'lockeen-billing-intent';
const BILLING_INTENT_VERSION = 2;
const BILLING_INTENT_MAX_AGE_MS = 10 * 60 * 1000;
const BILLING_REQUEST_TIMEOUT_MS = 12000;

function normalizeBillingPeriod(value) {
  return value === 'yearly' ? 'yearly' : 'monthly';
}

function parseStoredBillingIntent() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = JSON.parse(localStorage.getItem(BILLING_INTENT_STORAGE_KEY) || 'null');
    if (stored?.intent !== 'checkout' || stored.version !== BILLING_INTENT_VERSION) {
      saveBillingIntent(null);
      return null;
    }
    if (!stored.createdAt || Date.now() - Number(stored.createdAt) > BILLING_INTENT_MAX_AGE_MS) {
      saveBillingIntent(null);
      return null;
    }
    return {
      intent: 'checkout',
      billingPeriod: normalizeBillingPeriod(stored.billingPeriod),
      createdAt: stored.createdAt,
    };
  } catch {
    saveBillingIntent(null);
    return null;
  }
}

function buildBillingIntent(options = {}) {
  if (options?.intent !== 'checkout') return null;
  return {
    version: BILLING_INTENT_VERSION,
    intent: 'checkout',
    billingPeriod: normalizeBillingPeriod(options.billingPeriod),
    createdAt: Date.now(),
  };
}

function saveBillingIntent(intent) {
  if (typeof window === 'undefined') return;
  if (!intent) {
    localStorage.removeItem(BILLING_INTENT_STORAGE_KEY);
    return;
  }
  localStorage.setItem(BILLING_INTENT_STORAGE_KEY, JSON.stringify(intent));
}

function withBillingTimeout(promise) {
  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = window.setTimeout(() => resolve({
      error: {
        message: 'Billing took too long to open. Please try again.',
      },
    }), BILLING_REQUEST_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

/* ===================== ROOT APP ===================== */
function AuthShell() {
  const { user, status, error: authError, authEvent, isAuthenticated, isLoading, refreshSession } = useAuth();
  const [modal, setModal] = useState(null);
  const [pendingBillingIntent, setPendingBillingIntent] = useState(() => parseStoredBillingIntent());
  const [billingAction, setBillingAction] = useState(null);
  const [billingError, setBillingError] = useState(null);
  const billingIntentRunningRef = useRef(false);
  const [lang, setLang] = useState(() => normalizeLang(localStorage.getItem('lockeen-lang') || 'en'));
  const [pageAppEl, setPageAppEl] = useState(null);

  useEffect(() => {
    setPageAppEl(document.getElementById('page-app'));
    localStorage.removeItem('lockeen-theme');
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  useLayoutEffect(() => {
    const openAuth = (m, options = {}) => {
      const intent = buildBillingIntent(options);
      if (intent) {
        saveBillingIntent(intent);
        setPendingBillingIntent(intent);
        setBillingError(null);
      }
      setModal(m === 'signup' ? 'signup' : m === 'reset' ? 'reset' : 'signin');
    };
    const closeAuth = () => setModal(null);
    const signOut = () => {
      setModal(null);
      if (window.showPage) window.showPage('page-landing');
    };
    window.openAuth = openAuth;
    window.closeAuth = closeAuth;
    window.signOut = signOut;
    return () => {
      if (window.openAuth === openAuth) window.openAuth = undefined;
      if (window.closeAuth === closeAuth) window.closeAuth = undefined;
      if (window.signOut === signOut) window.signOut = undefined;
    };
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const isRecoveryLink = searchParams.get('auth') === 'reset' || hashParams.get('type') === 'recovery';

    if (isRecoveryLink) {
      setModal('reset');
    }
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
    if (!isAuthenticated || !pendingBillingIntent || billingIntentRunningRef.current) return;

    async function runBillingIntent() {
      const intent = pendingBillingIntent;
      billingIntentRunningRef.current = true;
      saveBillingIntent(null);
      setModal(null);
      setBillingError(null);
      setBillingAction('checkout');

      let result;
      try {
        result = await withBillingTimeout(
          isFreePlan(user)
            ? startCheckout({ billingPeriod: intent.billingPeriod })
            : openBillingPortal(),
        );
      } catch (error) {
        result = {
          error: {
            message: error?.message || 'Could not open billing.',
          },
        };
      }

      setBillingAction(null);
      billingIntentRunningRef.current = false;
      setPendingBillingIntent(null);

      if (result.error) {
        setBillingError(result.error.message || 'Could not open billing.');
        return;
      }

      window.location.href = result.data.url;
    }

    runBillingIntent();
  }, [isAuthenticated, pendingBillingIntent, user]);

  useEffect(() => {
    function onLang(e) {
      const next = normalizeLang(e.detail?.lang || localStorage.getItem('lockeen-lang') || 'en');
      setLang(next);
    }
    window.addEventListener('lockeen-language', onLang);
    return () => window.removeEventListener('lockeen-language', onLang);
  }, []);

  function changeLang(next) {
    const safe = normalizeLang(next);
    setLang(safe);
    if (window.setLockeenLanguage) window.setLockeenLanguage(safe);
    else localStorage.setItem('lockeen-lang', safe);
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
      {isLoading && <div style={runtimeS.state}>{tt(lang, 'loadingSession')}</div>}
      {status === 'error' && (
        <div style={runtimeS.state}>
          <strong>{tt(lang, 'authenticationUnavailable')}</strong>
          <span>{authError?.message || tt(lang, 'unableRestoreSession')}</span>
          <button onClick={refreshSession} style={runtimeS.button}>{tt(lang, 'retry')}</button>
          <button onClick={() => setModal('signin')} style={runtimeS.button}>{tt(lang, 'login')}</button>
        </div>
      )}
      {billingAction && (
        <div style={runtimeS.state}>
          <strong>{isFreePlan(user) ? 'Opening Stripe Checkout' : 'Opening billing portal'}</strong>
          <span>Please wait a moment.</span>
        </div>
      )}
      {billingError && (
        <div style={runtimeS.notice}>
          <span>{billingError}</span>
          <button onClick={() => setBillingError(null)} style={runtimeS.noticeButton}>Dismiss</button>
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
  notice: { position: 'fixed', right: 18, bottom: 18, zIndex: 1250, maxWidth: 360, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(239,68,68,.22)', background: '#fff', color: '#991B1B', boxShadow: '0 20px 45px -25px rgba(15,16,53,.35)', fontSize: 13, fontWeight: 700 },
  noticeButton: { padding: '7px 10px', borderRadius: 10, background: '#FEE2E2', color: '#991B1B', fontWeight: 800 },
};
