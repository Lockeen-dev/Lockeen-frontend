import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { staticPages } from '../content/staticPages';

const pageTitles = {
  en: {
    about: 'About — Lockeen',
    blog: 'Blog — Lockeen',
    careers: 'Careers – Lockeen',
    earn: 'Earn · Ambassador Program – Lockeen',
    press: 'Press – Lockeen',
    privacy: 'Privacy Policy — Lockeen',
    terms: 'Terms of Service — Lockeen',
  },
  it: {
    about: 'Chi siamo — Lockeen',
    blog: 'Blog — Lockeen',
    careers: 'Lavora con noi – Lockeen',
    earn: 'Guadagna · Programma Ambassador – Lockeen',
    press: 'Stampa – Lockeen',
    privacy: 'Privacy Policy — Lockeen',
    terms: 'Termini di servizio — Lockeen',
  },
};

const staticTextTranslations = {
  en: [
    ['Features', 'Funzioni'],
    ['Product', 'Prodotto'],
    ['Pricing', 'Prezzi'],
    ['Quizzes', 'Quiz'],
    ['Calendar', 'Calendario'],
    ['Sign In', 'Accedi'],
    ['Start Free', 'Inizia gratis'],
    ['Get Started', 'Inizia'],
    ['About', 'Chi siamo'],
    ['Blog', 'Blog'],
    ['Careers', 'Lavora con noi'],
    ['Earn', 'Guadagna'],
    ['Press', 'Stampa'],
    ['Partners', 'Partner'],
    ['Company', 'Azienda'],
    ['Resources', 'Risorse'],
    ['Help Center', 'Centro assistenza'],
    ['Guides', 'Guide'],
    ['API Docs', 'API Docs'],
    ['Status', 'Status'],
    ['Legal', 'Legale'],
    ['Privacy', 'Privacy'],
    ['Terms', 'Termini'],
    ['Security', 'Sicurezza'],
    ['Cookie Policy', 'Cookie Policy'],
    ['Privacy Policy', 'Privacy Policy'],
    ['Terms of Service', 'Termini di servizio'],
    ['Cookie Settings', 'Impostazioni cookie'],
    ['The AI-powered workspace for smarter studying. Learn better, achieve more.', 'Lo spazio AI per studiare meglio. Impara meglio, ottieni di più.'],
    ['Lockeen Ambassador Program', 'Programma Ambassador Lockeen'],
    ['Earn with Lockeen', 'Guadagna con Lockeen'],
    ['Become an Ambassador at your university. Earn €2 for every student who signs up with your link — recurring, with no cap.', 'Diventa Ambassador nella tua università. Guadagni €2 per ogni studente che si iscrive con il tuo link — ricorrenti, senza limiti.'],
    ['Diventa Ambassador nella tua università. Guadagni €2 per ogni studente che si iscrive con il tuo link — per sempre, senza limiti.', 'Diventa Ambassador nella tua università. Guadagni €2 per ogni studente che si iscrive con il tuo link — ricorrenti, senza limiti.'],
    ['Become an Ambassador at your university. Earn', 'Diventa Ambassador nella tua università. Guadagni'],
    ['for every student who signs up with your link — recurring, with no cap.', 'che si iscrive con il tuo link — ricorrenti, senza limiti.'],
    ['che si iscrive con il tuo link — per sempre, senza limiti.', 'che si iscrive con il tuo link — ricorrenti, senza limiti.'],
    ['Become an Ambassador →', 'Diventa Ambassador →'],
    ['Diventa Ambassador →', 'Diventa Ambassador →'],
    ['© 2026 Lockeen. All rights reserved.', '© 2026 Lockeen. Tutti i diritti riservati.'],
    ['Study smarter with AI', 'Studia meglio con l’AI'],
    ['Contact us', 'Contattaci'],
    ['Media kit', 'Media kit'],
    ['Back to home', 'Torna alla home'],
  ],
};

function normalizePage(raw) {
  if (!raw) return 'about';
  return raw.replace(/\.html$/, '');
}

function normalizeStaticLang(lang) {
  return lang === 'it' ? 'it' : 'en';
}

function getStaticLang() {
  return normalizeStaticLang(localStorage.getItem('lockeen-lang') || 'en');
}

function updateStaticDocumentTitle(lang, pageName) {
  document.title = pageTitles[lang]?.[pageName] || pageTitles.en[pageName] || 'Lockeen';
}

function ensureStaticLanguageControls(root, lang) {
  const makeSelect = (extraClass = '') => `
    <select class="lang-select lang-select-compact js-static-lang-select ${extraClass}" aria-label="Language">
      <option value="en">🇬🇧 EN</option>
      <option value="it">🇮🇹 IT</option>
    </select>`;

  const desktopActions = root.querySelector('nav .hidden.md\\:flex.items-center.gap-4');
  if (desktopActions && !desktopActions.querySelector('.js-static-lang-select')) {
    desktopActions.insertAdjacentHTML('afterbegin', makeSelect());
  }

  const mobileMenu = root.querySelector('#mob-menu');
  if (mobileMenu && !mobileMenu.querySelector('.js-static-lang-select')) {
    mobileMenu.insertAdjacentHTML('afterbegin', makeSelect('w-full mb-3'));
  }

  const navRow = root.querySelector('nav .h-20');
  if (navRow && !mobileMenu && !root.querySelector('.js-static-lang-select-mobile-inline')) {
    const mobileToggle = root.querySelector('#mob-toggle');
    const mobileWrap = document.createElement('div');
    mobileWrap.className = 'js-static-lang-select-mobile-inline md:hidden ml-auto mr-3';
    mobileWrap.innerHTML = makeSelect();
    navRow.insertBefore(mobileWrap, mobileToggle || null);
  }

  root.querySelectorAll('.js-static-lang-select').forEach((select) => {
    select.value = lang;
  });
}

function applyStaticLanguage(root, lang, pageName) {
  ensureStaticLanguageControls(root, lang);
  updateStaticDocumentTitle(lang, pageName);

  const targetIndex = lang === 'it' ? 1 : 0;
  const lookup = new Map();
  staticTextTranslations.en.forEach((entry) => {
    lookup.set(entry[0], entry[targetIndex]);
    lookup.set(entry[1], entry[targetIndex]);
  });

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach((node) => {
    const text = node.nodeValue;
    const normalized = text.trim().replace(/\s+/g, ' ');
    if (!normalized || !lookup.has(normalized)) return;
    node.nodeValue = text.replace(text.trim(), lookup.get(normalized));
  });

  const pageHeading = {
    en: {
      about: 'Built by students, for students.',
      blog: 'Ideas worth studying.',
      careers: 'Build the future of learning',
      earn: 'Share Lockeen. Earn €2 for every student.',
      press: 'Lockeen in the news',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
    },
    it: {
      about: 'Creato da studenti, per studenti.',
      blog: 'Idee da studiare.',
      careers: 'Costruisci il futuro dello studio',
      earn: 'Condividi Lockeen. Guadagna €2 per ogni studente.',
      press: 'Lockeen sulla stampa',
      privacy: 'Privacy Policy',
      terms: 'Termini di servizio',
    },
  };

  const headingText = pageHeading[lang]?.[pageName];
  if (headingText) {
    const heading = root.querySelector('h1');
    if (heading && heading.textContent.trim()) heading.textContent = headingText;
  }
}

export default function StaticPage() {
  const { page } = useParams();
  const location = useLocation();
  const pageName = normalizePage(page || location.pathname.split('/').filter(Boolean)[0]);
  const html = staticPages[pageName] || staticPages.about;

  useEffect(() => {
    const lang = getStaticLang();
    updateStaticDocumentTitle(lang, pageName);
    localStorage.removeItem('lockeen-theme');
    document.documentElement.setAttribute('data-theme', 'light');
    const root = document.getElementById('static-page-root');
    if (!root) return undefined;

    const scripts = Array.from(root.querySelectorAll('script'));
    scripts.forEach((oldScript) => {
      if (oldScript.src) {
        const nextScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach((attr) => nextScript.setAttribute(attr.name, attr.value));
        oldScript.replaceWith(nextScript);
        return;
      }

      try {
        Function(`
          ${oldScript.textContent}
          if (typeof openArticle !== 'undefined') window.openArticle = openArticle;
          if (typeof closeModal !== 'undefined') window.closeModal = closeModal;
          if (typeof showForm !== 'undefined') window.showForm = showForm;
        `)();
      } catch (error) {
        console.error('Static page script failed', error);
      }
      oldScript.remove();
    });

    applyStaticLanguage(root, lang, pageName);

    const onChange = (event) => {
      if (!event.target.matches('.js-static-lang-select')) return;
      const nextLang = normalizeStaticLang(event.target.value);
      localStorage.setItem('lockeen-lang', nextLang);
      applyStaticLanguage(root, nextLang, pageName);
      window.dispatchEvent(new CustomEvent('lockeen-language', { detail: { lang: nextLang } }));
    };

    root.addEventListener('change', onChange);

    return () => {
      root.removeEventListener('change', onChange);
      document.body.style.overflow = '';
      window.openArticle = undefined;
      window.closeModal = undefined;
      window.showForm = undefined;
    };
  }, [location.pathname]);

  return <div id="static-page-root" className="static-page" dangerouslySetInnerHTML={{ __html: html }} />;
}
