import { useEffect, useState } from 'react';

function detectMobile() {
  if (typeof window === 'undefined') return false;
  const narrow = window.innerWidth < 768;
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches;
  const touchDevice = navigator.maxTouchPoints > 1;
  return narrow && (coarsePointer || touchDevice);
}

export default function useIsMobile() {
  const [mobile, setMobile] = useState(detectMobile);
  useEffect(() => {
    const h = () => setMobile(detectMobile());
    window.addEventListener('resize', h);
    window.addEventListener('orientationchange', h);
    return () => {
      window.removeEventListener('resize', h);
      window.removeEventListener('orientationchange', h);
    };
  }, []);
  return mobile;
}
