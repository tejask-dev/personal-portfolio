'use client';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AnimatedTextProps {
    text: string;
    className?: string;
    delay?: number;
    duration?: number;
    type?: 'fadeIn' | 'slideIn' | 'bounce' | 'glitch' | 'typewriter';
}

export default function AnimatedText({
    text,
    className = '',
    delay = 0,
    duration = 1000,
    type = 'fadeIn'
}: AnimatedTextProps) {
    const textRef = useRef<HTMLDivElement>(null);

    const getAnimationProps = () => {
        switch (type) {
            case 'fadeIn':
                return {
                    initial: { opacity: 0, y: 50 },
                    animate: { opacity: 1, y: 0 },
                    transition: { duration: duration / 1000, delay: delay / 1000, ease: "easeOut" }
                };
            case 'slideIn':
                return {
                    initial: { x: -100, opacity: 0 },
                    animate: { x: 0, opacity: 1 },
                    transition: { duration: duration / 1000, delay: delay / 1000, ease: "easeOut" }
                };
            case 'bounce':
                return {
                    initial: { y: -100, scale: 0.5, opacity: 0 },
                    animate: { y: 0, scale: 1, opacity: 1 },
                    transition: { 
                        duration: duration / 1000, 
                        delay: delay / 1000, 
                        ease: "easeOut",
                        type: "spring",
                        stiffness: 100
                    }
                };
            case 'glitch':
                return {
                    initial: { opacity: 0 },
                    animate: { 
                        opacity: 1,
                        x: [0, -5, 5, -3, 3, 0],
                        y: [0, -2, 2, -1, 1, 0]
                    },
                    transition: { 
                        duration: duration / 1000, 
                        delay: delay / 1000,
                        x: { duration: 0.2, repeat: 1 },
                        y: { duration: 0.2, repeat: 1 }
                    }
                };
            case 'typewriter':
                return {
                    initial: { opacity: 0 },
                    animate: { opacity: 1 },
                    transition: { 
                        duration: duration / 1000, 
                        delay: delay / 1000,
                        staggerChildren: 0.05
                    }
                };
            default:
                return {
                    initial: { opacity: 0, y: 50 },
                    animate: { opacity: 1, y: 0 },
                    transition: { duration: duration / 1000, delay: delay / 1000, ease: "easeOut" }
                };
        }
    };

    const renderTypewriterText = () => {
        if (type !== 'typewriter') return text;
        
        return text.split('').map((char, index) => (
            <motion.span
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ 
                    duration: 0.1, 
                    delay: (delay / 1000) + (index * 0.05) 
                }}
            >
                {char === ' ' ? '\u00A0' : char}
            </motion.span>
        ));
    };

    return (
        <motion.div
            ref={textRef}
            className={className}
            {...getAnimationProps()}
        >
            {type === 'typewriter' ? renderTypewriterText() : text}
        </motion.div>
    );
}