'use client';
import { motion } from 'framer-motion';
import { Heart, Github, Linkedin, Instagram, Mail, ArrowUp } from 'lucide-react';

export default function Footer() {
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const currentYear = new Date().getFullYear();

  return (
        <footer className="border-t border-gray-700/50">
            <div className="container mx-auto px-4 py-8 sm:py-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
                    {/* Brand Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="space-y-4"
        >
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Tejas Kaushik
            </h3>
                        <p className="text-gray-400 leading-relaxed">
                            AI Researcher, Entrepreneur, and Innovator building the future with intelligence and creativity.
                        </p>
                    </motion.div>

          {/* Quick Links */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="space-y-4"
                    >
                        <h4 className="text-lg font-semibold text-white">Quick Links</h4>
                        <ul className="space-y-2">
                            {[
                                { name: 'About', href: '#about' },
                                { name: 'Experience', href: '#experience' },
                                { name: 'Projects', href: '#portfolio' },
                                { name: 'Contact', href: '#contact' }
                            ].map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                                        className="text-gray-400 hover:text-purple-400 transition-colors duration-300"
                  >
                                        {link.name}
                  </a>
                </li>
              ))}
            </ul>
                    </motion.div>

                    {/* Contact & Social */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="space-y-4"
                    >
                        <h4 className="text-lg font-semibold text-white">Let's Connect</h4>
                        <div className="space-y-3">
                <a
                  href="mailto:tejas.kaushik@outlook.com"
                                className="flex items-center gap-3 text-gray-400 hover:text-purple-400 transition-colors duration-300"
                            >
                                <Mail className="w-5 h-5" />
                                <span>tejas.kaushik@outlook.com</span>
                            </a>
                            <div className="flex gap-4">
                                <a
                                    href="https://github.com/tejask-dev"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-gray-700/50 rounded-lg hover:bg-purple-500/20 transition-colors duration-300 group"
                                >
                                    <Github className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                                </a>
                                <a
                                    href="https://www.linkedin.com/in/tejasskaushik/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-gray-700/50 rounded-lg hover:bg-blue-500/20 transition-colors duration-300 group"
                                >
                                    <Linkedin className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                                </a>
                                <a
                                    href="https://www.instagram.com/tejas_kaushik007/?hl=en"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-gray-700/50 rounded-lg hover:bg-pink-500/20 transition-colors duration-300 group"
                                >
                                    <Instagram className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                                </a>
                            </div>
          </div>
        </motion.div>
                </div>

                {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="border-t border-gray-700/50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
                >
                    <div className="text-gray-400 text-sm">
                        © {currentYear} Tejas Kaushik. All rights reserved.
                    </div>
                    
                    <button
                        onClick={scrollToTop}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full text-gray-400 hover:text-white transition-colors duration-300 group"
                    >
                        <span className="text-sm">Back to top</span>
                        <motion.div
                            animate={{ y: [0, -2, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            <ArrowUp className="w-4 h-4 group-hover:text-purple-400 transition-colors" />
                        </motion.div>
                    </button>
        </motion.div>
      </div>
    </footer>
  );
}