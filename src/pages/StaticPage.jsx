import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { staticPages } from '../content/staticPages';

const pageTitles = {
  about: 'About — Lockeen',
  blog: 'Blog — Lockeen',
  careers: 'Careers – Lockeen',
  earn: 'Earn · Ambassador Program – Lockeen',
  press: 'Press – Lockeen',
  privacy: 'Privacy Policy — Lockeen',
  terms: 'Terms of Service — Lockeen',
};

function normalizePage(raw) {
  if (!raw) return 'about';
  return raw.replace(/\.html$/, '');
}

export default function StaticPage() {
  const { page } = useParams();
  const location = useLocation();
  const pageName = normalizePage(page || location.pathname.split('/').filter(Boolean)[0]);
  const html = staticPages[pageName] || staticPages.about;

  useEffect(() => {
    document.title = pageTitles[pageName] || 'Lockeen';
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

    return () => {
      document.body.style.overflow = '';
      window.openArticle = undefined;
      window.closeModal = undefined;
      window.showForm = undefined;
    };
  }, [location.pathname]);

  return <div id="static-page-root" className="static-page" dangerouslySetInnerHTML={{ __html: html }} />;
}
