'use client';
import { useScroll, useTransform, motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';

export const Timeline = ({ data }: { data: any[] }) => {
    const ref = useRef(null);
    const containerRef = useRef(null);
    const [height, setHeight] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (ref.current) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    const rect = entry.target.getBoundingClientRect();
                    setHeight(rect.height);
                }
            });
            resizeObserver.observe(ref.current);
            return () => resizeObserver.disconnect();
        }
    }, [ref]);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ['start 10%', 'end 50%']
    });

    const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
    const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

    return (
        <div className="w-full font-sans sm:px-10 px-4" ref={containerRef}>
            <div className="w-full flex items-center justify-start">
                <div className="sm:w-2/3 w-full sm:px-16 px-2 flex flex-col items-start justify-center md:mt-26 mt-12">
                    <motion.h2 
                        className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        Experience
                    </motion.h2>
                    <motion.p 
                        className="text-sm sm:text-base lg:text-lg text-gray-300 mb-6 sm:mb-8"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                    >
                        With hands-on experience in{' '}
                        <span className="text-purple-400 font-serif italic font-bold">AI research and entrepreneurship</span>, I have contributed
                        to a variety of high-impact projects. I'm passionate about creating
                        beautiful, <span className="text-purple-400 font-serif italic font-bold">innovative solutions</span> paired
                        with solid, scalable technology.
                    </motion.p>
                </div>
            </div>

            <div ref={ref} className="relative max-w-7xl mx-auto pb-20 mt-12">
                {data.map((item, index) => (
                    <div key={index} className="flex justify-start pt-10 md:pt-40 md:gap-10 group">
                        <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
                            <div className="h-10 absolute left-3 md:left-3 w-10 rounded-full bg-[#04020e] flex items-center justify-center border border-white/10 shadow-[0_0_20px_rgba(124,58,237,0.1)] transition-shadow duration-500 group-hover:shadow-[0_0_30px_rgba(124,58,237,0.3)]">
                                <div className="h-4 w-4 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500" />
                            </div>
                            <div className="flex flex-col md:pl-20">
                                <h3 className="hidden md:block text-xl md:text-3xl font-bold text-white/90">{item.title}</h3>
                                <span className="hidden md:block text-lg text-purple-400/80 font-medium">
                                    {item.subtitle ?? ''}
                                </span>
                            </div>
                        </div>

                        <div className="relative pl-20 pr-4 md:pl-4 w-full">
                            <div className="flex flex-col md:hidden mb-4">
                                <h3 className="text-2xl font-bold text-white/90">{item.title}</h3>
                                <span className="text-sm text-purple-400/80 font-medium">
                                    {item.subtitle ?? ''}
                                </span>
                            </div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                {item.content}
                            </motion.div>
                        </div>
                    </div>
                ))}
                
                <div
                    style={{ height: height + 'px' }}
                    className="absolute md:left-8 left-8 top-0 overflow-hidden w-[2px] bg-gradient-to-b from-transparent via-gray-700/20 to-transparent"
                >
                    <motion.div
                        style={{
                            height: heightTransform,
                            opacity: opacityTransform
                        }}
                        className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-b from-purple-500 via-indigo-500 to-transparent shadow-[0_0_15px_rgba(168,85,247,0.8)]"
                    />
                </div>
            </div>
        </div>
    );
};
