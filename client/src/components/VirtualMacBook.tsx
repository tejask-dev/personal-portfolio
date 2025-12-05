'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wifi, 
    BatteryFull, 
    Bluetooth, 
    EllipsisVertical, 
    Search, 
    AppleIcon,
    X,
    Mail,
    Maximize2,
    Minimize2,
    Instagram,
    ExternalLink
} from 'lucide-react';
import SpotifyApp from './SpotifyApp';
import backgroundVideo from '../assets/3163534-uhd_3840_2160_30fps.mp4';
import { allPhotos } from '../lib/photos';

interface VirtualMacBookProps {
    isOpen: boolean;
    onClose: () => void;
}

const CameraApp = () => {
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

    return (
        <div className="w-full h-full flex flex-col bg-[#1c1c1e] text-white">
            <div className="p-3 sm:p-4 border-b border-gray-700 flex justify-between items-center bg-[#2c2c2e]">
                <h2 className="text-base sm:text-lg font-semibold">Photos</h2>
                <span className="text-xs sm:text-sm text-gray-400">{allPhotos.length} Items</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 sm:p-4">
                {selectedPhoto ? (
                    <div className="h-full flex flex-col items-center justify-center relative">
                        <button 
                            onClick={() => setSelectedPhoto(null)}
                            className="absolute top-0 left-0 p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors z-10"
                        >
                            <X className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <img 
                            src={selectedPhoto} 
                            alt="Full View" 
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
                        {allPhotos.map((photo, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={() => setSelectedPhoto(photo)}
                                className="aspect-square overflow-hidden rounded-lg cursor-pointer hover:opacity-80 transition-opacity relative group"
                            >
                                <img 
                                    src={photo} 
                                    alt={`Gallery ${index + 1}`} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    loading="lazy"
                                />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default function VirtualMacBook({ isOpen, onClose }: VirtualMacBookProps) {
    const [currentApp, setCurrentApp] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [appPositions, setAppPositions] = useState<{[key: string]: {x: number, y: number}}>({});
    const [draggingApp, setDraggingApp] = useState<string | null>(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [screenDimensions, setScreenDimensions] = useState({ width: 0, height: 0 });
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Prevent scrolling when MacBook is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
        } else {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        }

        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        };
    }, [isOpen]);

    // Initialize positions when opened
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                if (containerRef.current) {
                    const containerRect = containerRef.current.getBoundingClientRect();
                    setScreenDimensions({
                        width: containerRect.width,
                        height: containerRect.height
                    });

                    const initialPositions: {[key: string]: {x: number, y: number}} = {};
                    const apps = ['notes', 'spotify', 'home', 'instagram', 'camera', 'mail'];
                    const iconSize = 70;
                    const margin = 40;
                    const startX = 40;
                    const startY = 100;
                    const iconsPerRow = 3;

                    apps.forEach((app, index) => {
                        const row = Math.floor(index / iconsPerRow);
                        const col = index % iconsPerRow;
                        initialPositions[app] = {
                            x: startX + col * (iconSize + margin),
                            y: startY + row * (iconSize + margin + 20)
                        };
                    });

                    setAppPositions(initialPositions);
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const containerRect = containerRef.current.getBoundingClientRect();
                setScreenDimensions({
                    width: containerRect.width,
                    height: containerRect.height
                });
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleDragStart = (e: React.DragEvent, appName: string) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        setDraggingApp(appName);
        setOffset({ x: offsetX, y: offsetY });

        const dragImage = new Image();
        dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(dragImage, 0, 0);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!draggingApp || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const iconSize = 70;

        let newX = e.clientX - containerRect.left - offset.x;
        let newY = e.clientY - containerRect.top - offset.y;

        newX = Math.max(0, Math.min(newX, containerRect.width - iconSize));
        newY = Math.max(35, Math.min(newY, containerRect.height - iconSize - 25));

        setAppPositions((prev) => ({
            ...prev,
            [draggingApp]: { x: newX, y: newY }
        }));
    };

    const handleDragEnd = () => {
        setDraggingApp(null);
    };

    const appData = [
        { id: 'notes', image: '/images/notes.png', name: 'Notes' },
        { id: 'spotify', image: '/images/spotify.webp', name: 'Spotify' },
        { id: 'instagram', image: '/images/insta.jpg', name: 'Instagram' },
        { id: 'camera', image: '/images/cam.png', name: 'Gallery' },
        { id: 'mail', image: '/images/mail.png', name: 'Mail' },
        { id: 'home', image: '/images/home.png', name: 'Home', href: '/' }
    ];

    const renderAppContent = () => {
        switch (currentApp) {
            case 'notes':
                return (
                    <div className="bg-stone-100 h-full w-full text-stone-800 p-6 pt-8 flex flex-col">
                        <div className="text-2xl font-serif italic font-bold">Tejas's Notepad</div>
                        <div className="text-xl mb-2 text-gray-400">Jot down some notes here...</div>
                        <textarea
                            className="w-full flex-1 resize-none focus:outline-none bg-transparent"
                            placeholder="Hi! Welcome to Tejas's portfolio! Jot down some of your thoughts here. Don't worry, it'll stay!"
                        />
                    </div>
                );
            case 'mail':
                return (
                    <div className="w-full h-full flex justify-center items-center overflow-hidden bg-white">
                        <div className="p-8 text-center">
                            <h2 className="text-3xl font-bold mb-6 text-gray-800">Mail</h2>
                            <div className="space-y-4">
                                <p className="text-lg text-gray-600 mb-6">Get in touch with me!</p>
                                <a 
                                    href="mailto:tejas.kaushik@outlook.com"
                                    className="inline-flex items-center bg-blue-500 text-white px-8 py-3 rounded-lg text-lg hover:bg-blue-600 transition-colors duration-200"
                                >
                                    <Mail className="w-5 h-5 mr-2" />
                                    tejas.kaushik@outlook.com
                                </a>
                            </div>
                        </div>
                    </div>
                );
            case 'instagram':
                return (
                    <div className="w-full h-full flex justify-center items-center overflow-hidden bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500">
                        <div className="p-8 text-center max-w-2xl">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="mb-6"
                            >
                                <Instagram className="w-20 h-20 text-white mx-auto mb-4" />
                            </motion.div>
                            <h2 className="text-4xl font-bold text-white mb-4">Follow My Journey</h2>
                            <p className="text-xl text-white/90 mb-8">Check out my latest posts and updates on Instagram!</p>
                            <motion.a
                                href="https://www.instagram.com/tejas_kaushik007/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-3 bg-white text-pink-600 px-8 py-4 rounded-full text-lg font-bold hover:scale-105 transition-transform shadow-2xl"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Instagram className="w-6 h-6" />
                                @tejas_kaushik007
                                <ExternalLink className="w-5 h-5" />
                            </motion.a>
                        </div>
                    </div>
                );
            case 'spotify':
                return <SpotifyApp />;
            case 'camera':
                return <CameraApp />;
            default:
                return null;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-hidden"
                    onClick={onClose}
                    style={{ overflow: 'hidden' }}
                >
                    <div
                        ref={containerRef}
                        className="w-full h-screen overflow-hidden relative flex justify-center items-end"
                        onDragOver={handleDragOver}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="absolute top-0 left-0 w-full h-full object-cover z-[-1] opacity-80"
                            src={backgroundVideo}
                        />
                        
                        {/* Overlay for better text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none z-[-1]" />

                        {/* ToolBar */}
                        <div className="w-full h-[35px] absolute top-0 left-0 bg-[#171f2bB3] backdrop-blur-md flex justify-between items-center px-2 text-white text-sm z-50 shadow-sm">
                            <div className="flex items-center space-x-3 ml-2">
                                <AppleIcon className="w-4 h-4" />
                                <div className="font-bold">Finder</div>
                                <div>File</div>
                                <div>Edit</div>
                                <div>View</div>
                                <div className="md:flex hidden">Go</div>
                                <div className="md:flex hidden">Window</div>
                                <div className="md:flex hidden">Help</div>
                            </div>

                            <div className="flex items-center space-x-3 mr-2">
                                <BatteryFull className="w-4 h-4" />
                                <Wifi className="w-4 h-4" />
                                <Bluetooth className="w-4 h-4" />
                                <EllipsisVertical className="w-4 h-4" />
                                <Search className="w-4 h-4" />
                                <div className="flex items-center font-bold">
                                    <span>{currentTime.toLocaleDateString()}</span>
                                    <span className="ml-2">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Draggable Apps */}
                        {appData.map((app) => (
                            <motion.div
                                key={app.id}
                                className="absolute cursor-move"
                                style={{
                                    left: `${appPositions[app.id]?.x || 0}px`,
                                    top: `${appPositions[app.id]?.y || 0}px`,
                                    zIndex: draggingApp === app.id ? 10 : 1
                                }}
                                draggable
                                onDragStart={(e) => handleDragStart(e as any, app.id)}
                                onDragEnd={handleDragEnd}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {app.href ? (
                                    <a href={app.href} onClick={() => setCurrentApp(null)}>
                                        <div className="w-[70px] flex flex-col items-center group">
                                            <div
                                                className="bg-cover rounded-2xl w-[70px] h-[70px] shadow-lg group-hover:shadow-xl transition-all duration-200"
                                                style={{ backgroundImage: `url(${app.image})` }}
                                            ></div>
                                            <p className="text-sm font-bold text-center mt-2 text-white drop-shadow-md bg-black/20 rounded-full px-2 py-0.5 backdrop-blur-sm">
                                                {app.name}
                                            </p>
                                        </div>
                                    </a>
                                ) : (
                                    <div className="w-[70px] flex flex-col items-center group" onClick={() => setCurrentApp(app.id)}>
                                        <div
                                            className="bg-cover rounded-2xl w-[70px] h-[70px] shadow-lg group-hover:shadow-xl transition-all duration-200 cursor-pointer"
                                            style={{ backgroundImage: `url(${app.image})` }}
                                        ></div>
                                        <p className="text-sm font-bold text-center mt-2 text-white drop-shadow-md bg-black/20 rounded-full px-2 py-0.5 backdrop-blur-sm">{app.name}</p>
                                    </div>
                                )}
                            </motion.div>
                        ))}

                        {/* Dock */}
                        <motion.div 
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
                            className="m-2 px-2 sm:px-3 py-2 h-auto bg-[#171f2b80] backdrop-blur-md border border-gray-500/30 rounded-2xl flex flex-row gap-2 sm:gap-3 z-[999] shadow-2xl mb-4 overflow-x-auto max-w-[95vw] scrollbar-hide"
                        >
                            {appData
                                .filter((app) => app.id !== 'home')
                                .map((app) => (
                                    <motion.div
                                        key={app.id}
                                        onClick={() => setCurrentApp(app.id)}
                                        className="relative group flex-shrink-0"
                                        whileHover={{ scale: 1.2, y: -10 }}
                                        transition={{ type: "spring", stiffness: 300 }}
                                    >
                                        <div
                                            className="bg-cover rounded-xl w-[40px] h-[40px] sm:w-[50px] sm:h-[50px] cursor-pointer shadow-lg"
                                            style={{ backgroundImage: `url(${app.image})` }}
                                        />
                                        {/* Tooltip - hidden on mobile */}
                                        <div className="hidden sm:block absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-gray-600">
                                            {app.name}
                                        </div>
                                        {/* Active Dot */}
                                        {currentApp === app.id && (
                                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                                        )}
                                    </motion.div>
                                ))}
                            <div className="h-[40px] sm:h-[50px] w-0 border-0 border-r-1 border-r-gray-400/50 mx-1 flex-shrink-0"></div>
                            <motion.div 
                                onClick={onClose}
                                className="flex-shrink-0"
                                whileHover={{ scale: 1.2, y: -10 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <div
                                    className="bg-cover rounded-xl w-[40px] h-[40px] sm:w-[50px] sm:h-[50px] cursor-pointer shadow-lg"
                                    style={{ backgroundImage: `url(/images/home.png)` }}
                                />
                            </motion.div>
                        </motion.div>

                        {/* App Window */}
                        <AnimatePresence>
                            {currentApp && (
                                <div className="w-full absolute left-0 flex justify-center h-[calc(100vh-35px)] top-[35px] pointer-events-none px-2 sm:px-0">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                        animate={{ 
                                            opacity: 1, 
                                            scale: isMaximized ? 1 : 1, 
                                            y: 0,
                                            width: isMaximized ? "100%" : "95%",
                                            height: isMaximized ? "100%" : "75%"
                                        }}
                                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className={`flex flex-col relative mt-4 sm:mt-8 rounded-xl bg-white overflow-hidden shadow-2xl pointer-events-auto border border-gray-500/20 max-w-5xl`}
                                    >
                                        {/* Window Controls */}
                                        <div className="absolute top-0 left-0 right-0 h-8 bg-gray-200/50 backdrop-blur-md z-[1000] flex items-center px-4 border-b border-gray-300/20">
                                            <div className="flex gap-2 group">
                                                <button 
                                                    onClick={() => setCurrentApp(null)}
                                                    className="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF5F57]/80 flex items-center justify-center text-black/50"
                                                >
                                                    <X className="w-2 h-2 opacity-0 group-hover:opacity-100" />
                                                </button>
                                                <button 
                                                    onClick={() => setCurrentApp(null)} // Minimize logic could be complex
                                                    className="w-3 h-3 rounded-full bg-[#FEBC2E] hover:bg-[#FEBC2E]/80 flex items-center justify-center text-black/50"
                                                >
                                                    <Minimize2 className="w-2 h-2 opacity-0 group-hover:opacity-100" />
                                                </button>
                                                <button 
                                                    onClick={() => setIsMaximized(!isMaximized)}
                                                    className="w-3 h-3 rounded-full bg-[#28C840] hover:bg-[#28C840]/80 flex items-center justify-center text-black/50"
                                                >
                                                    <Maximize2 className="w-2 h-2 opacity-0 group-hover:opacity-100" />
                                                </button>
                                            </div>
                                            <div className="flex-1 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                {appData.find(a => a.id === currentApp)?.name}
                                            </div>
                                        </div>

                                        <div className="w-full bg-white z-[800] h-full pt-8">
                                            {renderAppContent()}
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
