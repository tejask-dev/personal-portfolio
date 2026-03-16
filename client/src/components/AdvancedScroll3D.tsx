'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import StarryBackground from './StarryBackground';

interface AdvancedScroll3DProps {
    children: React.ReactNode;
}

export default function AdvancedScroll3D({ children }: AdvancedScroll3DProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentSection, setCurrentSection] = useState(0);

    const { scrollYProgress } = useScroll();

    // Smooth background transitions per section
    const aboutOpacity     = useTransform(scrollYProgress, [0.08, 0.22], [0, 1]);
    const experienceOpacity = useTransform(scrollYProgress, [0.38, 0.52], [0, 1]);
    const projectsOpacity  = useTransform(scrollYProgress, [0.64, 0.78], [0, 1]);
    const awardsOpacity    = useTransform(scrollYProgress, [0.82, 0.92], [0, 1]);

    useEffect(() => {
        const sections = ['home', 'about', 'experience', 'portfolio', 'awards'];
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = sections.indexOf(entry.target.id);
                        if (index !== -1) setCurrentSection(index);
                    }
                });
            },
            { root: null, rootMargin: '-50% 0px', threshold: 0 }
        );

        sections.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    const scrollToSection = (index: number) => {
        const sections = ['home', 'about', 'experience', 'portfolio', 'awards'];
        document.getElementById(sections[index])?.scrollIntoView({ behavior: 'smooth' });
    };

    const sectionLabels = ['Hero', 'About', 'Experience', 'Projects', 'Awards'];

    return (
        <div ref={containerRef} className="relative min-h-screen bg-[#04020e]">

            {/* ── Starry canvas — base layer ── */}
            <div className="fixed inset-0 z-[1] pointer-events-none">
                <StarryBackground />
            </div>

            {/* ── Background gradient layers ── */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                {/* Hero — deep space */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#04020e] via-[#080420] to-[#04020e]" />

                {/* About — clean void with faint purple */}
                <motion.div
                    className="absolute inset-0"
                    style={{
                        opacity: aboutOpacity,
                        background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(30,10,60,0.8) 0%, transparent 70%)',
                    }}
                />

                {/* Experience — deep nebula */}
                <motion.div
                    className="absolute inset-0"
                    style={{
                        opacity: experienceOpacity,
                        background: 'linear-gradient(135deg, rgba(8,4,30,0.9) 0%, rgba(20,6,50,0.7) 50%, rgba(4,2,14,0.9) 100%)',
                    }}
                />

                {/* Projects — cosmic purple */}
                <motion.div
                    className="absolute inset-0"
                    style={{
                        opacity: projectsOpacity,
                        background: 'radial-gradient(ellipse 100% 80% at 30% 50%, rgba(50,10,100,0.5) 0%, transparent 70%)',
                    }}
                />

                {/* Awards — golden-purple tint */}
                <motion.div
                    className="absolute inset-0"
                    style={{
                        opacity: awardsOpacity,
                        background: 'radial-gradient(ellipse 80% 60% at 70% 60%, rgba(60,20,80,0.5) 0%, transparent 70%)',
                    }}
                />

                {/* Persistent subtle vignette */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 50%, rgba(4,2,14,0.6) 100%)',
                    }}
                />
            </div>

            {/* ── Main content ── */}
            <div className="relative z-10">
                {children}
            </div>

            {/* ── Right-side section nav dots ── */}
            <div className="fixed right-4 md:right-6 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col gap-4 items-center">
                {sectionLabels.map((label, index) => {
                    const isActive = currentSection === index;
                    return (
                        <motion.button
                            key={label}
                            onClick={() => scrollToSection(index)}
                            className="group relative flex items-center justify-end"
                            whileHover={{ scale: 1.3 }}
                            whileTap={{ scale: 0.88 }}
                            aria-label={`Go to ${label}`}
                        >
                            {/* Tooltip */}
                            <motion.span
                                className="absolute right-7 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-lg text-xs text-white border border-white/10 opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none"
                                initial={{ x: 6, opacity: 0 }}
                                whileHover={{ x: 0, opacity: 1 }}
                                transition={{ duration: 0.15 }}
                            >
                                {label}
                            </motion.span>

                            {/* Dot */}
                            <div className="relative flex items-center justify-center w-5 h-5">
                                {/* Outer ring when active */}
                                {isActive && (
                                    <motion.div
                                        layoutId="navDotRing"
                                        className="absolute inset-0 rounded-full border border-purple-400/60"
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <div
                                    className={`rounded-full transition-all duration-400 ${
                                        isActive
                                            ? 'w-2.5 h-2.5 bg-purple-400 shadow-[0_0_10px_rgba(139,92,246,0.9)]'
                                            : 'w-1.5 h-1.5 bg-white/25 group-hover:bg-white/60'
                                    }`}
                                />
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
