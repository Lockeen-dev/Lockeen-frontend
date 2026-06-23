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
        necessary: 'Cookie necessari',
        necessaryHelp: 'Richiesti per login, sicurezza, lingua e preferenze essenziali.',
        analytics: 'Cookie analytics',
        analyticsHelp: 'Opzionali. Ci aiutano a misurare utilizzo e performance senza pubblicità.',
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
        necessary: 'Necessary cookies',
        necessaryHelp: 'Required for login, security, language, and essential preferences.',
        analytics: 'Analytics cookies',
        analyticsHelp: 'Optional. They help us measure usage and performance without advertising.',
        necessaryOnly: 'Necessary only',
        save: 'Save preferences',
        close: 'Close',
      };
}

function readConsent() {
  try {
    const saved = JSON.parse(localStorage.getItem(COOKIE_CONSENT_KEY) || 'null');
    return { necessary: true, analytics: Boolean(saved?.analytics), updatedAt: saved?.updatedAt || null };
  } catch {
    return { necessary: true, analytics: false, updatedAt: null };
  }
}

function saveConsent({ analytics }) {
  const payload = { necessary: true, analytics: Boolean(analytics), updatedAt: new Date().toISOString() };
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent('lockeen-cookie-consent', { detail: payload }));
  return payload;
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

