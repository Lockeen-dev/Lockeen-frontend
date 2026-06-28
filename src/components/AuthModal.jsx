import { useEffect, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Google } from '../lib/icons';
import { useAuth } from '../context/AuthContext';

const AUTH_STYLES = `
  @keyframes authCardIn { from { opacity:0; transform:scale(.95) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
  @keyframes authSpin { to { transform:rotate(360deg); } }
  @keyframes authModeSwitch { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
`;

const AUTH_COPY = {
  en: {
    titles: {
      signin: 'Welcome back',
      signup: 'Create your account',
      forgot: 'Reset your password',
      reset: 'Choose a new password',
    },
    subtitles: {
      signin: 'Sign in to continue your learning journey',
      signup: 'Start studying smarter with AI in seconds',
      forgot: 'Enter your email and we will send a reset link',
      reset: 'Create a secure password for your account',
    },
    continueGoogle: 'Continue with Google',
    divider: 'or',
    fullName: 'Full name',
    email: 'Email',
    password: 'Password',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    forgot: 'Forgot?',
    togglePassword: 'Toggle password',
    loading: 'Just a sec…',
    actions: {
      signin: 'Sign In',
      signup: 'Create Account',
      forgot: 'Send Reset Link',
      reset: 'Update Password',
    },
    toggles: {
      signin: "Don't have an account?",
      signup: 'Already have an account?',
      forgot: 'Remembered your password?',
      reset: 'Remembered your password?',
      signUp: 'Sign up',
      signIn: 'Sign in',
    },
    errors: {
      emailRequired: 'Email is required.',
      passwordRequired: 'Password is required.',
      newPasswordRequired: 'New password is required.',
      passwordMin: 'Password must be at least 6 characters.',
      passwordMismatch: 'Passwords do not match.',
      resetSent: 'Password reset email sent. Check your inbox and open the latest link.',
      passwordUpdated: 'Password updated. Signing you in...',
      rateLimited: 'Too many attempts. Please wait a few minutes before requesting another email.',
      resetSessionInvalid: 'This reset link is no longer valid. Request a new password reset email and open the latest link.',
      resetRequestFailed: 'Unable to send the reset email. Check the address and try again.',
      resetUpdateFailed: 'Unable to update your password. Request a new reset link and try again.',
      invalidCredentials: 'Email or password is not correct.',
      emailNotConfirmed: 'Please confirm your email before signing in.',
      authFailed: 'Unable to authenticate.',
      resetExpired: 'This reset link has expired. Request a new password reset email and open the latest link.',
      resetInvalid: 'This reset link is invalid. Request a new password reset email and open the latest link.',
    },
  },
  it: {
    titles: {
      signin: 'Bentornato',
      signup: 'Crea il tuo account',
      forgot: 'Reimposta la password',
      reset: 'Scegli una nuova password',
    },
    subtitles: {
      signin: 'Accedi per continuare il tuo percorso di studio',
      signup: 'Inizia a studiare meglio con l’AI in pochi secondi',
      forgot: 'Inserisci la tua email: ti invieremo un link di reset',
      reset: 'Crea una password sicura per il tuo account',
    },
    continueGoogle: 'Continua con Google',
    divider: 'oppure',
    fullName: 'Nome completo',
    email: 'Email',
    password: 'Password',
    newPassword: 'Nuova password',
    confirmPassword: 'Conferma password',
    forgot: 'Dimenticata?',
    togglePassword: 'Mostra o nascondi password',
    loading: 'Un attimo…',
    actions: {
      signin: 'Accedi',
      signup: 'Crea account',
      forgot: 'Invia link di reset',
      reset: 'Aggiorna password',
    },
    toggles: {
      signin: 'Non hai un account?',
      signup: 'Hai già un account?',
      forgot: 'Ti sei ricordato la password?',
      reset: 'Ti sei ricordato la password?',
      signUp: 'Registrati',
      signIn: 'Accedi',
    },
    errors: {
      emailRequired: 'Email richiesta.',
      passwordRequired: 'Password richiesta.',
      newPasswordRequired: 'Nuova password richiesta.',
      passwordMin: 'La password deve avere almeno 6 caratteri.',
      passwordMismatch: 'Le password non coincidono.',
      resetSent: 'Email di reset inviata. Controlla la posta e apri il link più recente.',
      passwordUpdated: 'Password aggiornata. Accesso in corso...',
      rateLimited: 'Troppi tentativi. Attendi qualche minuto prima di richiedere un’altra email.',
      resetSessionInvalid: 'Questo link di reset non è più valido. Richiedi una nuova email e apri il link più recente.',
      resetRequestFailed: 'Impossibile inviare l’email di reset. Controlla l’indirizzo e riprova.',
      resetUpdateFailed: 'Impossibile aggiornare la password. Richiedi un nuovo link di reset e riprova.',
      invalidCredentials: 'Email o password non corretta.',
      emailNotConfirmed: 'Conferma la tua email prima di accedere.',
      authFailed: 'Impossibile autenticarti.',
      resetExpired: 'Questo link di reset è scaduto. Richiedi una nuova email e apri il link più recente.',
      resetInvalid: 'Questo link di reset non è valido. Richiedi una nuova email e apri il link più recente.',
    },
  },
};

function getAuthCopy(lang) {
  return AUTH_COPY[lang === 'it' ? 'it' : 'en'];
}

/* ===================== AUTH SCREEN ===================== */
export default function AuthModal({ initialMode = "signin", onAuth, onClose, darkMode, lang = 'en' }) {
  const { requestPasswordReset, signIn, signInWithGoogle, signUp, updatePassword } = useAuth();
  const copy = getAuthCopy(lang);
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  const [modeKey, setModeKey] = useState(0);

  useEffect(() => {
    setMode(initialMode);
    setError(initialMode === 'reset' ? getResetLinkError(copy) : null);
    setNotice(null);
    setPassword('');
    setConfirmPassword('');
    setModeKey(k => k + 1);
  }, [copy, initialMode]);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (mode === 'forgot') {
      if (!email.trim()) {
        setError(copy.errors.emailRequired);
        return;
      }
      setError(null);
      setNotice(null);
      setLoading(true);
      const result = await requestPasswordReset({ email });
      setLoading(false);
      if (result.error) {
        setError(formatAuthError(result.error, 'reset-request', copy));
        return;
      }
      setNotice(copy.errors.resetSent);
      return;
    }
    if (mode === 'reset') {
      if (!password) {
        setError(copy.errors.newPasswordRequired);
        return;
      }
      if (password.length < 6) {
        setError(copy.errors.passwordMin);
        return;
      }
      if (password !== confirmPassword) {
        setError(copy.errors.passwordMismatch);
        return;
      }
      setError(null);
      setNotice(null);
      setLoading(true);
      const result = await updatePassword({ password });
      setLoading(false);
      if (result.error) {
        setError(formatAuthError(result.error, 'reset-update', copy));
        return;
      }
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', window.location.pathname || '/');
      }
      setNotice(copy.errors.passwordUpdated);
      settleMobileViewport();
      onAuth && onAuth(result.data.user);
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError(copy.errors.emailRequired);
      return;
    }
    if (!password) {
      setError(copy.errors.passwordRequired);
      return;
    }
    setError(null);
    setNotice(null);
    setLoading(true);
    const input = { name: name || normalizedEmail.split('@')[0] || 'Alex', email: normalizedEmail, password };
    const result = mode === 'signin' ? await signIn(input) : await signUp(input);
    setLoading(false);
    if (result.error) {
      setError(formatAuthError(result.error, mode, copy));
      return;
    }
    settleMobileViewport();
    onAuth && onAuth(result.data.user);
  };

  const google = async () => {
    if (loading) return;
    setError(null);
    setNotice(null);
    setLoading(true);
    const result = await signInWithGoogle();
    setLoading(false);
    if (result.error) {
      setError(formatAuthError(result.error, 'google', copy));
      return;
    }
    if (result.data?.user) onAuth && onAuth(result.data.user);
  };

  const switchMode = (nextMode) => {
    setError(null);
    setNotice(null);
    setPassword('');
    setConfirmPassword('');
    setMode(nextMode);
    setModeKey(k => k + 1);
  };

  const focusStyle = (field) => focusedField === field
    ? { borderColor: 'var(--indigo)', boxShadow: '0 0 0 3px rgba(55,48,232,.12)' }
    : {};

  return (
    <div style={authS.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}>
      <style>{AUTH_STYLES}</style>
      <div style={authS.bg}>
      {/* decorative blobs */}
      <div style={authS.blob1} />
      <div style={authS.blob2} />

      <div style={{ ...authS.card, background: darkMode ? '#1e293b' : '#fff', animation: 'authCardIn .32s cubic-bezier(.22,1,.36,1)' }}>
        <div style={authS.brand}>
          <div style={{ width: 36, height: 36, background: '#3730E8', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/Lockeen-2.png" alt="Lockeen logo" style={{ width: 58, height: 58, maxWidth: 'none' }} />
          </div>
          <span style={authS.brandText}>Lockeen</span>
        </div>

        <h1 style={authS.title}>
          {copy.titles[mode]}
        </h1>
        <p style={authS.sub}>
          {copy.subtitles[mode]}
        </p>

        {mode !== 'forgot' && mode !== 'reset' && (
          <button type="button" onClick={google} style={{ ...authS.googleBtn, background: darkMode ? '#1e293b' : '#fff' }} disabled={loading}>
            <Google /> {copy.continueGoogle}
          </button>
        )}

        {mode !== 'forgot' && mode !== 'reset' && (
          <div style={authS.divider}>
            <span style={authS.dividerLine} />
            <span style={authS.dividerText}>{copy.divider}</span>
            <span style={authS.dividerLine} />
          </div>
        )}

        <form key={modeKey} onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'authModeSwitch .22s ease' }}>
          {mode === 'signup' && (
            <Field label={copy.fullName}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe"
                onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
                style={{ ...authS.input, background: darkMode ? '#0f172a' : '#fff', ...focusStyle('name') }} />
            </Field>
          )}
          {mode !== 'reset' && (
            <Field label={copy.email}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                required
                disabled={loading}
                autoComplete={mode === 'signin' ? 'email' : 'username'}
                onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                style={{ ...authS.input, background: darkMode ? '#0f172a' : '#fff', ...focusStyle('email') }} />
            </Field>
          )}
          {mode !== 'forgot' && (
            <Field label={mode === 'reset' ? copy.newPassword : copy.password} right={mode === 'signin' && <button type="button" onClick={() => switchMode('forgot')} style={authS.forgot}>{copy.forgot}</button>}>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  required
                  minLength={6}
                  disabled={loading}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                  style={{ ...authS.input, background: darkMode ? '#0f172a' : '#fff', paddingRight: 44, ...focusStyle('password') }} />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowPw(v => !v);
                  }}
                  aria-label={copy.togglePassword}
                  style={authS.eyeBtn}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
          )}
          {mode === 'reset' && (
            <Field label={copy.confirmPassword}>
              <input type={showPw ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
                required
                minLength={6}
                disabled={loading}
                autoComplete="new-password"
                onFocus={() => setFocusedField('confirmPassword')} onBlur={() => setFocusedField(null)}
                style={{ ...authS.input, background: darkMode ? '#0f172a' : '#fff', ...focusStyle('confirmPassword') }} />
            </Field>
          )}

          {error && <div style={authS.error}>{error}</div>}
          {notice && <div style={authS.notice}>{notice}</div>}

          <button type="submit" disabled={loading} style={{ ...authS.submit, opacity: loading ? .85 : 1 }}>
            {loading
              ? <><span style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'authSpin .7s linear infinite' }} /> {copy.loading}</>
              : <>{copy.actions[mode]} <ArrowRight size={18} /></>}
          </button>
        </form>

        <p style={authS.toggle}>
          {copy.toggles[mode]}{' '}
          <button type="button" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')} style={authS.toggleLink}>
            {mode === 'signin' ? copy.toggles.signUp : copy.toggles.signIn}
          </button>
        </p>
      </div>
        <button type="button" onClick={onClose} aria-label="Close" style={authS.closeBtn}>×</button>
      </div>
    </div>
  );
}

function settleMobileViewport() {
  if (typeof window === 'undefined' || !window.matchMedia?.('(max-width: 768px)').matches) return;
  const active = document.activeElement;
  if (active && typeof active.blur === 'function') active.blur();
  requestAnimationFrame(() => {
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
    if (window.scrollX !== 0) window.scrollTo(0, window.scrollY);
  });
}

function Field({ label, right, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>
        <span>{label}</span>{right}
      </span>
      {children}
    </div>
  );
}

function formatAuthError(error, context, copy) {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  if (code.includes('rate') || message.includes('rate limit') || message.includes('security purposes')) {
    return copy.errors.rateLimited;
  }
  if (context === 'reset-update' && (code.includes('session') || message.includes('session') || message.includes('jwt'))) {
    return copy.errors.resetSessionInvalid;
  }
  if (context === 'reset-request') {
    return error?.message || copy.errors.resetRequestFailed;
  }
  if (context === 'reset-update') {
    return error?.message || copy.errors.resetUpdateFailed;
  }
  if (message.includes('invalid login credentials')) {
    return copy.errors.invalidCredentials;
  }
  if (message.includes('email not confirmed')) {
    return copy.errors.emailNotConfirmed;
  }

  return error?.message || copy.errors.authFailed;
}

function getResetLinkError(copy) {
  if (typeof window === 'undefined') return null;

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const description = searchParams.get('error_description') || hashParams.get('error_description');
  const code = searchParams.get('error_code') || hashParams.get('error_code');

  if (!description && !code) return null;

  const normalized = `${code || ''} ${description || ''}`.toLowerCase();
  if (normalized.includes('expired')) {
    return copy.errors.resetExpired;
  }

  return description || copy.errors.resetInvalid;
}

const authS = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(7,11,45,.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, animation: 'fadein .2s ease' },
  closeBtn: { position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: 999, background: '#F4F5FF', color: 'var(--ink)', fontSize: 22, lineHeight: 1, display: 'grid', placeItems: 'center', fontWeight: 600 },
  bg: { position: 'relative', display: 'grid', placeItems: 'center', padding: 0 },
  blob1: { position: 'absolute', top: -180, left: -180, width: 520, height: 520, background: 'radial-gradient(closest-side, rgba(55,48,232,.18), transparent 70%)', filter: 'blur(20px)' },
  blob2: { position: 'absolute', bottom: -200, right: -200, width: 560, height: 560, background: 'radial-gradient(closest-side, rgba(139,92,246,.18), transparent 70%)', filter: 'blur(20px)' },
  card: { position: 'relative', width: '100%', maxWidth: 440, background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--border)', padding: 32, boxShadow: '0 20px 60px -20px rgba(15,16,53,.15)' },
  brand: { display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 24 },
  logoBox: { width: 40, height: 40, borderRadius: 12, background: 'var(--indigo)', color: '#fff', display: 'grid', placeItems: 'center' },
  brandText: { fontSize: 22, fontWeight: 800, color: 'var(--indigo)' },
  title: { fontSize: 26, fontWeight: 700, color: 'var(--ink)', margin: 0, textAlign: 'center', letterSpacing: '-0.02em' },
  sub: { textAlign: 'center', color: 'var(--gray)', marginTop: 8, marginBottom: 24, fontSize: 15 },
  googleBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)', color: 'var(--ink)', fontWeight: 600, fontSize: 15 },
  divider: { display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' },
  dividerLine: { flex: 1, height: 1, background: 'var(--border)' },
  dividerText: { color: 'var(--gray-2)', fontSize: 13 },
  input: { width: '100%', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 12, fontSize: 16, color: 'var(--ink)', background: 'var(--input-bg)', outline: 'none', transition: 'border-color .15s' },
  error: { padding: '10px 12px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: 13, fontWeight: 600, lineHeight: 1.4 },
  notice: { padding: '10px 12px', borderRadius: 12, background: '#ECFDF5', border: '1px solid #86EFAC', color: '#166534', fontSize: 13, fontWeight: 600, lineHeight: 1.4 },
  eyeBtn: { position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', padding: 8, color: 'var(--gray)', borderRadius: 8 },
  forgot: { fontSize: 13, color: 'var(--indigo)', fontWeight: 600 },
  submit: { width: '100%', marginTop: 8, padding: '13px 16px', background: 'var(--indigo)', color: '#fff', borderRadius: 12, fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 10px 30px -8px rgba(55,48,232,.45)' },
  toggle: { textAlign: 'center', marginTop: 22, color: 'var(--gray)', fontSize: 14 },
  toggleLink: { color: 'var(--indigo)', fontWeight: 700 },
};
