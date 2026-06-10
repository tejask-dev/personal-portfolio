'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Ambient cursor layer: a small follower dot plus a soft light field that
 * trails the native cursor (which stays fully usable). The dot grows over
 * interactive elements. Disabled for touch devices and reduced motion.
 */
export default function CursorGlow() {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reducedMotion) return;
    setEnabled(true);

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const dot = { ...target };
    const glow = { ...target };
    let scale = 1;
    let targetScale = 1;
    let visible = false;
    let frame = 0;

    const onMove = (event: MouseEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
      if (!visible) {
        visible = true;
        dot.x = glow.x = target.x;
        dot.y = glow.y = target.y;
        if (dotRef.current) dotRef.current.style.opacity = '1';
        if (glowRef.current) glowRef.current.style.opacity = '1';
      }
      const interactive = (event.target as Element | null)?.closest?.(
        'a, button, [role="button"], input, textarea, canvas',
      );
      targetScale = interactive ? 2.4 : 1;
    };

    const onLeave = () => {
      visible = false;
      if (dotRef.current) dotRef.current.style.opacity = '0';
      if (glowRef.current) glowRef.current.style.opacity = '0';
    };

    const tick = () => {
      dot.x += (target.x - dot.x) * 0.35;
      dot.y += (target.y - dot.y) * 0.35;
      glow.x += (target.x - glow.x) * 0.1;
      glow.y += (target.y - glow.y) * 0.1;
      scale += (targetScale - scale) * 0.18;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${dot.x}px, ${dot.y}px, 0) translate(-50%, -50%) scale(${scale})`;
      }
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${glow.x}px, ${glow.y}px, 0) translate(-50%, -50%)`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    document.addEventListener('mousemove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90]">
      <div
        ref={glowRef}
        className="absolute left-0 top-0 h-[340px] w-[340px] rounded-full opacity-0 transition-opacity duration-300"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.10) 0%, rgba(56,189,248,0.04) 42%, transparent 68%)',
        }}
      />
      <div
        ref={dotRef}
        className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-[#e9d5ff] opacity-0 shadow-[0_0_12px_rgba(192,132,252,0.85)] transition-opacity duration-300"
      />
    </div>
  );
}
