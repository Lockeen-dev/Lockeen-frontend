const COOKIE_CONSENT_KEY = 'lockeen-cookie-consent';

function getLang() {
  try {
    return localStorage.getItem('lockeen-lang') === 'it' ? 'it' : 'en';
  } catch {
    return 'en';
  }
}

function copy(lang = getLang()) {
  return lang === 'it'
    ? {
        press: 'Stampa',
        cookiePolicy: 'Cookie Policy',
        cookieSettings: 'Impostazioni cookie',
        title: 'Impostazioni cookie',
        body: 'Usiamo i cookie necessari per far funzionare Lockeen. I cookie analytics aiutano a capire cosa migliorare e restano opzionali.',
        bannerBody: 'Usiamo cookie necessari per far funzionare Lockeen. Puoi accettare anche analytics opzionali per aiutarci a migliorare il prodotto.',
        necessary: 'Cookie necessari',
        necessaryHelp: 'Richiesti per login, sicurezza, lingua e preferenze essenziali.',
        analytics: 'Cookie analytics',
        analyticsHelp: 'Opzionali. Ci aiutano a misurare utilizzo e performance senza pubblicità.',
        acceptAll: 'Accetta tutto',
        customize: 'Personalizza',
        necessaryOnly: 'Solo necessari',
        save: 'Salva preferenze',
        close: 'Chiudi',
      }
    : {
        press: 'Press',
        cookiePolicy: 'Cookie Policy',
        cookieSettings: 'Cookie Settings',
        title: 'Cookie settings',
        body: 'We use necessary cookies to keep Lockeen working. Analytics cookies help us understand what to improve and remain optional.',
        bannerBody: 'We use necessary cookies to keep Lockeen working. You can also accept optional analytics to help us improve the product.',
        necessary: 'Necessary cookies',
        necessaryHelp: 'Required for login, security, language, and essential preferences.',
        analytics: 'Analytics cookies',
        analyticsHelp: 'Optional. They help us measure usage and performance without advertising.',
        acceptAll: 'Accept all',
        customize: 'Customize',
        necessaryOnly: 'Necessary only',
        save: 'Save preferences',
        close: 'Close',
      };
}

function readConsent() {
  try {
    const saved = JSON.parse(localStorage.getItem(COOKIE_CONSENT_KEY) || 'null');
    return { necessary: true, analytics: Boolean(saved?.analytics), updatedAt: saved?.updatedAt || null, hasChoice: Boolean(saved?.updatedAt) };
  } catch {
    return { necessary: true, analytics: false, updatedAt: null, hasChoice: false };
  }
}

function saveConsent({ analytics }) {
  const payload = { necessary: true, analytics: Boolean(analytics), updatedAt: new Date().toISOString() };
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent('lockeen-cookie-consent', { detail: payload }));
  return payload;
}

export function getCookieConsent() {
  return readConsent();
}

function closeCookieBanner() {
  const banner = document.getElementById('lockeen-cookie-banner');
  if (banner) banner.remove();
}

function ensureBanner() {
  if (readConsent().hasChoice || document.getElementById('lockeen-cookie-banner')) return;

  const dict = copy();
  const banner = document.createElement('div');
  banner.id = 'lockeen-cookie-banner';
  banner.innerHTML = `
    <section role="region" aria-label="${dict.title}" style="position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;margin:auto;max-width:980px;border-radius:22px;background:#fff;color:#070B2D;border:1px solid rgba(7,11,45,.12);box-shadow:0 20px 70px rgba(7,11,45,.22);padding:18px;display:flex;flex-direction:column;gap:16px;align-items:center;text-align:center;">
      <div style="max-width:680px;">
        <strong data-cookie-banner-title style="display:block;font-size:16px;margin-bottom:4px;">${dict.title}</strong>
        <p data-cookie-banner-body style="font-size:14px;line-height:1.48;color:rgba(7,11,45,.68);margin:0;">${dict.bannerBody}</p>
      </div>
      <div style="display:flex;gap:9px;flex-wrap:wrap;align-items:center;justify-content:center;">
        <button type="button" data-cookie-necessary-banner style="padding:10px 14px;border-radius:999px;border:1px solid rgba(7,11,45,.14);background:#fff;color:#070B2D;font-weight:750;cursor:pointer;">${dict.necessaryOnly}</button>
        <button type="button" data-cookie-customize-banner style="padding:10px 14px;border-radius:999px;border:1px solid rgba(47,43,255,.22);background:#F7F8FC;color:#2F2BFF;font-weight:800;cursor:pointer;">${dict.customize}</button>
        <button type="button" data-cookie-accept-banner style="padding:10px 16px;border-radius:999px;border:0;background:#2F2BFF;color:#fff;font-weight:850;cursor:pointer;">${dict.acceptAll}</button>
      </div>
    </section>`;

  document.body.appendChild(banner);
  banner.querySelector('[data-cookie-necessary-banner]').addEventListener('click', () => {
    saveConsent({ analytics: false });
    closeCookieBanner();
  });
  banner.querySelector('[data-cookie-accept-banner]').addEventListener('click', () => {
    saveConsent({ analytics: true });
    closeCookieBanner();
  });
  banner.querySelector('[data-cookie-customize-banner]').addEventListener('click', () => {
    closeCookieBanner();
    openCookieSettings();
  });
}

function ensureModal() {
  const existing = document.getElementById('lockeen-cookie-settings-modal');
  if (existing) return existing;

  const modal = document.createElement('div');
  modal.id = 'lockeen-cookie-settings-modal';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div data-cookie-backdrop style="position:fixed;inset:0;z-index:10000;background:rgba(7,11,45,.48);display:none;align-items:center;justify-content:center;padding:18px;">
      <section role="dialog" aria-modal="true" aria-labelledby="lockeen-cookie-title" style="width:min(520px,100%);border-radius:24px;background:#fff;color:#070B2D;border:1px solid rgba(7,11,45,.12);box-shadow:0 24px 80px rgba(7,11,45,.24);padding:24px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:12px;">
          <div>
            <h2 id="lockeen-cookie-title" data-cookie-copy="title" style="font-size:24px;line-height:1.15;font-weight:800;margin:0 0 8px;"></h2>
            <p data-cookie-copy="body" style="font-size:15px;line-height:1.55;color:rgba(7,11,45,.68);margin:0;"></p>
          </div>
          <button type="button" data-cookie-close aria-label="Close" style="width:36px;height:36px;border-radius:999px;border:1px solid rgba(7,11,45,.12);background:#fff;color:#070B2D;font-size:18px;cursor:pointer;">×</button>
        </div>
        <div style="display:grid;gap:12px;margin:22px 0;">
          <label style="display:flex;gap:12px;align-items:flex-start;padding:14px;border:1px solid rgba(7,11,45,.1);border-radius:16px;background:#F7F8FC;">
            <input type="checkbox" checked disabled style="margin-top:4px;">
            <span>
              <strong data-cookie-copy="necessary" style="display:block;font-size:15px;"></strong>
              <span data-cookie-copy="necessaryHelp" style="display:block;font-size:13px;color:rgba(7,11,45,.58);line-height:1.45;margin-top:3px;"></span>
            </span>
          </label>
          <label style="display:flex;gap:12px;align-items:flex-start;padding:14px;border:1px solid rgba(7,11,45,.1);border-radius:16px;background:#fff;">
            <input type="checkbox" data-cookie-analytics style="margin-top:4px;">
            <span>
              <strong data-cookie-copy="analytics" style="display:block;font-size:15px;"></strong>
              <span data-cookie-copy="analyticsHelp" style="display:block;font-size:13px;color:rgba(7,11,45,.58);line-height:1.45;margin-top:3px;"></span>
            </span>
          </label>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;">
          <button type="button" data-cookie-necessary-only style="padding:11px 16px;border-radius:999px;border:1px solid rgba(7,11,45,.14);background:#fff;color:#070B2D;font-weight:700;cursor:pointer;"></button>
          <button type="button" data-cookie-save style="padding:11px 18px;border-radius:999px;border:0;background:#2F2BFF;color:#fff;font-weight:800;cursor:pointer;"></button>
        </div>
      </section>
    </div>`;

  document.body.appendChild(modal);

  modal.querySelector('[data-cookie-close]').addEventListener('click', closeCookieSettings);
  modal.querySelector('[data-cookie-backdrop]').addEventListener('click', (event) => {
    if (event.target.matches('[data-cookie-backdrop]')) closeCookieSettings();
  });
  modal.querySelector('[data-cookie-necessary-only]').addEventListener('click', () => {
    saveConsent({ analytics: false });
    closeCookieSettings();
  });
  modal.querySelector('[data-cookie-save]').addEventListener('click', () => {
    saveConsent({ analytics: modal.querySelector('[data-cookie-analytics]').checked });
    closeCookieSettings();
  });

  return modal;
}

function renderModalCopy(modal, lang = getLang()) {
  const dict = copy(lang);
  modal.querySelectorAll('[data-cookie-copy]').forEach((node) => {
    node.textContent = dict[node.dataset.cookieCopy] || '';
  });
  modal.querySelector('[data-cookie-necessary-only]').textContent = dict.necessaryOnly;
  modal.querySelector('[data-cookie-save]').textContent = dict.save;
  modal.querySelector('[data-cookie-close]').setAttribute('aria-label', dict.close);
}

export function openCookieSettings() {
  const modal = ensureModal();
  renderModalCopy(modal);
  modal.querySelector('[data-cookie-analytics]').checked = readConsent().analytics;
  modal.querySelector('[data-cookie-backdrop]').style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

export function closeCookieSettings() {
  const modal = document.getElementById('lockeen-cookie-settings-modal');
  if (!modal) return;
  modal.querySelector('[data-cookie-backdrop]').style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function refreshCookieBannerCopy() {
  const banner = document.getElementById('lockeen-cookie-banner');
  if (!banner) return;
  const dict = copy();
  banner.querySelector('[data-cookie-banner-title]').textContent = dict.title;
  banner.querySelector('[data-cookie-banner-body]').textContent = dict.bannerBody;
  banner.querySelector('[data-cookie-necessary-banner]').textContent = dict.necessaryOnly;
  banner.querySelector('[data-cookie-customize-banner]').textContent = dict.customize;
  banner.querySelector('[data-cookie-accept-banner]').textContent = dict.acceptAll;
}

export function ensureFooterLegalLinks(root = document, lang = getLang()) {
  const dict = copy(lang);
  const footers = root.querySelectorAll('footer');

  footers.forEach((footer) => {
    const companyHeading = [...footer.querySelectorAll('h4')].find((node) => /^(Company|Azienda)$/.test(node.textContent.trim()));
    const companyList = companyHeading?.parentElement?.querySelector('ul');
    if (companyList && !companyList.querySelector('a[href="/press"]')) {
      companyList.insertAdjacentHTML('beforeend', `<li><a href="/press" class="text-white/70 hover:text-white transition-colors" data-footer-press>${dict.press}</a></li>`);
    }

    const legalHeading = [...footer.querySelectorAll('h4')].find((node) => /^(Legal|Legale)$/.test(node.textContent.trim()));
    const legalList = legalHeading?.parentElement?.querySelector('ul');
    if (!legalList) return;

    if (!legalList.querySelector('a[href="/cookie-policy"]')) {
      legalList.insertAdjacentHTML('beforeend', `<li><a href="/cookie-policy" class="text-white/70 hover:text-white transition-colors" data-footer-cookie-policy>${dict.cookiePolicy}</a></li>`);
    }
    if (!legalList.querySelector('[data-cookie-settings-link]')) {
      legalList.insertAdjacentHTML('beforeend', `<li><button type="button" class="text-white/70 hover:text-white transition-colors" data-cookie-settings-link style="background:none;border:0;padding:0;font:inherit;cursor:pointer;">${dict.cookieSettings}</button></li>`);
    }
  });

  root.querySelectorAll('[data-footer-press]').forEach((node) => { node.textContent = dict.press; });
  root.querySelectorAll('[data-footer-cookie-policy]').forEach((node) => { node.textContent = dict.cookiePolicy; });
  root.querySelectorAll('[data-cookie-settings-link]').forEach((node) => { node.textContent = dict.cookieSettings; });
}

export function initCookieConsentUi(root = document) {
  ensureFooterLegalLinks(root);
  ensureBanner();
  refreshCookieBannerCopy();
  window.openCookieSettings = openCookieSettings;

  if (!window.__lockeenCookieSettingsBound) {
    window.__lockeenCookieSettingsBound = true;
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-cookie-settings-link]');
      if (!trigger) return;
      event.preventDefault();
      openCookieSettings();
    });
  }
}
