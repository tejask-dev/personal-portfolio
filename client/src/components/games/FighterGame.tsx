'use client';
import { useEffect, useRef, useState } from 'react';
import { X, Trophy, Swords } from 'lucide-react';

interface FighterGameProps {
    onClose: () => void;
}

const CHARACTERS = [
    { name: 'Blaze', color: '#ef4444', power: 'Fireball', type: 'fire', desc: 'Ranged Specialist' },
    { name: 'Frost', color: '#3b82f6', power: 'Freeze', type: 'ice', desc: 'Control / Stun' },
    { name: 'Volt', color: '#eab308', power: 'Shock', type: 'electric', desc: 'Speed / Dash' },
    { name: 'Shadow', color: '#a855f7', power: 'Teleport', type: 'dark', desc: 'Tricky Movement' },
    { name: 'Jade', color: '#22c55e', power: 'Heal', type: 'nature', desc: 'Tank / Recovery' },
];

export default function FighterGame({ onClose }: FighterGameProps) {
    const [selectedChar, setSelectedChar] = useState<number | null>(null);
    const [hoveredChar, setHoveredChar] = useState<number>(0); // For selection preview
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const selectionCanvasRef = useRef<HTMLCanvasElement>(null);
    
    // UI State
    const [p1Health, setP1Health] = useState(100);
    const [p2Health, setP2Health] = useState(100);
    const [p1Energy, setP1Energy] = useState(100); // Power meter
    const [p2Energy, setP2Energy] = useState(100);
    const [winner, setWinner] = useState<string | null>(null);
    const [gameStateStr, setGameStateStr] = useState<'select' | 'fight' | 'over'>('select');

    // Game Loop State (Refs for performance)
    const game = useRef({
        p1: createPlayer(100, 300, true),
        p2: createPlayer(600, 300, false),
        projectiles: [] as any[],
        particles: [] as any[],
        hitStop: 0, // Freeze frames on hit
        cameraShake: 0,
        cpuCharIndex: 0
    });

    function createPlayer(x: number, y: number, facingRight: boolean) {
        return {
            x, y, width: 50, height: 100,
            hp: 100, energy: 100,
            vx: 0, vy: 0,
            isAttacking: false,
            attackType: 'punch' as 'punch' | 'kick',
            attackCooldown: 0,
            powerCooldown: 0,
            frozenTimer: 0,
            stunTimer: 0,
            facingRight,
            color: '#fff',
            charIndex: 0,
            frame: 0
        };
    }

    // --- SELECTION SCREEN ANIMATION ---
    useEffect(() => {
        if (gameStateStr !== 'select') return;
        const canvas = selectionCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frame = 0;
        let animId: number;

        const renderSelection = () => {
            ctx.fillStyle = '#111';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw 3D-ish Rotating Character
            const char = CHARACTERS[hoveredChar];
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2 + 50);
            
            // Fake 3D rotation
            const scale = Math.sin(frame * 0.05) * 0.1 + 1; 
            const rotateY = Math.cos(frame * 0.02) * 0.2; 
            
            ctx.scale(scale, scale);
            ctx.transform(1, 0, rotateY, 1, 0, 0); // Skew for "3D" feel

            // Glow
            ctx.shadowBlur = 50;
            ctx.shadowColor = char.color;

            // Body
            ctx.fillStyle = char.color;
            ctx.fillRect(-40, -80, 80, 160);

            // Head
            ctx.fillStyle = '#fff'; // Visor
            ctx.fillRect(10, -60, 20, 10);
            
            ctx.fillStyle = char.color; // Head overlay
            ctx.beginPath();
            ctx.arc(0, -90, 30, 0, Math.PI * 2);
            ctx.fill();

            // Arms (Idle Sway)
            ctx.fillRect(-50, -70 + Math.sin(frame * 0.1) * 5, 10, 60);
            ctx.fillRect(40, -70 - Math.sin(frame * 0.1) * 5, 10, 60);

            ctx.restore();

            // Text
            ctx.fillStyle = 'white';
            ctx.font = 'bold 40px sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 0;
            ctx.fillText(char.name, canvas.width / 2, 50);
            
            ctx.fillStyle = '#aaa';
            ctx.font = '20px sans-serif';
            ctx.fillText(char.power, canvas.width / 2, 90);
            ctx.fillText(char.desc, canvas.width / 2, 120);

            frame++;
            animId = requestAnimationFrame(renderSelection);
        };

        renderSelection();
        return () => cancelAnimationFrame(animId);
    }, [hoveredChar, gameStateStr]);


    // --- MAIN FIGHT LOOP ---
    useEffect(() => {
        if (gameStateStr !== 'fight') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Init Players
        if (selectedChar !== null) {
            game.current.p1 = createPlayer(100, 300, true);
            game.current.p1.color = CHARACTERS[selectedChar].color;
            game.current.p1.charIndex = selectedChar;

            // Random CPU
            const cpuIdx = Math.floor(Math.random() * CHARACTERS.length);
            game.current.cpuCharIndex = cpuIdx;
            game.current.p2 = createPlayer(600, 300, false);
            game.current.p2.color = CHARACTERS[cpuIdx].color;
            game.current.p2.charIndex = cpuIdx;
            
            // Reset state
            setP1Health(100);
            setP2Health(100);
            game.current.projectiles = [];
            game.current.particles = [];
        }

        let animId: number;
        const keys = { a: false, d: false, w: false, j: false, k: false, u: false };
        const gravity = 0.8;
        const groundY = 400;

        const drawChar = (c: any, isP1: boolean) => {
            ctx.save();
            // Apply shake/frozen effect
            if (c.frozenTimer > 0) {
                ctx.globalAlpha = 0.8;
                ctx.fillStyle = '#00ffff'; // Ice tint
            }
            
            ctx.translate(c.x + 25, c.y + 50);
            if (!c.facingRight) ctx.scale(-1, 1);

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(0, 50, 20, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Body
            ctx.fillStyle = c.frozenTimer > 0 ? '#aee' : c.color;
            ctx.fillRect(-15, -30, 30, 60);

            // Head
            ctx.beginPath();
            ctx.arc(0, -45, 15, 0, Math.PI * 2);
            ctx.fill();

            // Visor
            ctx.fillStyle = '#fff';
            ctx.fillRect(5, -50, 12, 6);

            // Limbs
            ctx.strokeStyle = c.color;
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';

            // Arms
            ctx.beginPath();
            if (c.isAttacking && c.attackType === 'punch') {
                // Punch Animation
                ctx.moveTo(-10, -20);
                ctx.lineTo(45, -20); 
            } else {
                // Idle/Walk
                ctx.moveTo(-10, -20);
                ctx.lineTo(10, 10);
            }
            ctx.stroke();

            // Legs
            ctx.beginPath();
            if (c.isAttacking && c.attackType === 'kick') {
                // Kick Animation (High Kick)
                ctx.moveTo(-5, 30);
                ctx.lineTo(40, 0);
                // Other leg planted
                ctx.moveTo(10, 30);
                ctx.lineTo(10, 60);
            } else {
                // Idle/Walk Animation
                const walkOffset = Math.sin(c.frame * 0.2) * 10;
                ctx.moveTo(-10, 30);
                ctx.lineTo(-15 + (Math.abs(c.vx) > 0 ? walkOffset : 0), 60);
                ctx.moveTo(10, 30);
                ctx.lineTo(15 - (Math.abs(c.vx) > 0 ? walkOffset : 0), 60);
            }
            ctx.stroke();

            // Frozen block overlay
            if (c.frozenTimer > 0) {
                ctx.fillStyle = 'rgba(100, 255, 255, 0.4)';
                ctx.fillRect(-30, -80, 60, 150);
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.strokeRect(-30, -80, 60, 150);
            }

            ctx.restore();
            ctx.globalAlpha = 1;
        };

        const createParticle = (x: number, y: number, color: string, type: 'hit' | 'spark' = 'hit') => {
            for (let i = 0; i < 5; i++) {
                game.current.particles.push({
                    x, y,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    life: 1.0,
                    color,
                    type
                });
            }
        };

        const usePower = (p: any, enemy: any, charIdx: number) => {
            if (p.energy < 30 || p.frozenTimer > 0 || p.stunTimer > 0) return;
            p.energy -= 30;
            p.powerCooldown = 60;
            
            const type = CHARACTERS[charIdx].type;
            if (type === 'fire') {
                game.current.projectiles.push({
                    x: p.x + (p.facingRight ? 60 : -20), y: p.y + 30,
                    vx: p.facingRight ? 12 : -12,
                    type: 'fire', active: true, owner: p
                });
            } else if (type === 'ice') {
                game.current.projectiles.push({
                    x: p.x + (p.facingRight ? 60 : -20), y: p.y + 30,
                    vx: p.facingRight ? 8 : -8,
                    type: 'ice', active: true, owner: p
                });
            } else if (type === 'electric') {
                // Instant Dash Hit
                p.x += p.facingRight ? 250 : -250;
                createParticle(p.x, p.y + 50, 'yellow', 'spark');
                if (Math.abs(p.x - enemy.x) < 50 && Math.abs(p.y - enemy.y) < 50) {
                    enemy.hp -= 10;
                    enemy.stunTimer = 30;
                    game.current.hitStop = 5;
                    game.current.cameraShake = 5;
                }
            } else if (type === 'dark') {
                // Teleport Behind
                p.x = enemy.x + (enemy.facingRight ? -80 : 80);
                p.facingRight = !enemy.facingRight;
                createParticle(p.x, p.y + 50, 'purple', 'spark');
            } else if (type === 'nature') {
                p.hp = Math.min(100, p.hp + 20);
                createParticle(p.x, p.y + 50, 'green', 'spark');
            }
        };

        const update = () => {
            const { p1, p2 } = game.current;

            if (game.current.hitStop > 0) {
                game.current.hitStop--;
                draw(); // Just redraw, no update
                animId = requestAnimationFrame(update);
                return;
            }

            if (p1.hp <= 0 || p2.hp <= 0) {
                setWinner(p1.hp > 0 ? 'Player 1' : 'CPU');
                setGameStateStr('over');
                return; // Stop loop
            }

            // Sync React State for UI
            if (p1.frame % 10 === 0) {
                setP1Health(p1.hp); setP2Health(p2.hp);
                setP1Energy(p1.energy); setP2Energy(p2.energy);
            }

            // --- Player 1 Input ---
            if (p1.frozenTimer <= 0 && p1.stunTimer <= 0) {
                p1.vx = 0;
                if (keys.a) { p1.vx = -5; p1.facingRight = false; }
                if (keys.d) { p1.vx = 5; p1.facingRight = true; }
                if (keys.w && p1.y + p1.height >= groundY) p1.vy = -18;
                
                // Attacks
                if ((keys.j || keys.k) && p1.attackCooldown <= 0) {
                    p1.isAttacking = true;
                    p1.attackType = keys.k ? 'kick' : 'punch';
                    p1.attackCooldown = 25;
                    p1.energy = Math.min(100, p1.energy + 5); // Build meter
                    
                    // Hitbox
                    const range = keys.k ? 70 : 50; // Kick is longer
                    const damage = keys.k ? 8 : 5;
                    if (Math.abs(p1.x - p2.x) < range && Math.abs(p1.y - p2.y) < 50) {
                        // Hit!
                        p2.hp -= damage;
                        p2.stunTimer = 15;
                        p2.vx = p1.facingRight ? 10 : -10; // Knockback
                        p2.vy = -5;
                        game.current.hitStop = 4; // Hitstop effect
                        game.current.cameraShake = 3;
                        createParticle(p2.x + 25, p2.y + 20, 'white');
                    }
                }
                if (keys.u) usePower(p1, p2, p1.charIndex);
            } else {
                if (p1.frozenTimer > 0) p1.frozenTimer--;
                if (p1.stunTimer > 0) p1.stunTimer--;
            }

            // --- Player 2 AI ---
            if (p2.frozenTimer <= 0 && p2.stunTimer <= 0) {
                const dist = p1.x - p2.x;
                // Movement
                if (Math.abs(dist) > 60) {
                    p2.vx = dist > 0 ? 3 : -3;
                    p2.facingRight = dist > 0;
                } else {
                    p2.vx = 0;
                }
                // Attack
                if (Math.abs(dist) < 70 && p2.attackCooldown <= 0 && Math.random() < 0.05) {
                    p2.isAttacking = true;
                    p2.attackType = Math.random() > 0.5 ? 'kick' : 'punch';
                    p2.attackCooldown = 40;
                    
                    if (Math.abs(p1.x - p2.x) < (p2.attackType === 'kick' ? 70 : 50) && Math.abs(p1.y - p2.y) < 50) {
                        p1.hp -= (p2.attackType === 'kick' ? 8 : 5);
                        p1.stunTimer = 15;
                        p1.vx = p2.facingRight ? 10 : -10;
                        game.current.hitStop = 4;
                        createParticle(p1.x + 25, p1.y + 20, 'red');
                    }
                }
                // Power
                if (Math.random() < 0.01 && p2.energy >= 30) {
                    usePower(p2, p1, p2.charIndex);
                }
            } else {
                if (p2.frozenTimer > 0) p2.frozenTimer--;
                if (p2.stunTimer > 0) p2.stunTimer--;
            }

            // Physics
            [p1, p2].forEach(p => {
                p.vy += gravity;
                p.y += p.vy;
                p.x += p.vx;
                
                // Friction
                if (!keys.a && !keys.d && p === p1) p.vx *= 0.8;
                if (p === p2) p.vx *= 0.8;

                // Floor
                if (p.y + p.height > groundY) {
                    p.y = groundY - p.height;
                    p.vy = 0;
                }
                // Walls
                p.x = Math.max(0, Math.min(canvas.width - p.width, p.x));
                
                // Cooldowns
                if (p.attackCooldown > 0) p.attackCooldown--;
                if (p.attackCooldown < 10) p.isAttacking = false; // Anim end
                if (p.powerCooldown > 0) p.powerCooldown--;
                
                p.frame++;
            });

            // Projectiles
            game.current.projectiles.forEach((proj, i) => {
                if (!proj.active) return;
                proj.x += proj.vx;
                
                // Check collision with target (opposite of owner)
                const target = proj.owner === p1 ? p2 : p1;
                
                if (Math.abs(proj.x - (target.x + 25)) < 30 && Math.abs(proj.y - (target.y + 50)) < 50) {
                    proj.active = false;
                    if (proj.type === 'fire') {
                        target.hp -= 15;
                        target.stunTimer = 20;
                        createParticle(target.x, target.y, 'orange');
                    } else if (proj.type === 'ice') {
                        target.hp -= 5;
                        target.frozenTimer = 120; // 2 seconds (at 60fps)
                        createParticle(target.x, target.y, 'cyan');
                    }
                    game.current.hitStop = 5;
                }
                
                // Bounds
                if (proj.x < 0 || proj.x > canvas.width) proj.active = false;
            });

            // Draw
            draw();
            animId = requestAnimationFrame(update);
        };

        const draw = () => {
            // Clear
            ctx.fillStyle = '#222';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Camera Shake
            if (game.current.cameraShake > 0) {
                ctx.save();
                const dx = (Math.random() - 0.5) * game.current.cameraShake;
                const dy = (Math.random() - 0.5) * game.current.cameraShake;
                ctx.translate(dx, dy);
                game.current.cameraShake *= 0.9;
                if (game.current.cameraShake < 0.5) game.current.cameraShake = 0;
            }

            // Background Floor
            ctx.fillStyle = '#333';
            ctx.fillRect(0, groundY, canvas.width, 200);
            
            // Particles
            game.current.particles.forEach((p, i) => {
                p.x += p.vx; p.y += p.vy; p.life -= 0.05;
                if (p.life > 0) {
                    ctx.globalAlpha = p.life;
                    ctx.fillStyle = p.color;
                    ctx.fillRect(p.x, p.y, 4, 4);
                } else {
                    game.current.particles.splice(i, 1);
                }
            });
            ctx.globalAlpha = 1;

            // Projectiles
            game.current.projectiles.forEach(p => {
                if (!p.active) return;
                ctx.fillStyle = p.type === 'fire' ? '#f00' : '#0ff';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 10, 0, Math.PI*2);
                ctx.fill();
                // Trail
                ctx.shadowBlur = 10;
                ctx.shadowColor = ctx.fillStyle;
                ctx.stroke();
                ctx.shadowBlur = 0;
            });

            drawChar(game.current.p1, true);
            drawChar(game.current.p2, false);

            if (game.current.cameraShake > 0) ctx.restore();
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            switch(e.key.toLowerCase()) {
                case 'a': keys.a = true; break;
                case 'd': keys.d = true; break;
                case 'w': keys.w = true; break;
                case 'j': keys.j = true; break;
                case 'k': keys.k = true; break;
                case 'u': keys.u = true; break;
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            switch(e.key.toLowerCase()) {
                case 'a': keys.a = false; break;
                case 'd': keys.d = false; break;
                case 'w': keys.w = false; break;
                case 'j': keys.j = false; break;
                case 'k': keys.k = false; break;
                case 'u': keys.u = false; break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        update();

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            cancelAnimationFrame(animId);
        };
    }, [gameStateStr, selectedChar]);

    // --- RENDER UI ---
    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center backdrop-blur-sm">
            <div className="relative w-full max-w-5xl h-[600px] bg-gray-900 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl flex flex-col">
                {/* Top Bar */}
                <div className="absolute top-4 right-4 z-[100]">
                    <button onClick={onClose} className="p-2 bg-red-500/80 hover:bg-red-600 rounded-full text-white transition-colors shadow-lg">
                        <X className="w-8 h-8" />
                    </button>
                </div>

                {gameStateStr === 'select' && (
                    <div className="w-full h-full flex flex-col">
                        <div className="flex-1 relative">
                            {/* 3D Character Preview Canvas */}
                            <canvas ref={selectionCanvasRef} width={1024} height={400} className="w-full h-full object-cover" />
                        </div>
                        
                        <div className="h-48 bg-gray-800 p-4 grid grid-cols-5 gap-4 items-center">
                            {CHARACTERS.map((char, i) => (
                                <button 
                                    key={i}
                                    onMouseEnter={() => setHoveredChar(i)}
                                    onClick={() => { setSelectedChar(i); setGameStateStr('fight'); }}
                                    className={`h-32 rounded-xl border-4 transition-all relative overflow-hidden group ${
                                        hoveredChar === i ? 'border-white scale-105 shadow-lg' : 'border-transparent opacity-70'
                                    }`}
                                    style={{ backgroundColor: char.color }}
                                >
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-2xl font-black text-black/50 uppercase -rotate-12">{char.type}</span>
                                    </div>
                                    <div className="absolute bottom-0 w-full bg-black/60 text-white text-center py-1 font-bold">
                                        {char.name}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {gameStateStr === 'fight' && (
                    <div className="relative w-full h-full bg-gray-950">
                        {/* HUD */}
                        <div className="absolute top-0 w-full p-6 flex justify-between items-start pointer-events-none">
                            {/* P1 */}
                            <div className="w-[40%]">
                                <div className="flex justify-between text-white font-bold text-xl mb-1">
                                    <span>{CHARACTERS[selectedChar!].name}</span>
                                    <span>{Math.ceil(p1Health)}%</span>
                                </div>
                                <div className="w-full h-6 bg-gray-800 rounded skew-x-12 border border-white/20 overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-green-400 to-emerald-600 transition-all duration-200" style={{ width: `${Math.max(0, p1Health)}%` }} />
                                </div>
                                <div className="w-[80%] h-2 mt-1 bg-gray-800 rounded skew-x-12 overflow-hidden">
                                    <div className="h-full bg-blue-500 transition-all duration-200" style={{ width: `${p1Energy}%` }} />
                                </div>
                            </div>

                            {/* VS */}
                            <div className="text-4xl font-black text-white italic">VS</div>

                            {/* P2 */}
                            <div className="w-[40%] text-right">
                                <div className="flex justify-between text-white font-bold text-xl mb-1">
                                    <span>{Math.ceil(p2Health)}%</span>
                                    <span>CPU ({CHARACTERS[game.current.cpuCharIndex].name})</span>
                                </div>
                                <div className="w-full h-6 bg-gray-800 rounded -skew-x-12 border border-white/20 overflow-hidden">
                                    <div className="h-full bg-gradient-to-l from-red-400 to-rose-600 ml-auto transition-all duration-200" style={{ width: `${Math.max(0, p2Health)}%` }} />
                                </div>
                                <div className="w-[80%] h-2 mt-1 bg-gray-800 rounded -skew-x-12 overflow-hidden ml-auto">
                                    <div className="h-full bg-blue-500 transition-all duration-200 ml-auto" style={{ width: `${p2Energy}%` }} />
                                </div>
                            </div>
                        </div>

                        <canvas ref={canvasRef} width={1024} height={600} className="w-full h-full" />
                        
                        <div className="absolute bottom-4 w-full text-center text-white/50 text-sm pointer-events-none font-mono">
                            [A/D] Move • [W] Jump • [J] Punch • [K] Kick • [U] POWER ({CHARACTERS[selectedChar!].power})
                        </div>
                    </div>
                )}

                {gameStateStr === 'over' && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
                        <Trophy className="w-24 h-24 text-yellow-400 mb-4 animate-bounce" />
                        <h2 className="text-6xl font-black text-white mb-2 italic uppercase tracking-tighter">
                            {winner === 'Player 1' ? 'Victory' : 'Defeat'}
                        </h2>
                        <p className="text-gray-400 text-xl mb-8">
                            {winner === 'Player 1' ? 'You proved your strength!' : 'Train harder and try again.'}
                        </p>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => { setGameStateStr('fight'); }}
                                className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform flex items-center gap-2"
                            >
                                <Swords className="w-5 h-5" /> Rematch
                            </button>
                            <button 
                                onClick={() => { setGameStateStr('select'); setSelectedChar(null); }}
                                className="px-8 py-3 bg-gray-800 text-white font-bold rounded-full hover:bg-gray-700 transition-colors"
                            >
                                Character Select
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
