'use client';
import { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ExternalLink, Github, Code, Brain, Rocket, Star, Gamepad2, Play, CheckCircle } from 'lucide-react';
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
import devfestImage from '../assets/img_0531.jpg';

export default function Portfolio() {
    const [activeFilter, setActiveFilter] = useState('all');
    const [activeGame, setActiveGame] = useState<string | null>(null);
    const [visibleProjects, setVisibleProjects] = useState(3);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    const categories = [
        { id: 'all', name: 'All Projects', icon: Star },
        { id: 'ai', name: 'AI & ML', icon: Brain },
        { id: 'web', name: 'Web Dev', icon: Code },
        { id: 'research', name: 'Research', icon: Rocket },
        { id: 'games', name: 'Games', icon: Gamepad2 },
    ];

    const projects = [
        {
            id: 1,
            title: 'SomaAI',
            description: 'AI-powered platform with 1000+ active users, exploring next-generation AI systems and intelligent automation.',
            image: somaAI,
            category: 'ai',
            tech: ['Python', 'OpenAI API', 'React', 'Node.js'],
            links: {
                live: 'https://somaai-5qe3.onrender.com/',
                github: 'https://github.com/tejask-dev'
            },
            linkLabels: {
                live: 'Working Product'
            },
            achievements: ['1000+ active users', 'Next-gen AI systems', 'Intelligent automation']
        },
        {
            id: 2,
            title: 'Stellar Learning App',
            description: 'EdTech platform serving 10,000+ signups with 5,000+ active users, revolutionizing how students learn.',
            image: personalWebsite, // Placeholder
            category: 'web',
            tech: ['React', 'Node.js', 'Firebase', 'Tailwind CSS'],
            links: {
                live: 'https://stellarlearning.app/',
                github: 'https://github.com/tejask-dev'
            },
            linkLabels: {
                live: 'Live Website'
            },
            achievements: ['10,000+ signups', '5,000+ active users', 'Revolutionary EdTech']
        },
        {
            id: 3,
            title: 'MainSt.AI',
            description: 'AI-powered financial analysis and grant advisor for small businesses. Features particle background, data upload, and interactive charts.',
            image: null,
            category: 'ai',
            tech: ['Next.js 14', 'DeepSeek AI', 'Supabase', 'Three.js'],
            links: {
                live: '#',
                github: 'https://github.com/ShubhamDoshi126/Hackathon_Mainst_AI'
            },
            linkLabels: {
                live: 'Under Construction'
            },
            achievements: ['Hackathon Project', 'Financial Analysis', 'Grant Advisor']
        },
        {
            id: 4,
            title: 'DocuBridge',
            description: 'Document processing platform using AI to extract, analyze, and organize information from documents.',
            image: docubridge,
            category: 'ai',
            tech: ['Python', 'AI/ML', 'React', 'Node.js'],
            links: {
                live: '#',
                github: 'https://github.com/tejask-dev/Docubridge-Intership'
            },
            linkLabels: {
                live: 'Deploying Soon'
            },
            achievements: ['AI document processing', 'Advanced analysis', 'Automated extraction']
        },
        {
            id: 5,
            title: 'Mortgage Website',
            description: 'Professional mortgage website built for a client with modern design and user-friendly interface.',
            image: mortgageWebsite,
            category: 'web',
            tech: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'],
            links: {
                live: '#',
                github: 'https://github.com/tejask-dev'
            },
            achievements: ['Client project', 'Modern design', 'User-friendly interface']
        },
        {
            id: 6,
            title: 'HIV Child Treatment Research',
            description: 'Research project analyzing HIV treatment data for children, contributing to global health research.',
            image: researchPaper,
            category: 'research',
            tech: ['Python', 'Data Analysis', 'Research', 'Statistics'],
            links: {
                live: '#',
                github: 'https://github.com/tejask-dev/hiv-child-treatment-graphs'
            },
            achievements: ['Global health research', 'Data analysis', 'Research contribution']
        },
        // Games
        {
            id: 7,
            title: 'Neon Tetris',
            description: 'A classic Tetris clone with a modern neon aesthetic. Features score tracking, levels, and smooth animations.',
            image: 'game-tetris',
            category: 'games',
            tech: ['React', 'Canvas API', 'Game Loop'],
            gameId: 'tetris',
            achievements: ['Custom game engine', '60 FPS rendering', 'Responsive controls']
        },
        {
            id: 8,
            title: 'Starship Shooter',
            description: 'Vertical scrolling space shooter. Defeat waves of enemies, dodge bullets, and survive as long as possible.',
            image: 'game-starship',
            category: 'games',
            tech: ['Canvas API', 'Collision Detection', 'Particle System'],
            gameId: 'starship',
            achievements: ['Particle effects', 'Enemy AI', 'Dynamic difficulty']
        },
        {
            id: 9,
            title: 'Cyber Fighter',
            description: '2D fighting game with character selection and AI opponent. Choose from 5 unique fighters and battle for supremacy.',
            image: 'game-fighter',
            category: 'games',
            tech: ['Canvas API', 'State Machine', 'Physics Engine'],
            gameId: 'fighter',
            achievements: ['Combat system', 'AI opponent', 'Character selection']
        }
    ];

    const filteredProjects = activeFilter === 'all'
        ? projects
        : projects.filter(project => project.category === activeFilter);

    const displayProjects = filteredProjects.slice(0, visibleProjects);
    const hasMoreProjects = visibleProjects < filteredProjects.length;

  return (
        <section id="portfolio" className="min-h-screen py-20 bg-transparent relative">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div ref={ref} className="text-center mb-8 sm:mb-16">
                    <div className="mb-4 sm:mb-6">
                        <AnimatedText
                            text="Projects & Creations"
                            type="fadeIn"
                            className="text-3xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
                        />
                    </div>
                    <motion.p
                        className="text-base sm:text-xl text-gray-300 max-w-3xl mx-auto px-2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        A showcase of my innovative projects, from AI-powered applications to 
                        cutting-edge web platforms and interactive games.
                    </motion.p>
                </div>

                {/* Filter Buttons */}
        <motion.div
                    className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-8 sm:mb-16 px-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8, delay: 0.4 }}
        >
                    {categories.map((category, index) => (
                        <motion.button
                            key={category.id}
                            onClick={() => {
                                setActiveFilter(category.id);
                                setVisibleProjects(3); // Reset visible count when filter changes
                            }}
                            className={`filter-button flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-full font-semibold text-xs sm:text-base transition-all duration-300 ${
                                activeFilter === category.id
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
            >
                            <category.icon className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">{category.name}</span>
                            <span className="sm:hidden">{category.name.split(' ')[0]}</span>
                        </motion.button>
          ))}
        </motion.div>

        {/* Projects Grid */}
          <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8"
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.8, delay: 0.8 }}
          >
                    {displayProjects.map((project, index) => (
                        <AnimatedCard
                key={project.id}
                            hoverEffect="tilt"
                            delay={index * 0.1}
                        >
                            <div className="project-card bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 group h-full flex flex-col">
                                {/* Project Image or Game Preview */}
                                <div className="relative mb-4 sm:mb-6 overflow-hidden rounded-xl aspect-video group-hover:shadow-lg transition-all duration-300">
                                    {project.category === 'games' ? (
                                        <div className={`w-full h-full bg-gradient-to-br ${
                                            project.gameId === 'tetris' ? 'from-purple-900 to-indigo-900' :
                                            project.gameId === 'starship' ? 'from-slate-900 to-cyan-900' :
                                            'from-red-900 to-orange-900'
                                        } flex items-center justify-center group-hover:scale-110 transition-transform duration-500`}>
                                            <Gamepad2 className="w-16 h-16 text-white/50" />
                                        </div>
                                    ) : !project.image ? (
                                        <div className="w-full h-full bg-gradient-to-br from-amber-900/50 to-orange-900/50 flex flex-col items-center justify-center gap-2">
                                            <Code className="w-12 h-12 text-amber-400/70" />
                                            <span className="text-amber-300 text-sm font-medium">Under Construction</span>
                                        </div>
                                    ) : (
                                        <img 
                                            src={project.image} 
                                            alt={project.title} 
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    )}
                                    
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                                        <span className="text-white font-semibold flex items-center gap-2">
                                            {project.category === 'games' ? <><Play className="w-4 h-4" /> Play Demo</> : 'View Project'}
                                        </span>
                                    </div>
                                </div>

                                {/* Project Info */}
                                <div className="space-y-3 sm:space-y-4 flex-grow flex flex-col">
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-semibold text-white mb-1 sm:mb-2">{project.title}</h3>
                                        <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">{project.description}</p>
                                </div>

                                    {/* Tech Stack */}
                                    <div className="flex flex-wrap gap-2">
                                        {project.tech.map((tech, techIndex) => (
                      <span
                                                key={techIndex}
                                                className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                                    {/* Achievements */}
                                    <div className="space-y-2 mt-auto pt-4">
                                        <h4 className="text-sm font-semibold text-purple-400">Key Features:</h4>
                                        <ul className="text-xs text-gray-400 space-y-1">
                                            {project.achievements.map((achievement, achIndex) => (
                                                <li key={achIndex} className="flex items-center gap-2">
                                                    <Star className="w-3 h-3 text-yellow-400" />
                                                    {achievement}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Links / Play Button */}
                                    <div className="flex gap-3 pt-4 mt-auto">
                                        {project.category === 'games' ? (
                                            <button
                                                onClick={() => setActiveGame(project.gameId)}
                                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 flex-1 justify-center hover:scale-105 active:scale-95"
                                            >
                                                <Play className="w-4 h-4" />
                                                Play Demo
                                            </button>
                                        ) : (
                                            <>
                                                <motion.a
                                                    href={project.links.live}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${
                                                        project.links.live === '#' ? 'from-gray-600 to-gray-700 cursor-not-allowed opacity-70' : 'from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/25'
                                                    } text-white text-sm font-semibold rounded-lg transition-all duration-300 flex-1 justify-center`}
                                                    whileHover={project.links.live !== '#' ? { scale: 1.05 } : {}}
                                                    whileTap={project.links.live !== '#' ? { scale: 0.95 } : {}}
                                                    onClick={(e) => project.links.live === '#' && e.preventDefault()}
                                                >
                                                    {project.linkLabels?.live === 'Under Construction' ? (
                                                        <><Code className="w-4 h-4" /> Under Construction</>
                                                    ) : project.linkLabels?.live === 'Deploying Soon' ? (
                                                        <>Deploying Soon</>
                                                    ) : project.linkLabels?.live === 'Working Product' ? (
                                                        <><ExternalLink className="w-4 h-4" /> Working Product</>
                                                    ) : project.linkLabels?.live === 'Live Website' ? (
                                                        <><CheckCircle className="w-4 h-4" /> Live Website</>
                                                    ) : (
                                                        <><ExternalLink className="w-4 h-4" /> Live Demo</>
                                                    )}
                                                </motion.a>
                                                <motion.a
                                                    href={project.links.github}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-600 hover:text-white transition-all duration-300 flex-1 justify-center"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <Github className="w-4 h-4" />
                                                    Code
                                                </motion.a>
                                            </>
                    )}
                  </div>
                </div>
                            </div>
                        </AnimatedCard>
            ))}
          </motion.div>

          {/* View More Button */}
          {hasMoreProjects && (
              <motion.div 
                  className="flex justify-center mt-12"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
              >
                  <motion.button
                      onClick={() => setVisibleProjects(prev => prev + 3)}
                      className="px-8 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-white rounded-full hover:bg-purple-500/30 transition-all duration-300 flex items-center gap-2 group"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                  >
                      <span>View More Projects</span>
                      <motion.div
                        animate={{ y: [0, 3, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                          <Rocket className="w-4 h-4 text-purple-400" />
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
