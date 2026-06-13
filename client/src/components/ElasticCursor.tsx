'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Elastic "jelly" cursor in the spirit of the Abhijit Zende reference: a blob
 * that springs after the pointer, squeezes and stretches along its velocity
 * vector, and morphs into a rounded rectangle when it's over an interactive
 * element. The native cursor stays fully usable (this is a pointer-events-none
 * overlay). Disabled for touch devices and reduced-motion.
 *
 * Uses `backdrop-filter: invert()` so the blob and dot read against both the
 * dark galaxy and any bright card without needing per-section colors.
 */
const BASE = 26; // resting blob diameter (px)

function getScale(vx: number, vy: number) {
  const distance = Math.sqrt(vx * vx + vy * vy);
  return Math.min(distance / 735, 0.35);
}

function getAngle(vx: number, vy: number) {
  return (Math.atan2(vy, vx) * 180) / Math.PI;
}

function hoverTarget(el: Element | null): HTMLElement | null {
  return (el?.closest?.('a, button, [role="button"], .cursor-can-hover') as HTMLElement) ?? null;
}

export default function ElasticCursor() {
  const [enabled, setEnabled] = useState(false);
  const blobRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reducedMotion) return;
    setEnabled(true);

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { ...mouse };
    const vel = { x: 0, y: 0 };
    // Current animated box (lerped toward target each frame for the morph).
    const box = { w: BASE, h: BASE, r: BASE / 2 };
    let hovering: HTMLElement | null = null;
    let visible = false;
    let frame = 0;

    const onMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      hovering = hoverTarget(event.target as Element);
      if (!visible) {
        visible = true;
        pos.x = mouse.x;
        pos.y = mouse.y;
        if (blobRef.current) blobRef.current.style.opacity = '1';
        if (dotRef.current) dotRef.current.style.opacity = '1';
      }
    };
    const onLeave = () => {
      visible = false;
      if (blobRef.current) blobRef.current.style.opacity = '0';
      if (dotRef.current) dotRef.current.style.opacity = '0';
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      const blob = blobRef.current;
      const dot = dotRef.current;
      if (blob && dot) {
        if (hovering) {
          // Morph to the element: settle onto its center, match its box.
          const rect = hovering.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          pos.x = lerp(pos.x, cx, 0.2);
          pos.y = lerp(pos.y, cy, 0.2);
          box.w = lerp(box.w, rect.width + 16, 0.2);
          box.h = lerp(box.h, rect.height + 16, 0.2);
          box.r = lerp(box.r, 12, 0.2);
          blob.style.width = `${box.w}px`;
          blob.style.height = `${box.h}px`;
          blob.style.borderRadius = `${box.r}px`;
          blob.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
        } else {
          // Free follow: spring toward the pointer with a jelly squeeze.
          const prevX = pos.x;
          const prevY = pos.y;
          pos.x = lerp(pos.x, mouse.x, 0.22);
          pos.y = lerp(pos.y, mouse.y, 0.22);
          vel.x = (pos.x - prevX) * 1.2;
          vel.y = (pos.y - prevY) * 1.2;
          const scale = getScale(vel.x, vel.y);
          const angle = getAngle(vel.x, vel.y);
          box.w = lerp(box.w, BASE, 0.2);
          box.h = lerp(box.h, BASE, 0.2);
          box.r = lerp(box.r, BASE / 2, 0.2);
          blob.style.width = `${box.w}px`;
          blob.style.height = `${box.h}px`;
          blob.style.borderRadius = `${box.r}px`;
          blob.style.transform =
            `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) ` +
            `rotate(${angle}deg) scale(${1 + scale}, ${1 - scale * 2})`;
        }
        dot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0) translate(-50%, -50%)`;
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
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[95]">
      <div
        ref={blobRef}
        className="absolute left-0 top-0 opacity-0 transition-opacity duration-300 will-change-transform"
        style={{ width: BASE, height: BASE, borderRadius: BASE / 2, backdropFilter: 'invert(1)', WebkitBackdropFilter: 'invert(1)' }}
      />
      <div
        ref={dotRef}
        className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full opacity-0 transition-opacity duration-300 will-change-transform"
        style={{ backdropFilter: 'invert(1)', WebkitBackdropFilter: 'invert(1)' }}
      />
    </div>
  );
}
