import React, { useEffect, useState } from 'react';

import { ChevronDown, Coins, EyeOff, FileText, Google, LogOut, MsgCircle, Pencil, Trophy } from '../lib/icons';
import { LANG_OPTIONS } from '../lib/i18n';
import { formatLimit, getPlanLimits, getUserPlanTier, isFreePlan } from '../lib/planLimits';
import useIsMobile from '../lib/useIsMobile';
import { useAuth } from '../context/AuthContext';
import { getAiTutorUsage } from '../services/ai';
import {
  getAmbassadorAdmin,
  getAmbassadorDashboard,
  runAmbassadorAdminAction,
  submitLoggedAmbassadorApplication,
} from '../services/ambassadors';
import { openBillingPortal, reconcileCheckoutSession, startCheckout } from '../services/billing';
import LanguageSelect from './LanguageSelect';

const BILLING_PRICE_COPY = {
  monthly: {
    price: '€9.99',
    period: '/mo',
    noteEn: 'Billed monthly.',
    noteIt: 'Fatturato mensilmente.',
  },
  yearly: {
    price: '€6.67',
    period: '/mo',
    noteEn: '€79.99/year, billed yearly.',
    noteIt: '€79.99/anno, fatturato annualmente.',
  },
};

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
  const authProviders = Array.isArray(user?.authProviders) ? user.authProviders : [];
  const authProvider = String(user?.authProvider || authProviders[0] || 'email').toLowerCase();
  const isGoogleOnly = authProvider === 'google' && !authProviders.includes('email');
  const authMethodLabel = isGoogleOnly ? copy.googleSignIn : copy.emailPasswordSignIn;
  const [name, setName] = useState(user?.name || '');
  const [timezone, setTimezone] = useState(user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Rome');
  const [saving, setSaving] = useState(null);
  const [notice, setNotice] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [aiTutorUsage, setAiTutorUsage] = useState(null);
  const selectedPrice = BILLING_PRICE_COPY[billingPeriod] || BILLING_PRICE_COPY.monthly;
  const deviceLabel = getCurrentDeviceLabel();
  const aiTutorLimitValue = getAiTutorLimitValue({ usage: aiTutorUsage, planLimits, copy, freePlan });

  useEffect(() => {
    setName(user?.name || '');
    setTimezone(user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Rome');
  }, [user?.email, user?.name, user?.timezone]);

  useEffect(() => {
    let cancelled = false;
    async function loadAiTutorUsage() {
      if (!freePlan) {
        setAiTutorUsage(null);
        return;
      }
      const result = await getAiTutorUsage();
      if (!cancelled && result.data) setAiTutorUsage(result.data);
    }
    loadAiTutorUsage();
    return () => { cancelled = true; };
  }, [freePlan, user?.id, user?.planTier]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (!checkout) return;

    if (checkout === 'success') {
      showNotice('success', copy.checkoutSuccess);
      const sessionId = params.get('session_id');
      reconcileCheckoutSession(sessionId)
        .finally(() => window.setTimeout(() => refreshSession(), 900));
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
    if (isGoogleOnly) {
      showNotice('success', copy.googlePasswordManaged);
      return;
    }
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
              <div style={accountS.billingChoice}>
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
                <div style={accountS.priceSummary}>
                  <span style={accountS.priceValue}>{selectedPrice.price}</span>
                  <span style={accountS.pricePeriod}>{selectedPrice.period}</span>
                  <span style={accountS.priceNote}>{lang === 'it' ? selectedPrice.noteIt : selectedPrice.noteEn}</span>
                </div>
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
            <PlanLimitItem label={copy.limitDocuments} value={`${formatLimit(planLimits.activeDocuments, copy.unlimited)} ${freePlan ? copy.limitDocumentsUnitFree : copy.limitDocumentsUnit}`} />
            <PlanLimitItem label={copy.limitQuiz} value={`${formatLimit(planLimits.quizGenerationsPerMonth, copy.unlimited)} ${copy.limitMonthlyUnit}`} />
            <PlanLimitItem label={copy.limitFlashcards} value={`${formatLimit(planLimits.flashcardGenerationsPerMonth, copy.unlimited)} ${copy.limitMonthlyUnit}`} />
            <PlanLimitItem label={copy.limitTutor} value={aiTutorLimitValue} />
          </div>
          <div style={accountS.usageHint}>{usageCopy.hint}</div>
        </div>
        <div style={accountS.card}>
          <Row icon={<Trophy size={18} />} title={copy.planHistory} sub={freePlan ? copy.planHistorySubFree : copy.planHistorySubPro} action={<button onClick={freePlan ? handleUpgrade : handleManageBilling} disabled={saving === 'checkout' || saving === 'portal'} style={saving === 'checkout' || saving === 'portal' ? accountS.disabledBtn : accountS.softBtn}>{saving === 'checkout' ? copy.openingCheckout : saving === 'portal' ? copy.openingPortal : (freePlan ? copy.upgradeToPro : copy.manage)}</button>} />
        </div>
      </section>

      <section style={accountS.section}>
        <h3 style={accountS.sectionTitle}>{copy.bills}</h3>
        <div style={accountS.card}>
          <Row icon={<FileText size={18} />} title={copy.payments} sub={copy.paymentsSub} action={<ChevronDown size={18} color="var(--gray)" />} />
          <div style={accountS.divider} />
          <Row icon={<Coins size={18} />} title={copy.billingMethod} sub={freePlan ? copy.billingMethodSubFree : copy.billingMethodSubPro} action={<button onClick={freePlan ? handleUpgrade : handleManageBilling} disabled={saving === 'checkout' || saving === 'portal'} style={saving === 'checkout' || saving === 'portal' ? accountS.disabledBtn : accountS.ghostBtn}>{saving === 'checkout' ? copy.openingCheckout : saving === 'portal' ? copy.openingPortal : (freePlan ? copy.upgradeToPro : copy.manage)}</button>} />
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
            <div style={accountS.profileActions}>
              <button type="button" onClick={() => setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || timezone)} style={accountS.ghostBtn}>{copy.useBrowserTimezone}</button>
              <button onClick={handleProfileSave} disabled={saving === 'profile'} style={accountS.primaryBtn}>
                {saving === 'profile' ? copy.saving : copy.save}
              </button>
            </div>
          </div>
          <div style={accountS.divider} />
          <div style={accountS.editBlock}>
            <div style={accountS.rowIcon}>{isGoogleOnly ? <Google size={18} /> : <MsgCircle size={18} />}</div>
            <div style={{ flex:1, minWidth:220 }}>
              <div style={accountS.rowTitle}>{copy.email}</div>
              <div style={accountS.rowSub}>{email || copy.emailUnavailable} · {authMethodLabel}</div>
            </div>
            <button onClick={() => showNotice('success', isGoogleOnly ? copy.googleEmailManaged : copy.emailChangeLater)} style={accountS.ghostBtn}>{copy.changeLater}</button>
          </div>
          <div style={accountS.divider} />
          <Row
            icon={<EyeOff size={18} />}
            title={copy.password}
            sub={isGoogleOnly ? copy.passwordSubGoogle : copy.passwordSub}
            action={<button onClick={handlePasswordReset} disabled={saving === 'password' || !email || isGoogleOnly} style={saving === 'password' || !email || isGoogleOnly ? accountS.disabledBtn : accountS.ghostBtn}>{saving === 'password' ? copy.sending : isGoogleOnly ? copy.managedByGoogle : copy.sendReset}</button>}
          />
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

function getAiTutorLimitValue({ usage, planLimits, copy, freePlan }) {
  if (!freePlan) return `${formatLimit(planLimits.aiTutorMessagesPerMonth, copy.unlimited)} ${copy.limitMonthlyUnit}`;
  const quota = Number(usage?.quota);
  const remaining = Number(usage?.remaining);
  if (Number.isFinite(quota) && Number.isFinite(remaining)) {
    return copy.limitTutorRemaining
      .replace('{remaining}', String(Math.max(remaining, 0)))
      .replace('{count}', String(quota));
  }
  return `${formatLimit(planLimits.aiTutorMessagesPerMonth, copy.unlimited)} ${copy.limitMonthlyUnit}`;
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
    freeMode: 'Free trial',
    proMode: 'Pro active',
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
    limitTutorRemaining: '{remaining} / {count} left',
    limitDocumentsUnit: 'active',
    limitDocumentsUnitFree: 'trial',
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
    useBrowserTimezone: 'Use browser timezone',
    email: 'Email',
    emailUnavailable: 'No email available',
    googleSignIn: 'Google sign-in',
    emailPasswordSignIn: 'Email sign-in',
    password: 'Password',
    passwordSub: 'Send a secure reset link to change your password.',
    passwordSubGoogle: 'Password is managed by your Google account.',
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
    googleEmailManaged: 'This email is managed by Google. Change it from your Google account.',
    googlePasswordManaged: 'This password is managed by Google.',
    managedByGoogle: 'Google',
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
  },
  it: {
    account: 'Account',
    accountSub: 'Gestisci piano, profilo, dispositivi e preferenze.',
    logout: 'Esci',
    plan: 'Piano',
    freeMode: 'Prova Free',
    proMode: 'Pro attivo',
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
    limitTutorRemaining: '{remaining} / {count} rimasti',
    limitDocumentsUnit: 'attivo',
    limitDocumentsUnitFree: 'di prova',
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
    useBrowserTimezone: 'Usa fuso browser',
    email: 'Email',
    emailUnavailable: 'Email non disponibile',
    googleSignIn: 'Accesso Google',
    emailPasswordSignIn: 'Accesso email',
    password: 'Password',
    passwordSub: 'Invia un link sicuro per cambiare la password.',
    passwordSubGoogle: 'La password è gestita dal tuo account Google.',
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
    googleEmailManaged: 'Questa email è gestita da Google. Modificala dal tuo account Google.',
    googlePasswordManaged: 'Questa password è gestita da Google.',
    managedByGoogle: 'Google',
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
  profileActions: { display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', justifyContent:'flex-end' },
  label: { display:'flex', flexDirection:'column', gap:7, fontSize:12, fontWeight:800, color:'var(--gray)' },
  input: { width:'100%', minHeight:42, border:'1px solid var(--border)', borderRadius:12, padding:'0 12px', background:'var(--surface)', color:'var(--ink)', fontSize:14, fontWeight:800, outline:'none' },
  readOnlyPill: { minHeight:42, border:'1px solid var(--border)', borderRadius:12, padding:'0 12px', background:'var(--sidebar-bg)', color:'var(--ink)', fontSize:14, fontWeight:800, display:'flex', alignItems:'center' },
  divider: { height:1, background:'var(--border)' },
  primaryBtn: { padding:'11px 16px', borderRadius:12, border:'none', background:'var(--indigo)', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer' },
  primaryBtnDisabled: { opacity:.68, cursor:'not-allowed' },
  planActions: { display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', justifyContent:'flex-end' },
  billingChoice: { display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', justifyContent:'flex-end' },
  billingToggle: { display:'inline-flex', alignItems:'center', gap:3, padding:4, borderRadius:12, border:'1px solid var(--border)', background:'var(--sidebar-bg)' },
  billingToggleBtn: { border:'none', borderRadius:9, background:'transparent', color:'var(--gray)', padding:'7px 10px', fontSize:12, fontWeight:900, cursor:'pointer' },
  billingToggleBtnActive: { background:'var(--surface)', color:'var(--indigo)', boxShadow:'0 5px 14px -12px rgba(15,16,53,.55)' },
  priceSummary: { minWidth:142, display:'grid', gridTemplateColumns:'auto 1fr', alignItems:'baseline', columnGap:3, rowGap:1 },
  priceValue: { fontSize:19, fontWeight:900, color:'var(--ink)', lineHeight:1, fontVariantNumeric:'tabular-nums' },
  pricePeriod: { fontSize:12, fontWeight:900, color:'var(--gray)' },
  priceNote: { gridColumn:'1 / -1', fontSize:11, fontWeight:800, color:'var(--gray)', lineHeight:1.25 },
  softBtn: { padding:'9px 13px', borderRadius:10, border:'none', background:'#FEF3C7', color:'#92400E', fontWeight:800, fontSize:12, cursor:'pointer' },
  ghostBtn: { padding:'9px 13px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontWeight:700, fontSize:12, cursor:'pointer' },
  disabledBtn: { padding:'9px 13px', borderRadius:10, border:'none', background:'#E5E7EB', color:'#9CA3AF', fontWeight:800, fontSize:12, cursor:'not-allowed' },
  dangerBtn: { padding:'9px 13px', borderRadius:10, border:'none', background:'#EF4444', color:'#fff', fontWeight:800, fontSize:12, cursor:'pointer' },
  currentBtn: { padding:'9px 13px', borderRadius:10, border:'none', background:'#DCFCE7', color:'#166534', fontWeight:800, fontSize:12 },
};

function euro(cents = 0) {
  return `€${(Number(cents || 0) / 100).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

/* ============ EARN / AMBASSADOR VIEW ============ */
function EarnView({ user, lang = 'en' }) {
  const isMobile = useIsMobile();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState(null);
  const [adminData, setAdminData] = React.useState(null);
  const [notice, setNotice] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [form, setForm] = React.useState({
    firstName: user?.name?.split(' ')?.[0] || '',
    lastName: user?.name?.split(' ')?.slice(1).join(' ') || '',
    email: user?.email || '',
    university: '',
    studyField: '',
    studyYear: '',
    cityCountry: '',
    communityReach: '',
    motivation: '',
  });
  const [outboundForm, setOutboundForm] = React.useState({
    email: '',
    firstName: '',
    lastName: '',
    university: '',
    studyField: '',
    referralCode: '',
  });

  const copy = lang === 'it' ? {
    title: 'Ambassador dashboard',
    subtitle: 'Candidati, ottieni un link personale e monitora iscritti, Pro attivi e saldo maturato.',
    applyTitle: 'Candidati come Ambassador',
    applySub: 'Questo form serve per gli studenti inbound: raccoglie università, corso e reach. Dopo la call, un admin approva e attiva link e dashboard.',
    pendingTitle: 'Candidatura ricevuta',
    pendingSub: 'La richiesta è in review. Quando viene approvata, qui comparirà il tuo link personale.',
    approved: 'Approvato',
    link: 'Link personale',
    copyLink: 'Copia link',
    linkCopied: 'Link copiato',
    liveStatus: 'Live',
    pausedStatus: 'In pausa',
    pausedNote: 'Il tuo profilo ambassador è in pausa: il link resta visibile, ma non attribuisce nuovi signup finché un admin non lo riattiva.',
    referrals: 'Iscritti dal link',
    active: 'Pro attivi',
    available: 'Saldo disponibile',
    pending: 'Saldo pending',
    paid: 'Già pagato',
    threshold: 'Payout manuale sbloccato a €20.',
    submit: 'Invia candidatura',
    admin: 'Admin ambassador',
    noRows: 'Nessun dato ancora.',
  } : {
    title: 'Ambassador dashboard',
    subtitle: 'Apply, get a personal link, and track signups, active Pro users, and earned balance.',
    applyTitle: 'Apply as Ambassador',
    applySub: 'This form is for inbound students: it collects university, study field, and reach. After the call, an admin approves and activates link and dashboard.',
    pendingTitle: 'Application received',
    pendingSub: 'Your request is under review. Once approved, your personal link will appear here.',
    approved: 'Approved',
    link: 'Personal link',
    copyLink: 'Copy link',
    linkCopied: 'Link copied',
    liveStatus: 'Live',
    pausedStatus: 'Paused',
    pausedNote: 'Your ambassador profile is paused: the link stays visible, but it will not attribute new signups until an admin reactivates it.',
    referrals: 'Link signups',
    active: 'Active Pro',
    available: 'Available balance',
    pending: 'Pending balance',
    paid: 'Paid out',
    threshold: 'Manual payout unlocks at €20.',
    submit: 'Submit application',
    admin: 'Ambassador admin',
    noRows: 'No data yet.',
  };

  const card = {
    background: 'var(--surface)',
    borderRadius: 18,
    border: '1px solid var(--border)',
    padding: isMobile ? 16 : 20,
    boxShadow: '0 14px 34px -28px rgba(15,16,53,.4)',
  };

  async function load() {
    setLoading(true);
    const result = await getAmbassadorDashboard();
    if (result.error) setNotice({ type: 'error', text: result.error.message });
    else setData(result.data);

    if (user?.isAdmin) {
      const adminResult = await getAmbassadorAdmin();
      if (adminResult.error) setNotice({ type: 'error', text: adminResult.error.message });
      else setAdminData(adminResult.data);
    }
    setLoading(false);
  }

  React.useEffect(() => {
    load();
  }, [user?.id, user?.isAdmin]);

  async function submitApplication(e) {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    const result = await submitLoggedAmbassadorApplication({ ...form, locale: lang });
    if (result.error) setNotice({ type: 'error', text: result.error.message });
    else {
      setNotice({ type: 'success', text: lang === 'it' ? 'Candidatura inviata.' : 'Application submitted.' });
      await load();
    }
    setSubmitting(false);
  }

  async function runAdmin(action) {
    setSubmitting(true);
    setNotice(null);
    const result = await runAmbassadorAdminAction(action);
    if (result.error) setNotice({ type: 'error', text: result.error.message });
    else {
      setNotice({ type: 'success', text: lang === 'it' ? 'Aggiornato.' : 'Updated.' });
      setAdminData(result.data);
      await load();
    }
    setSubmitting(false);
  }

  async function copyReferralLink() {
    if (!referralLink) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(referralLink);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = referralLink;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      setNotice({ type: 'error', text: lang === 'it' ? 'Non sono riuscito a copiare il link.' : 'Could not copy the link.' });
    }
  }

  const ambassador = data?.ambassador;
  const application = data?.application;
  const summary = data?.summary || {};
  const referralLink = ambassador?.referral_code
    ? `${window.location.origin}/?ref=${ambassador.referral_code}`
    : '';
  const ambassadorStatus = ambassador?.status || 'active';
  const activeReferrals = (data?.referrals || []).filter((item) => ['paid', 'active'].includes(item.status)).length;

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ ...card, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr .8fr', gap: 18, alignItems: 'center', background: 'linear-gradient(135deg,#F7F8FF,#FFFFFF)' }}>
        <div>
          <div style={{ ...getStatusPillStyle(ambassador ? ambassadorStatus : 'active'), display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: 'currentColor' }} />
            Lockeen Ambassador Program {ambassador ? (ambassadorStatus === 'paused' ? copy.pausedStatus : copy.liveStatus) : ''}
          </div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 26 : 34, lineHeight: 1.08, color: 'var(--ink)', letterSpacing: '-.04em', fontWeight: 900 }}>{copy.title}</h1>
          <p style={{ margin: '10px 0 0', color: 'var(--gray)', fontSize: 14, lineHeight: 1.6, maxWidth: 620 }}>{copy.subtitle}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <StatCard label={copy.available} value={euro(summary.available)} />
          <StatCard label={copy.referrals} value={data?.referrals?.length || 0} />
        </div>
      </div>

      {notice && (
        <div style={{ ...accountS.notice, ...(notice.type === 'success' ? accountS.noticeSuccess : accountS.noticeError) }}>
          {notice.text}
        </div>
      )}

      {loading && <div style={card}>Loading...</div>}

      {!loading && ambassador && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr)', gap: 12 }}>
            <StatCard label={copy.referrals} value={data.referrals?.length || 0} />
            <StatCard label={copy.active} value={activeReferrals} />
            <StatCard label={copy.pending} value={euro(summary.pending)} />
            <StatCard label={copy.paid} value={euro(summary.paid)} />
          </div>

          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <div style={{ ...getStatusPillStyle(ambassadorStatus), display: 'inline-flex', marginBottom: 8 }}>
                  {ambassadorStatus === 'paused' ? copy.pausedStatus : copy.liveStatus}
                </div>
                <h2 style={earnS.h2}>{copy.link}</h2>
                <p style={earnS.muted}>{ambassadorStatus === 'paused' ? copy.pausedNote : copy.threshold}</p>
              </div>
              <button
                type="button"
                onClick={copyReferralLink}
                style={copiedLink ? accountS.currentBtn : accountS.primaryBtn}
              >
                {copiedLink ? copy.linkCopied : copy.copyLink}
              </button>
            </div>
            <div style={{ marginTop: 14, padding: '13px 14px', borderRadius: 12, background: '#EEF2FF', color: 'var(--indigo)', fontWeight: 900, wordBreak: 'break-all', fontSize: 13 }}>
              {referralLink}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
            <DataPanel title="Referral">
              {(data.referrals || []).length === 0 && <Empty text={copy.noRows} />}
              {(data.referrals || []).slice(0, 8).map((item) => (
                <Row key={item.id} left={item.referred_email_masked || 'student'} sub={formatDate(item.created_at)} right={item.status} />
              ))}
            </DataPanel>
            <DataPanel title="Commissioni">
              {(data.commissions || []).length === 0 && <Empty text={copy.noRows} />}
              {(data.commissions || []).slice(0, 8).map((item) => (
                <Row key={item.id} left={euro(item.amount_cents)} sub={formatDate(item.created_at)} right={item.status} />
              ))}
            </DataPanel>
          </div>
        </>
      )}

      {!loading && !user?.isAdmin && !ambassador && application && (
        <div style={card}>
          <div style={earnS.kicker}>{application.status}</div>
          <h2 style={earnS.h2}>{copy.pendingTitle}</h2>
          <p style={earnS.muted}>{copy.pendingSub}</p>
        </div>
      )}

      {!loading && !user?.isAdmin && !ambassador && !application && (
        <form onSubmit={submitApplication} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <h2 style={earnS.h2}>{copy.applyTitle}</h2>
            <p style={earnS.muted}>{copy.applySub}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap: 12 }}>
            <Field label="Nome *" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
            <Field label="Cognome *" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required />
            <Field label="Email *" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
            <Field label="Università *" value={form.university} onChange={(v) => setForm({ ...form, university: v })} required />
            <Field label="Cosa studi *" value={form.studyField} onChange={(v) => setForm({ ...form, studyField: v })} required />
            <Field label="Anno" value={form.studyYear} onChange={(v) => setForm({ ...form, studyYear: v })} />
            <Field label="Città / Paese" value={form.cityCountry} onChange={(v) => setForm({ ...form, cityCountry: v })} />
            <Field label="Community / reach" value={form.communityReach} onChange={(v) => setForm({ ...form, communityReach: v })} />
          </div>
          <label style={accountS.label}>
            Motivazione
            <textarea value={form.motivation} onChange={(e) => setForm({ ...form, motivation: e.target.value })} rows={4} style={{ ...accountS.input, paddingTop: 10, resize: 'vertical' }} />
          </label>
          <button type="submit" disabled={submitting} style={{ ...accountS.primaryBtn, alignSelf: 'flex-start', ...(submitting ? accountS.primaryBtnDisabled : null) }}>
            {copy.submit}
          </button>
        </form>
      )}

      {user?.isAdmin && (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={earnS.kicker}>Admin</div>
            <h2 style={earnS.h2}>{copy.admin}</h2>
          </div>
          {!adminData && <Empty text="Admin data loading..." />}
          {adminData && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
              <DataPanel title="Candidature">
                {(adminData.applications || []).length === 0 && <Empty text={copy.noRows} />}
                {(adminData.applications || []).slice(0, 12).map((app) => (
                  <details key={app.id} style={earnS.adminDetails}>
                    <summary style={earnS.adminSummary}>
                      <div>
                        <div style={earnS.rowTitle}>{app.first_name} {app.last_name}</div>
                        <div style={earnS.rowSub}>{app.email} · {app.university} · {app.status}</div>
                      </div>
                      <span style={getStatusPillStyle(app.status)}>{app.status}</span>
                    </summary>
                    <AdminDetailGrid
                      items={[
                        ['Email', app.email],
                        ['Università', app.university],
                        ['Cosa studia', app.study_field],
                        ['Anno', app.study_year || '—'],
                        ['Città / Paese', app.city_country || '—'],
                        ['Community / reach', app.community_reach || '—'],
                        ['Motivazione', app.motivation || '—'],
                        ['Creata', formatDate(app.created_at)],
                      ]}
                    />
                    <div style={earnS.adminActions}>
                      <button
                        type="button"
                        disabled={submitting || app.status === 'approved'}
                        onClick={() => runAdmin({ action: 'approve_application', applicationId: app.id })}
                        style={app.status === 'approved' ? accountS.currentBtn : accountS.primaryBtn}
                      >
                        Approva
                      </button>
                      <button
                        type="button"
                        disabled={submitting || ['approved', 'rejected'].includes(app.status)}
                        onClick={() => runAdmin({ action: 'reject_application', applicationId: app.id, reason: 'manual_admin_reject' })}
                        style={['approved', 'rejected'].includes(app.status) ? accountS.disabledBtn : accountS.dangerBtn}
                      >
                        Non approvare
                      </button>
                    </div>
                  </details>
                ))}
              </DataPanel>
              <DataPanel title="Crea ambassador">
                <div style={{ padding: 12, display: 'grid', gap: 10 }}>
                  <Field label="Email *" type="email" value={outboundForm.email} onChange={(v) => setOutboundForm({ ...outboundForm, email: v })} required />
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                    <Field label="Nome *" value={outboundForm.firstName} onChange={(v) => setOutboundForm({ ...outboundForm, firstName: v })} required />
                    <Field label="Cognome *" value={outboundForm.lastName} onChange={(v) => setOutboundForm({ ...outboundForm, lastName: v })} required />
                    <Field label="Università *" value={outboundForm.university} onChange={(v) => setOutboundForm({ ...outboundForm, university: v })} required />
                    <Field label="Cosa studia" value={outboundForm.studyField} onChange={(v) => setOutboundForm({ ...outboundForm, studyField: v })} />
                  </div>
                  <Field label="Referral code opzionale" value={outboundForm.referralCode} onChange={(v) => setOutboundForm({ ...outboundForm, referralCode: v })} />
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => runAdmin({ action: 'create_ambassador', ...outboundForm })}
                    style={submitting ? accountS.disabledBtn : accountS.primaryBtn}
                  >
                    Crea ambassador
                  </button>
                  <div style={earnS.rowSub}>Se l’email ha già un account Lockeen, viene attivata subito. Se non esiste ancora, resta pre-approvata e si attiva automaticamente al primo signup con quella email.</div>
                </div>
              </DataPanel>
              <DataPanel title="Pre-approvati in attesa">
                {(adminData.invites || []).filter((invite) => invite.status === 'pending_signup').length === 0 && <Empty text={copy.noRows} />}
                {(adminData.invites || []).filter((invite) => invite.status === 'pending_signup').map((invite) => (
                  <details key={invite.id} style={earnS.adminDetails}>
                    <summary style={earnS.adminSummary}>
                      <div>
                        <div style={earnS.rowTitle}>{invite.first_name} {invite.last_name}</div>
                        <div style={earnS.rowSub}>{invite.email} · {invite.university} · {invite.referral_code}</div>
                      </div>
                      <span style={getStatusPillStyle('pending_signup')}>In attesa signup</span>
                    </summary>
                    <AdminDetailGrid
                      items={[
                        ['Email', invite.email],
                        ['Università', invite.university],
                        ['Cosa studia', invite.study_field || '—'],
                        ['Referral code', invite.referral_code],
                        ['Commissione', euro(invite.commission_cents)],
                        ['Soglia payout', euro(invite.payout_threshold_cents)],
                        ['Creata', formatDate(invite.created_at)],
                      ]}
                    />
                  </details>
                ))}
              </DataPanel>
              <DataPanel title="Payout manuali">
                {(adminData.ambassadors || []).map((amb) => {
                  const s = adminData.summaries?.[amb.id] || {};
                  return (
                    <details key={amb.id} style={earnS.adminDetails}>
                      <summary style={earnS.adminSummary}>
                        <div>
                          <div style={earnS.rowTitle}>{amb.first_name} {amb.last_name}</div>
                          <div style={earnS.rowSub}>{amb.referral_code} · disponibile {euro(s.available)} · {amb.status}</div>
                        </div>
                        <span style={getStatusPillStyle(amb.status)}>{amb.status}</span>
                      </summary>
                      <AdminDetailGrid
                        items={[
                          ['Email', amb.email],
                          ['Università', amb.university],
                          ['Cosa studia', amb.study_field || '—'],
                          ['Referral code', amb.referral_code],
                          ['Status', amb.status],
                          ['Iscritti dal link', s.referrals || 0],
                          ['Pro attivi', s.activeReferrals || 0],
                          ['Disponibile', euro(s.available)],
                          ['Pending', euro(s.pending)],
                          ['Pagato', euro(s.paid)],
                          ['Soglia payout', euro(s.threshold || amb.payout_threshold_cents)],
                          ['Approvato', formatDate(amb.approved_at)],
                        ]}
                      />
                      <div style={earnS.adminActions}>
                        <button
                          type="button"
                          disabled={submitting || Number(s.available || 0) < Number(s.threshold || 2000)}
                          onClick={() => runAdmin({ action: 'pay_ambassador', ambassadorId: amb.id, method: 'manual_bank' })}
                          style={Number(s.available || 0) >= Number(s.threshold || 2000) ? accountS.primaryBtn : accountS.disabledBtn}
                        >
                          Segna pagato
                        </button>
                        <button
                          type="button"
                          disabled={submitting || amb.status !== 'active'}
                          onClick={() => runAdmin({ action: 'deactivate_ambassador', ambassadorId: amb.id, reason: 'manual_admin_pause' })}
                          style={amb.status === 'active' ? accountS.dangerBtn : accountS.disabledBtn}
                        >
                          Disattiva ambassador
                        </button>
                        <button
                          type="button"
                          disabled={submitting || amb.status !== 'paused'}
                          onClick={() => runAdmin({ action: 'reactivate_ambassador', ambassadorId: amb.id, reason: 'manual_admin_reactivate' })}
                          style={amb.status === 'paused' ? accountS.primaryBtn : accountS.disabledBtn}
                        >
                          Riattiva ambassador
                        </button>
                      </div>
                    </details>
                  );
                })}
              </DataPanel>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <label style={accountS.label}>
      {label}
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} style={accountS.input} />
    </label>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ padding: 16, borderRadius: 14, border: '1px solid var(--border)', background: 'rgba(255,255,255,.82)' }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: 6, fontSize: 11, fontWeight: 900, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
    </div>
  );
}

function DataPanel({ title, children }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 16, background: 'var(--surface)', overflow: 'hidden' }}>
      <div style={{ padding: '13px 15px', borderBottom: '1px solid var(--border)', fontWeight: 900, color: 'var(--ink)' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  );
}

function Row({ left, sub, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={earnS.rowTitle}>{left}</div>
        <div style={earnS.rowSub}>{sub}</div>
      </div>
      <span style={{ alignSelf: 'center', padding: '5px 8px', borderRadius: 999, background: '#EEF2FF', color: 'var(--indigo)', fontSize: 11, fontWeight: 900 }}>{right}</span>
    </div>
  );
}

function AdminDetailGrid({ items = [] }) {
  return (
    <div style={earnS.detailGrid}>
      {items.map(([label, value]) => (
        <div key={label} style={earnS.detailItem}>
          <div style={earnS.detailLabel}>{label}</div>
          <div style={earnS.detailValue}>{value || '—'}</div>
        </div>
      ))}
    </div>
  );
}

function getStatusPillStyle(status = '') {
  const value = String(status || '').toLowerCase();
  const base = {
    alignSelf: 'center',
    padding: '5px 8px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    whiteSpace: 'nowrap',
  };
  if (['approved', 'active', 'claimed', 'paid'].includes(value)) {
    return { ...base, background: '#DCFCE7', color: '#166534' };
  }
  if (['rejected', 'paused', 'cancelled', 'failed', 'archived'].includes(value)) {
    return { ...base, background: '#FEE2E2', color: '#B91C1C' };
  }
  return { ...base, background: '#FEF3C7', color: '#92400E' };
}

function Empty({ text }) {
  return <div style={{ padding: 15, color: 'var(--gray)', fontSize: 13, fontWeight: 800 }}>{text}</div>;
}

const earnS = {
  kicker: { fontSize: 11, fontWeight: 900, color: 'var(--indigo)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 },
  h2: { margin: 0, fontSize: 19, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-.02em' },
  muted: { margin: '6px 0 0', color: 'var(--gray)', fontSize: 13, lineHeight: 1.55 },
  rowTitle: { fontSize: 13, fontWeight: 900, color: 'var(--ink)' },
  rowSub: { marginTop: 3, fontSize: 11, fontWeight: 700, color: 'var(--gray)' },
  adminRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 12, borderBottom: '1px solid var(--border)' },
  adminDetails: { borderBottom: '1px solid var(--border)' },
  adminSummary: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 12, cursor: 'pointer', listStyle: 'none' },
  adminActions: { display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 12px 12px' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8, padding: '0 12px 12px' },
  detailItem: { padding: 10, borderRadius: 10, background: '#F8FAFC', border: '1px solid #EEF2F7', minWidth: 0 },
  detailLabel: { fontSize: 10, fontWeight: 900, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 },
  detailValue: { fontSize: 12, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.35, overflowWrap: 'anywhere' },
};

export { AccountView, EarnView };
