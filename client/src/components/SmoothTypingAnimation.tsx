'use client';
import { useState, useEffect } from 'react';

interface SmoothTypingAnimationProps {
    words: string[];
    className?: string;
    delay?: number;
    speed?: number;
    pauseTime?: number;
}

export default function SmoothTypingAnimation({ 
    words, 
    className = '', 
    delay = 0, 
    speed = 80, 
    pauseTime = 2000 
}: SmoothTypingAnimationProps) {
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [currentText, setCurrentText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);

    useEffect(() => {
        const startTimeout = setTimeout(() => setHasStarted(true), delay);
        return () => clearTimeout(startTimeout);
    }, [delay]);

    useEffect(() => {
        if (!hasStarted || words.length === 0) return;
        
        const timeout = setTimeout(() => {
            const currentWord = words[currentWordIndex];
            
            if (isPaused) {
                setIsPaused(false);
                setIsDeleting(true);
                return;
            }
            
            if (!isDeleting && currentText.length < currentWord.length) {
                // Typing
                setCurrentText(currentWord.slice(0, currentText.length + 1));
            } else if (!isDeleting && currentText.length === currentWord.length) {
                // Finished typing, pause
                setIsPaused(true);
            } else if (isDeleting && currentText.length > 0) {
                // Deleting
                setCurrentText(currentWord.slice(0, currentText.length - 1));
            } else if (isDeleting && currentText.length === 0) {
                // Finished deleting, move to next word
                setIsDeleting(false);
                setCurrentWordIndex((prev) => (prev + 1) % words.length);
            }
        }, isPaused ? pauseTime : isDeleting ? speed / 2 : speed);

        return () => clearTimeout(timeout);
    }, [currentText, isDeleting, isPaused, currentWordIndex, words, speed, pauseTime, hasStarted]);

    return (
        <div className={`relative inline-flex items-center ${className}`}>
            <span className="text-white font-semibold whitespace-nowrap">
                {currentText}
            </span>
            
            {/* Smooth cursor */}
            <span className="w-0.5 h-[1.2em] bg-purple-500 ml-1 animate-blink" />
        </div>
    );
}
