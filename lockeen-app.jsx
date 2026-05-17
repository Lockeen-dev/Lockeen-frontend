const { useState, useEffect, useRef, useMemo } = React;

/* ===================== ICONS ===================== */
const Icon = ({ d, fill, size = 20, sw = 1.8, children, viewBox = "0 0 24 24" }) => (
  <svg width={size} height={size} viewBox={viewBox} fill={fill || "none"} stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children || (d ? <path d={d} /> : null)}
  </svg>
);
const ZapSolid    = (p) => <Icon {...p} fill="currentColor" sw={0}><path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z"/></Icon>;
const BookOpen    = (p) => <Icon {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></Icon>;
const MsgCircle   = (p) => <Icon {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></Icon>;
const BarChart3   = (p) => <Icon {...p}><path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-3"/></Icon>;
const Sparkles    = (p) => <Icon {...p}><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></Icon>;
const Check       = (p) => <Icon {...p}><polyline points="20 6 9 17 4 12"/></Icon>;
const ArrowRight  = (p) => <Icon {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></Icon>;
const Search      = (p) => <Icon {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Icon>;
const Plus        = (p) => <Icon {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Icon>;
const Send        = (p) => <Icon {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></Icon>;
const Eye         = (p) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></Icon>;
const EyeOff      = (p) => <Icon {...p}><path d="M17.94 17.94A10.06 10.06 0 0 1 12 19c-6.5 0-10-7-10-7a17.4 17.4 0 0 1 4.06-4.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a17.34 17.34 0 0 1-2.16 3.08"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12A3 3 0 1 1 9.88 9.88"/></Icon>;
const Bell        = (p) => <Icon {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></Icon>;
const LogOut      = (p) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Icon>;
const FileText    = (p) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></Icon>;
const Layers      = (p) => <Icon {...p}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></Icon>;
const Lightning   = (p) => <Icon {...p}><polygon points="13 2 3 14 11 14 10 22 21 9 13 9 13 2"/></Icon>;
const Trend       = (p) => <Icon {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></Icon>;
const Clock       = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Icon>;
const Flame       = (p) => <Icon {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></Icon>;
const Trophy      = (p) => <Icon {...p}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></Icon>;
const Google      = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 16.1 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.3l-6.2-5.2C29.3 35 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.6l6.2 5.2C40.9 36.6 44 30.9 44 24c0-1.2-.1-2.3-.4-3.5z"/>
  </svg>
);
const Brain       = (p) => <Icon {...p}><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></Icon>;
const CalendarIcon = (p) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Icon>;
const Trash       = (p) => <Icon {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></Icon>;

/* ===================== LIFE CATEGORIES ===================== */
const LIFE_CATS = [
  { id:'study',   label:'Study',   color:'#3730E8', bg:'#EEF2FF', text:'#3730E8' },
  { id:'fitness', label:'Fitness', color:'#10B981', bg:'#DCFCE7', text:'#065F46' },
  { id:'social',  label:'Social',  color:'#F59E0B', bg:'#FEF3C7', text:'#92400E' },
  { id:'rest',    label:'Rest',    color:'#8B5CF6', bg:'#F5F3FF', text:'#5B21B6' },
  { id:'other',   label:'Other',   color:'#6B7280', bg:'#F3F4F6', text:'#374151' },
];

/* ===================== CALENDAR HELPERS ===================== */
const CAL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CAL_MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const getMonday = (d) => { const r = new Date(d); const day = r.getDay(); r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day)); r.setHours(0,0,0,0); return r; };
const addDays   = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const dayKey    = (d) => `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
const durToMins = (s) => { let m=0; const h=s.match(/(\d+)h/); const mn=s.match(/(\d+)m/); if(h) m+=parseInt(h[1])*60; if(mn) m+=parseInt(mn[1]); return m||0; };

const SUBJECT_NOTE_MAP = {
  Biology:    { noteId:1, bg:'#EEF2FF', color:'#3730E8', text:'#3730E8' },
  Chemistry:  { noteId:2, bg:'#FDF2F8', color:'#8B5CF6', text:'#8B5CF6' },
  History:    { noteId:3, bg:'#FEF3C7', color:'#F59E0B', text:'#92400E' },
  Math:       { noteId:4, bg:'#ECFEFF', color:'#06B6D4', text:'#0E7490' },
  Economics:  { noteId:5, bg:'#DCFCE7', color:'#10B981', text:'#065F46' },
  Literature: { noteId:6, bg:'#FEE2E2', color:'#EF4444', text:'#991B1B' },
};

const initEvents = () => {
  const t = new Date(); t.setHours(0,0,0,0);
  const ev = {};
  const set = (d, arr) => { ev[dayKey(d)] = arr; };
  set(t, [
    { name:'Biology — Cellular Respiration', time:'09:00', dur:'1h30m', cat:'study', noteId:1, noteColor:'#3730E8', noteBg:'#EEF2FF', noteText:'#3730E8', noteSubject:'Biology' },
    { name:'Gym', time:'17:00', dur:'1h', cat:'fitness', noteId:null, noteColor:null, noteBg:null, noteText:null, noteSubject:null },
  ]);
  set(addDays(t,1), [
    { name:'Chemistry — Organic Chemistry', time:'10:00', dur:'1h', cat:'study', noteId:2, noteColor:'#8B5CF6', noteBg:'#FDF2F8', noteText:'#8B5CF6', noteSubject:'Chemistry' },
    { name:'Coffee with Sara', time:'15:00', dur:'1h30m', cat:'social', noteId:null, noteColor:null, noteBg:null, noteText:null, noteSubject:null },
  ]);
  set(addDays(t,2), [
    { name:'Math — Calculus Derivatives', time:'08:00', dur:'45m', cat:'study', noteId:4, noteColor:'#06B6D4', noteBg:'#ECFEFF', noteText:'#0E7490', noteSubject:'Math' },
    { name:'Rest & recover', time:'20:00', dur:'30m', cat:'rest', noteId:null, noteColor:null, noteBg:null, noteText:null, noteSubject:null },
  ]);
  set(addDays(t,3), [
    { name:'History — WWII Timeline', time:'11:00', dur:'2h', cat:'study', noteId:3, noteColor:'#F59E0B', noteBg:'#FEF3C7', noteText:'#92400E', noteSubject:'History' },
  ]);
  set(addDays(t,-1), [
    { name:'Physics revision', time:'14:00', dur:'1h', cat:'study', noteId:null, noteColor:null, noteBg:null, noteText:null, noteSubject:null },
    { name:'Morning run', time:'07:00', dur:'40m', cat:'fitness', noteId:null, noteColor:null, noteBg:null, noteText:null, noteSubject:null },
  ]);
  return ev;
};

/* ===================== ROOT APP ===================== */
function App() {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState({ name: 'Alex', email: 'alex@lockeen.com' });

  return authed
    ? <Dashboard user={user} onLogout={() => setAuthed(false)} />
    : <AuthScreen onAuth={(u) => { setUser(u); setAuthed(true); }} />;
}

/* ===================== AUTH SCREEN ===================== */
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('alex@lockeen.com');
  const [password, setPassword] = useState('••••••••');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

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

  return (
    <div style={authS.bg}>
      <div style={authS.blob1} />
      <div style={authS.blob2} />
      <div style={authS.card}>
        <div style={authS.brand}>
          <div style={authS.logoBox}>
            <img src="Lockeen-2.png" alt="Lockeen logo" style={{ width: 58, height: 58, maxWidth: 'none' }} />
          </div>
          <span style={authS.brandText}>Lockeen</span>
        </div>
        <h1 style={authS.title}>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
        <p style={authS.sub}>{mode === 'signin' ? 'Sign in to continue your learning journey' : 'Start studying smarter with AI in seconds'}</p>
        <button onClick={google} style={authS.googleBtn} disabled={loading}><Google /> Continue with Google</button>
        <div style={authS.divider}>
          <span style={authS.dividerLine} />
          <span style={authS.dividerText}>or</span>
          <span style={authS.dividerLine} />
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'signup' && (
            <Field label="Full name">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" style={authS.input} />
            </Field>
          )}
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={authS.input} />
          </Field>
          <Field label="Password" right={mode === 'signin' && <a href="#" style={authS.forgot}>Forgot?</a>}>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ ...authS.input, paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPw(v => !v)} aria-label="Toggle password" style={authS.eyeBtn}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          <button type="submit" disabled={loading} style={{ ...authS.submit, opacity: loading ? .7 : 1 }}>
            {loading ? 'Just a sec…' : (mode === 'signin' ? 'Sign In' : 'Create Account')}
            <ArrowRight size={18} />
          </button>
        </form>
        <p style={authS.toggle}>
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} style={authS.toggleLink}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
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
  bg: { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, position: 'relative', overflow: 'hidden' },
  blob1: { position: 'absolute', top: -180, left: -180, width: 520, height: 520, background: 'radial-gradient(closest-side, rgba(55,48,232,.18), transparent 70%)', filter: 'blur(20px)' },
  blob2: { position: 'absolute', bottom: -200, right: -200, width: 560, height: 560, background: 'radial-gradient(closest-side, rgba(139,92,246,.18), transparent 70%)', filter: 'blur(20px)' },
  card: { position: 'relative', width: '100%', maxWidth: 440, background: '#fff', borderRadius: 24, border: '1px solid var(--border)', padding: 32, boxShadow: '0 20px 60px -20px rgba(15,16,53,.15)' },
  brand: { display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 24 },
  logoBox: { width: 40, height: 40, borderRadius: 12, background: 'var(--indigo)', color: '#fff', display: 'grid', placeItems: 'center' },
  brandText: { fontSize: 22, fontWeight: 800, color: 'var(--indigo)' },
  title: { fontSize: 26, fontWeight: 700, color: 'var(--ink)', margin: 0, textAlign: 'center', letterSpacing: '-0.02em' },
  sub: { textAlign: 'center', color: 'var(--gray)', marginTop: 8, marginBottom: 24, fontSize: 15 },
  googleBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 12, background: '#fff', color: 'var(--ink)', fontWeight: 600, fontSize: 15 },
  divider: { display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' },
  dividerLine: { flex: 1, height: 1, background: 'var(--border)' },
  dividerText: { color: 'var(--gray-2)', fontSize: 13 },
  input: { width: '100%', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 12, fontSize: 15, color: 'var(--ink)', background: '#fff', outline: 'none', transition: 'border-color .15s' },
  eyeBtn: { position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', padding: 8, color: 'var(--gray)', borderRadius: 8 },
  forgot: { fontSize: 13, color: 'var(--indigo)', fontWeight: 600 },
  submit: { width: '100%', marginTop: 8, padding: '13px 16px', background: 'var(--indigo)', color: '#fff', borderRadius: 12, fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 10px 30px -8px rgba(55,48,232,.45)' },
  toggle: { textAlign: 'center', marginTop: 22, color: 'var(--gray)', fontSize: 14 },
  toggleLink: { color: 'var(--indigo)', fontWeight: 700 },
};

/* ===================== DASHBOARD SHELL ===================== */
function Dashboard({ user, onLogout }) {
  const [tab, setTab] = useState('dashboard');
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  return (
    <div style={shellS.wrap}>
      <header style={shellS.header}>
        <div style={shellS.headerInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={shellS.logoBox}><BookOpen size={20} /></div>
            <span style={shellS.brand}>Lockeen</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={shellS.iconBtn} aria-label="Notifications"><Bell size={18} /></button>
            <div style={shellS.avatar}>{user.name?.[0]?.toUpperCase() || 'A'}</div>
            <button onClick={onLogout} style={shellS.signoutBtn} title="Sign out">
              <LogOut size={16} /> <span style={{ marginLeft: 6 }}>Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <div style={shellS.outerCard}>
        <div style={shellS.grid}>
          <Sidebar tab={tab} setTab={setTab} />
          <div style={shellS.main}>
            {tab === 'dashboard' && <DashboardHome user={user} setTab={setTab} />}
            {tab === 'notes'     && <NotesView selectedNoteId={selectedNoteId} setSelectedNoteId={setSelectedNoteId} />}
            {tab === 'calendar'  && <CalendarView setTab={setTab} setSelectedNoteId={setSelectedNoteId} />}
            {tab === 'tutor'     && <TutorView />}
            {tab === 'analytics' && <AnalyticsView />}
          </div>
        </div>
      </div>
    </div>
  );
}

const shellS = {
  wrap: { minHeight: '100vh', padding: '24px 24px 48px', maxWidth: 1280, margin: '0 auto' },
  header: { marginBottom: 20 },
  headerInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logoBox: { width: 36, height: 36, borderRadius: 10, background: 'var(--indigo)', color: '#fff', display: 'grid', placeItems: 'center' },
  brand: { fontSize: 18, fontWeight: 800, color: 'var(--indigo)' },
  iconBtn: { width: 38, height: 38, borderRadius: 10, background: '#fff', border: '1px solid var(--border)', color: 'var(--ink)', display: 'grid', placeItems: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 999, background: 'linear-gradient(135deg, var(--indigo), var(--purple))', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 },
  signoutBtn: { display: 'flex', alignItems: 'center', padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', color: 'var(--ink)', fontWeight: 600, fontSize: 13 },
  outerCard: { border: '2px solid var(--indigo)', borderRadius: 24, background: '#fff', overflow: 'hidden', boxShadow: '0 30px 60px -30px rgba(55,48,232,.25)' },
  grid: { display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 640 },
  main: { padding: '32px 36px' },
};

/* ===================== SIDEBAR ===================== */
function Sidebar({ tab, setTab }) {
  const items = [
    { id: 'dashboard', label: 'Dashboard', Icon: ZapSolid },
    { id: 'notes',     label: 'My Notes',  Icon: BookOpen  },
    { id: 'calendar',  label: 'Calendar',  Icon: CalendarIcon },
    { id: 'tutor',     label: 'AI Tutor',  Icon: MsgCircle },
    { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
  ];
  return (
    <aside style={sideS.wrap}>
      <nav style={sideS.nav}>
        {items.map(({ id, label, Icon: I }) => {
          const active = id === tab;
          return (
            <button key={id} onClick={() => setTab(id)} style={{ ...sideS.item, ...(active ? sideS.itemActive : null) }}>
              <I size={18} sw={active ? 0 : 1.8} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
      <div style={sideS.goalCard}>
        <div style={sideS.goalLabel}>Weekly Goal</div>
        <div style={sideS.goalValue}>78%</div>
        <div style={sideS.goalBarTrack}>
          <div style={sideS.goalBarFill} />
        </div>
      </div>
    </aside>
  );
}

const sideS = {
  wrap: { background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)', padding: '24px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
  nav: { display: 'flex', flexDirection: 'column', gap: 6 },
  item: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 999, color: 'var(--gray)', fontWeight: 600, fontSize: 14, textAlign: 'left' },
  itemActive: { background: 'var(--indigo)', color: '#fff', boxShadow: '0 8px 22px -10px rgba(55,48,232,.6)' },
  goalCard: { background: 'var(--lavender)', borderRadius: 16, padding: 16, marginTop: 24 },
  goalLabel: { fontSize: 12, color: 'var(--gray)', fontWeight: 600 },
  goalValue: { fontSize: 26, fontWeight: 800, color: 'var(--indigo)', marginTop: 4, marginBottom: 10, letterSpacing: '-0.02em' },
  goalBarTrack: { height: 6, background: '#E5E7FF', borderRadius: 999, overflow: 'hidden' },
  goalBarFill: { width: '78%', height: '100%', background: 'linear-gradient(90deg, var(--indigo), var(--purple))', borderRadius: 999 },
};

/* ===================== DASHBOARD HOME ===================== */
function DashboardHome({ user, setTab }) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={homeS.h1}>Good morning, {user.name}</h2>
        <p style={homeS.sub}>Ready to continue your learning journey?</p>
      </div>
      <div style={homeS.cardsRow}>
        <div style={{ ...homeS.bigCard, background: 'linear-gradient(180deg, #EEF2FF 0%, #FFFFFF 100%)' }}>
          <div style={{ ...homeS.dot, background: 'var(--indigo)' }} />
          <h3 style={homeS.cardTitle}>Biology Quiz</h3>
          <p style={homeS.cardMeta}>15 questions • 20 min</p>
          <button style={homeS.primaryBtn} onClick={() => alert('Quiz started!')}>Start Quiz</button>
        </div>
        <div style={{ ...homeS.bigCard, background: 'linear-gradient(180deg, #FDF2F8 0%, #FFFFFF 100%)' }}>
          <div style={{ ...homeS.dot, background: 'var(--purple)' }} />
          <h3 style={homeS.cardTitle}>Chemistry Flash</h3>
          <p style={homeS.cardMeta}>48 cards • Practice</p>
          <button style={homeS.outlineBtn} onClick={() => setTab('notes')}>Review Cards</button>
        </div>
      </div>
      <button onClick={() => setTab('calendar')} style={{ ...homeS.outlineBtn, width: 'auto', display: 'inline-flex', marginBottom: 20, padding: '11px 20px' }}>
        <CalendarIcon size={16} /> Open Calendar
      </button>
      <div style={homeS.assistant}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={homeS.assistantIcon}><MsgCircle size={18} /></div>
          <div>
            <h4 style={homeS.assistantTitle}>AI Study Assistant</h4>
            <p style={homeS.assistantSub}>Ask me anything</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={homeS.msgUser}>Explain photosynthesis in simple terms</div>
          <div style={homeS.msgAI}>Photosynthesis is how plants make their own food using sunlight…</div>
        </div>
        <button onClick={() => setTab('tutor')} style={{ ...homeS.outlineBtn, marginTop: 16, width: 'auto', alignSelf: 'flex-start', padding: '10px 18px' }}>
          Open AI Tutor <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

const homeS = {
  h1: { margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' },
  sub: { margin: '6px 0 0', color: 'var(--gray)', fontSize: 15 },
  cardsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 },
  bigCard: { border: '1px solid var(--border)', borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', gap: 10 },
  dot: { width: 22, height: 22, borderRadius: 999, boxShadow: '0 0 0 6px rgba(255,255,255,.6)' },
  cardTitle: { margin: '6px 0 2px', fontSize: 18, fontWeight: 700, color: 'var(--ink)' },
  cardMeta: { margin: 0, color: 'var(--gray)', fontSize: 13 },
  primaryBtn: { marginTop: 14, padding: '11px 16px', borderRadius: 999, background: 'var(--indigo)', color: '#fff', fontWeight: 600, fontSize: 14, width: '100%' },
  outlineBtn: { marginTop: 14, padding: '11px 16px', borderRadius: 999, background: '#fff', color: 'var(--ink)', border: '1px solid var(--border)', fontWeight: 600, fontSize: 14, width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  assistant: { background: '#F6F8FF', borderRadius: 20, padding: 22, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' },
  assistantIcon: { width: 38, height: 38, borderRadius: 999, background: '#E0EAFF', color: 'var(--indigo)', display: 'grid', placeItems: 'center' },
  assistantTitle: { margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink)' },
  assistantSub: { margin: '2px 0 0', color: 'var(--gray)', fontSize: 13 },
  msgUser: { padding: '12px 16px', background: '#fff', borderRadius: 14, border: '1px solid var(--border)', color: 'var(--ink)', fontSize: 14 },
  msgAI:   { padding: '12px 16px', background: 'var(--teal)', borderRadius: 14, color: 'var(--ink)', fontSize: 14 },
};

/* ===================== MY NOTES ===================== */
const seedNotes = [
  { id: 1, title: 'Cellular Respiration',         subject: 'Biology',    updated: '2h ago',      pages: 12, color: '#EEF2FF', dot: 'var(--indigo)' },
  { id: 2, title: 'Organic Chemistry Reactions',  subject: 'Chemistry',  updated: 'Yesterday',   pages: 24, color: '#FDF2F8', dot: 'var(--purple)' },
  { id: 3, title: 'World War II Timeline',        subject: 'History',    updated: '3 days ago',  pages: 18, color: '#FEF3C7', dot: '#F59E0B' },
  { id: 4, title: 'Calculus — Derivatives',       subject: 'Math',       updated: '1 week ago',  pages: 32, color: '#ECFEFF', dot: '#06B6D4' },
  { id: 5, title: 'Macroeconomics Notes',         subject: 'Economics',  updated: '2 weeks ago', pages: 16, color: '#DCFCE7', dot: '#10B981' },
  { id: 6, title: 'Shakespeare — Hamlet',         subject: 'Literature', updated: '3 weeks ago', pages: 22, color: '#FEE2E2', dot: '#EF4444' },
];

function NotesView({ selectedNoteId, setSelectedNoteId }) {
  const [q, setQ] = useState('');
  const [highlightId, setHighlightId] = useState(null);
  const noteRefs = useRef({});
  const filtered = useMemo(() => seedNotes.filter(n => (n.title + ' ' + n.subject).toLowerCase().includes(q.toLowerCase())), [q]);

  useEffect(() => {
    if (!selectedNoteId) return;
    setHighlightId(selectedNoteId);
    setTimeout(() => noteRefs.current[selectedNoteId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    const t = setTimeout(() => {
      setHighlightId(null);
      setSelectedNoteId(null);
    }, 2000);
    return () => clearTimeout(t);
  }, [selectedNoteId]);

  return (
    <div>
      <div style={notesS.headRow}>
        <div>
          <h2 style={homeS.h1}>My Notes</h2>
          <p style={homeS.sub}>{filtered.length} {filtered.length === 1 ? 'note' : 'notes'} • upload anything to generate study materials</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={notesS.search}>
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes…" style={notesS.searchInput} />
          </div>
          <button style={notesS.newBtn}><Plus size={16} /> New Note</button>
        </div>
      </div>
      <div style={notesS.grid}>
        {filtered.map(n => (
          <div key={n.id} ref={el => noteRefs.current[n.id] = el}
            style={{ ...notesS.card, ...(highlightId === n.id ? { border: '2px solid var(--indigo)', boxShadow: '0 0 0 3px rgba(55,48,232,.12)' } : {}) }}>
            <div style={{ ...notesS.cover, background: n.color }}>
              <div style={{ ...notesS.coverDot, background: n.dot }} />
              <span style={notesS.subjectChip}>{n.subject}</span>
            </div>
            <div style={{ padding: 18 }}>
              <h3 style={notesS.title}>{n.title}</h3>
              <p style={notesS.meta}>{n.pages} pages • Updated {n.updated}</p>
              <div style={notesS.actions}>
                <button style={notesS.primarySmall} onClick={() => alert(`Generating quiz for "${n.title}"…`)}>
                  <Sparkles size={14} /> Generate Quiz
                </button>
                <button style={notesS.ghostSmall} onClick={() => alert(`Opening flashcards for "${n.title}"…`)}>
                  <Layers size={14} /> Flashcards
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const notesS = {
  headRow: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 16, flexWrap: 'wrap' },
  search: { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px', color: 'var(--gray)' },
  searchInput: { border: 'none', outline: 'none', fontSize: 14, color: 'var(--ink)', width: 180, background: 'transparent' },
  newBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 12, background: 'var(--indigo)', color: '#fff', fontWeight: 600, fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 },
  card: { background: '#fff', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', transition: 'border-color .2s, box-shadow .2s' },
  cover: { height: 100, position: 'relative', display: 'grid', placeItems: 'center' },
  coverDot: { width: 36, height: 36, borderRadius: 12 },
  subjectChip: { position: 'absolute', top: 12, right: 12, fontSize: 11, fontWeight: 700, padding: '4px 10px', background: 'rgba(255,255,255,.8)', borderRadius: 999, color: 'var(--ink)' },
  title: { margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' },
  meta: { margin: '0 0 14px', color: 'var(--gray)', fontSize: 12 },
  actions: { display: 'flex', gap: 8 },
  primarySmall: { flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px', borderRadius: 10, background: 'var(--indigo)', color: '#fff', fontWeight: 600, fontSize: 12 },
  ghostSmall:   { flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px', borderRadius: 10, background: '#fff', color: 'var(--ink)', border: '1px solid var(--border)', fontWeight: 600, fontSize: 12 },
};

/* ===================== AI TUTOR ===================== */
const tutorReplies = [
  "Great question — let's break it down step by step. The key idea is that the rate of change tells you how a quantity is moving at an instant in time.",
  "Think of it this way: imagine you're tracking the position of a car. The derivative is the speedometer reading at any moment.",
  "Here's a quick worked example: if f(x) = x², then f'(x) = 2x. So at x = 3, the slope is 6.",
  "Try this practice problem: differentiate f(x) = 3x³ − 5x + 2. Hint: bring the exponent down, then subtract 1.",
  "Excellent. You're getting the hang of it. Want to try a quiz on this topic next?",
];

function TutorView() {
  const [msgs, setMsgs] = useState([
    { who: 'ai', text: "Hi Alex! I'm your AI tutor. What subject would you like to explore today?" },
    { who: 'user', text: "Can you help me understand derivatives in calculus?" },
    { who: 'ai', text: "Absolutely — derivatives measure how a function changes as its input changes. They're the foundation of calculus and incredibly useful in physics, economics, and engineering." },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);
  const replyIdx = useRef(0);

  useEffect(() => { endRef.current?.scrollTo({ top: endRef.current.scrollHeight, behavior: 'smooth' }); }, [msgs, typing]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMsgs(m => [...m, { who: 'user', text }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const reply = tutorReplies[replyIdx.current % tutorReplies.length];
      replyIdx.current += 1;
      setMsgs(m => [...m, { who: 'ai', text: reply }]);
      setTyping(false);
    }, 900 + Math.random() * 600);
  };

  const suggestions = ["Explain Newton's laws", 'Help me with quadratic equations', 'Summarize photosynthesis', 'Quiz me on WWII'];

  return (
    <div style={tutorS.wrap}>
      <div style={tutorS.head}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={tutorS.avatar}><Brain size={18} /></div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>AI Tutor</h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--gray)' }}>
              <span style={tutorS.onlineDot} /> Online • Powered by Lockeen AI
            </p>
          </div>
        </div>
      </div>
      <div ref={endRef} style={tutorS.thread}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.who === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={m.who === 'user' ? tutorS.bubbleUser : tutorS.bubbleAI}>{m.text}</div>
          </div>
        ))}
        {typing && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ ...tutorS.bubbleAI, display: 'flex', gap: 6, padding: '14px 18px' }}>
              <span style={tutorS.typingDot} /><span style={{ ...tutorS.typingDot, animationDelay: '.15s' }} /><span style={{ ...tutorS.typingDot, animationDelay: '.3s' }} />
            </div>
          </div>
        )}
      </div>
      <div style={tutorS.suggestRow}>
        {suggestions.map(s => (
          <button key={s} onClick={() => setInput(s)} style={tutorS.suggestChip}>{s}</button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} style={tutorS.composer}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything…" style={tutorS.composerInput} />
        <button type="submit" style={tutorS.sendBtn} aria-label="Send"><Send size={16} /></button>
      </form>
      <style>{`@keyframes tdot { 0%,80%,100% { transform: translateY(0); opacity:.4 } 40% { transform: translateY(-4px); opacity:1 } }`}</style>
    </div>
  );
}

const tutorS = {
  wrap: { display: 'flex', flexDirection: 'column', minHeight: 560 },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' },
  avatar: { width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, var(--indigo), var(--purple))', color: '#fff', display: 'grid', placeItems: 'center' },
  onlineDot: { display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: '#10B981', marginRight: 6, verticalAlign: 'middle' },
  thread: { flex: 1, display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 4px', maxHeight: 420, overflowY: 'auto' },
  bubbleAI:   { maxWidth: '78%', background: '#F4F6FF', color: 'var(--ink)', padding: '12px 16px', borderRadius: 18, borderTopLeftRadius: 6, fontSize: 14, lineHeight: 1.5 },
  bubbleUser: { maxWidth: '78%', background: 'var(--indigo)', color: '#fff', padding: '12px 16px', borderRadius: 18, borderTopRightRadius: 6, fontSize: 14, lineHeight: 1.5 },
  typingDot: { width: 8, height: 8, borderRadius: 999, background: 'var(--gray-2)', animation: 'tdot 1s infinite ease-in-out' },
  suggestRow: { display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' },
  suggestChip: { padding: '8px 12px', borderRadius: 999, background: '#fff', border: '1px solid var(--border)', color: 'var(--ink)', fontWeight: 500, fontSize: 12 },
  composer: { display: 'flex', alignItems: 'center', gap: 10, padding: 8, background: '#fff', border: '1px solid var(--border)', borderRadius: 16 },
  composerInput: { flex: 1, border: 'none', outline: 'none', padding: '10px 12px', fontSize: 14, background: 'transparent', color: 'var(--ink)' },
  sendBtn: { width: 40, height: 40, borderRadius: 12, background: 'var(--indigo)', color: '#fff', display: 'grid', placeItems: 'center' },
};

/* ===================== ANALYTICS ===================== */
const weekData = [
  { day: 'Mon', mins: 45 }, { day: 'Tue', mins: 80 }, { day: 'Wed', mins: 60 },
  { day: 'Thu', mins: 110 }, { day: 'Fri', mins: 90 }, { day: 'Sat', mins: 140 }, { day: 'Sun', mins: 75 },
];
const subjects = [
  { name: 'Biology',    progress: 84, color: 'var(--indigo)' },
  { name: 'Chemistry',  progress: 67, color: 'var(--purple)' },
  { name: 'Math',       progress: 92, color: '#06B6D4' },
  { name: 'History',    progress: 41, color: '#F59E0B' },
  { name: 'Literature', progress: 58, color: '#EF4444' },
];

function AnalyticsView() {
  const maxMin = Math.max(...weekData.map(d => d.mins));
  const totalMin = weekData.reduce((a, b) => a + b.mins, 0);
  const stats = [
    { label: 'Study time this week', value: `${Math.floor(totalMin/60)}h ${totalMin%60}m`, Icon: Clock,  tint: 'var(--lavender)', col: 'var(--indigo)' },
    { label: 'Current streak',       value: '42 days',                                    Icon: Flame,  tint: '#FFF7ED',         col: '#F97316' },
    { label: 'Avg. quiz score',      value: '88%',                                        Icon: Trend,  tint: '#ECFDF5',         col: '#10B981' },
    { label: 'Rank this week',       value: '#12',                                        Icon: Trophy, tint: '#FEF9C3',         col: '#CA8A04' },
  ];
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={homeS.h1}>Analytics</h2>
        <p style={homeS.sub}>Track your study habits and progress across subjects</p>
      </div>
      <div style={analS.statsGrid}>
        {stats.map(s => {
          const I = s.Icon;
          return (
            <div key={s.label} style={analS.statCard}>
              <div style={{ ...analS.statIcon, background: s.tint, color: s.col }}><I size={18} /></div>
              <div>
                <div style={analS.statValue}>{s.value}</div>
                <div style={analS.statLabel}>{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={analS.row}>
        <div style={analS.chartCard}>
          <div style={analS.cardHeader}>
            <div>
              <h3 style={analS.cardTitle}>Weekly study time</h3>
              <p style={analS.cardSub}>Minutes spent studying per day</p>
            </div>
            <span style={analS.legend}><span style={{ ...analS.legendDot, background: 'var(--indigo)' }} /> mins</span>
          </div>
          <div style={analS.chart}>
            {weekData.map(d => {
              const h = Math.round((d.mins / maxMin) * 180);
              return (
                <div key={d.day} style={analS.barCol}>
                  <div style={analS.barLabel}>{d.mins}m</div>
                  <div style={analS.barTrack}><div style={{ ...analS.bar, height: h }} /></div>
                  <div style={analS.dayLabel}>{d.day}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={analS.subjectCard}>
          <h3 style={{ ...analS.cardTitle, marginBottom: 4 }}>Subject mastery</h3>
          <p style={{ ...analS.cardSub, marginBottom: 18 }}>Your progress per subject</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {subjects.map(s => (
              <div key={s.name}>
                <div style={analS.subjRow}>
                  <span style={analS.subjName}>{s.name}</span>
                  <span style={analS.subjPct}>{s.progress}%</span>
                </div>
                <div style={analS.progTrack}>
                  <div style={{ ...analS.progFill, width: `${s.progress}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const analS = {
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 },
  statCard: { display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: '#fff', border: '1px solid var(--border)', borderRadius: 16 },
  statIcon: { width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' },
  statLabel: { fontSize: 12, color: 'var(--gray)', marginTop: 2 },
  row: { display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 },
  chartCard: { background: '#fff', border: '1px solid var(--border)', borderRadius: 20, padding: 22 },
  cardHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)' },
  cardSub: { margin: '4px 0 0', fontSize: 13, color: 'var(--gray)' },
  legend: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--gray)' },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  chart: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, alignItems: 'end', height: 240 },
  barCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  barLabel: { fontSize: 11, color: 'var(--gray)' },
  barTrack: { width: '100%', maxWidth: 40, height: 190, background: '#F4F5FF', borderRadius: 10, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', background: 'linear-gradient(180deg, var(--indigo), var(--purple))', borderRadius: 10, transition: 'height .4s ease' },
  dayLabel: { fontSize: 12, color: 'var(--gray)', fontWeight: 600 },
  subjectCard: { background: '#fff', border: '1px solid var(--border)', borderRadius: 20, padding: 22 },
  subjRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 },
  subjName: { fontSize: 13, fontWeight: 600, color: 'var(--ink)' },
  subjPct: { fontSize: 13, color: 'var(--gray)', fontWeight: 600 },
  progTrack: { height: 8, background: '#F4F5FF', borderRadius: 999, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: 999, transition: 'width .4s ease' },
};

/* ===================== CALENDAR VIEW ===================== */
function CalendarView({ setTab, setSelectedNoteId }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [view, setView]           = useState('week');
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [viewYear, setViewYear]   = useState(() => new Date().getFullYear());
  const [activeCats, setActiveCats] = useState(() => new Set(LIFE_CATS.map(c => c.id)));
  const [events, setEvents]       = useState(initEvents);
  const [modalKey, setModalKey]   = useState(null);
  const [selCat, setSelCat]       = useState('study');
  const [selNoteId, setSelNoteId] = useState(null);
  const [modalName, setModalName] = useState('');
  const [modalTime, setModalTime] = useState('09:00');
  const [modalDur, setModalDur]   = useState('1h');

  const navPrev = () => {
    if (view === 'week') { setWeekStart(d => addDays(d, -7)); }
    else { setViewMonth(m => { if (m === 0) { setViewYear(y => y-1); return 11; } return m-1; }); }
  };
  const navNext = () => {
    if (view === 'week') { setWeekStart(d => addDays(d, 7)); }
    else { setViewMonth(m => { if (m === 11) { setViewYear(y => y+1); return 0; } return m+1; }); }
  };

  const openModal = (key) => {
    setModalKey(key); setSelCat('study'); setSelNoteId(null);
    setModalName(''); setModalTime('09:00'); setModalDur('1h');
  };
  const closeModal = () => setModalKey(null);

  const toggleCat = (id) => setActiveCats(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s;
  });

  const deleteEvent = (key, idx) => setEvents(ev => ({
    ...ev, [key]: ev[key].filter((_, i) => i !== idx),
  }));

  const selectSubject = (subject) => {
    const info = SUBJECT_NOTE_MAP[subject];
    if (selNoteId === info.noteId) {
      setSelNoteId(null); setModalName('');
    } else {
      setSelNoteId(info.noteId);
      const note = seedNotes.find(n => n.id === info.noteId);
      setModalName(`${subject} — ${note?.title || subject}`);
    }
  };

  const addEvent = () => {
    if (!modalName.trim()) return;
    const cat = LIFE_CATS.find(c => c.id === selCat);
    const noteSubject = selCat === 'study' && selNoteId
      ? Object.keys(SUBJECT_NOTE_MAP).find(s => SUBJECT_NOTE_MAP[s].noteId === selNoteId) || null
      : null;
    const noteInfo = noteSubject ? SUBJECT_NOTE_MAP[noteSubject] : null;
    const ev = {
      name: modalName, time: modalTime, dur: modalDur, cat: selCat,
      noteId: selCat === 'study' ? selNoteId : null,
      noteColor: noteInfo?.color || null,
      noteBg:    noteInfo?.bg    || null,
      noteText:  noteInfo?.text  || null,
      noteSubject,
    };
    setEvents(prev => ({ ...prev, [modalKey]: [...(prev[modalKey] || []), ev] }));
    closeModal();
  };

  const handleEvClick = (ev) => {
    if (ev.noteId) { setSelectedNoteId(ev.noteId); setTab('notes'); }
  };

  const weekLabel = () => {
    const end = addDays(weekStart, 4);
    if (weekStart.getMonth() === end.getMonth())
      return `${CAL_MONTHS_S[weekStart.getMonth()]} ${weekStart.getDate()}–${end.getDate()}, ${weekStart.getFullYear()}`;
    return `${CAL_MONTHS_S[weekStart.getMonth()]} ${weekStart.getDate()} – ${CAL_MONTHS_S[end.getMonth()]} ${end.getDate()}`;
  };

  const rangeLabel = view === 'week' ? weekLabel() : `${CAL_MONTHS[viewMonth]} ${viewYear}`;

  const weekDays = useMemo(() => Array.from({length:5}, (_, i) => addDays(weekStart, i)), [weekStart]);

  const monthGrid = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startMonday = getMonday(first);
    return Array.from({length:42}, (_, i) => addDays(startMonday, i));
  }, [viewMonth, viewYear]);

  const lifeBalance = useMemo(() => {
    const totals = {};
    LIFE_CATS.forEach(c => { totals[c.id] = 0; });
    Array.from({length:7}, (_, i) => addDays(weekStart, i)).forEach(d => {
      (events[dayKey(d)] || []).forEach(ev => {
        totals[ev.cat] = (totals[ev.cat] || 0) + durToMins(ev.dur);
      });
    });
    const total = Object.values(totals).reduce((a, b) => a + b, 0);
    return LIFE_CATS.map(c => ({ ...c, mins: totals[c.id], pct: total > 0 ? Math.round(totals[c.id]/total*100) : 0 }));
  }, [events, weekStart]);

  const fmtModalDate = (key) => {
    if (!key) return '';
    const [y, m, d] = key.split('-').map(Number);
    return `${CAL_MONTHS_S[m-1]} ${d}, ${y}`;
  };

  const DAY_NAMES = ['MON','TUE','WED','THU','FRI'];

  const renderWeek = () => (
    <div style={calS.weekGrid}>
      {weekDays.map((day, i) => {
        const key = dayKey(day);
        const dayEvs = (events[key] || []).filter(ev => activeCats.has(ev.cat));
        const isToday = dayKey(day) === dayKey(today);
        return (
          <div key={i} style={calS.weekCol}>
            <div style={calS.weekColHeader}>
              <span style={calS.weekDayName}>{DAY_NAMES[i]}</span>
              <span style={{ ...calS.weekDayNum, ...(isToday ? calS.weekDayToday : {}) }}>{day.getDate()}</span>
            </div>
            <div style={calS.weekEvs}>
              {dayEvs.map((ev, idx) => {
                const cat = LIFE_CATS.find(c => c.id === ev.cat);
                const borderColor = ev.noteId ? ev.noteColor : cat?.color;
                const bg = ev.noteId ? ev.noteBg : cat?.bg;
                return (
                  <div key={idx}
                    style={{ ...calS.evCard, borderLeft: `3px solid ${borderColor}`, background: bg, cursor: ev.noteId ? 'pointer' : 'default' }}
                    onClick={() => handleEvClick(ev)}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:4 }}>
                      <span style={calS.evName}>{ev.name}</span>
                      <button style={calS.evTrash} onClick={(e) => { e.stopPropagation(); deleteEvent(key, idx); }}>
                        <Trash size={11} />
                      </button>
                    </div>
                    <div style={calS.evMeta}>
                      <Clock size={10} /> {ev.time} · {ev.dur}
                    </div>
                    {ev.noteId && (
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:5 }}>
                        <span style={{ ...calS.noteChip, background: ev.noteBg, color: ev.noteText }}>{ev.noteSubject}</span>
                        <BookOpen size={11} />
                      </div>
                    )}
                  </div>
                );
              })}
              <button style={calS.addSlot} onClick={() => openModal(key)}>+ Add</button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const WEEK_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const renderMonth = () => (
    <div>
      <div style={calS.monthWeekHeader}>
        {WEEK_LABELS.map(d => <div key={d} style={calS.monthWeekLabel}>{d}</div>)}
      </div>
      <div style={calS.monthGrid}>
        {monthGrid.map((day, i) => {
          const key = dayKey(day);
          const isCurrentMonth = day.getMonth() === viewMonth;
          const isToday = dayKey(day) === dayKey(today);
          const dayEvs = (events[key] || []).filter(ev => activeCats.has(ev.cat));
          return (
            <div key={i}
              style={{ ...calS.monthCell, ...(isToday ? calS.monthCellToday : {}), opacity: isCurrentMonth ? 1 : 0.35, cursor: isCurrentMonth ? 'pointer' : 'default' }}
              onClick={() => isCurrentMonth && openModal(key)}>
              <span style={{ ...calS.monthDayNum, ...(isToday ? calS.monthDayToday : {}) }}>{day.getDate()}</span>
              <div style={{ display:'flex', flexDirection:'column', gap:2, marginTop:3 }}>
                {dayEvs.slice(0,2).map((ev, idx) => {
                  const cat = LIFE_CATS.find(c => c.id === ev.cat);
                  return (
                    <div key={idx} style={{ ...calS.monthPill, background: ev.noteId ? ev.noteColor : cat?.color }}>
                      {ev.name}
                    </div>
                  );
                })}
                {dayEvs.length > 2 && <div style={calS.monthMore}>+{dayEvs.length - 2} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderModal = () => {
    const cat = LIFE_CATS.find(c => c.id === selCat);
    const noteInfo = selNoteId ? Object.values(SUBJECT_NOTE_MAP).find(v => v.noteId === selNoteId) : null;
    const saveBg = noteInfo ? noteInfo.color : cat?.color;
    return (
      <div style={calS.overlay} onClick={closeModal}>
        <div style={calS.modal} onClick={e => e.stopPropagation()}>
          <h3 style={calS.modalTitle}>Add activity · {fmtModalDate(modalKey)}</h3>
          <div style={calS.modalField}>
            <label style={calS.modalLabel}>What are you doing?</label>
            <input value={modalName} onChange={e => setModalName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEvent()}
              placeholder="e.g. Study session, Gym, Coffee…"
              style={calS.modalInput} autoFocus />
          </div>
          <div style={{ display:'flex', gap:12, marginBottom:16 }}>
            <div style={{ flex:1 }}>
              <label style={calS.modalLabel}>Start time</label>
              <input type="time" value={modalTime} onChange={e => setModalTime(e.target.value)} style={calS.modalInput} />
            </div>
            <div style={{ flex:1 }}>
              <label style={calS.modalLabel}>Duration</label>
              <select value={modalDur} onChange={e => setModalDur(e.target.value)} style={calS.modalInput}>
                {['15m','30m','45m','1h','1h30m','2h','3h'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={calS.modalLabel}>Category</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
              {LIFE_CATS.map(c => (
                <button key={c.id}
                  onClick={() => { setSelCat(c.id); if (c.id !== 'study') setSelNoteId(null); }}
                  style={{ ...calS.catChip, background: selCat===c.id ? c.color : c.bg, color: selCat===c.id ? '#fff' : c.text, border: `1.5px solid ${c.color}` }}>
                  <span style={{ ...calS.catDot, background: selCat===c.id ? '#fff' : c.color }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          {selCat === 'study' && (
            <div style={{ marginBottom:16 }}>
              <label style={calS.modalLabel}>Which subject?</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
                {Object.entries(SUBJECT_NOTE_MAP).map(([subject, info]) => (
                  <button key={subject}
                    onClick={() => selectSubject(subject)}
                    style={{ ...calS.catChip, background: selNoteId===info.noteId ? info.color : info.bg, color: selNoteId===info.noteId ? '#fff' : info.text, border: `1.5px solid ${info.color}` }}>
                    {subject}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
            <button onClick={closeModal} style={calS.cancelBtn}>Cancel</button>
            <button onClick={addEvent} style={{ ...calS.saveBtn, background: saveBg }}>Add activity</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={calS.wrap}>
      <div style={calS.header}>
        <div style={calS.navGroup}>
          <button onClick={navPrev} style={calS.navBtn}>‹</button>
          <span style={calS.rangeLabel}>{rangeLabel}</span>
          <button onClick={navNext} style={calS.navBtn}>›</button>
        </div>
        <div style={calS.viewToggleGroup}>
          {['week','month'].map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ ...calS.toggleBtn, ...(view===v ? calS.toggleBtnActive : {}) }}>
              {v.charAt(0).toUpperCase()+v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={calS.catsRow}>
        {LIFE_CATS.map(c => (
          <button key={c.id} onClick={() => toggleCat(c.id)}
            style={{ ...calS.catChip, opacity: activeCats.has(c.id) ? 1 : 0.3, background: c.bg, color: c.text, border: `1.5px solid ${c.color}33` }}>
            <span style={{ ...calS.catDot, background: c.color }} />
            {c.label}
          </button>
        ))}
      </div>

      {view === 'week' ? renderWeek() : renderMonth()}

      <div style={calS.balanceSection}>
        <h4 style={calS.balanceTitle}>Life Balance — this week</h4>
        <div style={calS.balanceGrid}>
          {lifeBalance.map(b => (
            <div key={b.id} style={calS.balanceCard}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{ ...calS.catDot, background: b.color }} />
                <span style={{ fontSize:12, fontWeight:600, color:'var(--ink)' }}>{b.label}</span>
              </div>
              <div style={{ fontSize:22, fontWeight:800, color: b.color, letterSpacing:'-0.02em', marginBottom:6 }}>{b.pct}%</div>
              <div style={{ height:4, background:'#F4F5FF', borderRadius:999, overflow:'hidden', marginBottom:4 }}>
                <div style={{ width:`${b.pct}%`, height:'100%', background: b.color, borderRadius:999 }} />
              </div>
              <div style={{ fontSize:11, color:'var(--gray)' }}>{b.mins}m</div>
            </div>
          ))}
        </div>
      </div>

      {modalKey && renderModal()}
    </div>
  );
}

const calS = {
  wrap: { display:'flex', flexDirection:'column', gap:18 },
  header: { display:'flex', alignItems:'center', justifyContent:'space-between' },
  navGroup: { display:'flex', alignItems:'center', gap:10 },
  navBtn: { width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'#fff', color:'var(--ink)', fontSize:18, display:'grid', placeItems:'center', cursor:'pointer' },
  rangeLabel: { fontSize:16, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.01em', minWidth:180, textAlign:'center' },
  viewToggleGroup: { display:'flex', background:'#F8F9FF', border:'1px solid var(--border)', borderRadius:10, padding:3, gap:2 },
  toggleBtn: { padding:'6px 16px', borderRadius:8, fontSize:13, fontWeight:600, color:'var(--gray)', background:'transparent', border:'none', cursor:'pointer' },
  toggleBtnActive: { background:'#fff', color:'var(--ink)', boxShadow:'0 1px 4px rgba(0,0,0,.08)', border:'0.5px solid var(--border)' },
  catsRow: { display:'flex', gap:8, flexWrap:'wrap' },
  catChip: { display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:999, fontSize:12, fontWeight:600, cursor:'pointer', transition:'opacity .15s' },
  catDot: { width:8, height:8, borderRadius:999, flexShrink:0 },
  weekGrid: { display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:10 },
  weekCol: { display:'flex', flexDirection:'column', gap:6 },
  weekColHeader: { display:'flex', flexDirection:'column', alignItems:'center', gap:2, paddingBottom:8, borderBottom:'1px solid var(--border)' },
  weekDayName: { fontSize:10, fontWeight:700, color:'var(--gray)', letterSpacing:'0.06em' },
  weekDayNum: { fontSize:22, fontWeight:700, color:'var(--ink)', lineHeight:1, width:36, height:36, display:'grid', placeItems:'center', borderRadius:999 },
  weekDayToday: { background:'#3730E8', color:'#fff' },
  weekEvs: { display:'flex', flexDirection:'column', gap:6 },
  evCard: { borderRadius:10, padding:'8px 10px', display:'flex', flexDirection:'column', gap:4, border:'1px solid transparent' },
  evName: { fontSize:12, fontWeight:600, color:'var(--ink)', lineHeight:1.3 },
  evMeta: { display:'flex', alignItems:'center', gap:4, fontSize:10, color:'var(--gray)' },
  evTrash: { color:'var(--gray-2)', padding:2, borderRadius:4, flexShrink:0, opacity:0.6 },
  noteChip: { fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:999 },
  addSlot: { border:'1.5px dashed var(--border)', borderRadius:10, padding:'7px', fontSize:12, color:'var(--gray-2)', fontWeight:600, textAlign:'center', cursor:'pointer', background:'transparent', transition:'border-color .15s' },
  monthWeekHeader: { display:'grid', gridTemplateColumns:'repeat(7, 1fr)', marginBottom:4 },
  monthWeekLabel: { textAlign:'center', fontSize:11, fontWeight:700, color:'var(--gray)', letterSpacing:'0.04em', padding:'4px 0' },
  monthGrid: { display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2 },
  monthCell: { minHeight:72, padding:'6px 8px', borderRadius:8, border:'1px solid transparent', display:'flex', flexDirection:'column' },
  monthCellToday: { border:'1.5px solid #3730E8' },
  monthDayNum: { fontSize:12, fontWeight:600, color:'var(--ink)' },
  monthDayToday: { background:'#3730E8', color:'#fff', width:20, height:20, borderRadius:999, display:'grid', placeItems:'center', fontSize:11 },
  monthPill: { fontSize:10, fontWeight:600, color:'#fff', padding:'2px 6px', borderRadius:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  monthMore: { fontSize:10, color:'var(--gray)', fontWeight:600 },
  balanceSection: { borderTop:'1px solid var(--border)', paddingTop:18 },
  balanceTitle: { margin:'0 0 12px', fontSize:14, fontWeight:700, color:'var(--ink)' },
  balanceGrid: { display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:10 },
  balanceCard: { background:'#fff', border:'1px solid var(--border)', borderRadius:14, padding:14 },
  overlay: { position:'fixed', inset:0, background:'rgba(15,16,53,.4)', display:'grid', placeItems:'center', zIndex:100 },
  modal: { background:'#fff', borderRadius:20, padding:28, width:'100%', maxWidth:480, boxShadow:'0 20px 60px -10px rgba(15,16,53,.2)' },
  modalTitle: { margin:'0 0 20px', fontSize:16, fontWeight:700, color:'var(--ink)' },
  modalField: { marginBottom:16 },
  modalLabel: { display:'block', fontSize:12, fontWeight:700, color:'var(--ink)', marginBottom:8, letterSpacing:'0.01em' },
  modalInput: { width:'100%', padding:'10px 12px', border:'1px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--ink)', background:'#fff', outline:'none', boxSizing:'border-box' },
  cancelBtn: { padding:'10px 20px', borderRadius:999, border:'1px solid var(--border)', background:'#fff', color:'var(--ink)', fontWeight:600, fontSize:14, cursor:'pointer' },
  saveBtn: { padding:'10px 20px', borderRadius:999, border:'none', color:'#fff', fontWeight:600, fontSize:14, cursor:'pointer', boxShadow:'0 6px 20px -6px rgba(55,48,232,.4)' },
};

/* ===================== MOUNT ===================== */
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
