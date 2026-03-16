'use client';
import { useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, Sparkles, Code, Brain, Rocket, Star, ChevronDown, Mail } from 'lucide-react';
import { FaGithub, FaLinkedin, FaInstagram } from 'react-icons/fa';
import VirtualMacBook from './VirtualMacBook';
import SmoothTypingAnimation from './SmoothTypingAnimation';

const stats = [
    { value: '10K+', label: 'Students Impacted' },
    { value: '300+', label: 'SomaAI Users' },
    { value: '6+', label: 'Awards Won' },
    { value: '4+', label: 'Years Building' },
];

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

    const floatingElements = [
        { icon: Code, delay: 0, x: 12, y: 22, color: 'text-cyan-400', size: 44 },
        { icon: Brain, delay: 1.5, x: 82, y: 30, color: 'text-purple-400', size: 52 },
        { icon: Rocket, delay: 3, x: 20, y: 72, color: 'text-pink-400', size: 40 },
        { icon: Star, delay: 4.5, x: 78, y: 68, color: 'text-yellow-400', size: 36 },
        { icon: Sparkles, delay: 2, x: 50, y: 15, color: 'text-blue-400', size: 32 },
    ];

    const handleClickMe = () => setShowMacBook(true);
    const handleExploreWork = () => {
        document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
    };

    const containerVariants = {
        hidden: {},
        visible: { transition: { staggerChildren: 0.15 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] } }
    };

    return (
        <div ref={containerRef} className="relative min-h-screen overflow-hidden flex items-center justify-center" id="home">

            {/* ── Aurora Background Blobs ── */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Primary purple blob */}
                <motion.div
                    className="absolute w-[70vw] h-[70vw] max-w-[800px] max-h-[800px] rounded-full animate-aurora-1"
                    style={{
                        top: '-20%',
                        left: '-15%',
                        background: 'radial-gradient(circle at center, rgba(109,40,217,0.35) 0%, rgba(109,40,217,0.12) 40%, transparent 70%)',
                        filter: 'blur(60px)',
                    }}
                />
                {/* Blue / indigo blob */}
                <motion.div
                    className="absolute w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full animate-aurora-2"
                    style={{
                        bottom: '-15%',
                        right: '-10%',
                        background: 'radial-gradient(circle at center, rgba(59,130,246,0.28) 0%, rgba(99,102,241,0.12) 40%, transparent 70%)',
                        filter: 'blur(70px)',
                    }}
                />
                {/* Pink / rose accent blob */}
                <motion.div
                    className="absolute w-[45vw] h-[45vw] max-w-[550px] max-h-[550px] rounded-full animate-aurora-3"
                    style={{
                        top: '30%',
                        right: '5%',
                        background: 'radial-gradient(circle at center, rgba(236,72,153,0.22) 0%, rgba(168,85,247,0.1) 40%, transparent 70%)',
                        filter: 'blur(80px)',
                    }}
                />
                {/* Subtle cyan top-right */}
                <div
                    className="absolute w-[35vw] h-[35vw] max-w-[400px] max-h-[400px] rounded-full"
                    style={{
                        top: '0',
                        right: '20%',
                        background: 'radial-gradient(circle at center, rgba(6,182,212,0.12) 0%, transparent 70%)',
                        filter: 'blur(50px)',
                    }}
                />
            </div>

            {/* ── Floating Icons ── */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {floatingElements.map((element, index) => (
                    <motion.div
                        key={index}
                        className={`absolute ${element.color}`}
                        style={{ left: `${element.x}%`, top: `${element.y}%`, opacity: 0.15 }}
                        animate={{
                            y: [0, -22, 0],
                            rotate: [0, 12, -8, 0],
                            scale: [1, 1.12, 1],
                            opacity: [0.12, 0.22, 0.12],
                        }}
                        transition={{
                            duration: 6 + index * 1.2,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: element.delay,
                        }}
                    >
                        <element.icon size={element.size} />
                    </motion.div>
                ))}
            </div>

            {/* ── Dot grid subtle overlay ── */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
                }}
            />

            {/* ── Main Content ── */}
            <motion.div
                className="relative z-10 text-center px-4 max-w-5xl mx-auto"
                style={{ y, opacity }}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Badge */}
                <motion.div
                    variants={itemVariants}
                    className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 backdrop-blur-sm text-purple-300 text-xs sm:text-sm font-medium"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
                    </span>
                    Open to opportunities & collabs
                </motion.div>

                {/* Name Title */}
                <motion.h1
                    variants={itemVariants}
                    className="text-5xl sm:text-7xl md:text-8xl lg:text-[7rem] font-bold mb-4 sm:mb-6 tracking-tight leading-none"
                >
                    <span className="block bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-white bg-[length:200%_auto] animate-shine">
                        Tejas Kaushik
                    </span>
                </motion.h1>

                {/* Typing Animation */}
                <motion.div
                    variants={itemVariants}
                    className="h-10 sm:h-12 md:h-16 flex items-center justify-center mb-6 sm:mb-8"
                >
                    <SmoothTypingAnimation
                        words={descriptiveWords}
                        className="text-xl sm:text-2xl md:text-4xl text-purple-200/80"
                        speed={55}
                        pauseTime={2200}
                    />
                </motion.div>

                {/* Description */}
                <motion.p
                    variants={itemVariants}
                    className="text-base sm:text-lg md:text-xl text-gray-400 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-2"
                >
                    Building the future with AI, leading thousands of students, and creating
                    innovative solutions that make a real difference in the world.
                </motion.p>

                {/* Buttons */}
                <motion.div
                    variants={itemVariants}
                    className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center items-center mb-10 sm:mb-12"
                >
                    <motion.button
                        onClick={handleClickMe}
                        className="group relative px-7 sm:px-9 py-3.5 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-semibold text-base sm:text-lg shadow-lg shadow-purple-500/30 overflow-hidden"
                        whileHover={{ scale: 1.06, boxShadow: '0 0 40px rgba(139,92,246,0.5)' }}
                        whileTap={{ scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                        {/* Shimmer overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                        <span className="relative z-10 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                            Click me!
                        </span>
                    </motion.button>

                    <motion.button
                        onClick={handleExploreWork}
                        className="group px-7 sm:px-9 py-3.5 sm:py-4 border border-white/20 rounded-full text-white/80 font-semibold text-base sm:text-lg hover:bg-white/8 hover:border-purple-500/50 hover:text-white transition-all duration-300 backdrop-blur-sm"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                        <span className="flex items-center gap-2">
                            Explore My Work
                            <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-y-1 transition-transform duration-300" />
                        </span>
                    </motion.button>
                </motion.div>

                {/* Social Links */}
                <motion.div
                    variants={itemVariants}
                    className="flex gap-3 sm:gap-4 justify-center items-center mb-16 sm:mb-20"
                >
                    {[
                        { href: "https://www.linkedin.com/in/tejasskaushik/", icon: FaLinkedin, label: "LinkedIn", hoverClass: "hover:text-blue-400 hover:border-blue-400/40 hover:bg-blue-500/10 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]" },
                        { href: "https://www.instagram.com/tejas_kaushik007/", icon: FaInstagram, label: "Instagram", hoverClass: "hover:text-pink-400 hover:border-pink-400/40 hover:bg-pink-500/10 hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]" },
                        { href: "https://github.com/tejask-dev", icon: FaGithub, label: "GitHub", hoverClass: "hover:text-gray-200 hover:border-gray-400/40 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]" },
                        { href: "mailto:tejas.kaushik@outlook.com", icon: Mail, label: "Email", hoverClass: "hover:text-purple-400 hover:border-purple-400/40 hover:bg-purple-500/10 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]" },
                    ].map((social, index) => (
                        <motion.a
                            key={social.label}
                            href={social.href}
                            target={social.href.startsWith('mailto') ? undefined : "_blank"}
                            rel={social.href.startsWith('mailto') ? undefined : "noopener noreferrer"}
                            aria-label={social.label}
                            className={`p-3 sm:p-3.5 rounded-full border border-white/15 text-white/60 backdrop-blur-sm transition-all duration-300 ${social.hoverClass}`}
                            initial={{ opacity: 0, scale: 0, rotate: -30 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            transition={{ delay: 1.2 + index * 0.1, type: "spring", stiffness: 260, damping: 20 }}
                            whileHover={{ scale: 1.18, y: -4 }}
                            whileTap={{ scale: 0.94 }}
                        >
                            <social.icon className="w-5 h-5 sm:w-5 sm:h-5" />
                        </motion.a>
                    ))}
                </motion.div>

                {/* ── Stats Row ── */}
                <motion.div
                    variants={itemVariants}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-2xl mx-auto"
                >
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            className="glass-card glow-card rounded-2xl p-4 sm:p-5 text-center"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.6 + index * 0.12, duration: 0.6, ease: 'easeOut' }}
                            whileHover={{ scale: 1.05, y: -3 }}
                        >
                            <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">
                                {stat.value}
                            </div>
                            <div className="text-gray-400 text-xs sm:text-xs leading-tight">{stat.label}</div>
                        </motion.div>
                    ))}
                </motion.div>
            </motion.div>

            {/* ── Scroll Indicator ── */}
            <motion.div
                className="absolute bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer z-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.4, duration: 1 }}
                onClick={handleExploreWork}
            >
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="flex flex-col items-center gap-2 text-white/40 hover:text-white/70 transition-colors duration-300"
                >
                    <span className="text-[10px] uppercase tracking-[0.2em] font-medium">Scroll</span>
                    <ChevronDown className="w-5 h-5" />
                </motion.div>
            </motion.div>

            <VirtualMacBook isOpen={showMacBook} onClose={() => setShowMacBook(false)} />
        </div>
    );
}
