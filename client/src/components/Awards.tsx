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
    badge: string;
}

const awards: Award[] = [
    {
        id: 1,
        image: Img3MT,
        title: "Youreka 3MT Challenge – First Place (National)",
        category: "Public Speaking & Research",
        description: "Won first place nationally in the Three Minute Thesis Challenge at Youreka, presenting complex HIV research in an accessible and compelling format.",
        icon: Trophy,
        badge: "🥇 National Champion",
    },
    {
        id: 5,
        image: ImgSymposium,
        title: "Youreka National Research Symposium – First Place",
        category: "Research",
        description: "Awarded first place nationally for the best HIV research presentation and outcomes at the Youreka Canada National Symposium.",
        icon: Star,
        badge: "🥇 1st Place National",
    },
    {
        id: 2,
        image: ImgChemistry,
        title: "Chemical Conundrums – First Place",
        category: "Science Olympiad",
        description: "Placed first in the University of Guelph Science Olympiad chemistry event, solving analytical problems and reaction-based challenges under pressure.",
        icon: AwardIcon,
        badge: "🥇 1st Place",
    },
    {
        id: 3,
        image: ImgHydroecology,
        title: "Hydroecology – First Place",
        category: "Science Olympiad",
        description: "Earned first place in the hydroecology event at the University of Guelph Science Olympiad, demonstrating field and lab analysis skills.",
        icon: AwardIcon,
        badge: "🥇 1st Place",
    },
    {
        id: 6,
        image: ImgTargetAlpha,
        title: "Target Alpha National Finalist – Top 7",
        category: "Finance & Innovation",
        description: "Recognized as a national finalist (Top 7) in Target Alpha's Financial Planners Conference, showcasing innovative solutions to real-world financial problems.",
        icon: Medal,
        badge: "🏆 Top 7 National",
    },
    {
        id: 4,
        image: ImgDebate,
        title: "Ethics Bowl – Second Place",
        category: "Debate",
        description: "Placed second in the regional Ethics Bowl competition, excelling in structured moral debate — an impressive result for a first-time competitor.",
        icon: Medal,
        badge: "🥈 2nd Place",
    },
];

export default function Awards() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (isPlaying) {
            timerRef.current = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % awards.length);
            }, 5000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isPlaying, currentIndex]);

    const handleNext = () => setCurrentIndex((prev) => (prev + 1) % awards.length);
    const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + awards.length) % awards.length);

    const current = awards[currentIndex];
    const Icon = current.icon;

    return (
        <section id="awards" className="py-24 relative overflow-hidden bg-transparent">
            {/* Background glows */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[20%] -right-[10%] w-[45%] h-[45%] bg-purple-500/8 rounded-full blur-3xl" />
                <div className="absolute -bottom-[20%] -left-[10%] w-[45%] h-[45%] bg-blue-500/8 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[40%] bg-pink-500/5 rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                    className="text-center mb-12 sm:mb-16"
                >
                    <h2 className="text-3xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 mb-3 not-italic">
                        Awards & Recognition
                    </h2>
                    <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto">
                        Excellence in research, competition, leadership, and innovation.
                    </p>
                </motion.div>

                {/* Main gallery card */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.15 }}
                    className="max-w-5xl mx-auto"
                    onMouseEnter={() => setIsPlaying(false)}
                    onMouseLeave={() => setIsPlaying(true)}
                >
                    <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-white/3 backdrop-blur-xl shadow-[0_0_80px_rgba(0,0,0,0.5)]">
                        {/* Top gradient line */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent z-20" />

                        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[480px]">
                            {/* Image pane */}
                            <div className="relative h-[280px] lg:h-auto overflow-hidden bg-black/40">
                                <AnimatePresence mode="wait">
                                    <motion.img
                                        key={current.id}
                                        src={current.image}
                                        alt={current.title}
                                        initial={{ opacity: 0, scale: 1.08 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.96 }}
                                        transition={{ duration: 0.65, ease: [0.25, 0.1, 0.25, 1] }}
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                </AnimatePresence>
                                {/* Gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/30" />

                                {/* Category badge */}
                                <div className="absolute top-4 left-4 z-10">
                                    <motion.span
                                        key={current.id + '-badge'}
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/15 rounded-full text-xs font-semibold text-white"
                                    >
                                        <Icon className="w-3 h-3 text-yellow-400" />
                                        {current.category}
                                    </motion.span>
                                </div>

                                {/* Index counter */}
                                <div className="absolute bottom-4 left-4 z-10 text-white/40 text-xs font-mono">
                                    {String(currentIndex + 1).padStart(2, '0')} / {String(awards.length).padStart(2, '0')}
                                </div>
                            </div>

                            {/* Content pane */}
                            <div className="relative p-6 sm:p-10 flex flex-col justify-between bg-gradient-to-br from-black/20 to-black/5">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={current.id + '-content'}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -16 }}
                                        transition={{ duration: 0.45, delay: 0.15 }}
                                        className="flex flex-col gap-5 h-full"
                                    >
                                        {/* Award icon + category (desktop) */}
                                        <div className="hidden lg:flex items-center gap-3">
                                            <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/20">
                                                <Icon className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <span className="text-xs font-bold text-purple-300 tracking-wider uppercase">
                                                {current.category}
                                            </span>
                                        </div>

                                        {/* Badge pill */}
                                        <div className="inline-flex w-fit items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/15 to-orange-500/10 border border-yellow-500/20 text-yellow-300 text-xs font-bold">
                                            {current.badge}
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-snug">
                                            {current.title}
                                        </h3>

                                        {/* Description */}
                                        <p className="text-gray-300 text-sm sm:text-base leading-relaxed flex-grow">
                                            {current.description}
                                        </p>

                                        {/* Progress bar */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                                                <span>Auto-playing</span>
                                                <span>{currentIndex + 1} of {awards.length}</span>
                                            </div>
                                            <div className="w-full h-0.5 bg-white/8 rounded-full overflow-hidden">
                                                {isPlaying ? (
                                                    <motion.div
                                                        key={currentIndex}
                                                        initial={{ width: "0%" }}
                                                        animate={{ width: "100%" }}
                                                        transition={{ duration: 5, ease: "linear" }}
                                                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="h-full w-full bg-white/15 rounded-full" />
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="absolute bottom-5 right-5 lg:bottom-8 lg:right-8 flex items-center gap-2.5 z-20">
                            <button
                                onClick={handlePrev}
                                className="p-2.5 rounded-xl bg-white/8 hover:bg-white/15 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all text-white group"
                                aria-label="Previous award"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                            </button>
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="p-2.5 rounded-xl bg-white/8 hover:bg-white/15 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all text-white"
                                aria-label={isPlaying ? "Pause" : "Play"}
                            >
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={handleNext}
                                className="p-2.5 rounded-xl bg-white/8 hover:bg-white/15 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all text-white group"
                                aria-label="Next award"
                            >
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* Thumbnail strip */}
                    <div className="flex justify-center mt-5 gap-2.5 overflow-x-auto pb-2 px-2 scrollbar-hide">
                        {awards.map((award, i) => (
                            <motion.button
                                key={award.id}
                                onClick={() => setCurrentIndex(i)}
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.95 }}
                                className={`relative flex-shrink-0 rounded-xl overflow-hidden transition-all duration-300 border-2 ${
                                    i === currentIndex
                                        ? "border-purple-500 shadow-[0_0_16px_rgba(139,92,246,0.4)] scale-110"
                                        : "border-transparent opacity-45 hover:opacity-80"
                                }`}
                                style={{ width: 56, height: 56 }}
                                aria-label={`View award: ${award.title}`}
                            >
                                <img src={award.image} alt={award.title} className="w-full h-full object-cover" loading="lazy" />
                                {i === currentIndex && (
                                    <div className="absolute inset-0 bg-purple-500/20" />
                                )}
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
