'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { Instagram, Linkedin, Github, Mail, Award, Users, BookOpen, Lightbulb, Sparkles, Zap, Heart } from 'lucide-react';
import PhotoCarousel from './PhotoCarousel';

export default function About() {
    const [activeTab, setActiveTab] = useState('story');
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"]
    });

    // Scroll-based transforms
    const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
    const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 1.1]);

    const tabs = [
        { id: 'story', label: 'My Story', content: 'story' },
        { id: 'passion', label: 'My Passion', content: 'passion' },
        { id: 'vision', label: 'My Vision', content: 'vision' }
    ];

    const content = {
        story: {
            title: "🌟 My Story",
            paragraphs: [
                "Born in India and immigrating to Canada at the age of 8, I've always been guided by curiosity and a drive to make a meaningful impact. Growing up in a multicultural environment taught me to see challenges from multiple perspectives — blending creativity, empathy, and analytical thinking to craft innovative solutions.",
                "My journey into technology began with a simple question: 'How can we use technology to solve real-world problems?' That question sparked my passion for artificial intelligence, machine learning, and software development — eventually leading me to found multiple ventures and contribute to research focused on creating positive change through innovation.",
                "Now in Grade 12, I'm aspiring to major in Computer Science at the University of Waterloo, where I hope to continue pushing the boundaries of what's possible. Beyond academics, I'm committed to building purposeful technologies, empowering others through education, and using innovation as a tool to make the world better."
            ]
        },
        passion: {
            title: "💫 My Passion",
            subtitle: "AI, Innovation & Impact",
            paragraphs: [
                "I'm passionate about artificial intelligence and its power to transform the way we learn, work, and connect. My focus lies in developing AI systems that are not only advanced but also ethical, accessible, and meaningful — tools that amplify human potential rather than replace it.",
                "Entrepreneurship fuels that passion. I love identifying real-world problems and turning them into scalable, impactful solutions. From founding Top Score Tutoring to serving as CTO of Stellar Learning, I've learned that the best products come from truly understanding users and building with empathy and purpose.",
                "Continuous learning and research drive everything I do. Whether it's developing Soma AI to explore next-generation AI systems or conducting global health research through programs like Youreka, I believe knowledge is meant to be shared — to educate, empower, and create lasting change."
            ]
        },
        vision: {
            title: "🌍 My Vision",
            subtitle: "Building Tomorrow's Solutions",
            paragraphs: [
                "My vision is to create technologies that democratize education and empower people to reach their full potential. I believe that AI and innovation should exist to elevate human creativity, not replace it — to connect, not divide.",
                "I'm working toward a future where personalized learning is accessible to everyone, where AI augments human capabilities, and where technology helps bridge global inequalities in education, opportunity, and health.",
                "Ultimately, I aim to be part of a generation that uses technology responsibly and purposefully — tackling challenges like educational inequality and healthcare accessibility while ensuring that the benefits of innovation are shared by all."
            ]
        }
  };

  return (
        <section id="about" className="min-h-screen py-20 relative overflow-hidden bg-transparent">
            {/* Subtle white stars for pure black background */}
            <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 15 }).map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-0.5 h-0.5 bg-white rounded-full opacity-60"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                            opacity: [0.3, 1, 0.3],
                            scale: [0.5, 1, 0.5]
                        }}
                        transition={{
                            duration: 4 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 3
                        }}
                    />
                ))}
            </div>

            <div className="container mx-auto px-4 relative z-10">
        <motion.div 
                    ref={ref}
                    style={{ y, opacity, scale }}
          className="text-center mb-16"
                >
                    <motion.h2 
                        className="text-3xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4 sm:mb-6"
                        initial={{ opacity: 0, y: 50, scale: 0.8 }}
                        animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                        transition={{ 
                            duration: 1.2, 
                            ease: "easeOut",
                            type: "spring",
                            stiffness: 100
                        }}
                        whileHover={{ 
                            scale: 1.05,
                            transition: { duration: 0.3 }
                        }}
                    >
            About Me
                    </motion.h2>
                    <motion.p 
                        className="text-base sm:text-xl text-gray-300 max-w-3xl mx-auto px-2"
                        initial={{ opacity: 0, y: 30 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ 
                            duration: 0.8, 
                            delay: 0.3,
                            ease: "easeOut"
                        }}
                    >
                        Get to know the person behind the projects, the story behind the success, 
                        and the vision that drives everything I do.
                    </motion.p>
        </motion.div>
        
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
                    {/* Left Side - Image and Stats */}
        <motion.div 
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="space-y-8 flex justify-center lg:justify-start"
                    >
                        {/* Photo Carousel */}
                        <PhotoCarousel />
          </motion.div>
          
                    {/* Right Side - Content */}
          <motion.div
                        initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
                        className="space-y-8"
                    >
                        {/* Tab Navigation */}
                        <div className="flex flex-wrap gap-2 mb-6 sm:mb-8 justify-center lg:justify-start">
                            {tabs.map((tab, index) => (
                                <motion.button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ 
                                        duration: 0.6, 
                                        delay: index * 0.1,
                                        ease: "easeOut"
                                    }}
                                    whileHover={{ 
                                        scale: 1.05,
                                        y: -2,
                                        transition: { duration: 0.2 }
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full font-semibold text-sm sm:text-base transition-all duration-300 ${
                                        activeTab === tab.id
                                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                                            : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </motion.button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ 
                                duration: 0.6,
                                ease: "easeOut",
                                type: "spring",
                                stiffness: 100
                            }}
                            className="space-y-4 sm:space-y-6"
                        >
                            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6 text-center lg:text-left">
                                {content[activeTab as keyof typeof content].title}
                            </h3>
                            
                            {content[activeTab as keyof typeof content].paragraphs.map((paragraph, index) => (
                                <motion.p
                                    key={index}
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ 
                                        duration: 0.6, 
                                        delay: index * 0.15,
                                        ease: "easeOut",
                                        type: "spring",
                                        stiffness: 100
                                    }}
                                    className="text-gray-300 text-sm sm:text-base lg:text-lg leading-relaxed"
                                >
                                    {paragraph}
                                </motion.p>
                            ))}
          </motion.div>
          
                        {/* Social Links */}
          <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="pt-8"
                        >
                            <motion.h4 
                                className="text-xl font-semibold text-white mb-4"
                                initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6, delay: 0.5 }}
          >
                                Let's Connect
                            </motion.h4>
                            <div className="flex gap-4">
                                {[
                                    { href: "https://www.instagram.com/tejas_kaushik007/?hl=en", icon: Instagram, color: "pink-400", label: "Instagram" },
                                    { href: "https://www.linkedin.com/in/tejasskaushik/", icon: Linkedin, color: "blue-400", label: "LinkedIn" },
                                    { href: "https://github.com/tejask-dev", icon: Github, color: "gray-300", label: "GitHub" },
                                    { href: "mailto:tejas.kaushik@outlook.com", icon: Mail, color: "purple-400", label: "Email" }
                                ].map((social, index) => (
                                    <motion.a
                                        key={social.label}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ 
                                            duration: 0.5, 
                                            delay: 0.6 + index * 0.1,
                                            ease: "easeOut",
                                            type: "spring",
                                            stiffness: 100
                                        }}
                                        whileHover={{ 
                                            scale: 1.1,
                                            y: -5,
                                            transition: { duration: 0.2 }
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        className={`p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-all duration-300 group cursor-pointer`}
                >
                                        <social.icon className={`w-6 h-6 text-white group-hover:text-${social.color} transition-colors duration-300`} />
                                    </motion.a>
              ))}
            </div>
                        </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}