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
  it: {
    About: 'Chi siamo',
    Blog: 'Blog',
    Careers: 'Lavora con noi',
    Press: 'Stampa',
    Product: 'Prodotto',
    Features: 'Funzionalità',
    Pricing: 'Prezzi',
    Calendar: 'Calendario',
    Company: 'Azienda',
    Resources: 'Risorse',
    Legal: 'Legale',
    'Privacy Policy': 'Privacy Policy',
    'Terms of Service': 'Termini di servizio',
    'Sign In': 'Accedi',
    'Start Free': 'Inizia gratis',
    'Get Started': 'Inizia',
    'Contact us': 'Contattaci',
    'Media kit': 'Media kit',
    'Back to home': 'Torna alla home',
    'All rights reserved.': 'Tutti i diritti riservati.',
    'Study smarter with AI': 'Studia meglio con l’AI',
    'Join Lockeen': 'Unisciti a Lockeen',
    'Earn with Lockeen': 'Guadagna con Lockeen',
    'Ambassador Program': 'Programma Ambassador',
    'Terms': 'Termini',
    Privacy: 'Privacy',
  },
};

function normalizePage(raw) {
  if (!raw) return 'about';
  return raw.replace(/\.html$/, '');
}

function applyStaticLanguage(root, lang, pageName) {
  const translations = staticTextTranslations[lang];
  if (!translations) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach((node) => {
    const text = node.nodeValue;
    const trimmed = text.trim();
    if (!trimmed || !translations[trimmed]) return;
    node.nodeValue = text.replace(trimmed, translations[trimmed]);
  });

  const pageHeading = {
    about: 'Chi siamo',
    careers: 'Lavora con noi',
    earn: 'Programma Ambassador',
    press: 'Stampa',
    privacy: 'Privacy Policy',
    terms: 'Termini di servizio',
  }[pageName];

  if (pageHeading) {
    const heading = root.querySelector('h1');
    if (heading && heading.textContent.trim()) heading.textContent = pageHeading;
  }
}

export default function StaticPage() {
  const { page } = useParams();
  const location = useLocation();
  const pageName = normalizePage(page || location.pathname.split('/').filter(Boolean)[0]);
  const html = staticPages[pageName] || staticPages.about;

  useEffect(() => {
    const lang = localStorage.getItem('lockeen-lang') === 'it' ? 'it' : 'en';
    document.title = pageTitles[lang]?.[pageName] || pageTitles.en[pageName] || 'Lockeen';
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

    return () => {
      document.body.style.overflow = '';
      window.openArticle = undefined;
      window.closeModal = undefined;
      window.showForm = undefined;
    };
  }, [location.pathname]);

  return <div id="static-page-root" className="static-page" dangerouslySetInnerHTML={{ __html: html }} />;
}
