'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Pause, Play, Trophy } from 'lucide-react';
import ScrollTextReveal from './ScrollTextReveal';
import Img3MT from '../assets/Youreka/3MT.png';
import ImgChemistry from '../assets/Science Olympiad/Chemisty.jpg';
import ImgHydroecology from '../assets/Science Olympiad/Hydroecology.jpg';
import ImgSymposium from '../assets/Youreka/YourekaSymposium.jpg';
import ImgTargetAlpha from '../assets/Target Alpha/TargetAlpha.jpg';

const awards = [
  { image: ImgSymposium, title: 'Youreka National Research Symposium', year: '2025', note: 'First place nationally for HIV treatment research and presentation quality.' },
  { image: Img3MT, title: 'Youreka 3MT Challenge', year: '2025', note: 'First place nationally for translating complex health research into a concise public presentation.' },
  { image: ImgTargetAlpha, title: 'Target Alpha National Finalist', year: '2023', note: 'Top 7 national recognition for finance, investment analysis, and strategic recommendations.' },
  { image: ImgChemistry, title: 'Science Olympiad Chemistry', year: '2022', note: 'First place in analytical chemistry problem solving at the University of Guelph event.' },
  { image: ImgHydroecology, title: 'Science Olympiad Hydroecology', year: '2022', note: 'First place for environmental science analysis and applied field reasoning.' },
];

const recognition = [
  'Incoming Western Computer Science + Ivey, Class of 2030',
  'CCC Junior: 71/75',
  'CCC Senior distinction: 30/75, top 350 worldwide',
  'Waterloo Catalyst Early Entrepreneurs stream',
  'Harvard Ventures-TECH Summer Program',
  'Summer Company Program approval through Small Business & Entrepreneurship Centre',
  'OSLC Spirit Leader selection',
  'Ethics Bowl Canada regional competition, 2nd place',
];

export default function Awards() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const current = awards[currentIndex];

  useEffect(() => {
    if (!isPlaying) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((index) => (index + 1) % awards.length);
    }, 5200);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  const next = () => setCurrentIndex((index) => (index + 1) % awards.length);
  const previous = () => setCurrentIndex((index) => (index - 1 + awards.length) % awards.length);

  return (
    <section id="awards" className="section-shell">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow text-center">Recognition</p>
        <ScrollTextReveal
          text="Curated awards that signal research strength, communication, and competitive judgment."
          className="section-title mx-auto max-w-4xl text-center"
        />

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mt-12 overflow-hidden rounded-[2rem] border border-[#f8fbff]/10 bg-[#16091f]/76 shadow-2xl shadow-black/20 backdrop-blur-xl"
          onMouseEnter={() => setIsPlaying(false)}
          onMouseLeave={() => setIsPlaying(true)}
        >
          <div className="grid min-h-[460px] md:grid-cols-[1.05fr_0.95fr]">
            <div className="relative min-h-[280px] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.img
                  key={current.title}
                  src={current.image}
                  alt={current.title}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.55 }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-[#16091f] via-transparent to-transparent" />
            </div>

            <div className="flex flex-col justify-between p-6 md:p-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.title}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.35 }}
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#a855f7]/25 bg-[#a855f7]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#ddd6fe]">
                    <Trophy className="h-4 w-4" />
                    {current.year}
                  </div>
                  <h3 className="mt-6 text-3xl font-semibold leading-tight text-[#f8fbff] md:text-4xl">{current.title}</h3>
                  <p className="mt-5 text-base leading-8 text-[#ede9fe]">{current.note}</p>
                </motion.div>
              </AnimatePresence>

              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-[#d8b4fe]">
                  <span>{currentIndex + 1} of {awards.length}</span>
                  <span>{isPlaying ? 'Auto' : 'Paused'}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-[#f8fbff]/10">
                  <motion.div
                    key={`${currentIndex}-${isPlaying}`}
                    initial={{ width: '0%' }}
                    animate={{ width: isPlaying ? '100%' : '100%' }}
                    transition={{ duration: isPlaying ? 5.2 : 0.2, ease: 'linear' }}
                    className="h-full bg-[#a855f7]"
                  />
                </div>

                <div className="mt-5 flex items-center gap-2">
                  <button type="button" onClick={previous} aria-label="Previous award" className="icon-button">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setIsPlaying((value) => !value)} aria-label={isPlaying ? 'Pause awards carousel' : 'Play awards carousel'} className="icon-button">
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={next} aria-label="Next award" className="icon-button">
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {recognition.map((item) => (
            <div key={item} className="rounded-2xl border border-[#f8fbff]/10 bg-[#f8fbff]/[0.055] px-5 py-4 text-sm font-semibold text-[#ede9fe]">
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
