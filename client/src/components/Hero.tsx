'use client';
import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, Mail } from 'lucide-react';
import { FaGithub, FaInstagram, FaLinkedin } from 'react-icons/fa';
import { profile } from '@/data/profile';
import { useMediaQuery } from '@/hooks/use-media-query';
import ScrollTextReveal from './ScrollTextReveal';
import SceneErrorBoundary from './SceneErrorBoundary';
import Magnetic from './Magnetic';

const HeroRobot3D = lazy(() => import('./HeroRobot3D'));

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};

const badgeVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.3 } },
};

const badgeItem = {
  hidden: { opacity: 0, scale: 0.9, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export default function Hero() {
  // Below lg the fixed RobotStage is not rendered; the robot appears as an
  // unframed in-flow scene instead.
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <header id="home" className="relative flex min-h-screen flex-col justify-center overflow-hidden px-5 pb-10 pt-28">
      {/* Soft scrim so hero copy stays readable where it floats over the
          robot's desk, without boxing the scene in. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-[58%] bg-gradient-to-r from-[#070312]/85 via-[#070312]/35 to-transparent lg:block"
      />
      <motion.div
        className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-4xl">
          <motion.div variants={badgeVariants} initial="hidden" animate="visible" className="mb-6 flex flex-wrap gap-2">
            {profile.badges.map((badge, index) => (
              <motion.span
                key={badge}
                variants={badgeItem}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide ${
                  index === 0
                    ? 'border-[#c084fc]/45 bg-[#7c3aed]/16 text-[#e9d5ff]'
                    : 'border-[#f8fbff]/12 bg-[#f8fbff]/[0.05] text-[#ddd6fe]'
                }`}
              >
                {badge}
              </motion.span>
            ))}
          </motion.div>

          {/* Single, descriptive H1 for SEO/screen readers; the animated
              headline below is presentational to avoid a duplicate H1. */}
          <motion.h1 variants={item} className="sr-only">
            Tejass Kaushik — building at the intersection of AI, entrepreneurship, and human ambition.
          </motion.h1>

          <ScrollTextReveal
            as="p"
            text="Building at the intersection of AI, entrepreneurship, and human ambition."
            className="max-w-5xl text-[clamp(2.6rem,6.2vw,5.4rem)] font-semibold leading-[1.02] tracking-normal"
          />

          <motion.p
            variants={item}
            className="mt-7 max-w-2xl text-lg leading-8 text-[#ede9fe] md:text-xl md:leading-9"
          >
            I'm Tejass Kaushik — an incoming Western University Computer Science + Ivey AEO student and AI
            entrepreneur building products across education, finance, and social impact.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Magnetic className="flex sm:inline-flex">
              <button
                type="button"
                onClick={() => scrollTo('portfolio')}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#a855f7] px-7 py-3.5 text-sm font-bold text-white shadow-[0_16px_44px_rgba(168,85,247,0.3)] transition hover:bg-[#c084fc] focus:outline-none focus:ring-2 focus:ring-[#c084fc] focus:ring-offset-2 focus:ring-offset-[#070312]"
              >
                View Projects
              </button>
            </Magnetic>
            <Magnetic className="flex sm:inline-flex">
              <button
                type="button"
                onClick={() => scrollTo('contact')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#f8fbff]/[0.18] bg-[#f8fbff]/[0.07] px-7 py-3.5 text-sm font-bold text-[#f8fbff] backdrop-blur transition hover:border-[#c084fc]/70 hover:bg-[#f8fbff]/12 focus:outline-none focus:ring-2 focus:ring-[#c084fc] focus:ring-offset-2 focus:ring-offset-[#070312]"
              >
                Contact Me
              </button>
            </Magnetic>
          </motion.div>

          <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-5 text-sm text-[#d8b4fe]">
            <a className="inline-flex items-center gap-2 transition hover:text-[#f0abfc]" href={profile.socials.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <FaLinkedin className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">LinkedIn</span>
            </a>
            <a className="inline-flex items-center gap-2 transition hover:text-[#f0abfc]" href={profile.socials.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <FaGithub className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
            <a className="inline-flex items-center gap-2 transition hover:text-[#f0abfc]" href={profile.socials.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <FaInstagram className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Instagram</span>
            </a>
            <a className="inline-flex items-center gap-2 transition hover:text-[#f0abfc]" href={`mailto:${profile.email}`} aria-label="Email">
              <Mail className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Email</span>
            </a>
          </motion.div>
        </div>

        {/* Desktop: this column stays empty — the robot lives on the fixed
            RobotStage layer behind the content and occupies this space.
            Mobile/tablet: the robot renders here in normal flow, unframed,
            directly over the galaxy background. */}
        {isDesktop ? (
          <div aria-hidden="true" />
        ) : (
          <motion.div variants={item} className="relative h-[420px] sm:h-[480px]" aria-hidden="true">
            <SceneErrorBoundary>
              <Suspense fallback={null}>
                <HeroRobot3D cameraY={12.2} zoom={0.92} />
              </Suspense>
            </SceneErrorBoundary>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.65 }}
        className="mx-auto mt-16 w-full max-w-7xl"
        aria-label="Selected impact metrics"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:max-w-3xl">
          {profile.metrics.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#f8fbff]/[0.08] bg-[#16091f]/62 p-3.5 text-center backdrop-blur transition hover:border-[#c084fc]/40 hover:bg-[#2e1065]/30"
            >
              <div className="text-xl font-bold text-[#f0abfc]">{stat.value}</div>
              <div className="mt-1 text-xs leading-4 text-[#ede9fe]/72">{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      <button
        type="button"
        onClick={() => scrollTo('about')}
        className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#f8fbff]/50 transition hover:text-[#f0abfc] md:inline-flex"
        aria-label="Scroll to about section"
      >
        Scroll
        <ArrowDown className="h-4 w-4 animate-bounce" />
      </button>
    </header>
  );
}
