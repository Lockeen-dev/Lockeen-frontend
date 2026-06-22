import React, { useEffect, useState } from 'react';

import { ChevronDown, Coins, EyeOff, FileText, LogOut, MsgCircle, Pencil, Trash2, Trophy } from '../lib/icons';
import { LANG_OPTIONS } from '../lib/i18n';
import { formatLimit, getPlanLimits, getUserPlanTier, isFreePlan } from '../lib/planLimits';
import useIsMobile from '../lib/useIsMobile';
import { useAuth } from '../context/AuthContext';
import { openBillingPortal, startCheckout } from '../services/billing';
import LanguageSelect from './LanguageSelect';

function AccountView({ user, lang, onLangChange, onLogout }) {
  const isMobile = useIsMobile();
  const { refreshSession, requestPasswordReset, updateProfile } = useAuth();
  const email = user?.email || '';
  const initial = user?.name?.[0]?.toUpperCase() || 'A';
  const accountLang = LANG_OPTIONS.find(l => l.value === lang) || LANG_OPTIONS[0];
  const copy = accountCopy[lang] || accountCopy.en;
  const planTier = getUserPlanTier(user);
  const planLimits = getPlanLimits(user);
  const freePlan = isFreePlan(user);
  const usageCopy = freePlan ? copy.freeUsage : copy.proUsage;
  const [name, setName] = useState(user?.name || '');
  const [timezone, setTimezone] = useState(user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Rome');
  const [saving, setSaving] = useState(null);
  const [notice, setNotice] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const deviceLabel = getCurrentDeviceLabel();

  useEffect(() => {
    setName(user?.name || '');
    setTimezone(user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Rome');
  }, [user?.email, user?.name, user?.timezone]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (!checkout) return;

    if (checkout === 'success') {
      showNotice('success', copy.checkoutSuccess);
      window.setTimeout(() => refreshSession(), 1200);
    }
    if (checkout === 'cancelled') showNotice('error', copy.checkoutCancelled);

    params.delete('checkout');
    params.delete('session_id');
    const nextSearch = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`);
  }, [copy.checkoutCancelled, copy.checkoutSuccess, refreshSession]);

  const showNotice = (type, text) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice((current) => current?.text === text ? null : current), 4500);
  };

  const handleProfileSave = async () => {
    setSaving('profile');
    const result = await updateProfile({ name, language: lang, timezone });
    setSaving(null);
    if (result.error) {
      showNotice('error', formatAccountError(result.error, copy));
      return;
    }
    showNotice('success', copy.profileSaved);
  };

  const handleLanguageChange = async (nextLang) => {
    onLangChange(nextLang);
    setSaving('language');
    const result = await updateProfile({ name, language: nextLang, timezone });
    setSaving(null);
    if (result.error) {
      showNotice('error', formatAccountError(result.error, copy));
      return;
    }
    showNotice('success', (accountCopy[nextLang] || accountCopy.en).languageSaved);
  };

  const handlePasswordReset = async () => {
    setSaving('password');
    const result = await requestPasswordReset({ email });
    setSaving(null);
    if (result.error) {
      showNotice('error', formatAccountError(result.error, copy));
      return;
    }
    showNotice('success', copy.passwordResetSent);
  };

  const handleUpgrade = async () => {
    setSaving('checkout');
    const result = await startCheckout({ billingPeriod });
    setSaving(null);
    if (result.error) {
      showNotice('error', formatAccountError(result.error, copy));
      return;
    }
    window.location.href = result.data.url;
  };

  const handleManageBilling = async () => {
    setSaving('portal');
    const result = await openBillingPortal();
    setSaving(null);
    if (result.error) {
      showNotice('error', formatAccountError(result.error, copy));
      return;
    }
    window.location.href = result.data.url;
  };

  const Row = ({ icon, title, sub, action, danger }) => (
    <div style={accountS.row}>
      <div style={accountS.rowIcon}>{icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={accountS.rowTitle}>{title}</div>
        {sub && <div style={accountS.rowSub}>{sub}</div>}
      </div>
      {action && <div style={{ flexShrink:0 }}>{action}</div>}
    </div>
  );

  return (
    <div style={accountS.wrap}>
      <div style={{ ...accountS.hero, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center' }}>
        <div style={accountS.bigAvatar}>{initial}</div>
        <div style={{ flex:1 }}>
          <h2 style={accountS.title}>{copy.account}</h2>
          <p style={accountS.sub}>{copy.accountSub}</p>
        </div>
        <button onClick={onLogout} style={accountS.logoutTop}><LogOut size={15} /> {copy.logout}</button>
      </div>

      {notice && (
        <div style={{ ...accountS.notice, ...(notice.type === 'error' ? accountS.noticeError : accountS.noticeSuccess) }}>
          {notice.text}
        </div>
      )}

      <section style={accountS.section}>
        <h3 style={accountS.sectionTitle}>{copy.plan}</h3>
        <div style={accountS.planCard}>
          <div>
            <div style={accountS.planBadge}>{freePlan ? copy.freeMode : copy.proMode}</div>
            <h4 style={accountS.planTitle}>Lockeen {planTier === 'pro' ? 'Pro' : 'Free'}</h4>
            <p style={accountS.planText}>{freePlan ? copy.freePlanText : copy.proPlanText}</p>
          </div>
          <div style={accountS.planActions}>
            {freePlan && (
              <div style={accountS.billingToggle} aria-label={copy.billingCycle}>
                <button
                  type="button"
                  onClick={() => setBillingPeriod('monthly')}
                  style={{ ...accountS.billingToggleBtn, ...(billingPeriod === 'monthly' ? accountS.billingToggleBtnActive : null) }}
                >
                  {copy.monthly}
                </button>
                <button
                  type="button"
                  onClick={() => setBillingPeriod('yearly')}
                  style={{ ...accountS.billingToggleBtn, ...(billingPeriod === 'yearly' ? accountS.billingToggleBtnActive : null) }}
                >
                  {copy.yearly}
                </button>
              </div>
            )}
            <button
              onClick={freePlan ? handleUpgrade : handleManageBilling}
              disabled={saving === 'checkout' || saving === 'portal'}
              style={{ ...accountS.primaryBtn, ...(saving === 'checkout' || saving === 'portal' ? accountS.primaryBtnDisabled : null) }}
            >
              {saving === 'checkout' ? copy.openingCheckout : saving === 'portal' ? copy.openingPortal : (freePlan ? copy.upgradeToPro : copy.managePlan)}
            </button>
          </div>
        </div>
        <div style={accountS.usageCard}>
          <div style={accountS.usageHeader}>
            <div>
              <div style={accountS.usageEyebrow}>{copy.currentPlan}</div>
              <h4 style={accountS.usageTitle}>{usageCopy.title}</h4>
              <p style={accountS.usageSub}>{usageCopy.sub}</p>
            </div>
            <div style={accountS.usageBadge}>{freePlan ? copy.freeMode : copy.proMode}</div>
          </div>
          <div style={accountS.usageGrid}>
            <PlanLimitItem label={copy.limitDocuments} value={`${formatLimit(planLimits.activeDocuments, copy.unlimited)} ${copy.limitDocumentsUnit}`} />
            <PlanLimitItem label={copy.limitQuiz} value={`${formatLimit(planLimits.quizGenerationsPerMonth, copy.unlimited)} ${copy.limitMonthlyUnit}`} />
            <PlanLimitItem label={copy.limitFlashcards} value={`${formatLimit(planLimits.flashcardGenerationsPerMonth, copy.unlimited)} ${copy.limitMonthlyUnit}`} />
            <PlanLimitItem label={copy.limitTutor} value={`${formatLimit(planLimits.aiTutorMessagesPerMonth, copy.unlimited)} ${copy.limitMonthlyUnit}`} />
          </div>
          <div style={accountS.usageHint}>{usageCopy.hint}</div>
        </div>
        <div style={accountS.card}>
          <Row icon={<Trophy size={18} />} title={copy.planHistory} sub={freePlan ? copy.planHistorySubFree : copy.planHistorySubPro} action={<button onClick={handleManageBilling} disabled={saving === 'portal'} style={saving === 'portal' ? accountS.disabledBtn : accountS.softBtn}>{saving === 'portal' ? copy.openingPortal : copy.manage}</button>} />
        </div>
      </section>

      <section style={accountS.section}>
        <h3 style={accountS.sectionTitle}>{copy.bills}</h3>
        <div style={accountS.card}>
          <Row icon={<FileText size={18} />} title={copy.payments} sub={copy.paymentsSub} action={<ChevronDown size={18} color="var(--gray)" />} />
          <div style={accountS.divider} />
          <Row icon={<Coins size={18} />} title={copy.billingMethod} sub={freePlan ? copy.billingMethodSubFree : copy.billingMethodSubPro} action={<button onClick={handleManageBilling} disabled={saving === 'portal'} style={saving === 'portal' ? accountS.disabledBtn : accountS.ghostBtn}>{saving === 'portal' ? copy.openingPortal : copy.manage}</button>} />
        </div>
      </section>

      <section style={accountS.section}>
        <h3 style={accountS.sectionTitle}>{copy.profile}</h3>
        <div style={accountS.card}>
          <div style={accountS.editBlock}>
            <div style={accountS.rowIcon}><Pencil size={18} /></div>
            <div style={accountS.formGrid}>
              <label style={accountS.label}>
                {copy.name}
                <input value={name} onChange={(event) => setName(event.target.value)} style={accountS.input} />
              </label>
              <label style={accountS.label}>
                {copy.detectedTimezone}
                <div style={accountS.readOnlyPill}>{formatTimezoneLabel(timezone)}</div>
              </label>
            </div>
            <button onClick={handleProfileSave} disabled={saving === 'profile'} style={accountS.primaryBtn}>
              {saving === 'profile' ? copy.saving : copy.save}
            </button>
          </div>
          <div style={accountS.divider} />
          <div style={accountS.editBlock}>
            <div style={accountS.rowIcon}><MsgCircle size={18} /></div>
            <div style={{ flex:1, minWidth:220 }}>
              <div style={accountS.rowTitle}>{copy.email}</div>
              <div style={accountS.rowSub}>{email || copy.emailUnavailable}</div>
            </div>
            <button onClick={() => showNotice('success', copy.emailChangeLater)} style={accountS.ghostBtn}>{copy.changeLater}</button>
          </div>
          <div style={accountS.divider} />
          <Row icon={<EyeOff size={18} />} title={copy.password} sub={copy.passwordSub} action={<button onClick={handlePasswordReset} disabled={saving === 'password' || !email} style={saving === 'password' || !email ? accountS.disabledBtn : accountS.ghostBtn}>{saving === 'password' ? copy.sending : copy.sendReset}</button>} />
        </div>
      </section>

      <section style={accountS.section}>
        <h3 style={accountS.sectionTitle}>{copy.activeDevices}</h3>
        <div style={accountS.card}>
          <div style={{ marginBottom:12 }}>
            <div style={accountS.rowTitle}>{copy.activeDevicesTitle}</div>
            <div style={accountS.rowSub}>{copy.activeDevicesSub}</div>
          </div>
          <Row
            icon={<span style={{ width:10, height:10, borderRadius:999, background:'#10B981', display:'block' }} />}
            title={deviceLabel}
            sub={copy.currentDeviceSub}
            action={<button style={accountS.currentBtn}>{copy.current}</button>}
          />
        </div>
      </section>

      <section style={accountS.section}>
        <h3 style={accountS.sectionTitle}>{copy.language}</h3>
        <div style={{ ...accountS.card, overflow:'visible' }}>
          <Row
            icon={<span style={{ fontSize:20 }}>{accountLang.flag}</span>}
            title={`${accountLang.flag} ${accountLang.label}`}
            sub={copy.languageSub}
            action={<LanguageSelect lang={lang} onChange={handleLanguageChange} compact />}
          />
        </div>
      </section>

      <section style={accountS.section}>
        <h3 style={accountS.sectionTitle}>{copy.dangerZone}</h3>
        <div style={accountS.card}>
          <Row
            icon={<Trash2 size={18} />}
            title={copy.deleteAccount}
            sub={copy.deleteAccountSub}
            action={<button onClick={() => showNotice('error', copy.deleteAccountSoon)} style={accountS.dangerBtn}>{copy.requestDeletion}</button>}
          />
        </div>
      </section>
    </div>
  );
}

function PlanLimitItem({ label, value }) {
  return (
    <div style={accountS.limitItem}>
      <span style={accountS.limitLabel}>{label}</span>
      <strong style={accountS.limitValue}>{value}</strong>
    </div>
  );
}

function getCurrentDeviceLabel() {
  if (typeof navigator === 'undefined') return 'Current browser';
  const platform = navigator.platform || 'Browser';
  const userAgent = navigator.userAgent || '';
  const browser = userAgent.includes('Chrome') ? 'Chrome' : userAgent.includes('Safari') ? 'Safari' : userAgent.includes('Firefox') ? 'Firefox' : 'Browser';
  return `${platform}, ${browser}`;
}

function formatTimezoneLabel(timezone) {
  const now = new Date();
  const label = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local timezone';
  try {
    const offset = new Intl.DateTimeFormat('en', {
      timeZone: label,
      timeZoneName: 'shortOffset',
    }).formatToParts(now).find((part) => part.type === 'timeZoneName')?.value;
    return offset ? `${label} (${offset})` : label;
  } catch {
    return label;
  }
}

function formatAccountError(error, copy) {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  if (code.includes('rate') || message.includes('rate limit')) {
    return copy.emailRateLimit;
  }
  if (code.includes('stripe_customer_missing') || message.includes('no stripe customer')) {
    return copy.billingCustomerMissing;
  }
  if (code.includes('stripe_portal_failed') || message.includes('billing portal')) {
    return copy.billingPortalError;
  }
  return error?.message || copy.saveError;
}

const accountCopy = {
  en: {
    account: 'Account',
    accountSub: 'Manage plan, profile, devices, and preferences.',
    logout: 'Log out',
    plan: 'Plan',
    freeMode: 'Free mode',
    proMode: 'Pro mode',
    freePlanText: 'Try one document with one quiz and one flashcard generation.',
    proPlanText: 'Unlimited documents, higher AI limits, and priority study tools.',
    upgradeToPro: 'Upgrade to Pro',
    managePlan: 'Manage plan',
    currentPlan: 'Current plan',
    freeUsage: {
      title: 'Free trial limits',
      sub: 'Free is a short trial of the core study flow.',
      hint: 'If the first generated quiz and flashcards are useful, Pro unlocks more materials and higher AI limits.',
    },
    proUsage: {
      title: 'Pro plan limits',
      sub: 'Your Pro subscription unlocks the full study workspace.',
      hint: 'Your Pro plan removes these trial limits.',
    },
    unlimited: 'Unlimited',
    limitDocuments: 'Documents',
    limitQuiz: 'Quiz generations',
    limitFlashcards: 'Flashcard generations',
    limitTutor: 'AI Tutor messages',
    limitDocumentsUnit: 'active',
    limitMonthlyUnit: '/ month',
    planHistory: 'Plan history',
    planHistorySubFree: 'Billing history appears after your first Pro subscription.',
    planHistorySubPro: 'Manage your subscription and billing history in Stripe.',
    reactivate: 'Reactivate',
    bills: 'Bills',
    payments: 'Payments',
    paymentsSub: 'See payments and receipts',
    billingMethod: 'Billing method',
    billingMethodSubFree: 'No active payment method on Free plan',
    billingMethodSubPro: 'Managed securely in Stripe.',
    manage: 'Manage',
    profile: 'Profile',
    name: 'Name',
    timezone: 'Timezone',
    detectedTimezone: 'Detected timezone',
    email: 'Email',
    emailUnavailable: 'No email available',
    password: 'Password',
    passwordSub: 'Send a secure reset link to change your password.',
    edit: 'Edit',
    save: 'Save',
    saving: 'Saving...',
    sending: 'Sending...',
    profileSaved: 'Profile updated.',
    languageSaved: 'Language updated.',
    passwordResetSent: 'Password reset email sent.',
    saveError: 'Could not save this setting. Please try again.',
    emailRateLimit: 'A reset email was already sent. Please wait a few minutes before requesting another one.',
    billingCustomerMissing: 'Stripe is not connected to this account yet. Upgrade to Pro first.',
    billingPortalError: 'Stripe billing portal is not ready yet. Check the portal settings in Stripe.',
    sendReset: 'Send reset',
    changeLater: 'Change later',
    emailChangeLater: 'Email changes will be enabled after the confirmation flow is fully verified.',
    activeDevices: 'Active devices',
    activeDevicesTitle: 'Current session',
    activeDevicesSub: 'Device management will be connected after account security settings are expanded.',
    currentDeviceSub: 'Current browser session',
    current: 'Current',
    language: 'Language',
    languageSub: 'This setting changes the Lockeen interface language.',
    billingCycle: 'Billing cycle',
    monthly: 'Monthly',
    yearly: 'Yearly',
    openingCheckout: 'Opening checkout...',
    openingPortal: 'Opening...',
    checkoutSuccess: 'Payment completed. Pro status may take a moment to appear.',
    checkoutCancelled: 'Checkout cancelled. No payment was completed.',
    portalSoon: 'The billing portal will be enabled after the Stripe webhook is connected.',
    dangerZone: 'Danger zone',
    deleteAccount: 'Delete account',
    deleteAccountSub: 'Account deletion will be enabled after the data deletion workflow is connected.',
    deleteAccountSoon: 'Delete account is not enabled yet. No data was changed.',
    requestDeletion: 'Request deletion',
  },
  it: {
    account: 'Account',
    accountSub: 'Gestisci piano, profilo, dispositivi e preferenze.',
    logout: 'Esci',
    plan: 'Piano',
    freeMode: 'Modalità free',
    proMode: 'Modalità Pro',
    freePlanText: 'Prova un documento con una generazione quiz e una flashcard.',
    proPlanText: 'Documenti illimitati, limiti AI più alti e strumenti studio prioritari.',
    upgradeToPro: 'Passa a Pro',
    managePlan: 'Gestisci piano',
    currentPlan: 'Piano attuale',
    freeUsage: {
      title: 'Limiti prova Free',
      sub: 'Free è una prova breve del flusso studio principale.',
      hint: 'Se il primo quiz e le prime flashcard generate ti sono utili, Pro sblocca più materiali e limiti AI più alti.',
    },
    proUsage: {
      title: 'Limiti piano Pro',
      sub: 'Il tuo abbonamento Pro sblocca tutto il workspace di studio.',
      hint: 'Il piano Pro rimuove questi limiti di prova.',
    },
    unlimited: 'Illimitato',
    limitDocuments: 'Documenti',
    limitQuiz: 'Generazioni quiz',
    limitFlashcards: 'Generazioni flashcard',
    limitTutor: 'Messaggi AI Tutor',
    limitDocumentsUnit: 'attivo',
    limitMonthlyUnit: '/ mese',
    planHistory: 'Storico piano',
    planHistorySubFree: 'Lo storico billing appare dopo il primo abbonamento Pro.',
    planHistorySubPro: 'Gestisci abbonamento e storico billing in Stripe.',
    reactivate: 'Riattiva',
    bills: 'Fatture',
    payments: 'Pagamenti',
    paymentsSub: 'Vedi pagamenti e ricevute',
    billingMethod: 'Metodo di pagamento',
    billingMethodSubFree: 'Nessun metodo di pagamento attivo sul piano Free',
    billingMethodSubPro: 'Gestito in modo sicuro da Stripe.',
    manage: 'Gestisci',
    profile: 'Profilo',
    name: 'Nome',
    timezone: 'Fuso orario',
    detectedTimezone: 'Fuso rilevato',
    email: 'Email',
    emailUnavailable: 'Email non disponibile',
    password: 'Password',
    passwordSub: 'Invia un link sicuro per cambiare la password.',
    edit: 'Modifica',
    save: 'Salva',
    saving: 'Salvataggio...',
    sending: 'Invio...',
    profileSaved: 'Profilo aggiornato.',
    languageSaved: 'Lingua aggiornata.',
    passwordResetSent: 'Email per reimpostare la password inviata.',
    saveError: 'Impossibile salvare questa impostazione. Riprova.',
    emailRateLimit: 'Hai già richiesto una mail di reset. Aspetta qualche minuto prima di richiederne un’altra.',
    billingCustomerMissing: 'Stripe non è ancora collegato a questo account. Passa prima a Pro.',
    billingPortalError: 'Il portale billing Stripe non è ancora pronto. Controlla le impostazioni del portale su Stripe.',
    sendReset: 'Invia reset',
    changeLater: 'Più avanti',
    emailChangeLater: 'Il cambio email verrà attivato quando il flusso di conferma sarà verificato completamente.',
    activeDevices: 'Dispositivi attivi',
    activeDevicesTitle: 'Sessione corrente',
    activeDevicesSub: 'La gestione dispositivi verrà collegata quando espandiamo la sicurezza account.',
    currentDeviceSub: 'Sessione browser corrente',
    current: 'Corrente',
    language: 'Lingua',
    languageSub: 'Questa impostazione cambia la lingua dell’interfaccia Lockeen.',
    billingCycle: 'Periodo fatturazione',
    monthly: 'Mensile',
    yearly: 'Annuale',
    openingCheckout: 'Apertura checkout...',
    openingPortal: 'Apertura...',
    checkoutSuccess: 'Pagamento completato. Lo stato Pro può richiedere qualche momento per comparire.',
    checkoutCancelled: 'Checkout annullato. Nessun pagamento completato.',
    portalSoon: 'Il portale billing verrà attivato dopo il collegamento del webhook Stripe.',
    dangerZone: 'Zona pericolosa',
    deleteAccount: 'Elimina account',
    deleteAccountSub: 'La cancellazione account verrà attivata quando il workflow di eliminazione dati sarà collegato.',
    deleteAccountSoon: 'Elimina account non è ancora attivo. Nessun dato è stato modificato.',
    requestDeletion: 'Richiedi eliminazione',
  },
};

const accountS = {
  wrap: { display:'flex', flexDirection:'column', gap:22, maxWidth:980, margin:'0 auto' },
  hero: { display:'flex', gap:16, padding:20, borderRadius:20, background:'linear-gradient(135deg,#EEF2FF,#F5F3FF)', border:'1px solid var(--border)' },
  bigAvatar: { width:58, height:58, borderRadius:18, background:'linear-gradient(135deg,var(--indigo),var(--purple))', color:'#fff', display:'grid', placeItems:'center', fontSize:22, fontWeight:800, boxShadow:'0 14px 28px -18px rgba(55,48,232,.7)' },
  title: { margin:0, fontSize:26, fontWeight:800, color:'var(--ink)', letterSpacing:'-.03em' },
  sub: { margin:'4px 0 0', fontSize:14, color:'var(--gray)', lineHeight:1.5 },
  logoutTop: { display:'inline-flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:12, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontWeight:700, fontSize:13, cursor:'pointer' },
  notice: { padding:'12px 14px', borderRadius:14, fontSize:13, fontWeight:800, border:'1px solid transparent' },
  noticeSuccess: { background:'#ECFDF5', color:'#047857', borderColor:'#A7F3D0' },
  noticeError: { background:'#FEF2F2', color:'#B91C1C', borderColor:'#FECACA' },
  section: { display:'flex', flexDirection:'column', gap:10 },
  sectionTitle: { margin:0, fontSize:18, fontWeight:800, color:'var(--ink)', letterSpacing:'-.02em' },
  card: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', boxShadow:'0 12px 30px -26px rgba(15,16,53,.35)' },
  planCard: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, padding:18, borderRadius:16, background:'var(--surface)', border:'1px solid var(--border)', boxShadow:'0 12px 30px -26px rgba(15,16,53,.35)', flexWrap:'wrap' },
  usageCard: { display:'flex', flexDirection:'column', gap:14, padding:16, borderRadius:16, border:'1px solid var(--border)', background:'linear-gradient(135deg,#FFFFFF,#F8FAFF)', boxShadow:'0 12px 30px -26px rgba(15,16,53,.35)' },
  usageHeader: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' },
  usageEyebrow: { fontSize:11, fontWeight:900, color:'var(--indigo)', textTransform:'uppercase', letterSpacing:'.04em' },
  usageTitle: { margin:'3px 0 0', fontSize:16, fontWeight:900, color:'var(--ink)' },
  usageSub: { margin:'3px 0 0', color:'var(--gray)', fontSize:12, lineHeight:1.45 },
  usageBadge: { display:'inline-flex', padding:'6px 10px', borderRadius:999, background:'#EEF2FF', color:'var(--indigo)', fontSize:11, fontWeight:900 },
  usageGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))', gap:8 },
  usageHint: { padding:'10px 12px', borderRadius:12, background:'#FEF3C7', color:'#92400E', fontSize:12, fontWeight:800, lineHeight:1.4 },
  limitItem: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'11px 12px', borderRadius:12, border:'1px solid #E7E9F4', background:'rgba(255,255,255,.82)' },
  limitValue: { fontSize:14, fontWeight:900, color:'var(--ink)', lineHeight:1, whiteSpace:'nowrap' },
  limitLabel: { fontSize:12, fontWeight:800, color:'var(--gray)', lineHeight:1.35 },
  planBadge: { display:'inline-flex', padding:'5px 10px', borderRadius:999, background:'#ECFDF5', color:'#047857', fontSize:11, fontWeight:800, marginBottom:8 },
  planTitle: { margin:0, fontSize:18, fontWeight:800, color:'var(--ink)' },
  planText: { margin:'4px 0 0', color:'var(--gray)', fontSize:13 },
  row: { display:'flex', alignItems:'center', gap:12, padding:'15px 18px' },
  rowIcon: { width:34, height:34, borderRadius:12, background:'var(--sidebar-bg)', color:'var(--indigo)', display:'grid', placeItems:'center', flexShrink:0 },
  rowTitle: { fontSize:14, fontWeight:800, color:'var(--ink)' },
  rowSub: { fontSize:12, color:'var(--gray)', marginTop:2, lineHeight:1.45 },
  editBlock: { display:'flex', alignItems:'flex-end', gap:12, padding:'15px 18px', flexWrap:'wrap' },
  formGrid: { flex:1, minWidth:240, display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))', gap:12 },
  label: { display:'flex', flexDirection:'column', gap:7, fontSize:12, fontWeight:800, color:'var(--gray)' },
  input: { width:'100%', minHeight:42, border:'1px solid var(--border)', borderRadius:12, padding:'0 12px', background:'var(--surface)', color:'var(--ink)', fontSize:14, fontWeight:800, outline:'none' },
  readOnlyPill: { minHeight:42, border:'1px solid var(--border)', borderRadius:12, padding:'0 12px', background:'var(--sidebar-bg)', color:'var(--ink)', fontSize:14, fontWeight:800, display:'flex', alignItems:'center' },
  divider: { height:1, background:'var(--border)' },
  primaryBtn: { padding:'11px 16px', borderRadius:12, border:'none', background:'var(--indigo)', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer' },
  primaryBtnDisabled: { opacity:.68, cursor:'not-allowed' },
  planActions: { display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', justifyContent:'flex-end' },
  billingToggle: { display:'inline-flex', alignItems:'center', gap:3, padding:4, borderRadius:12, border:'1px solid var(--border)', background:'var(--sidebar-bg)' },
  billingToggleBtn: { border:'none', borderRadius:9, background:'transparent', color:'var(--gray)', padding:'7px 10px', fontSize:12, fontWeight:900, cursor:'pointer' },
  billingToggleBtnActive: { background:'var(--surface)', color:'var(--indigo)', boxShadow:'0 5px 14px -12px rgba(15,16,53,.55)' },
  softBtn: { padding:'9px 13px', borderRadius:10, border:'none', background:'#FEF3C7', color:'#92400E', fontWeight:800, fontSize:12, cursor:'pointer' },
  ghostBtn: { padding:'9px 13px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontWeight:700, fontSize:12, cursor:'pointer' },
  disabledBtn: { padding:'9px 13px', borderRadius:10, border:'none', background:'#E5E7EB', color:'#9CA3AF', fontWeight:800, fontSize:12, cursor:'not-allowed' },
  dangerBtn: { padding:'9px 13px', borderRadius:10, border:'none', background:'#EF4444', color:'#fff', fontWeight:800, fontSize:12, cursor:'pointer' },
  currentBtn: { padding:'9px 13px', borderRadius:10, border:'none', background:'#DCFCE7', color:'#166534', fontWeight:800, fontSize:12 },
};

/* ============ EARN / AMBASSADOR VIEW ============ */
function EarnView() {
  const isMobile = useIsMobile();
  const [feed, setFeed] = React.useState([
    { name: 'Martia R.', time: 'ora',      amt: '+€2' },
    { name: 'Luca B.',   time: '2 min fa', amt: '+€2' },
    { name: 'Sara F.',   time: '5 min fa', amt: '+€2' },
  ]);
  const [showForm, setShowForm] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  const card = {
    background: 'var(--surface)',
    borderRadius: 20,
    border: '1px solid var(--border)',
    padding: '24px',
    boxShadow: '0 4px 24px rgba(55,48,232,.08)',
  };

  const steps = [
    { n: '01', title: 'Richiedi accesso', desc: 'Inserisci la tua email, ti inviamo un link personale tracciato. Ci vogliono 2 minuti.' },
    { n: '02', title: 'Condividi all\'università', desc: 'Gruppo WhatsApp del corso, chat universitaria, passaparola in biblioteca. Funziona tutto.' },
    { n: '03', title: 'Guadagna €2 per studente', desc: 'Per ogni studente che si iscrive con il tuo link ottieni €2 al mese. Ogni mese. Payout da €20.' },
  ];

  const strategies = [
    { emoji: '💬', range: '€80–200/mese', title: 'Un messaggio nel gruppo WhatsApp', desc: '"Sto usando Lockeen per prepararmi all\'esame — se vi iscrivete con il mio link ci andiamo entrambi avanti." Un messaggio in un gruppo da 200. Fine.', stat: '1 messaggio → 97 iscritti' },
    { emoji: '🎤', range: '€200–500/mese', title: 'L\'annuncio del rappresentante', desc: 'Hai 5 minuti prima della lezione. Dici che Lockeen ti ha salvato la sessione e condividi il link nella chat del corso. Chi ti conosce si fida. Conversione altissima.', stat: '3 corsi coperti → 248 iscritti' },
    { emoji: '📖', range: '€20–80/mese',  title: 'Passaparola in sala studio', desc: 'Stai studiando, un compagno ti chiede come fai a ricordare tutto. Gli mostri Lockeen sul telefono e gli mandi il link. Niente di più naturale.', stat: 'Solo passaparola → 42 iscritti' },
    { emoji: '📱', range: '€40–150/mese', title: 'Instagram stories', desc: 'Uno screenshot della tua streak, "questo mi sta salvando la sessione" in storia. Non ti servono 10k follower — bastano i tuoi compagni di corso.', stat: '2 storie → 73 iscritti' },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 32, alignItems: 'center', marginBottom: 56 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: '#ECFDF5', border: '1px solid #86EFAC', borderRadius: 999, marginBottom: 20 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#065F46' }}>Lockeen Ambassador Program</span>
          </div>
          <h1 style={{ fontSize: isMobile ? 26 : 34, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.15, marginBottom: 16 }}>
            Condividi Lockeen.<br />Guadagna <span style={{ color: 'var(--indigo)' }}>€2 per ogni studente.</span>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--gray)', lineHeight: 1.7, marginBottom: 28, maxWidth: 420 }}>
            Gli Ambassador sono studenti che portano Lockeen alla propria università e guadagnano €2 per ogni compagno che si iscrive. Per sempre. Una community che cresce insieme.
          </p>
          {!showForm && !submitted && (
            <button onClick={() => setShowForm(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: 'var(--indigo)', color: '#fff', borderRadius: 14, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}>
              Diventa Ambassador →
            </button>
          )}
          {showForm && !submitted && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="la.tua@email.com"
                style={{ flex: 1, minWidth: 200, padding: '13px 16px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--input-bg)', color: 'var(--ink)', fontSize: 14, outline: 'none' }}
              />
              <button type="submit" style={{ padding: '13px 24px', background: 'var(--indigo)', color: '#fff', borderRadius: 12, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
                Richiedi accesso
              </button>
            </form>
          )}
          {submitted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', background: '#ECFDF5', border: '1px solid #86EFAC', borderRadius: 14 }}>
              <span style={{ fontSize: 20 }}>🎉</span>
              <div>
                <div style={{ fontWeight: 700, color: '#065F46', fontSize: 14 }}>Richiesta inviata!</div>
                <div style={{ color: '#065F46', fontSize: 13, opacity: .8 }}>Ti mandiamo il link entro 24h.</div>
              </div>
            </div>
          )}
        </div>

        {/* Earnings card mockup */}
        <div style={{ ...card, position: 'relative' }}>
          <div style={{ position: 'absolute', top: -14, right: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'var(--ink)', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
            💸 €2 per studente, ogni mese
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 4 }}>I tuoi guadagni</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--ink)' }}>€1.150</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981', background: '#ECFDF5', padding: '2px 8px', borderRadius: 999 }}>+ €12 ora</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 20 }}>questo mese · 575 studenti attivi</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            {feed.map((f, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{f.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--gray)', marginLeft: 8 }}>{f.time}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>{f.amt}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--gray)' }}>altri 572 questo mese</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>+€1.144</span>
            </div>
          </div>
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--lavender)', borderRadius: 10, fontSize: 12, color: 'var(--indigo)', fontWeight: 500, textAlign: 'center' }}>
            🔄 Ricorrente finché restano iscritti
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ marginBottom: 52 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 8 }}>Come funziona</div>
          <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: 'var(--ink)' }}>Tre passi. Zero complicazioni.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 16 }}>
          {steps.map(s => (
            <div key={s.n} style={{ ...card, padding: '28px 24px' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--border)', marginBottom: 16, lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.65 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Real strategies */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 8 }}>Strategie reali</div>
          <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>Come gli Ambassador guadagnano migliaia di €</h2>
          <p style={{ fontSize: 14, color: 'var(--gray)' }}>Niente ads, follower o skill di marketing. Queste sono le strategie che funzionano davvero.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
          {strategies.map((s, i) => (
            <div key={i} style={{ ...card, padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 22 }}>{s.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', background: 'var(--lavender)', color: 'var(--indigo)', borderRadius: 999 }}>{s.range}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.65, marginBottom: 16 }}>{s.desc}</div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, fontSize: 12, color: 'var(--gray)', fontWeight: 500 }}>{s.stat}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA banner */}
      <div style={{ borderRadius: 24, background: 'linear-gradient(135deg, #070B2D 0%, #1a1060 60%, #2F2BFF 100%)', padding: isMobile ? '40px 24px' : '56px 64px', textAlign: 'center', position: 'relative', overflow: 'hidden', marginTop: 8 }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,120,255,.3), transparent)', transform: 'translate(30%,-30%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(47,43,255,.25), transparent)', transform: 'translate(-30%,30%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <h2 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 800, color: '#fff', marginBottom: 12, lineHeight: 1.25 }}>
            La tua università ha bisogno<br />di un Lockeen Ambassador.
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.65)', marginBottom: 32, maxWidth: 460, margin: '0 auto 32px' }}>
            Entra nella community, ottieni il tuo link e inizia a guadagnare portando Lockeen ai tuoi compagni.
          </p>
          <button
            onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '15px 32px', background: '#fff', color: '#2F2BFF', borderRadius: 14, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(47,43,255,.3)' }}
          >
            Diventa Ambassador →
          </button>
        </div>
      </div>
    </div>
  );
}

export { AccountView, EarnView };
