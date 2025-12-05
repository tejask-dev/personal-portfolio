import React from 'react';
import { motion } from 'framer-motion';

export function ExperienceCard({ company, role, location, description, images }: {
    company: string;
    role: string;
    location: string;
    description: React.ReactNode;
    images?: Array<{ src: string; alt: string; type?: 'image' | 'pdf' }>;
}) {
    return (
        <motion.div 
            className="relative p-6 md:p-8 rounded-2xl bg-gray-900/40 backdrop-blur-sm border border-white/5 hover:border-purple-500/30 transition-colors duration-500"
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
        >
            {/* Glowing corner effect */}
            <div className="absolute -top-2 -right-2 w-20 h-20 bg-purple-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-2">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-white">{company}</h3>
                    <p className="text-purple-400 font-medium">{role}</p>
                </div>
                <span className="text-sm md:text-base text-gray-400 bg-white/5 px-3 py-1 rounded-full w-fit">
                    {location}
                </span>
            </div>

            <div className="text-gray-300 text-sm md:text-base leading-relaxed mb-6">
                {description}
            </div>

            {images && images.length > 0 && (
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {images.map((img, i) => {
                        const isPDF = img.type === 'pdf' || img.src.toLowerCase().endsWith('.pdf');
                        
                        if (isPDF) {
                            return (
                                <motion.a
                                    key={i}
                                    href={img.src}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative min-w-[280px] md:min-w-[320px] aspect-[16/10] rounded-lg overflow-hidden border border-white/10 shadow-lg bg-gradient-to-br from-purple-900/30 to-blue-900/30 hover:border-purple-500/50 transition-all duration-300 flex flex-col items-center justify-center group cursor-pointer"
                                    whileHover={{ scale: 1.02 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                    <motion.div
                                        className="relative z-10 flex flex-col items-center gap-3"
                                        whileHover={{ scale: 1.1 }}
                                    >
                                        <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <p className="text-white text-sm font-medium text-center px-4">{img.alt}</p>
                                        <p className="text-purple-300 text-xs">Click to view PDF</p>
                                    </motion.div>
                                </motion.a>
                            );
                        }
                        
                        return (
                            <motion.div 
                                key={i} 
                                className="relative min-w-[280px] md:min-w-[320px] aspect-[16/10] rounded-lg overflow-hidden border border-white/10 shadow-lg bg-black/50"
                                whileHover={{ scale: 1.02 }}
                                transition={{ duration: 0.3 }}
                            >
                                <img 
                                    src={img.src} 
                                    alt={img.alt} 
                                    className="w-full h-full object-contain hover:scale-105 transition-transform duration-700" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                    <p className="text-white text-sm font-medium truncate w-full">{img.alt}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
}
