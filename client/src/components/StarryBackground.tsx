'use client';
import { useEffect, useRef } from 'react';

interface Star {
    x: number;
    y: number;
    size: number;
    opacity: number;
    speed: number;
    twinkleSpeed: number;
    twinklePhase: number;
}

interface ShootingStar {
    x: number;
    y: number;
    length: number;
    speed: number;
    angle: number;
    opacity: number;
    active: boolean;
}

export default function StarryBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        let animationFrameId: number;

        // Set canvas size
        const resizeCanvas = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // Initialize stars
        const stars: Star[] = [];
        const numStars = Math.floor((width * height) / 3000); // Density of stars

        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 1.5 + 0.5,
                opacity: Math.random(),
                speed: Math.random() * 0.05 + 0.01,
                twinkleSpeed: Math.random() * 0.02 + 0.005,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }

        // Shooting stars
        let shootingStar: ShootingStar | null = null;
        let shootingStarTimer = 0;
        const shootingStarInterval = 200; // Frames between shooting stars

        const createShootingStar = (): ShootingStar => {
            const startX = Math.random() * width;
            const startY = Math.random() * height * 0.5; // Start in top half
            const angle = Math.PI / 4 + (Math.random() * Math.PI / 4); // 45 to 90 degrees down-right
            return {
                x: startX,
                y: startY,
                length: Math.random() * 80 + 20,
                speed: Math.random() * 10 + 5,
                angle: angle,
                opacity: 1,
                active: true
            };
        };

        // Animation Loop
        const render = () => {
            ctx.clearRect(0, 0, width, height);
            
            // Draw Stars
            stars.forEach(star => {
                // Update star
                star.y -= star.speed;
                if (star.y < 0) star.y = height;
                
                // Twinkle
                star.twinklePhase += star.twinkleSpeed;
                const twinkle = Math.sin(star.twinklePhase) * 0.5 + 0.5; // 0 to 1
                const currentOpacity = star.opacity * (0.5 + twinkle * 0.5);

                // Draw
                ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
            });

            // Handle Shooting Star
            shootingStarTimer++;
            if (shootingStarTimer > shootingStarInterval && !shootingStar) {
                if (Math.random() < 0.01) { // Chance to spawn
                    shootingStar = createShootingStar();
                    shootingStarTimer = 0;
                }
            }

            if (shootingStar && shootingStar.active) {
                // Update
                shootingStar.x += Math.cos(shootingStar.angle) * shootingStar.speed;
                shootingStar.y += Math.sin(shootingStar.angle) * shootingStar.speed;
                shootingStar.opacity -= 0.01;

                // Draw
                if (shootingStar.opacity > 0) {
                    const tailX = shootingStar.x - Math.cos(shootingStar.angle) * shootingStar.length;
                    const tailY = shootingStar.y - Math.sin(shootingStar.angle) * shootingStar.length;

                    const gradient = ctx.createLinearGradient(shootingStar.x, shootingStar.y, tailX, tailY);
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${shootingStar.opacity})`);
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(shootingStar.x, shootingStar.y);
                    ctx.lineTo(tailX, tailY);
                    ctx.stroke();
                    
                    // Glow head
                    ctx.fillStyle = `rgba(255, 255, 255, ${shootingStar.opacity})`;
                    ctx.beginPath();
                    ctx.arc(shootingStar.x, shootingStar.y, 2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    shootingStar.active = false;
                    shootingStar = null;
                }
                
                // Bounds check
                if (shootingStar && (shootingStar.x > width || shootingStar.y > height)) {
                    shootingStar.active = false;
                    shootingStar = null;
                }
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 pointer-events-none"
            style={{ background: 'transparent' }}
        />
    );
}
