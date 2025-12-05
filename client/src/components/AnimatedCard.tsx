'use client';
import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface AnimatedCardProps {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: 'lift' | 'glow' | 'tilt' | 'magnetic' | 'morph';
    delay?: number;
}

export default function AnimatedCard({
    children,
    className = '',
    hoverEffect = 'lift',
    delay = 0
}: AnimatedCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Mouse position tracking for 3D Tilt
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Smooth spring animation
    const mouseX = useSpring(x, { stiffness: 150, damping: 15 });
    const mouseY = useSpring(y, { stiffness: 150, damping: 15 });

    // Transform mouse position to rotation
    const rotateX = useTransform(mouseY, [-0.5, 0.5], [15, -15]); // Reverse axis for natural feel
    const rotateY = useTransform(mouseX, [-0.5, 0.5], [-15, 15]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXRel = e.clientX - rect.left;
        const mouseYRel = e.clientY - rect.top;
        
        // Calculate normalized position (-0.5 to 0.5)
        const xPct = (mouseXRel / width) - 0.5;
        const yPct = (mouseYRel / height) - 0.5;

        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        x.set(0);
        y.set(0);
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
    };

    const getHoverProps = () => {
        switch (hoverEffect) {
            case 'magnetic': // Now essentially the 3D Tilt
            case 'tilt':
                return {
                    style: {
                        rotateX: rotateX,
                        rotateY: rotateY,
                        transformStyle: "preserve-3d" as const,
                    }
                };
            case 'lift':
                return {
                    whileHover: { y: -10, scale: 1.02 }
                };
            default:
                return {
                    whileHover: { scale: 1.02 }
                };
        }
    };

    return (
        <motion.div
            ref={cardRef}
            className={`relative perspective-1000 ${className}`} // perspective is key for 3D
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: delay }}
            onMouseMove={hoverEffect === 'magnetic' || hoverEffect === 'tilt' ? handleMouseMove : undefined}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...getHoverProps()}
        >
            <div style={{ transform: "translateZ(0)" }}> {/* Fix for some browser rendering artifacts */}
                {children}
            </div>
            
            {/* Shine Effect for Tilt/Magnetic */}
            {(hoverEffect === 'magnetic' || hoverEffect === 'tilt') && (
                <motion.div 
                    className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/10 to-transparent rounded-2xl z-20"
                    style={{
                        opacity: useTransform(mouseX, [-0.5, 0, 0.5], [0, 0.5, 0]),
                        rotateX: rotateX, // Match rotation
                        rotateY: rotateY,
                    }}
                />
            )}
        </motion.div>
    );
}
