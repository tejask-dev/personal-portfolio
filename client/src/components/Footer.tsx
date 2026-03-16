'use client';
import { motion } from 'framer-motion';
import { Heart, ArrowUp, Mail, MapPin } from 'lucide-react';
import { FaGithub, FaLinkedin, FaInstagram } from 'react-icons/fa';

export default function Footer() {
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    const year = new Date().getFullYear();

    const navLinks = [
        { name: 'About', href: '#about' },
        { name: 'Experience', href: '#experience' },
        { name: 'Projects', href: '#portfolio' },
        { name: 'Awards', href: '#awards' },
    ];

    const socials = [
        { href: 'https://github.com/tejask-dev', Icon: FaGithub, label: 'GitHub', hoverClass: 'hover:text-white hover:bg-white/10 hover:border-white/25' },
        { href: 'https://www.linkedin.com/in/tejasskaushik/', Icon: FaLinkedin, label: 'LinkedIn', hoverClass: 'hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-400/30' },
        { href: 'https://www.instagram.com/tejas_kaushik007/?hl=en', Icon: FaInstagram, label: 'Instagram', hoverClass: 'hover:text-pink-400 hover:bg-pink-500/10 hover:border-pink-400/30' },
    ];

    return (
        <footer className="relative overflow-hidden">
            {/* Top separator gradient line */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

            {/* Subtle background glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[80%] bg-purple-500/4 rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto px-4 py-12 sm:py-16 relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 mb-12">

                    {/* Brand */}
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="space-y-4"
                    >
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Tejas Kaushik
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                            AI Researcher, Entrepreneur, and Innovator building the future
                            with intelligence and creativity.
                        </p>
                        <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                            <MapPin className="w-3 h-3" />
                            <span>Windsor, Ontario, Canada</span>
                        </div>
                        {/* Social icons */}
                        <div className="flex gap-2.5 pt-1">
                            {socials.map(({ href, Icon, label, hoverClass }) => (
                                <motion.a
                                    key={label}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={label}
                                    whileHover={{ scale: 1.12, y: -3 }}
                                    whileTap={{ scale: 0.93 }}
                                    className={`p-2.5 rounded-xl border border-white/10 text-gray-400 backdrop-blur-sm transition-all duration-300 ${hoverClass}`}
                                >
                                    <Icon className="w-4 h-4" />
                                </motion.a>
                            ))}
                        </div>
                    </motion.div>

                    {/* Quick Links */}
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        viewport={{ once: true }}
                        className="space-y-4"
                    >
                        <h4 className="text-sm font-bold text-white uppercase tracking-widest">Navigate</h4>
                        <ul className="space-y-2.5">
                            {navLinks.map((link) => (
                                <li key={link.name}>
                                    <a
                                        href={link.href}
                                        className="group flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors duration-300 text-sm"
                                    >
                                        <span className="w-4 h-px bg-gray-700 group-hover:w-6 group-hover:bg-purple-400 transition-all duration-300" />
                                        {link.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Contact */}
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        viewport={{ once: true }}
                        className="space-y-4"
                    >
                        <h4 className="text-sm font-bold text-white uppercase tracking-widest">Get In Touch</h4>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Open to collaborations, internships, and exciting new opportunities.
                        </p>
                        <motion.a
                            href="mailto:tejas.kaushik@outlook.com"
                            className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-purple-500/15 to-pink-500/10 border border-purple-500/25 rounded-xl text-purple-300 text-sm font-medium hover:from-purple-500/25 hover:to-pink-500/20 hover:border-purple-500/40 transition-all duration-300 group"
                            whileHover={{ scale: 1.03, y: -1 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            <Mail className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                            tejas.kaushik@outlook.com
                        </motion.a>
                    </motion.div>
                </div>

                {/* Bottom bar */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    viewport={{ once: true }}
                    className="pt-8 border-t border-white/6 flex flex-col sm:flex-row justify-between items-center gap-4"
                >
                    <p className="text-gray-500 text-xs flex items-center gap-1.5">
                        © {year} Tejas Kaushik. Made with
                        <motion.span
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <Heart className="w-3 h-3 text-pink-500 fill-pink-500" />
                        </motion.span>
                        All rights reserved.
                    </p>

                    <motion.button
                        onClick={scrollToTop}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-gray-400 hover:text-white hover:bg-white/10 hover:border-purple-500/30 transition-all duration-300 text-xs font-medium group"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Back to top
                        <motion.div
                            animate={{ y: [0, -3, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <ArrowUp className="w-3.5 h-3.5 group-hover:text-purple-400 transition-colors" />
                        </motion.div>
                    </motion.button>
                </motion.div>
            </div>
        </footer>
    );
}
