import { useEffect } from "react";
import { motion, useMotionValue, useMotionTemplate, useAnimationFrame } from "framer-motion";

function GridPattern({ offsetX, offsetY }) {
  return (
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <motion.pattern
          id="lockeen-grid-pattern"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#lockeen-grid-pattern)" />
    </svg>
  );
}

export default function InfiniteGridBg({ heroRef }) {
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);
  const gridOffsetX = useMotionValue(0);
  const gridOffsetY = useMotionValue(0);

  useEffect(() => {
    const onMove = (e) => {
      const el = heroRef?.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [heroRef, mouseX, mouseY]);

  useAnimationFrame(() => {
    gridOffsetX.set((gridOffsetX.get() + 0.4) % 40);
    gridOffsetY.set((gridOffsetY.get() + 0.4) % 40);
  });

  const maskImage = useMotionTemplate`radial-gradient(380px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {/* base grid — very subtle always-on layer */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.045, color: '#3730E8' }}>
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </div>
      {/* mouse-reveal grid layer */}
      <motion.div style={{ position: 'absolute', inset: 0, opacity: 0.38, color: '#3730E8', maskImage, WebkitMaskImage: maskImage }}>
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </motion.div>
      {/* ambient blobs — Lockeen palette */}
      <div style={{ position: 'absolute', right: '-8%', top: '-25%', width: '45%', height: '60%', borderRadius: '50%', background: 'rgba(55,48,232,0.06)', filter: 'blur(90px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: '-5%', bottom: '-15%', width: '35%', height: '45%', borderRadius: '50%', background: 'rgba(139,92,246,0.06)', filter: 'blur(90px)', pointerEvents: 'none' }} />
    </div>
  );
}
