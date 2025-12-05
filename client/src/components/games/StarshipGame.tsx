'use client';
import { useEffect, useRef, useState } from 'react';
import { X, MousePointer2, Shield, Zap, Heart } from 'lucide-react';

interface StarshipGameProps {
    onClose: () => void;
}

export default function StarshipGame({ onClose }: StarshipGameProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [health, setHealth] = useState(100);
    
    // UI state for active powerups
    const [activeShield, setActiveShield] = useState(0);
    const [activeDoubleShot, setActiveDoubleShot] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Game state refs
        let animationId: number;
        let frame = 0;
        
        const player = { x: canvas.width / 2, y: canvas.height - 50, width: 30, height: 30, color: '#00ffff' };
        const bullets: any[] = [];
        const enemies: any[] = [];
        const particles: any[] = [];
        const powerups: any[] = [];
        
        let isMouseDown = false;
        let shieldTimer = 0;
        let doubleShotTimer = 0;

        const spawnEnemy = () => {
            const size = Math.random() * 20 + 20;
            const type = Math.random() > 0.7 ? 'chaser' : 'normal';
            enemies.push({
                x: Math.random() * (canvas.width - size),
                y: -size,
                width: size,
                height: size,
                color: type === 'chaser' ? '#ff0055' : '#ff9900',
                speed: Math.random() * 2 + 1,
                type,
                hp: type === 'chaser' ? 3 : 1
            });
        };

        const spawnPowerup = (x: number, y: number) => {
            if (Math.random() > 0.2) { // 20% chance
                const type = Math.random();
                let pType = 'heal';
                let color = '#22c55e';
                if (type < 0.33) { pType = 'shield'; color = '#3b82f6'; }
                else if (type < 0.66) { pType = 'double'; color = '#ef4444'; }
                
                powerups.push({ x, y, type: pType, color, vy: 2, radius: 10 });
            }
        };

        const createExplosion = (x: number, y: number, color: string) => {
            for (let i = 0; i < 10; i++) {
                particles.push({
                    x, y,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    life: 1,
                    color
                });
            }
        };

        const update = () => {
            if (health <= 0) {
                setGameOver(true);
                return;
            }

            // Update timers
            if (shieldTimer > 0) shieldTimer--;
            if (doubleShotTimer > 0) doubleShotTimer--;
            
            // Sync UI (throttled slightly for perf? actually React state updates are batched)
            if (frame % 30 === 0) {
                setActiveShield(Math.ceil(shieldTimer / 60));
                setActiveDoubleShot(Math.ceil(doubleShotTimer / 60));
            }

            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Trail effect
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Player
            ctx.save();
            ctx.translate(player.x, player.y);
            
            // Shield Effect
            if (shieldTimer > 0) {
                ctx.beginPath();
                ctx.arc(0, 0, 25, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(60, 130, 246, ${Math.random() * 0.5 + 0.5})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(-15, 15);
            ctx.lineTo(15, 15);
            ctx.closePath();
            ctx.fill();
            
            // Engine flame
            ctx.fillStyle = `rgba(255, 100, 0, ${Math.random()})`;
            ctx.beginPath();
            ctx.moveTo(-10, 15);
            ctx.lineTo(0, 25 + Math.random() * 10);
            ctx.lineTo(10, 15);
            ctx.fill();
            ctx.restore();

            // Bullets
            if (frame % 8 === 0 && isMouseDown) {
                if (doubleShotTimer > 0) {
                    bullets.push({ x: player.x - 10, y: player.y - 15, width: 4, height: 10, color: '#ffff00', speed: 10 });
                    bullets.push({ x: player.x + 10, y: player.y - 15, width: 4, height: 10, color: '#ffff00', speed: 10 });
                } else {
                    bullets.push({ x: player.x, y: player.y - 15, width: 4, height: 10, color: '#ffff00', speed: 10 });
                }
            }

            bullets.forEach((b, i) => {
                b.y -= b.speed;
                ctx.fillStyle = b.color;
                ctx.fillRect(b.x - b.width/2, b.y, b.width, b.height);
                if (b.y < 0) bullets.splice(i, 1);
            });

            // Enemies
            if (frame % 60 === 0) spawnEnemy();

            enemies.forEach((e, i) => {
                e.y += e.speed;
                if (e.type === 'chaser') {
                    if (e.x < player.x) e.x += 0.5;
                    if (e.x > player.x) e.x -= 0.5;
                }

                ctx.fillStyle = e.color;
                ctx.fillRect(e.x, e.y, e.width, e.height);

                // Collision Player
                if (
                    player.x - 15 < e.x + e.width &&
                    player.x + 15 > e.x &&
                    player.y - 15 < e.y + e.height &&
                    player.y + 15 > e.y
                ) {
                    createExplosion(e.x + e.width/2, e.y + e.height/2, e.color);
                    enemies.splice(i, 1);
                    if (shieldTimer <= 0) {
                        setHealth(prev => Math.max(0, prev - 20));
                    }
                }

                // Collision Bullet
                bullets.forEach((b, bi) => {
                    if (
                        b.x > e.x &&
                        b.x < e.x + e.width &&
                        b.y > e.y &&
                        b.y < e.y + e.height
                    ) {
                        bullets.splice(bi, 1);
                        e.hp--;
                        if (e.hp <= 0) {
                            createExplosion(e.x + e.width/2, e.y + e.height/2, e.color);
                            spawnPowerup(e.x + e.width/2, e.y + e.height/2);
                            enemies.splice(i, 1);
                            setScore(prev => prev + 100);
                        }
                    }
                });

                if (e.y > canvas.height) enemies.splice(i, 1);
            });

            // Powerups
            powerups.forEach((p, i) => {
                p.y += p.vy;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
                // Glow
                ctx.shadowBlur = 10;
                ctx.shadowColor = p.color;
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Collision Player
                const dist = Math.hypot(player.x - p.x, player.y - p.y);
                if (dist < 30) {
                    if (p.type === 'shield') shieldTimer = 300; // 5s
                    if (p.type === 'double') doubleShotTimer = 600; // 10s
                    if (p.type === 'heal') setHealth(prev => Math.min(100, prev + 20));
                    powerups.splice(i, 1);
                }

                if (p.y > canvas.height) powerups.splice(i, 1);
            });

            // Particles
            particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.05;
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, 3, 3);
                ctx.globalAlpha = 1;
                if (p.life <= 0) particles.splice(i, 1);
            });

            frame++;
            animationId = requestAnimationFrame(update);
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            player.x = e.clientX - rect.left;
            player.y = e.clientY - rect.top;
        };

        const handleMouseDown = () => isMouseDown = true;
        const handleMouseUp = () => isMouseDown = false;

        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mouseup', handleMouseUp);
        
        update();

        return () => {
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mouseup', handleMouseUp);
            cancelAnimationFrame(animationId);
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center backdrop-blur-sm">
            <div className="relative">
                <div className="absolute -top-12 left-0 right-0 flex justify-between text-white items-center w-[400px]">
                    <div className="text-xl font-bold">Score: {score}</div>
                    
                    {/* Active Powerups HUD */}
                    <div className="flex gap-2">
                        {activeShield > 0 && (
                            <div className="flex items-center gap-1 bg-blue-500/20 px-2 py-1 rounded-full text-blue-400 text-sm">
                                <Shield className="w-4 h-4" /> {activeShield}s
                            </div>
                        )}
                        {activeDoubleShot > 0 && (
                            <div className="flex items-center gap-1 bg-red-500/20 px-2 py-1 rounded-full text-red-400 text-sm">
                                <Zap className="w-4 h-4" /> {activeDoubleShot}s
                            </div>
                        )}
                    </div>

                    <div className="text-xl font-bold text-red-400 flex items-center gap-1">
                        <Heart className="w-5 h-5 fill-current" /> {health}%
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full"><X /></button>
                </div>
                
                <canvas 
                    ref={canvasRef} 
                    width={400} 
                    height={600} 
                    className="bg-black rounded-xl border-2 border-cyan-500 cursor-none shadow-[0_0_50px_rgba(0,255,255,0.3)]"
                />

                {gameOver && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl">
                        <div className="text-center">
                            <h2 className="text-4xl font-bold text-red-500 mb-4">Mission Failed</h2>
                            <p className="text-white mb-4">Final Score: {score}</p>
                            <button 
                                onClick={() => window.location.reload()} 
                                className="px-6 py-2 bg-cyan-500 text-black font-bold rounded hover:bg-cyan-400"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}
                
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm flex items-center gap-2">
                    <MousePointer2 className="w-4 h-4" /> Move & Click to Shoot
                </div>
            </div>
        </div>
    );
}
