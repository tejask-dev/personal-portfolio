import { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { href: "#about", label: "About" },
    { href: "#resume", label: "Resume" },
    { href: "#portfolio", label: "Portfolio" },
    { href: "#awards", label: "Awards" },
    { href: "#contact", label: "Contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg z-50 border-b border-blue-100 shadow-sm transition-all duration-300">
      <div className="container-custom">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Name */}
          <motion.a
            href="#hero"
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-2xl font-extrabold text-blue-700 tracking-tight hover:text-blue-900 transition-colors duration-200">
              Tejas Kaushik
            </span>
          </motion.a>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-2">
              {navItems.map((item, index) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  className="relative inline-block px-4 py-1.5 rounded-full font-medium text-slate-700 hover:text-white hover:bg-blue-600 focus:bg-blue-700 focus:text-white focus:outline-none transition-all duration-200 group"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.07 }}
                >
                  <span className="relative z-10">{item.label}</span>
                  {/* Animated Underline (on hover) */}
                  <span className="absolute left-2 right-2 -bottom-1 h-0.5 bg-blue-500 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                </motion.a>
              ))}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-blue-700 hover:text-blue-900 bg-white rounded-full p-2 shadow-sm border border-blue-100 transition-colors duration-200"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              className="mobile-menu md:hidden bg-white border-t border-blue-200 overflow-hidden shadow-lg rounded-b-2xl"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28 }}
            >
              <div className="px-4 pt-4 pb-6 flex flex-col gap-2">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block px-4 py-3 rounded-xl text-blue-700 font-medium bg-blue-50 hover:bg-blue-600 hover:text-white transition-all duration-200 text-lg"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}