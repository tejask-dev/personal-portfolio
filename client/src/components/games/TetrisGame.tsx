'use client';
import { useEffect, useRef, useState } from 'react';
import { X, RotateCcw } from 'lucide-react';

interface TetrisGameProps {
    onClose: () => void;
}

const SHAPES = [
    [[1, 1, 1, 1]], // I
    [[1, 1], [1, 1]], // O
    [[0, 1, 0], [1, 1, 1]], // T
    [[1, 0, 0], [1, 1, 1]], // L
    [[0, 0, 1], [1, 1, 1]], // J
    [[0, 1, 1], [1, 1, 0]], // S
    [[1, 1, 0], [0, 1, 1]]  // Z
];

const COLORS = ['#00f0f0', '#f0f000', '#a000f0', '#f0a000', '#0000f0', '#00f000', '#f00000'];

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;

export default function TetrisGame({ onClose }: TetrisGameProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Game state refs to avoid closure staleness in loop
    const gameState = useRef({
        grid: Array(ROWS).fill(null).map(() => Array(COLS).fill(0)),
        currentPiece: null as any,
        score: 0,
        gameOver: false
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        let lastTime = 0;
        let dropCounter = 0;
        let dropInterval = 1000;

        const resetGame = () => {
            gameState.current = {
                grid: Array(ROWS).fill(null).map(() => Array(COLS).fill(0)),
                currentPiece: createPiece(),
                score: 0,
                gameOver: false
            };
            setScore(0);
            setGameOver(false);
            dropInterval = 1000;
        };

        const createPiece = () => {
            const typeId = Math.floor(Math.random() * SHAPES.length);
            const shape = SHAPES[typeId];
            return {
                shape,
                color: COLORS[typeId],
                x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
                y: 0
            };
        };

        const draw = () => {
            // Clear
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw grid
            gameState.current.grid.forEach((row, y) => {
                row.forEach((value: number, x: number) => {
                    if (value) {
                        ctx.fillStyle = value as any; // value stores color string
                        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                    }
                });
            });

            // Draw current piece
            if (gameState.current.currentPiece) {
                const { shape, color, x, y } = gameState.current.currentPiece;
                shape.forEach((row: number[], dy: number) => {
                    row.forEach((value, dx) => {
                        if (value) {
                            ctx.fillStyle = color;
                            ctx.fillRect((x + dx) * BLOCK_SIZE, (y + dy) * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                        }
                    });
                });
            }
        };

        const collide = (grid: any[][], piece: any) => {
            const { shape, x, y } = piece;
            for (let dy = 0; dy < shape.length; dy++) {
                for (let dx = 0; dx < shape[dy].length; dx++) {
                    if (shape[dy][dx] &&
                        (grid[y + dy] && grid[y + dy][x + dx]) !== 0) {
                        return true;
                    }
                }
            }
            return false;
        };

        const merge = (grid: any[][], piece: any) => {
            const { shape, color, x, y } = piece;
            shape.forEach((row: number[], dy: number) => {
                row.forEach((value, dx) => {
                    if (value) {
                        grid[y + dy][x + dx] = color;
                    }
                });
            });
        };

        const rotate = (piece: any) => {
            const newShape = piece.shape[0].map((_: any, i: number) =>
                piece.shape.map((row: any[]) => row[i]).reverse()
            );
            const tempPiece = { ...piece, shape: newShape };
            if (!collide(gameState.current.grid, tempPiece)) {
                gameState.current.currentPiece = tempPiece;
            }
        };

        const arenaSweep = () => {
            let rowCount = 0;
            outer: for (let y = gameState.current.grid.length - 1; y > 0; --y) {
                for (let x = 0; x < gameState.current.grid[y].length; ++x) {
                    if (gameState.current.grid[y][x] === 0) {
                        continue outer;
                    }
                }
                const row = gameState.current.grid.splice(y, 1)[0].fill(0);
                gameState.current.grid.unshift(row);
                ++y;
                rowCount++;
            }
            if (rowCount > 0) {
                gameState.current.score += rowCount * 100;
                setScore(gameState.current.score);
                dropInterval = Math.max(100, 1000 - Math.floor(gameState.current.score / 500) * 100);
            }
        };

        const playerDrop = () => {
            const { currentPiece, grid } = gameState.current;
            currentPiece.y++;
            if (collide(grid, currentPiece)) {
                currentPiece.y--;
                merge(grid, currentPiece);
                arenaSweep();
                gameState.current.currentPiece = createPiece();
                if (collide(grid, gameState.current.currentPiece)) {
                    gameState.current.gameOver = true;
                    setGameOver(true);
                }
            }
            dropCounter = 0;
        };

        const update = (time = 0) => {
            if (gameState.current.gameOver || isPaused) {
                draw();
                if (gameState.current.gameOver) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = 'white';
                    ctx.font = '30px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
                }
                animationId = requestAnimationFrame(update);
                return;
            }

            const deltaTime = time - lastTime;
            lastTime = time;
            dropCounter += deltaTime;

            if (dropCounter > dropInterval) {
                playerDrop();
            }

            draw();
            animationId = requestAnimationFrame(update);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameState.current.gameOver || isPaused) return;
            
            const { currentPiece, grid } = gameState.current;
            if (!currentPiece) return;

            if (e.key === 'ArrowLeft') {
                currentPiece.x--;
                if (collide(grid, currentPiece)) currentPiece.x++;
            } else if (e.key === 'ArrowRight') {
                currentPiece.x++;
                if (collide(grid, currentPiece)) currentPiece.x--;
            } else if (e.key === 'ArrowDown') {
                playerDrop();
            } else if (e.key === 'ArrowUp') {
                rotate(currentPiece);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        resetGame();
        update();

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            cancelAnimationFrame(animationId);
        };
    }, [isPaused]);

    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-gray-900 p-6 rounded-2xl border border-purple-500/30 shadow-2xl max-w-md w-full relative">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Neon Tetris</h2>
                        <p className="text-purple-400">Score: {score}</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => window.location.reload()} // Quick reset hack or prop
                            className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 text-white"
                        >
                            <RotateCcw className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-400"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                
                <canvas 
                    ref={canvasRef} 
                    width={COLS * BLOCK_SIZE} 
                    height={ROWS * BLOCK_SIZE}
                    className="bg-black rounded-lg mx-auto shadow-lg border border-gray-800"
                />
                
                <div className="mt-4 text-center text-gray-500 text-sm">
                    Use Arrow Keys to Move & Rotate
                </div>
                
                {gameOver && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/80 p-6 rounded-xl border border-red-500/50 text-center pointer-events-auto">
                            <h3 className="text-3xl font-bold text-red-500 mb-2">Game Over</h3>
                            <p className="text-white mb-4">Final Score: {score}</p>
                            <button 
                                onClick={() => window.location.reload()} // Or better reset
                                className="px-6 py-2 bg-purple-600 rounded-full text-white hover:bg-purple-500 transition-colors"
                            >
                                Play Again
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

