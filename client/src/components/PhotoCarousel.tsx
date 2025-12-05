'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { allPhotos } from '../lib/photos';

export default function PhotoCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    const photos = allPhotos;

    // Auto-play functionality
    useEffect(() => {
        if (!isAutoPlaying) return;

        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
        }, 3000); // Change photo every 3 seconds

        return () => clearInterval(interval);
    }, [isAutoPlaying, photos.length]);

    const nextPhoto = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
    };

    const prevPhoto = () => {
        setCurrentIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length);
    };

    const goToPhoto = (index: number) => {
        setCurrentIndex(index);
    };

    return (
        <div className="relative w-full max-w-[280px] sm:max-w-[320px] h-[350px] sm:h-96 mx-auto group">
            {/* Main Photo Container */}
            <div className="relative w-full h-full overflow-hidden rounded-2xl shadow-2xl border-4 border-white/10">
                <AnimatePresence mode="wait">
                    <motion.img
                        key={currentIndex}
                        src={photos[currentIndex]}
                        alt={`Tejas Kaushik ${currentIndex + 1}`}
                        className="w-full h-full object-cover"
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.5 }}
                    />
                </AnimatePresence>
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Navigation Arrows */}
                <motion.button
                    onClick={prevPhoto}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 bg-black/40 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/60"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <ChevronLeft className="w-5 h-5" />
                </motion.button>

                <motion.button
                    onClick={nextPhoto}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-black/40 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/60"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <ChevronRight className="w-5 h-5" />
                </motion.button>

                {/* Play/Pause Button */}
                <motion.button
                    onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                    className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/60"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </motion.button>
            </div>

            {/* Navigation Dots - Limited to first few or indicator */}
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex gap-1.5">
                {photos.slice(0, 5).map((_, index) => (
                    <motion.button
                        key={index}
                        onClick={() => goToPhoto(index)}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                            index === currentIndex 
                                ? 'bg-purple-500 w-4' 
                                : 'bg-gray-600 hover:bg-gray-400'
                        }`}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                    />
                ))}
                {photos.length > 5 && (
                    <span className="text-gray-600 text-xs self-center ml-1">+{photos.length - 5}</span>
                )}
            </div>

            {/* Photo Counter */}
            <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {currentIndex + 1} / {photos.length}
            </div>
        </div>
    );
}
