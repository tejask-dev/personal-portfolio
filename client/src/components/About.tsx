'use client';
import { useState, useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { FaInstagram, FaLinkedin, FaGithub } from 'react-icons/fa';
import { Mail } from 'lucide-react';
import PhotoCarousel from './PhotoCarousel';

const techStack = [
    { label: 'Python', color: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-300' },
    { label: 'TypeScript', color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-300' },
    { label: 'React', color: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-300' },
    { label: 'Node.js', color: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-300' },
    { label: 'OpenAI API', color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-300' },
    { label: 'Next.js', color: 'from-white/10 to-white/5 border-white/20 text-gray-200' },
    { label: 'TailwindCSS', color: 'from-sky-500/20 to-sky-600/10 border-sky-500/30 text-sky-300' },
    { label: 'Firebase', color: 'from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-300' },
    { label: 'SQL', color: 'from-violet-500/20 to-violet-600/10 border-violet-500/30 text-violet-300' },
    { label: 'Machine Learning', color: 'from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-300' },
];

export default function About() {
    const [activeTab, setActiveTab] = useState('story');
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-80px' });
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"]
    });

    const y = useTransform(scrollYProgress, [0, 1], [60, -60]);
    const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);

    const tabs = [
        { id: 'story', label: 'My Story' },
        { id: 'passion', label: 'My Passion' },
        { id: 'vision', label: 'My Vision' },
    ];

    const content = {
        story: {
            title: "🌟 My Story",
            paragraphs: [
                "Born in India and immigrating to Canada at the age of 8, I've always been guided by curiosity and a drive to make a meaningful impact. Growing up in a multicultural environment taught me to see challenges from multiple perspectives — blending creativity, empathy, and analytical thinking to craft innovative solutions.",
                "My journey into technology began with a simple question: 'How can we use technology to solve real-world problems?' That question sparked my passion for artificial intelligence, machine learning, and software development — eventually leading me to found multiple ventures and contribute to research focused on creating positive change through innovation.",
                "Now in Grade 12, I'm aspiring to major in Computer Science at the University of Waterloo, where I hope to continue pushing the boundaries of what's possible.",
            ],
        },
        passion: {
            title: "💫 My Passion",
            paragraphs: [
                "I'm passionate about artificial intelligence and its power to transform the way we learn, work, and connect. My focus lies in developing AI systems that are not only advanced but also ethical, accessible, and meaningful — tools that amplify human potential rather than replace it.",
                "Entrepreneurship fuels that passion. I love identifying real-world problems and turning them into scalable, impactful solutions. From founding Top Score Tutoring to serving as CTO of Stellar Learning, I've learned that the best products come from truly understanding users and building with empathy and purpose.",
                "Continuous learning and research drive everything I do. Whether it's developing SomaAI or conducting global health research through Youreka, I believe knowledge is meant to be shared — to educate, empower, and create lasting change.",
            ],
        },
        vision: {
            title: "🌍 My Vision",
            paragraphs: [
                "My vision is to create technologies that democratize education and empower people to reach their full potential. I believe that AI and innovation should exist to elevate human creativity, not replace it — to connect, not divide.",
                "I'm working toward a future where personalized learning is accessible to everyone, where AI augments human capabilities, and where technology helps bridge global inequalities in education, opportunity, and health.",
                "Ultimately, I aim to be part of a generation that uses technology responsibly and purposefully — tackling challenges like educational inequality and healthcare accessibility while ensuring the benefits of innovation are shared by all.",
            ],
        },
    };

    const socialLinks = [
        { href: "https://www.instagram.com/tejas_kaushik007/?hl=en", Icon: FaInstagram, label: "Instagram", colorClass: "hover:text-pink-400 hover:bg-pink-500/10 hover:border-pink-400/30 hover:shadow-[0_0_20px_rgba(236,72,153,0.25)]" },
        { href: "https://www.linkedin.com/in/tejasskaushik/", Icon: FaLinkedin, label: "LinkedIn", colorClass: "hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-400/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.25)]" },
        { href: "https://github.com/tejask-dev", Icon: FaGithub, label: "GitHub", colorClass: "hover:text-gray-200 hover:bg-white/10 hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]" },
        { href: "mailto:tejas.kaushik@outlook.com", Icon: Mail, label: "Email", colorClass: "hover:text-purple-400 hover:bg-purple-500/10 hover:border-purple-400/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.25)]" },
    ];

    return (
        <section id="about" className="min-h-screen py-20 relative overflow-hidden bg-transparent">
            {/* Subtle twinkling dots */}
            <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-[2px] h-[2px] bg-white/50 rounded-full"
                        style={{
                            left: `${(i * 37 + 11) % 100}%`,
                            top: `${(i * 53 + 7) % 100}%`,
                        }}
                        animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.4, 0.8] }}
                        transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
                    />
                ))}
            </div>

            <div className="container mx-auto px-4 relative z-10">
                {/* Section header */}
                <motion.div
                    ref={ref}
                    style={{ y, opacity }}
                    className="text-center mb-14 sm:mb-20"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={isInView ? { opacity: 1, scale: 1 } : {}}
                        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4 not-italic">
                            About Me
                        </h2>
                        <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto px-2">
                            Get to know the person behind the projects — the story, the passion, and the vision.
                        </p>
                    </motion.div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-start">
                    {/* Left — Photo carousel */}
                    <motion.div
                        initial={{ opacity: 0, x: -40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                        viewport={{ once: true }}
                        className="flex justify-center lg:justify-start"
                    >
                        <PhotoCarousel />
                    </motion.div>

                    {/* Right — Content */}
                    <motion.div
                        initial={{ opacity: 0, x: 40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                        viewport={{ once: true }}
                        className="space-y-7"
                    >
                        {/* Tab buttons */}
                        <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                            {tabs.map((tab, i) => (
                                <motion.button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    initial={{ opacity: 0, y: 16 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1, duration: 0.5 }}
                                    viewport={{ once: true }}
                                    whileHover={{ scale: 1.04, y: -2 }}
                                    whileTap={{ scale: 0.96 }}
                                    className={`px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 ${
                                        activeTab === tab.id
                                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                                            : 'bg-white/6 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/10'
                                    }`}
                                >
                                    {tab.label}
                                </motion.button>
                            ))}
                        </div>

                        {/* Tab content */}
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            transition={{ duration: 0.45, ease: 'easeOut' }}
                            className="space-y-4"
                        >
                            <h3 className="text-2xl sm:text-3xl font-bold text-white text-center lg:text-left">
                                {content[activeTab as keyof typeof content].title}
                            </h3>
                            {content[activeTab as keyof typeof content].paragraphs.map((para, i) => (
                                <motion.p
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.12, duration: 0.5 }}
                                    className="text-gray-300 text-sm sm:text-base leading-relaxed"
                                >
                                    {para}
                                </motion.p>
                            ))}
                        </motion.div>

                        {/* Tech stack tags */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            viewport={{ once: true }}
                        >
                            <p className="text-xs uppercase tracking-widest text-gray-500 mb-3 text-center lg:text-left font-medium">
                                Tech I work with
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                                {techStack.map((tech, i) => (
                                    <motion.span
                                        key={tech.label}
                                        initial={{ opacity: 0, scale: 0.85 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.05, duration: 0.4 }}
                                        viewport={{ once: true }}
                                        whileHover={{ scale: 1.07, y: -2 }}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-full bg-gradient-to-br border backdrop-blur-sm cursor-default ${tech.color}`}
                                    >
                                        {tech.label}
                                    </motion.span>
                                ))}
                            </div>
                        </motion.div>

                        {/* Social links */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.35 }}
                            viewport={{ once: true }}
                            className="pt-2"
                        >
                            <p className="text-sm font-semibold text-white mb-3 text-center lg:text-left">
                                Let's Connect
                            </p>
                            <div className="flex gap-3 justify-center lg:justify-start">
                                {socialLinks.map(({ href, Icon, label, colorClass }, i) => (
                                    <motion.a
                                        key={label}
                                        href={href}
                                        target={href.startsWith('mailto') ? undefined : '_blank'}
                                        rel={href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
                                        aria-label={label}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.5 + i * 0.08, type: 'spring', stiffness: 260, damping: 20 }}
                                        viewport={{ once: true }}
                                        whileHover={{ scale: 1.15, y: -4 }}
                                        whileTap={{ scale: 0.93 }}
                                        className={`p-3 rounded-full border border-white/12 text-white/60 backdrop-blur-sm transition-all duration-300 ${colorClass}`}
                                    >
                                        <Icon className="w-5 h-5" />
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
