import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { staticPages } from '../content/staticPages';
import {
  STATIC_LANGS,
  getStaticPageTitle,
  normalizeStaticLang,
  staticPageCommonText,
  staticPageSpecificText,
} from '../content/staticPageI18n';

function normalizePage(raw) {
  if (!raw) return 'about';
  return raw.replace(/\.html$/, '');
}

function translateTextNodes(root, dictionary) {
  if (!root || !dictionary) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const raw = node.nodeValue;
    const trimmed = raw.trim();
    const replacement = dictionary[trimmed];
    if (!replacement) return;
    node.nodeValue = raw.replace(trimmed, replacement);
  });
}

function translateExactElements(root, dictionary) {
  if (!root || !dictionary) return;
  root.querySelectorAll('h1, h2, h3, h4, p, a, button, span, div').forEach((el) => {
    if (el.children.length > 0 && !['A', 'BUTTON'].includes(el.tagName)) return;
    const text = el.textContent?.replace(/\s+/g, ' ').trim();
    const replacement = dictionary[text];
    if (!replacement) return;
    el.textContent = replacement;
  });
}

function applyStaticLanguage(root, pageName, lang) {
  const safeLang = normalizeStaticLang(lang);
  document.documentElement.lang = safeLang;
  localStorage.setItem('lockeen-lang', safeLang);
  document.title = getStaticPageTitle(pageName, safeLang);

  if (safeLang === 'en') return;

  const dictionary = {
    ...(staticPageCommonText[safeLang] || {}),
    ...(staticPageSpecificText[pageName]?.[safeLang] || {}),
  };
  translateTextNodes(root, dictionary);
  translateExactElements(root, dictionary);
}

export default function StaticPage() {
  const { page } = useParams();
  const location = useLocation();
  const pageName = normalizePage(page || location.pathname.split('/').filter(Boolean)[0]);
  const html = staticPages[pageName] || staticPages.about;
  const [lang, setLang] = useState(() => {
    if (typeof window === 'undefined') return 'en';
    return normalizeStaticLang(localStorage.getItem('lockeen-lang') || 'en');
  });

  useEffect(() => {
    const safeLang = normalizeStaticLang(lang);
    localStorage.removeItem('lockeen-theme');
    document.documentElement.setAttribute('data-theme', 'light');
    const root = document.getElementById('static-page-root');
    if (!root) return undefined;
    applyStaticLanguage(root, pageName, safeLang);

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

    return () => {
      document.body.style.overflow = '';
      window.openArticle = undefined;
      window.closeModal = undefined;
      window.showForm = undefined;
    };
  }, [location.pathname, lang, pageName]);

  useEffect(() => {
    const onLanguage = (event) => setLang(normalizeStaticLang(event?.detail?.lang || 'en'));
    window.addEventListener('lockeen-language', onLanguage);
    return () => window.removeEventListener('lockeen-language', onLanguage);
  }, []);

  const safeLang = normalizeStaticLang(lang);

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 22,
          right: 24,
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          borderRadius: 14,
          border: '1px solid rgba(7,11,45,.12)',
          background: 'rgba(255,255,255,.9)',
          boxShadow: '0 12px 30px rgba(7,11,45,.08)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <select
          value={safeLang}
          onChange={(event) => {
            const nextLang = normalizeStaticLang(event.target.value);
            localStorage.setItem('lockeen-lang', nextLang);
            setLang(nextLang);
            window.dispatchEvent(new CustomEvent('lockeen-language', { detail: { lang: nextLang } }));
          }}
          aria-label="Language"
          style={{
            border: 0,
            background: 'transparent',
            color: '#070B2D',
            fontWeight: 800,
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {Object.entries(STATIC_LANGS).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.flag} {value.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
      <div id="static-page-root" key={`${pageName}-${safeLang}`} className="static-page" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
