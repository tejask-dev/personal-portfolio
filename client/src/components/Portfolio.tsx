'use client';
import { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ExternalLink, Code, Brain, Rocket, Star, Gamepad2, Play, CheckCircle, ChevronDown } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import AnimatedCard from './AnimatedCard';
import AnimatedText from './AnimatedText';

// Game Components
import TetrisGame from './games/TetrisGame';
import StarshipGame from './games/StarshipGame';
import FighterGame from './games/FighterGame';

// Import images
import somaAI from '../assets/SomaAI.png';
import mortgageWebsite from '../assets/MortgageWebsite.png';
import docubridge from '../assets/Docubridge.png';
import researchPaper from '../assets/Youreka/Research Paper.png';
import personalWebsite from '../assets/Personal Website.png';

export default function Portfolio() {
    const [activeFilter, setActiveFilter] = useState('all');
    const [activeGame, setActiveGame] = useState<string | null>(null);
    const [visibleProjects, setVisibleProjects] = useState(6);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-80px' });

    const categories = [
        { id: 'all', name: 'All', icon: Star },
        { id: 'ai', name: 'AI & ML', icon: Brain },
        { id: 'web', name: 'Web Dev', icon: Code },
        { id: 'research', name: 'Research', icon: Rocket },
        { id: 'games', name: 'Games', icon: Gamepad2 },
    ];

    const projects = [
        {
            id: 1,
            title: 'SomaAI',
            description: 'AI-powered mental health chatbot with 1,000+ active users. Personalized, private conversations for emotional wellbeing.',
            image: somaAI,
            category: 'ai',
            tech: ['Python', 'OpenAI API', 'React', 'Node.js'],
            links: { live: 'https://somaai-5qe3.onrender.com/', github: 'https://github.com/tejask-dev' },
            linkLabels: { live: 'Working Product' },
            achievements: ['1,000+ active users', 'Next-gen AI systems', 'Intelligent automation'],
            accent: 'from-violet-500/20 to-purple-600/10',
            borderAccent: 'hover:border-violet-500/40',
            glowColor: 'hover:shadow-[0_0_40px_rgba(139,92,246,0.2)]',
        },
        {
            id: 2,
            title: 'Stellar Learning',
            description: 'EdTech platform revolutionizing how students learn with AI-driven personalization. 10,000+ signups.',
            image: personalWebsite,
            category: 'web',
            tech: ['React', 'Node.js', 'Firebase', 'Tailwind CSS'],
            links: { live: 'https://stellarlearning.app/', github: 'https://github.com/tejask-dev' },
            linkLabels: { live: 'Live Website' },
            achievements: ['10,000+ signups', '5,000+ active users', 'Revolutionary EdTech'],
            accent: 'from-cyan-500/20 to-blue-600/10',
            borderAccent: 'hover:border-cyan-500/40',
            glowColor: 'hover:shadow-[0_0_40px_rgba(6,182,212,0.2)]',
        },
        {
            id: 3,
            title: 'MainSt.AI',
            description: 'AI-powered financial analysis and grant advisor for small businesses with particle backgrounds and interactive charts.',
            image: null,
            category: 'ai',
            tech: ['Next.js 14', 'DeepSeek AI', 'Supabase', 'Three.js'],
            links: { live: '#', github: 'https://github.com/ShubhamDoshi126/Hackathon_Mainst_AI' },
            linkLabels: { live: 'Under Construction' },
            achievements: ['Hackathon Project', 'Financial Analysis', 'Grant Advisor'],
            accent: 'from-amber-500/20 to-orange-600/10',
            borderAccent: 'hover:border-amber-500/40',
            glowColor: 'hover:shadow-[0_0_40px_rgba(245,158,11,0.15)]',
        },
        {
            id: 4,
            title: 'DocuBridge',
            description: 'Document processing platform using AI to extract, analyze, and organize information from complex documents at scale.',
            image: docubridge,
            category: 'ai',
            tech: ['Python', 'AI/ML', 'React', 'Node.js'],
            links: { live: '#', github: 'https://github.com/tejask-dev/Docubridge-Intership' },
            linkLabels: { live: 'Deploying Soon' },
            achievements: ['AI document processing', 'Advanced analysis', 'Automated extraction'],
            accent: 'from-emerald-500/20 to-teal-600/10',
            borderAccent: 'hover:border-emerald-500/40',
            glowColor: 'hover:shadow-[0_0_40px_rgba(16,185,129,0.15)]',
        },
        {
            id: 5,
            title: 'Mortgage Website',
            description: 'Professional mortgage platform built for a client with modern design, intuitive UX, and responsive layout.',
            image: mortgageWebsite,
            category: 'web',
            tech: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'],
            links: { live: '#', github: 'https://github.com/tejask-dev' },
            linkLabels: { live: 'Client Project' },
            achievements: ['Client project', 'Modern design', 'User-friendly interface'],
            accent: 'from-blue-500/20 to-indigo-600/10',
            borderAccent: 'hover:border-blue-500/40',
            glowColor: 'hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]',
        },
        {
            id: 6,
            title: 'HIV Child Treatment Research',
            description: 'National award-winning research analyzing HIV treatment data for children in Sub-Saharan Africa. Soon to be published.',
            image: researchPaper,
            category: 'research',
            tech: ['Python', 'Data Analysis', 'Research', 'Statistics'],
            links: { live: '#', github: 'https://github.com/tejask-dev/hiv-child-treatment-graphs' },
            linkLabels: { live: '1st Place National' },
            achievements: ['1st Place National', 'Global health research', 'Data analysis'],
            accent: 'from-rose-500/20 to-red-600/10',
            borderAccent: 'hover:border-rose-500/40',
            glowColor: 'hover:shadow-[0_0_40px_rgba(244,63,94,0.15)]',
        },
        {
            id: 7,
            title: 'Neon Tetris',
            description: 'Classic Tetris with a stunning neon aesthetic. Custom game engine with score tracking, levels, and smooth 60 FPS animations.',
            image: 'game-tetris',
            category: 'games',
            tech: ['React', 'Canvas API', 'Game Loop', 'TypeScript'],
            gameId: 'tetris',
            achievements: ['Custom game engine', '60 FPS rendering', 'Responsive controls'],
            accent: 'from-purple-500/20 to-indigo-600/10',
            borderAccent: 'hover:border-purple-500/40',
            glowColor: 'hover:shadow-[0_0_40px_rgba(139,92,246,0.2)]',
        },
        {
            id: 8,
            title: 'Starship Shooter',
            description: 'Vertical scrolling space shooter. Defeat waves of enemies, dodge bullets, and survive in deep space.',
            image: 'game-starship',
            category: 'games',
            tech: ['Canvas API', 'Collision Detection', 'Particle System'],
            gameId: 'starship',
            achievements: ['Particle effects', 'Enemy AI', 'Dynamic difficulty'],
            accent: 'from-cyan-500/20 to-slate-600/10',
            borderAccent: 'hover:border-cyan-500/40',
            glowColor: 'hover:shadow-[0_0_40px_rgba(6,182,212,0.2)]',
        },
        {
            id: 9,
            title: 'Cyber Fighter',
            description: '2D fighting game with character selection and AI opponent. Choose from 5 unique fighters and battle for supremacy.',
            image: 'game-fighter',
            category: 'games',
            tech: ['Canvas API', 'State Machine', 'Physics Engine'],
            gameId: 'fighter',
            achievements: ['Combat system', 'AI opponent', 'Character selection'],
            accent: 'from-red-500/20 to-orange-600/10',
            borderAccent: 'hover:border-red-500/40',
            glowColor: 'hover:shadow-[0_0_40px_rgba(239,68,68,0.2)]',
        },
    ];

    const filteredProjects = activeFilter === 'all'
        ? projects
        : projects.filter((p) => p.category === activeFilter);

    const displayProjects = filteredProjects.slice(0, visibleProjects);
    const hasMore = visibleProjects < filteredProjects.length;

    const gameGradients: Record<string, string> = {
        tetris: 'from-purple-900/80 via-indigo-900/60 to-purple-900/80',
        starship: 'from-slate-900/80 via-cyan-900/60 to-slate-900/80',
        fighter: 'from-red-900/80 via-orange-900/60 to-red-900/80',
    };

    return (
        <section id="portfolio" className="min-h-screen py-20 bg-transparent relative">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div ref={ref} className="text-center mb-10 sm:mb-16">
                    <div className="mb-4 sm:mb-5">
                        <AnimatedText
                            text="Projects & Creations"
                            type="fadeIn"
                            className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
                        />
                    </div>
                    <motion.p
                        className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto px-2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.7, delay: 0.2 }}
                    >
                        AI-powered applications, cutting-edge web platforms, and interactive games —
                        built with purpose and precision.
                    </motion.p>
                </div>

                {/* Filter buttons */}
                <motion.div
                    className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10 sm:mb-14 px-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.7, delay: 0.35 }}
                >
                    {categories.map((cat, i) => (
                        <motion.button
                            key={cat.id}
                            onClick={() => { setActiveFilter(cat.id); setVisibleProjects(6); }}
                            className={`flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-semibold text-xs sm:text-sm transition-all duration-300 border ${
                                activeFilter === cat.id
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-lg shadow-purple-500/25'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            initial={{ opacity: 0, y: 16 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
                        >
                            <cat.icon className="w-3.5 h-3.5" />
                            {cat.name}
                        </motion.button>
                    ))}
                </motion.div>

                {/* Projects Grid */}
                <motion.div
                    layout
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7"
                >
                    <AnimatePresence mode="popLayout">
                        {displayProjects.map((project, index) => (
                            <motion.div
                                key={project.id}
                                layout
                                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.94 }}
                                transition={{ duration: 0.45, delay: index * 0.07, ease: [0.25, 0.1, 0.25, 1] }}
                            >
                                <AnimatedCard hoverEffect="tilt" delay={0}>
                                    <div
                                        className={`relative h-full rounded-2xl border border-white/8 bg-gradient-to-br ${project.accent} backdrop-blur-md overflow-hidden flex flex-col group transition-all duration-400 ${project.borderAccent} ${project.glowColor}`}
                                        style={{ minHeight: '420px' }}
                                    >
                                        {/* Top gradient line */}
                                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                                        {/* Image / game preview */}
                                        <div className="relative h-44 overflow-hidden flex-shrink-0">
                                            {project.category === 'games' ? (
                                                <div className={`w-full h-full bg-gradient-to-br ${gameGradients[project.gameId!]} flex flex-col items-center justify-center gap-3 group-hover:scale-105 transition-transform duration-500`}>
                                                    <motion.div
                                                        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                                                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                                    >
                                                        <Gamepad2 className="w-14 h-14 text-white/40" />
                                                    </motion.div>
                                                    <span className="text-white/50 text-xs font-medium tracking-widest uppercase">
                                                        Interactive
                                                    </span>
                                                </div>
                                            ) : !project.image ? (
                                                <div className="w-full h-full bg-gradient-to-br from-amber-900/40 to-orange-900/30 flex flex-col items-center justify-center gap-2">
                                                    <Code className="w-10 h-10 text-amber-400/60" />
                                                    <span className="text-amber-300/70 text-xs font-medium">Under Construction</span>
                                                </div>
                                            ) : (
                                                <img
                                                    src={project.image}
                                                    alt={project.title}
                                                    className="w-full h-full object-cover transition-transform duration-600 group-hover:scale-108"
                                                    loading="lazy"
                                                />
                                            )}

                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
                                                <span className="text-white text-sm font-semibold flex items-center gap-1.5">
                                                    {project.category === 'games' ? <><Play className="w-4 h-4" /> Play Demo</> : 'View Project'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-5 flex flex-col flex-grow space-y-3">
                                            <div>
                                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-purple-200 transition-colors duration-300">
                                                    {project.title}
                                                </h3>
                                                <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">
                                                    {project.description}
                                                </p>
                                            </div>

                                            {/* Tech badges */}
                                            <div className="flex flex-wrap gap-1.5">
                                                {project.tech.map((t) => (
                                                    <span key={t} className="px-2.5 py-1 bg-white/6 border border-white/10 text-gray-300 text-[10px] rounded-full font-medium">
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Achievements */}
                                            <div className="space-y-1 mt-auto">
                                                {project.achievements.map((ach) => (
                                                    <div key={ach} className="flex items-center gap-2 text-[11px] text-gray-400">
                                                        <Star className="w-3 h-3 text-yellow-400/70 flex-shrink-0" />
                                                        {ach}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex gap-2.5 pt-3 mt-auto">
                                                {project.category === 'games' ? (
                                                    <button
                                                        onClick={() => setActiveGame(project.gameId!)}
                                                        className="flex items-center justify-center gap-2 flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-xl hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 hover:scale-105 active:scale-95"
                                                    >
                                                        <Play className="w-3.5 h-3.5" />
                                                        Play Demo
                                                    </button>
                                                ) : (
                                                    <>
                                                        <motion.a
                                                            href={project.links?.live}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`flex items-center justify-center gap-1.5 flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${
                                                                project.links?.live === '#'
                                                                    ? 'bg-white/6 border border-white/10 text-gray-500 cursor-not-allowed'
                                                                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/30 hover:scale-105 active:scale-95'
                                                            }`}
                                                            onClick={(e) => project.links?.live === '#' && e.preventDefault()}
                                                            whileHover={project.links?.live !== '#' ? { scale: 1.04 } : {}}
                                                        >
                                                            {project.linkLabels?.live === 'Under Construction' ? (
                                                                <><Code className="w-3 h-3" /> Under Construction</>
                                                            ) : project.linkLabels?.live === 'Deploying Soon' ? (
                                                                'Deploying Soon'
                                                            ) : project.linkLabels?.live === 'Working Product' ? (
                                                                <><ExternalLink className="w-3 h-3" /> Working Product</>
                                                            ) : project.linkLabels?.live === 'Live Website' ? (
                                                                <><CheckCircle className="w-3 h-3" /> Live Website</>
                                                            ) : project.linkLabels?.live === '1st Place National' ? (
                                                                <><Star className="w-3 h-3" /> 1st Place National</>
                                                            ) : project.linkLabels?.live === 'Client Project' ? (
                                                                <><CheckCircle className="w-3 h-3" /> Client Project</>
                                                            ) : (
                                                                <><ExternalLink className="w-3 h-3" /> Live Demo</>
                                                            )}
                                                        </motion.a>
                                                        <motion.a
                                                            href={project.links?.github}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white/6 border border-white/10 text-gray-300 text-xs font-bold rounded-xl hover:bg-white/12 hover:text-white hover:border-white/20 transition-all duration-300"
                                                            whileHover={{ scale: 1.04 }}
                                                        >
                                                            <FaGithub className="w-3.5 h-3.5" />
                                                            Code
                                                        </motion.a>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </AnimatedCard>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>

                {/* View More */}
                {hasMore && (
                    <motion.div
                        className="flex justify-center mt-12"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        <motion.button
                            onClick={() => setVisibleProjects((p) => p + 3)}
                            className="flex items-center gap-2.5 px-8 py-3.5 bg-white/5 border border-white/12 text-gray-300 rounded-full hover:bg-white/10 hover:border-purple-500/40 hover:text-white transition-all duration-300 text-sm font-medium group"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.96 }}
                        >
                            View More Projects
                            <motion.div
                                animate={{ y: [0, 4, 0] }}
                                transition={{ repeat: Infinity, duration: 1.4 }}
                            >
                                <ChevronDown className="w-4 h-4 text-purple-400" />
                            </motion.div>
                        </motion.button>
                    </motion.div>
                )}
            </div>

            {/* Game Modals */}
            <AnimatePresence>
                {activeGame && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative z-50"
                    >
                        {activeGame === 'tetris' && <TetrisGame onClose={() => setActiveGame(null)} />}
                        {activeGame === 'starship' && <StarshipGame onClose={() => setActiveGame(null)} />}
                        {activeGame === 'fighter' && <FighterGame onClose={() => setActiveGame(null)} />}
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
