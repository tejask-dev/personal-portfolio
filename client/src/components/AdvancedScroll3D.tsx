'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import StarBackground from './StarBackground';
import HeroNodeField from './HeroNodeField';
import SceneErrorBoundary from './SceneErrorBoundary';

interface AdvancedScroll3DProps {
  children: React.ReactNode;
  /** Fixed layer between the galaxy background and the content (e.g. the robot stage). */
  stage?: React.ReactNode;
  /** Topmost fixed layers (preloader, cursor glow) that must sit above all chrome. */
  overlay?: React.ReactNode;
}

const sections = ['home', 'about', 'skills', 'western-ivey', 'experience', 'portfolio', 'awards', 'leadership', 'contact'];
const labels = ['Home', 'About', 'Skills', 'Western + Ivey', 'Experience', 'Projects', 'Recognition', 'Leadership', 'Contact'];

export default function AdvancedScroll3D({ children, stage, overlay }: AdvancedScroll3DProps) {
  const [currentSection, setCurrentSection] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = sections.indexOf(entry.target.id);
            if (index !== -1) setCurrentSection(index);
          }
        });
      },
      { root: null, rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );

    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#070312] text-[#f8fbff]">
      {/* Star background — sits below everything, fixed */}
      <SceneErrorBoundary>
        <StarBackground />
      </SceneErrorBoundary>

      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Deep space gradient overlay for readability */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(147,51,234,0.28)_0%,rgba(88,28,135,0.18)_34%,rgba(7,3,18,0.82)_78%),radial-gradient(ellipse_at_20%_35%,rgba(59,130,246,0.14),transparent_42%),linear-gradient(180deg,rgba(7,3,18,0.34),rgba(7,3,18,0.92))]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(216,180,254,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(216,180,254,0.025)_1px,transparent_1px)] bg-[size:72px_72px] opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
        <div className="absolute inset-0 noise-overlay" />
        {/* Hero node field — neural net overlay, only in hero viewport */}
        <div className="absolute inset-x-0 top-0 h-screen">
          <HeroNodeField />
        </div>
      </div>

      {stage}

      <div className="relative z-10">{children}</div>

      {overlay}

      <nav
        aria-label="Section navigation"
        className="fixed right-5 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-3 md:flex"
      >
        {labels.map((label, index) => {
          const isActive = currentSection === index;
          return (
            <motion.button
              key={label}
              type="button"
              onClick={() => document.getElementById(sections[index])?.scrollIntoView({ behavior: 'smooth' })}
              className="group relative flex h-8 w-8 items-center justify-center"
              whileHover={{ scale: 1.08 }}
              aria-label={`Go to ${label}`}
            >
              <span className="absolute right-9 rounded-md border border-white/10 bg-[#16091f]/90 px-2 py-1 text-xs text-[#f8fbff] opacity-0 shadow-lg backdrop-blur transition-opacity group-hover:opacity-100">
                {label}
              </span>
              <span
                className={`rounded-full transition-all ${
                  isActive
                    ? 'h-3 w-3 bg-[#a855f7] shadow-[0_0_0_6px_rgba(59,130,246,0.16)]'
                    : 'h-1.5 w-1.5 bg-[#f8fbff]/35 group-hover:bg-[#f8fbff]/70'
                }`}
              />
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
}
