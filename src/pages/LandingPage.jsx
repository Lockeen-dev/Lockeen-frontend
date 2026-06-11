import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import ProductScrollPreview from '../components/ProductScrollPreview';
import InfiniteGridBg from '../components/InfiniteGridBg';
import { landingHtml } from '../content/landingHtml';
import { initMarketingDom } from '../marketingBoot';
import LockeenRuntime from '../LockeenRuntime';

function LandingInteractionLayer() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.2 });

  return (
    <>
      <motion.div className="landing-scroll-progress" style={{ scaleX }} />
    </>
  );
}

export default function LandingPage() {
  const [productPreviewRoot, setProductPreviewRoot] = useState(null);
  const [heroGridRoot, setHeroGridRoot] = useState(null);
  const heroRef = useRef(null);

  useEffect(() => {
    const showPage = function showPage(id) {
      document.querySelectorAll('.page').forEach((page) => { page.style.display = 'none'; });
      const el = document.getElementById(id);
      if (el) el.style.display = 'block';
      try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch { window.scrollTo(0, 0); }
    };
    window.showPage = showPage;
    initMarketingDom();
    setProductPreviewRoot(document.getElementById('product-scroll-preview-root'));

    const landing = document.getElementById('page-landing');
    if (!landing) return undefined;

    // Inject InfiniteGrid into hero section
    const heroSection = landing.querySelector('main > section:first-of-type');
    let gridDiv = null;
    if (heroSection) {
      heroRef.current = heroSection;
      gridDiv = document.createElement('div');
      gridDiv.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0;';
      heroSection.insertBefore(gridDiv, heroSection.firstChild);
      setHeroGridRoot(gridDiv);
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sections = [...landing.querySelectorAll('main > section')];
    const revealTargets = [
      ...sections.slice(1).flatMap((section) => [...section.children]),
      ...landing.querySelectorAll('#features-grid > div, #pricing-grid > div, .uni-pill'),
    ].filter((node) => !node.closest('footer'));

    revealTargets.forEach((node, index) => {
      node.classList.add('landing-reveal');
      node.style.setProperty('--reveal-delay', `${Math.min(index % 8, 7) * 45}ms`);
    });

    const observer = reduceMotion ? null : new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        } else {
          entry.target.classList.remove('is-visible');
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });

    if (observer) revealTargets.forEach((node) => observer.observe(node));
    else revealTargets.forEach((node) => node.classList.add('is-visible'));

    const buttons = [...landing.querySelectorAll('button, a[href^="#"]')];
    const buttonHandlers = [];
    buttons.forEach((button) => {
      button.classList.add('landing-pressable');
      const onPointerDown = () => button.classList.add('is-pressing');
      const onPointerUp = () => button.classList.remove('is-pressing');
      button.addEventListener('pointerdown', onPointerDown);
      button.addEventListener('pointerup', onPointerUp);
      button.addEventListener('pointercancel', onPointerUp);
      button.addEventListener('pointerleave', onPointerUp);
      buttonHandlers.push([button, onPointerDown, onPointerUp]);
    });

    // ── Hero entrance stagger ──
    if (!reduceMotion) {
      const heroSection = landing.querySelector('main > section:first-of-type, section:first-of-type');
      if (heroSection) {
        heroSection.querySelector('.inline-flex')?.classList.add('hero-badge-reveal');
        heroSection.querySelector('h1')?.classList.add('hero-title-reveal');
        heroSection.querySelector('p.text-xl, p.text-2xl')?.classList.add('hero-sub-reveal');
        heroSection.querySelectorAll('.flex.gap-4 > *, .flex.gap-3 > *').forEach((el, i) => {
          el.classList.add('hero-cta-reveal');
          el.style.setProperty('--cta-delay', `${i * 75}ms`);
        });
        // Hero cards (Quiz, Flashcard, AI Tutor) — all 3 staggered
        heroSection.querySelectorAll('.max-w-5xl .grid > div').forEach((card, i) => {
          card.classList.add('hero-card-reveal');
          card.style.setProperty('--card-delay', `${620 + i * 90}ms`);
        });
      }
    }

    // ── Pricing cards: force left-to-right uniform stagger ──
    landing.querySelectorAll('#pricing-grid > div').forEach((card, i) => {
      card.style.setProperty('--reveal-delay', `${i * 60}ms`);
    });

    // ── Nav scroll shadow ──
    const nav = landing.querySelector('nav');
    const onScroll = () => nav?.classList.toggle('is-scrolled', window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (gridDiv) gridDiv.remove();
      setHeroGridRoot(null);
      if (window.showPage === showPage) window.showPage = undefined;
      window.setLockeenLanguage = undefined;
      observer?.disconnect();
      buttonHandlers.forEach(([button, onPointerDown, onPointerUp]) => {
        button.removeEventListener('pointerdown', onPointerDown);
        button.removeEventListener('pointerup', onPointerUp);
        button.removeEventListener('pointercancel', onPointerUp);
        button.removeEventListener('pointerleave', onPointerUp);
      });
      setProductPreviewRoot(null);
    };
  }, []);

  return (
    <>
      <LandingInteractionLayer />
      <div id="page-landing" className="page" dangerouslySetInnerHTML={{ __html: landingHtml }} />
      {heroGridRoot && createPortal(<InfiniteGridBg heroRef={heroRef} />, heroGridRoot)}
      {productPreviewRoot && createPortal(<ProductScrollPreview />, productPreviewRoot)}
      <div id="page-app" className="page notranslate" translate="no" style={{ display: 'none' }} />
      <LockeenRuntime />
    </>
  );
}
