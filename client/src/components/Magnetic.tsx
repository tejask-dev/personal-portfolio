'use client';
import { useRef, type ReactNode } from 'react';
import { motion, useReducedMotion, useSpring } from 'framer-motion';

type MagneticProps = {
  children: ReactNode;
  className?: string;
  /** How strongly the element leans toward the cursor (0–1). */
  strength?: number;
};

/**
 * Subtle magnetic hover: the wrapped element leans a few pixels toward the
 * cursor and springs back on leave. No-op for touch and reduced motion.
 */
export default function Magnetic({ children, className, strength = 0.18 }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const x = useSpring(0, { stiffness: 220, damping: 18, mass: 0.5 });
  const y = useSpring(0, { stiffness: 220, damping: 18, mass: 0.5 });

  const onPointerMove = (event: React.PointerEvent) => {
    if (reducedMotion || event.pointerType !== 'mouse' || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((event.clientX - rect.left - rect.width / 2) * strength);
    y.set((event.clientY - rect.top - rect.height / 2) * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      className={className}
    >
      {children}
    </motion.div>
  );
}
