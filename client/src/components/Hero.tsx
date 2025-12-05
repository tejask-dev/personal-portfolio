'use client';
import { useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, Sparkles, Code, Brain, Rocket, Star, ChevronDown } from 'lucide-react';
import VirtualMacBook from './VirtualMacBook';
import SmoothTypingAnimation from './SmoothTypingAnimation';

export default function Hero() {
    const [showMacBook, setShowMacBook] = useState(false);
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"]
    });

    const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    const descriptiveWords = [
        "AI Fanatic", "Entrepreneur", "Innovator", "Problem Solver",
        "Tech Visionary", "Future Builder", "Lifelong Learner",
        "Founder @ Top Score Tutoring", "CTO @ Stellar Learning",
        "Aspiring Software Engineer", "Startup Enthusiast"
    ];

    // Optimized floating elements
    const floatingElements = [
        { icon: Code, delay: 0, x: 15, y: 25, color: 'text-cyan-400' },
        { icon: Brain, delay: 2, x: 85, y: 35, color: 'text-purple-400' },
        { icon: Rocket, delay: 4, x: 25, y: 75, color: 'text-pink-400' },
        { icon: Star, delay: 6, x: 75, y: 65, color: 'text-yellow-400' },
    ];

    const handleClickMe = () => setShowMacBook(true);
    
    const handleExploreWork = () => {
        document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
    };

  return (
        <div ref={containerRef} className="relative min-h-screen overflow-hidden flex items-center justify-center" id="home">
            
            {/* Floating Background Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {floatingElements.map((element, index) => (
                    <motion.div
                        key={index}
                        className={`absolute opacity-20 ${element.color}`}
                        style={{ left: `${element.x}%`, top: `${element.y}%` }}
                        animate={{
                            y: [0, -20, 0],
                            rotate: [0, 10, -10, 0],
                            scale: [1, 1.1, 1]
                        }}
                        transition={{
                            duration: 5 + index,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: element.delay
                        }}
                    >
                        <element.icon size={48} />
                    </motion.div>
                ))}
            </div>

            {/* Main Content */}
          <motion.div
                className="relative z-10 text-center px-4 max-w-5xl mx-auto"
                style={{ y, opacity }}
            >
                {/* Name Title with Animated Gradient */}
            <motion.h1
                    className="text-6xl md:text-8xl lg:text-9xl font-bold mb-6 tracking-tight"
                    initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
            >
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-white bg-[length:200%_auto] animate-shine">
                Tejas Kaushik
              </span>
            </motion.h1>

                {/* Typing Animation */}
                <motion.div
                    className="h-12 md:h-16 flex items-center justify-center mb-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
            >
                    <SmoothTypingAnimation 
                        words={descriptiveWords}
                        className="text-2xl md:text-4xl"
                        speed={50}
                        pauseTime={2000}
                    />
                </motion.div>

                {/* Description */}
            <motion.p
                    className="text-lg md:text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
            >
                    Building the future with AI, leading thousands of students, and creating 
                    innovative solutions that make a difference in the world.
            </motion.p>

                {/* Buttons */}
            <motion.div
                    className="flex flex-col sm:flex-row gap-6 justify-center items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, duration: 0.8 }}
            >
                    <motion.button
                        onClick={handleClickMe}
                        className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-semibold text-lg shadow-lg shadow-purple-500/30 overflow-hidden"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            Click me!
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rotate-12 scale-150" />
                    </motion.button>

                    <motion.button
                        onClick={handleExploreWork}
                        className="group px-8 py-4 border border-purple-500/50 rounded-full text-purple-300 font-semibold text-lg hover:bg-purple-500/10 hover:border-purple-500 transition-all duration-300 backdrop-blur-sm"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <span className="flex items-center gap-2">
                Explore My Work
                            <ArrowDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
                        </span>
                    </motion.button>
                </motion.div>
            </motion.div>

            {/* Scroll Indicator */}
            <motion.div
                className="absolute bottom-10 left-1/2 transform -translate-x-1/2 cursor-pointer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: [0, 10, 0] }}
                transition={{ delay: 2, duration: 2, repeat: Infinity }}
                onClick={handleExploreWork}
            >
                <div className="flex flex-col items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase tracking-widest">Scroll</span>
                    <ChevronDown className="text-white/50 w-6 h-6" />
                </div>
          </motion.div>

            <VirtualMacBook isOpen={showMacBook} onClose={() => setShowMacBook(false)} />
        </div>
  );
}
