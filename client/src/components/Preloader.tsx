'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export const PRELOADER_DONE_EVENT = 'tk:preloader-done';
export const MODEL_READY_EVENT = 'tk:model-ready';

const MIN_VISIBLE_MS = 1900;
const MAX_VISIBLE_MS = 3800;

const bootLines = [
  'Initializing Tejass Kaushik',
  'Loading AI Founder Interface',
  'Western CS + Ivey · Class of 2030',
  'Building at the intersection of AI and ambition',
];

declare global {
  interface Window {
    __tkPreloaderDone?: boolean;
  }
}

export default function Preloader() {
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [lineIndex, setLineIndex] = useState(0);
  const [fill, setFill] = useState(0);
  const modelReady = useRef(false);

  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    let lineTimer = 0;
    let done = false;

    const onModelReady = () => {
      modelReady.current = true;
    };
    window.addEventListener(MODEL_READY_EVENT, onModelReady);

    const finish = () => {
      if (done) return;
      done = true;
      window.__tkPreloaderDone = true;
      window.dispatchEvent(new Event(PRELOADER_DONE_EVENT));
      setVisible(false);
    };

    const tick = () => {
      const elapsed = performance.now() - start;
      // Time-driven fill that holds near the end until the model confirms,
      // so the bar never stalls and never lies for long.
      const timeFill = Math.min(0.92, elapsed / MIN_VISIBLE_MS) * 100;
      setFill(modelReady.current ? Math.max(timeFill, 96) : timeFill);

      if (elapsed >= MIN_VISIBLE_MS && (modelReady.current || elapsed >= MAX_VISIBLE_MS)) {
        setFill(100);
        finish();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    lineTimer = window.setInterval(() => {
      setLineIndex((index) => Math.min(index + 1, bootLines.length - 1));
    }, 520);

    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(lineTimer);
      window.removeEventListener(MODEL_READY_EVENT, onModelReady);
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (!visible) document.body.style.overflow = '';
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-label="Loading portfolio"
          exit={{ opacity: 0, scale: reducedMotion ? 1 : 1.02 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#070312]"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(124,58,237,0.22),transparent_55%),radial-gradient(ellipse_at_50%_-20%,rgba(56,189,248,0.08),transparent_50%)]"
          />
          {!reducedMotion && (
            <motion.div
              aria-hidden="true"
              initial={{ y: '-10%' }}
              animate={{ y: '110%' }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c084fc]/40 to-transparent"
              style={{ position: 'absolute' }}
            />
          )}

          <div className="relative flex w-full max-w-md flex-col items-center px-8 text-center">
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-xs font-bold uppercase tracking-[0.34em] text-[#c084fc]"
            >
              Tejass Kaushik
            </motion.p>

            <div className="mt-5 h-6 overflow-hidden" aria-hidden="true">
              <AnimatePresence mode="wait">
                <motion.p
                  key={lineIndex}
                  initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
                  transition={{ duration: 0.32 }}
                  className="text-sm font-medium tracking-wide text-[#ede9fe]/85"
                >
                  {bootLines[lineIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="mt-7 h-px w-full overflow-hidden rounded-full bg-[#f8fbff]/10">
              <div
                className="h-full bg-gradient-to-r from-[#7c3aed] via-[#a855f7] to-[#38bdf8] transition-[width] duration-300 ease-out"
                style={{ width: `${fill}%` }}
              />
            </div>
            <p className="mt-3 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[#ddd6fe]/45" aria-hidden="true">
              {Math.round(fill)}%
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
