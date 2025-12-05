import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Trophy, Medal, Star, Award as AwardIcon, Pause, Play } from "lucide-react";

// Import images
import Img3MT from "../assets/Youreka/3MT.png";
import ImgChemistry from "../assets/Science Olympiad/Chemisty.jpg";
import ImgDebate from "../assets/DebateMedal.jpg";
import ImgHydroecology from "../assets/Science Olympiad/Hydroecology.jpg";
import ImgSymposium from "../assets/Youreka/YourekaSymposium.jpg";
import ImgTargetAlpha from "../assets/Target Alpha/TargetAlpha.jpg";

interface Award {
    id: number;
    image: string;
    title: string;
    category: string;
    description: string;
    icon: React.ElementType;
}

const awards: Award[] = [
    {
        id: 1,
        image: Img3MT,
        title: "Youreka 3MT Challenge – First Place (National)",
        category: "Public Speaking & Research",
        description: "Won first place nationally in the Three Minute Thesis Challenge at Youreka, presenting complex HIV research in an accessible format.",
        icon: Trophy
    },
    {
        id: 5,
        image: ImgSymposium,
        title: "Youreka National Research Symposium – First Place",
        category: "Research",
        description: "Awarded first place nationally for the best HIV research presentation and outcomes at the Youreka Canada National Symposium.",
        icon: Star
    },
    {
        id: 2,
        image: ImgChemistry,
        title: "Chemical Conundrums – First Place",
        category: "Science Olympiad",
        description: "Placed first in the University of Guelph Science Olympiad chemistry event, solving analytical problems and reaction-based challenges.",
        icon: AwardIcon
    },
    {
        id: 3,
        image: ImgHydroecology,
        title: "Hydroecology – First Place",
        category: "Science Olympiad",
        description: "Earned first place in the hydroecology event at the University of Guelph Science Olympiad, demonstrating field and lab analysis skills.",
        icon: AwardIcon
    },
    {
        id: 6,
        image: ImgTargetAlpha,
        title: "Target Alpha National Finalist",
        category: "Finance & Innovation",
        description: "Received recognition as a national finalist (Top 7) in the Target Alpha competition called Financial Planners Conference (FPC), showcasing innovative solutions to real-world problems.",
        icon: Medal
    },
    {
        id: 4,
        image: ImgDebate,
        title: "Ethics Bowl – Second Place",
        category: "Debate",
        description: "Placed second in the regional Ethics Bowl competition, excelling in structured debate on moral dilemmas despite it being my first competition.",
        icon: Medal
    },
];

export default function Awards() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Auto-scroll functionality
    useEffect(() => {
        if (isPlaying) {
            timerRef.current = setInterval(() => {
                handleNext();
            }, 5000); // Change every 5 seconds
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPlaying, currentIndex]);

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % awards.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + awards.length) % awards.length);
    };

    const currentAward = awards[currentIndex];

    return (
        <section id="awards" className="py-24 relative overflow-hidden bg-transparent">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-8 sm:mb-16"
                >
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 mb-3 sm:mb-4">
                        Awards & Recognition
                    </h2>
                    <p className="text-gray-400 text-sm sm:text-lg max-w-2xl mx-auto px-2">
                        Celebrating excellence in research, competition, and innovation.
                    </p>
                </motion.div>

                {/* Gallery Container */}
                <div 
                    className="max-w-6xl mx-auto"
                    onMouseEnter={() => setIsPlaying(false)}
                    onMouseLeave={() => setIsPlaying(true)}
                >
                    <div className="relative bg-gray-800/30 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[500px]">
                            {/* Image Side */}
                            <div className="relative h-[300px] lg:h-auto overflow-hidden bg-black/50">
                                <AnimatePresence mode="wait">
                                    <motion.img
                                        key={currentAward.id}
                                        src={currentAward.image}
                                        alt={currentAward.title}
                                        initial={{ opacity: 0, scale: 1.1 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.7 }}
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                </AnimatePresence>
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 lg:from-transparent lg:to-transparent" />
                                
                                {/* Category Tag (Mobile Overlay / Desktop Hidden) */}
                                <div className="absolute top-4 left-4 z-20">
                                    <span className="px-3 py-1 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-xs font-medium text-white flex items-center gap-2">
                                        <currentAward.icon className="w-3 h-3 text-yellow-400" />
                                        {currentAward.category}
                                    </span>
                                </div>
                            </div>

                            {/* Content Side */}
                            <div className="relative p-4 sm:p-8 md:p-12 flex flex-col justify-center bg-gradient-to-br from-gray-900/50 to-gray-800/50">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentAward.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.5, delay: 0.2 }}
                                        className="relative z-10"
                                    >
                                        <div className="hidden lg:flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                                <currentAward.icon className="w-6 h-6 text-purple-400" />
                                            </div>
                                            <span className="text-sm font-semibold text-purple-300 tracking-wider uppercase">
                                                {currentAward.category}
                                            </span>
                                        </div>

                                        <h3 className="text-xl sm:text-2xl md:text-4xl font-bold text-white mb-3 sm:mb-6 leading-tight">
                                            {currentAward.title}
                                        </h3>

                                        <p className="text-gray-300 text-sm sm:text-base lg:text-lg leading-relaxed mb-4 sm:mb-8">
                                            {currentAward.description}
                                        </p>

                                        {/* Progress Bar */}
                                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-auto">
                                            {isPlaying && (
                                                <motion.div
                                                    initial={{ width: "0%" }}
                                                    animate={{ width: "100%" }}
                                                    transition={{ duration: 5, ease: "linear", repeat: 0 }}
                                                    key={currentIndex} // Reset on index change
                                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                                />
                                            )}
                                            {!isPlaying && (
                                                <div 
                                                    className="h-full bg-gray-500 w-full"
                                                    style={{ width: "100%" }} // Static when paused
                                                />
                                            )}
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="absolute bottom-4 right-4 lg:bottom-8 lg:right-8 flex items-center gap-4 z-20">
                            <button
                                onClick={handlePrev}
                                className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 transition-all text-white group"
                            >
                                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            </button>
                            
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 transition-all text-white"
                            >
                                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            </button>

                            <button
                                onClick={handleNext}
                                className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 transition-all text-white group"
                            >
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* Thumbnails */}
                    <div className="flex justify-center mt-4 sm:mt-8 gap-2 sm:gap-3 overflow-x-auto pb-4 px-2 sm:px-4 scrollbar-hide">
                        {awards.map((award, index) => (
                            <button
                                key={award.id}
                                onClick={() => setCurrentIndex(index)}
                                className={`relative flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg sm:rounded-xl overflow-hidden transition-all duration-300 border-2 ${
                                    index === currentIndex 
                                        ? "border-purple-500 scale-110 shadow-lg shadow-purple-500/25" 
                                        : "border-transparent opacity-50 hover:opacity-100 hover:scale-105"
                                }`}
                            >
                                <img 
                                    src={award.image} 
                                    alt={award.title} 
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
