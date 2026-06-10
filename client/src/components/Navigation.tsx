'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, Briefcase, Code2, FileText, GraduationCap, Home, Mail, Menu, User, UsersRound, X } from 'lucide-react';
import { scroller } from 'react-scroll';

const navItems = [
  { name: 'Home', href: '#home', icon: Home, id: 'home' },
  { name: 'About', href: '#about', icon: User, id: 'about' },
  { name: 'Skills', href: '#skills', icon: Code2, id: 'skills' },
  { name: 'Western + Ivey', href: '#western-ivey', icon: GraduationCap, id: 'western-ivey' },
  { name: 'Experience', href: '#experience', icon: Briefcase, id: 'experience' },
  { name: 'Projects', href: '#portfolio', icon: FileText, id: 'portfolio' },
  { name: 'Recognition', href: '#awards', icon: Award, id: 'awards' },
  { name: 'Leadership', href: '#leadership', icon: UsersRound, id: 'leadership' },
  { name: 'Contact', href: '#contact', icon: Mail, id: 'contact' },
];

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 32);
      const scrollPosition = window.scrollY + 130;
      for (let i = navItems.length - 1; i >= 0; i--) {
        const element = document.getElementById(navItems[i].id);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(navItems[i].id);
          break;
        }
      }
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    scroller.scrollTo(href.replace('#', ''), {
      duration: 650,
      smooth: 'easeInOutQuart',
      offset: -80,
    });
    setIsOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed left-0 right-0 top-0 z-50 px-3 py-3"
      aria-label="Primary navigation"
    >
      <div
        className={`mx-auto flex h-16 max-w-7xl items-center justify-between rounded-full border px-4 transition ${
          scrolled
            ? 'border-[#f8fbff]/12 bg-[#16091f]/82 shadow-2xl shadow-black/20 backdrop-blur-xl'
            : 'border-transparent bg-transparent'
        }`}
      >
        <button
          type="button"
          onClick={() => scrollToSection('#home')}
          className="text-left text-sm font-bold uppercase tracking-[0.22em] text-[#f8fbff] transition hover:text-[#ddd6fe]"
        >
          Tejass Kaushik
        </button>

        <div className="hidden items-center gap-1 xl:flex">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => scrollToSection(item.href)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive ? 'bg-[#f8fbff] text-[#070312]' : 'text-[#ede9fe] hover:bg-[#f8fbff]/[0.08] hover:text-[#f8fbff]'
                }`}
              >
                {item.name}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollToSection('#contact')}
          className="hidden rounded-full bg-[#a855f7] px-4 py-2 text-sm font-bold text-[#070312] transition hover:bg-[#c084fc] md:inline-flex"
        >
          Contact
        </button>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="rounded-full border border-[#f8fbff]/12 p-2 text-[#f8fbff] lg:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-auto mt-2 max-w-7xl overflow-hidden rounded-3xl border border-[#f8fbff]/12 bg-[#16091f]/94 p-3 shadow-2xl backdrop-blur-xl xl:hidden"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => scrollToSection(item.href)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    isActive ? 'bg-[#a855f7] text-[#070312]' : 'text-[#ede9fe] hover:bg-[#f8fbff]/[0.08]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
