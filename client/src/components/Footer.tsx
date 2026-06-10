'use client';
import { ArrowUp, Mail, MapPin } from 'lucide-react';
import { FaGithub, FaInstagram, FaLinkedin } from 'react-icons/fa';

export default function Footer() {
  const year = new Date().getFullYear();
  const links = [
    { name: 'About', href: '#about' },
    { name: 'Western + Ivey', href: '#western-ivey' },
    { name: 'Portfolio', href: '#portfolio' },
    { name: 'Recognition', href: '#awards' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <footer className="relative border-t border-[#f8fbff]/10 bg-[#070312]/50 px-5 py-12">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.1fr_0.7fr_0.9fr]">
        <div>
          <h2 className="text-3xl font-semibold text-[#f8fbff]">Tejass Kaushik</h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-[#ede9fe]">
            Open to partnerships, product collaborations, speaking opportunities, internships, and conversations with teams building at the intersection of AI, finance, and education.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-[#d8b4fe]">
            <MapPin className="h-4 w-4 text-[#c084fc]" />
            Ontario, Canada
          </p>
        </div>

        <nav aria-label="Footer navigation">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#ddd6fe]">Navigate</h3>
          <div className="mt-4 grid gap-3">
            {links.map((link) => (
              <a key={link.name} href={link.href} className="text-sm text-[#ede9fe] transition hover:text-[#ddd6fe]">
                {link.name}
              </a>
            ))}
          </div>
        </nav>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#ddd6fe]">Contact</h3>
          <a href="mailto:tejas.kaushik@outlook.com" className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#f8fbff]/12 bg-[#f8fbff]/[0.06] px-4 py-2.5 text-sm font-semibold text-[#f8fbff] transition hover:border-[#a855f7]/60 hover:text-[#ddd6fe]">
            <Mail className="h-4 w-4" />
            tejas.kaushik@outlook.com
          </a>
          <div className="mt-5 flex gap-3">
            <a aria-label="LinkedIn" href="https://www.linkedin.com/in/tejasskaushik/" target="_blank" rel="noopener noreferrer" className="icon-button">
              <FaLinkedin className="h-4 w-4" />
            </a>
            <a aria-label="GitHub" href="https://github.com/tejask-dev" target="_blank" rel="noopener noreferrer" className="icon-button">
              <FaGithub className="h-4 w-4" />
            </a>
            <a aria-label="Instagram" href="https://www.instagram.com/tejas_kaushik007/" target="_blank" rel="noopener noreferrer" className="icon-button">
              <FaInstagram className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-7xl flex-col justify-between gap-4 border-t border-[#f8fbff]/[0.08] pt-6 text-xs text-[#d8b4fe] sm:flex-row sm:items-center">
          <p>Built by Tejass Kaushik. Western CS + Ivey 2030. Copyright {year}.</p>
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="inline-flex items-center gap-2 transition hover:text-[#ddd6fe]">
          Back to top
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
      </div>
    </footer>
  );
}
