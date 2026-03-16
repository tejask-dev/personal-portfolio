'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, User, Briefcase, Code, Award } from 'lucide-react';

export default function Navigation() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeSection, setActiveSection] = useState('home');

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 60);

            const sections = ['home', 'about', 'experience', 'portfolio', 'awards'];
            const scrollPosition = window.scrollY + 120;

            for (let i = sections.length - 1; i >= 0; i--) {
                const element = document.getElementById(sections[i]);
                if (element && element.offsetTop <= scrollPosition) {
                    setActiveSection(sections[i]);
                    break;
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navItems = [
        { name: 'Home', href: '#home', icon: Home, id: 'home' },
        { name: 'About', href: '#about', icon: User, id: 'about' },
        { name: 'Experience', href: '#experience', icon: Briefcase, id: 'experience' },
        { name: 'Projects', href: '#portfolio', icon: Code, id: 'portfolio' },
        { name: 'Awards', href: '#awards', icon: Award, id: 'awards' },
    ];

    const scrollToSection = (href: string) => {
        const element = document.querySelector(href);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
        setIsOpen(false);
    };

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed top-0 left-0 right-0 z-50"
        >
            {/* Navbar inner container — adapts on scroll */}
            <div
                className={`transition-all duration-500 ${
                    scrolled
                        ? 'mx-3 sm:mx-6 mt-3 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]'
                        : 'mx-0 mt-0 rounded-none border-transparent bg-transparent backdrop-blur-none'
                }`}
            >
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-center h-16">

                        {/* Desktop nav pill */}
                        <div className="hidden lg:flex items-center gap-1">
                            {navItems.map((item, index) => {
                                const Icon = item.icon;
                                const isActive = activeSection === item.id;
                                return (
                                    <motion.div
                                        key={item.name}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.08 }}
                                        className="relative"
                                    >
                                        <motion.button
                                            onClick={() => scrollToSection(item.href)}
                                            whileHover={{ y: -2 }}
                                            whileTap={{ scale: 0.95 }}
                                            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 ${
                                                isActive
                                                    ? 'text-white'
                                                    : 'text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            {/* Active background */}
                                            {isActive && (
                                                <motion.div
                                                    layoutId="navActive"
                                                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30"
                                                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                                />
                                            )}
                                            <Icon className={`relative z-10 w-4 h-4 transition-colors ${isActive ? 'text-purple-400' : ''}`} />
                                            <span className="relative z-10">{item.name}</span>
                                        </motion.button>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Mobile / tablet brand name (left) */}
                        <div className="lg:hidden flex items-center w-full justify-between">
                            <motion.span
                                className="text-base font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"
                                whileHover={{ scale: 1.04 }}
                            >
                                Tejas Kaushik
                            </motion.span>

                            {/* Tablet icons-only row */}
                            <div className="hidden md:flex items-center gap-1">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeSection === item.id;
                                    return (
                                        <motion.button
                                            key={item.name}
                                            onClick={() => scrollToSection(item.href)}
                                            whileHover={{ y: -2, scale: 1.08 }}
                                            whileTap={{ scale: 0.94 }}
                                            className={`relative p-2.5 rounded-xl transition-all duration-200 ${
                                                isActive
                                                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                                    : 'text-gray-400 hover:text-white hover:bg-white/8'
                                            }`}
                                            aria-label={item.name}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {/* Mobile hamburger */}
                            <motion.button
                                whileTap={{ scale: 0.92 }}
                                onClick={() => setIsOpen(!isOpen)}
                                className="md:hidden p-2 text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                                aria-label="Toggle menu"
                            >
                                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
                                    {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                                </motion.div>
                            </motion.button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="md:hidden mx-3 mt-2 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-2xl overflow-hidden shadow-2xl"
                    >
                        <div className="p-3 space-y-1">
                            {navItems.map((item, index) => {
                                const Icon = item.icon;
                                const isActive = activeSection === item.id;
                                return (
                                    <motion.button
                                        key={item.name}
                                        initial={{ opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => scrollToSection(item.href)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                                            isActive
                                                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-white'
                                                : 'text-gray-400 hover:text-white hover:bg-white/8'
                                        }`}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : ''}`} />
                                        <span className="text-sm font-medium">{item.name}</span>
                                        {isActive && (
                                            <motion.div
                                                layoutId="mobileActive"
                                                className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                            />
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
}
