'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, User, Briefcase, Code, Mail, Sparkles, Star, Award } from 'lucide-react';

export default function Navigation() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeSection, setActiveSection] = useState('home');

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
            
            // Update active section based on scroll position
            const sections = ['home', 'about', 'experience', 'portfolio', 'awards'];
            const scrollPosition = window.scrollY + 100;
            
            for (let i = sections.length - 1; i >= 0; i--) {
                const element = document.getElementById(sections[i]);
                if (element && element.offsetTop <= scrollPosition) {
                    setActiveSection(sections[i]);
                    break;
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

  const navItems = [
        { name: 'Home', href: '#home', icon: Home, id: 'home' },
        { name: 'About', href: '#about', icon: User, id: 'about' },
        { name: 'Experience', href: '#experience', icon: Briefcase, id: 'experience' },
        { name: 'Projects', href: '#portfolio', icon: Code, id: 'portfolio' },
        { name: 'Awards', href: '#awards', icon: Award, id: 'awards' }
    ];

    const scrollToSection = (href: string) => {
        const element = document.querySelector(href);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
        setIsOpen(false);
    };

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-transparent"
        >
            <div className="container mx-auto px-4 relative z-10">
                <div className="flex items-center justify-center h-16 mt-4">
                    {/* Centered Navigation with Icons and Words */}
                    <motion.div
                        className="hidden lg:flex items-center space-x-1 bg-black/40 rounded-full px-6 py-3 border border-purple-500/50"
                        whileHover={{
                            scale: 1.05,
                        }}
                        transition={{ duration: 0.3 }}
                    >
                        {navItems.map((item, index) => {
                            const Icon = item.icon;
                            const isActive = activeSection === item.id;

  return (
                                <motion.div
                                    key={item.name}
                                    className="relative group"
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <motion.button
                                        onClick={() => scrollToSection(item.href)}
                                        whileHover={{ 
                                            y: -3,
                                            scale: 1.1,
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        className={`relative px-3 py-2 rounded-full transition-all duration-300 flex items-center gap-2 ${
                                            isActive 
                                                ? 'bg-gradient-to-r from-purple-500/40 to-pink-500/40' 
                                                : 'hover:bg-white/20'
                                        }`}
                                    >
                                        <Icon className={`w-4 h-4 transition-colors ${
                                            isActive 
                                                ? 'text-purple-400' 
                                                : 'text-gray-300 group-hover:text-purple-400'
                                        }`} />
                                        <span className={`text-sm font-medium transition-colors ${
                                            isActive 
                                                ? 'text-white' 
                                                : 'text-gray-300 group-hover:text-white'
                                        }`}>
                                            {item.name}
                                        </span>
                                        
                                        {/* Active indicator */}
                                        {isActive && (
                                            <motion.div
                                                className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full"
                                                layoutId="activeTab"
                                                transition={{ duration: 0.3 }}
                                            />
                                        )}
                                    </motion.button>
                                    
                                </motion.div>
                            );
                        })}
                    </motion.div>

                    {/* Logo for mobile/tablet */}
                    <motion.div
                        className="lg:hidden text-lg font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"
                        whileHover={{ scale: 1.05 }}
                    >
              Tejas Kaushik
                    </motion.div>

                    {/* Tablet Navigation */}
                    <div className="hidden md:flex lg:hidden items-center space-x-1 ml-auto">
                        {navItems.map((item, index) => {
                            const Icon = item.icon;
                            const isActive = activeSection === item.id;
                            
                            return (
                                <motion.button
                                    key={item.name}
                                    onClick={() => scrollToSection(item.href)}
                                    whileHover={{ y: -2, scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`flex items-center gap-1 px-2 py-2 rounded-lg transition-all duration-300 group ${
                                        isActive ? 'bg-purple-500/20 text-purple-400' : 'text-gray-300 hover:text-white hover:bg-white/10'
                                    }`}
                >
                                    <Icon className="w-4 h-4" />
                                    <span className="text-xs font-medium hidden lg:inline">{item.name}</span>
                                </motion.button>
                            );
                        })}
          </div>

          {/* Mobile Menu Button */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden ml-auto p-2 text-gray-300 hover:text-white transition-colors relative"
                    >
                        <motion.div
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.3 }}
            >
                            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </motion.div>
                    </motion.button>
          </div>
        </div>

            {/* Enhanced Mobile Menu */}
        <AnimatePresence>
                {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="md:hidden bg-slate-900/98 backdrop-blur-xl border-t border-purple-500/30"
            >
                        <div className="container mx-auto px-4 py-6">
                            <div className="space-y-2">
                                {navItems.map((item, index) => {
                                    const Icon = item.icon;
                                    const isActive = activeSection === item.id;
                                    
                                    return (
                                        <motion.button
                                            key={item.name}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            onClick={() => scrollToSection(item.href)}
                                            className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all duration-300 group ${
                                                isActive 
                                                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/50' 
                                                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                                            }`}
                                        >
                                            <motion.div
                                                animate={isActive ? { rotate: [0, 10, -10, 0] } : {}}
                                                transition={{ duration: 0.5 }}
                                            >
                                                <Icon className={`w-5 h-5 transition-colors ${
                                                    isActive 
                                                        ? 'text-purple-400' 
                                                        : 'group-hover:text-purple-400'
                                                }`} />
                                            </motion.div>
                                            <span className={`font-medium transition-colors ${
                                                isActive ? 'text-white' : ''
                                            }`}>
                                                {item.name}
                                            </span>
                                            
                                            {/* Active indicator */}
                                            {isActive && (
                                                <motion.div
                                                    className="ml-auto w-2 h-2 bg-purple-400 rounded-full"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ delay: 0.2 }}
                                                />
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </motion.nav>
  );
}