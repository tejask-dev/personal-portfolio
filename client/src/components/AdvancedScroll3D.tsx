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
    
    const { scrollYProgress } = useScroll(); // Track window scroll

    // Smooth background transitions
    const aboutOpacity = useTransform(scrollYProgress, [0.1, 0.25], [0, 1]);
    // Experience is 2nd section (index 2)
    const experienceOpacity = useTransform(scrollYProgress, [0.4, 0.55], [0, 1]);
    // Projects is 3rd section (index 3)
    const projectsOpacity = useTransform(scrollYProgress, [0.7, 0.85], [0, 1]);

    // Intersection Observer for precise section tracking
    useEffect(() => {
        // Correct order based on Home.tsx: Home -> About -> Experience -> Portfolio -> Awards
        const sections = ['home', 'about', 'experience', 'portfolio', 'awards'];
        const observerOptions = {
            root: null,
            rootMargin: '-50% 0px', // Trigger when section is 50% visible
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const index = sections.indexOf(entry.target.id);
                    if (index !== -1) {
                        setCurrentSection(index);
                    }
                }
            });
        }, observerOptions);

        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, []);

    const scrollToSection = (index: number) => {
        const sections = ['home', 'about', 'experience', 'portfolio', 'awards'];
        const element = document.getElementById(sections[index]);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div ref={containerRef} className="relative min-h-screen bg-[#04020e]">
            {/* Starry Background - Base Layer */}
            <div className="fixed inset-0 z-[1]">
                <StarryBackground />
            </div>
            
            {/* Background Gradients - Layered for Depth */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                {/* Default/Hero Background - Deep Space */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#04020e] via-[#0a051e] to-[#04020e]" />

                {/* About Section - Pure Black/Void */}
                <motion.div
                    className="absolute inset-0 bg-black"
                    style={{ opacity: aboutOpacity }}
                />
                
                {/* Experience Section - Deep Nebula */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-tl from-[#0a0a2e] to-black"
                    style={{ opacity: experienceOpacity }}
                />

                {/* Projects Section - Cosmic Purple/Blue Tint */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-[#0f0529] via-[#04020e] to-[#1a0b38]"
                    style={{ opacity: projectsOpacity }}
                />
            </div>

            {/* Main Content */}
            <div className="relative z-10">
                {children}
            </div>

            {/* Right Side Navigation Dots */}
            <div className="fixed right-4 md:right-8 top-1/2 transform -translate-y-1/2 z-50 hidden md:block">
                <div className="flex flex-col gap-4">
                    {['Hero', 'About', 'Experience', 'Projects', 'Awards'].map((section, index) => (
                        <motion.button
                            key={section}
                            onClick={() => scrollToSection(index)}
                            className="group relative flex items-center justify-end"
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            {/* Label on Hover */}
                            <motion.span 
                                className="absolute right-6 px-2 py-1 bg-white/10 backdrop-blur-md rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap"
                                initial={{ x: 10 }}
                                whileHover={{ x: 0 }}
                            >
                                {section}
                            </motion.span>
                            
                            {/* Dot */}
                            <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-500 border border-white/30 ${
                                currentSection === index 
                                    ? 'bg-white scale-125 shadow-[0_0_10px_rgba(255,255,255,0.8)]' 
                                    : 'bg-transparent hover:bg-white/50'
                            }`} />
                        </motion.button>
                    ))}
                </div>
            </div>
        </div>
    );
}
