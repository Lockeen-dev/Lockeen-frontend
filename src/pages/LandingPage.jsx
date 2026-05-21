import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ProductScrollPreview from '../components/ProductScrollPreview';
import { landingHtml } from '../content/landingHtml';
import { initMarketingDom } from '../marketingBoot';
import LockeenRuntime from '../LockeenRuntime';

export default function LandingPage() {
  const [productPreviewRoot, setProductPreviewRoot] = useState(null);

  useEffect(() => {
    window.showPage = function showPage(id) {
      document.querySelectorAll('.page').forEach((page) => { page.style.display = 'none'; });
      const el = document.getElementById(id);
      if (el) el.style.display = 'block';
      try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch { window.scrollTo(0, 0); }
    };
    initMarketingDom();
    setProductPreviewRoot(document.getElementById('product-scroll-preview-root'));
    return () => {
      window.showPage = undefined;
      window.openAuth = undefined;
      window.closeAuth = undefined;
      window.signOut = undefined;
      window.setLockeenLanguage = undefined;
      setProductPreviewRoot(null);
    };
  }, []);

  return (
    <>
      <div id="page-landing" className="page" dangerouslySetInnerHTML={{ __html: landingHtml }} />
      {productPreviewRoot && createPortal(<ProductScrollPreview />, productPreviewRoot)}
      <div id="page-app" className="page notranslate" translate="no" style={{ display: 'none' }} />
      <LockeenRuntime />
    </>
  );
}
