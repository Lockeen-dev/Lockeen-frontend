import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Google } from '../lib/icons';

const AUTH_STYLES = `
  @keyframes authCardIn { from { opacity:0; transform:scale(.95) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
  @keyframes authSpin { to { transform:rotate(360deg); } }
  @keyframes authModeSwitch { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
`;

/* ===================== AUTH SCREEN ===================== */
export default function AuthModal({ initialMode = "signin", onAuth, onClose, darkMode }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('alex@lockeen.com');
  const [password, setPassword] = useState('••••••••');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [modeKey, setModeKey] = useState(0);

  const submit = (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      onAuth({ name: name || email.split('@')[0] || 'Alex', email });
    }, 700);
  };

  const google = () => {
    setLoading(true);
    setTimeout(() => onAuth({ name: 'Alex', email: 'alex@gmail.com' }), 600);
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
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p style={authS.sub}>
          {mode === 'signin'
            ? 'Sign in to continue your learning journey'
            : 'Start studying smarter with AI in seconds'}
        </p>

        <button onClick={google} style={{ ...authS.googleBtn, background: darkMode ? '#1e293b' : '#fff' }} disabled={loading}>
          <Google /> Continue with Google
        </button>

        <div style={authS.divider}>
          <span style={authS.dividerLine} />
          <span style={authS.dividerText}>or</span>
          <span style={authS.dividerLine} />
        </div>

        <form key={modeKey} onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'authModeSwitch .22s ease' }}>
          {mode === 'signup' && (
            <Field label="Full name">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe"
                onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
                style={{ ...authS.input, background: darkMode ? '#0f172a' : '#fff', ...focusStyle('name') }} />
            </Field>
          )}
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
              style={{ ...authS.input, background: darkMode ? '#0f172a' : '#fff', ...focusStyle('email') }} />
          </Field>
          <Field label="Password" right={mode === 'signin' && <a href="#" style={authS.forgot}>Forgot?</a>}>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                style={{ ...authS.input, background: darkMode ? '#0f172a' : '#fff', paddingRight: 44, ...focusStyle('password') }} />
              <button type="button" onClick={() => setShowPw(v => !v)} aria-label="Toggle password" style={authS.eyeBtn}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>

          <button type="submit" disabled={loading} style={{ ...authS.submit, opacity: loading ? .85 : 1 }}>
            {loading
              ? <><span style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'authSpin .7s linear infinite' }} /> Just a sec…</>
              : <>{mode === 'signin' ? 'Sign In' : 'Create Account'} <ArrowRight size={18} /></>}
          </button>
        </form>

        <p style={authS.toggle}>
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setModeKey(k => k + 1); }} style={authS.toggleLink}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
        <button onClick={onClose} aria-label="Close" style={authS.closeBtn}>×</button>
      </div>
    </div>
  );
}

function Field({ label, right, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>
        <span>{label}</span>{right}
      </span>
      {children}
    </label>
  );
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
  input: { width: '100%', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 12, fontSize: 15, color: 'var(--ink)', background: 'var(--input-bg)', outline: 'none', transition: 'border-color .15s' },
  eyeBtn: { position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', padding: 8, color: 'var(--gray)', borderRadius: 8 },
  forgot: { fontSize: 13, color: 'var(--indigo)', fontWeight: 600 },
  submit: { width: '100%', marginTop: 8, padding: '13px 16px', background: 'var(--indigo)', color: '#fff', borderRadius: 12, fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 10px 30px -8px rgba(55,48,232,.45)' },
  toggle: { textAlign: 'center', marginTop: 22, color: 'var(--gray)', fontSize: 14 },
  toggleLink: { color: 'var(--indigo)', fontWeight: 700 },
};
