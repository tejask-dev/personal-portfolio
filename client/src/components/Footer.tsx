import { motion } from "framer-motion";
import { Linkedin, Github, Twitter } from "lucide-react";

export default function Footer() {
  const quickLinks = [
    { href: "#about", label: "About" },
    { href: "#resume", label: "Resume" },
    { href: "#portfolio", label: "Portfolio" },
    // { href: "#blog", label: "Blog" }, // Remove if no blog page exists
  ];

  const socialLinks = [
    { icon: Linkedin, href: "https://www.linkedin.com/in/tejasskaushik/", label: "LinkedIn" },
    { icon: Github, href: "https://github.com/tejask-dev", label: "GitHub" },
    { icon: Twitter, href: "https://x.com/Tejass_Kaushik", label: "Twitter" },
  ];

  return (
    <footer className="bg-slate-900 text-white pt-16 pb-10">
      <div className="container-custom">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {/* Name & Bio */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-extrabold mb-2 text-blue-400 tracking-tight">
              Tejas Kaushik
            </h3>
            <div className="h-1 w-20 bg-blue-800 rounded mb-4" />
            <p className="text-slate-300 mb-5 leading-relaxed">
              Student. Founder. Researcher.<br />
              Passionate about building tools that empower communities and create real impact.
            </p>
            {/* Social Icons */}
            <div className="flex space-x-4 mt-4">
              {socialLinks.map((link, index) => (
                <motion.a
                  key={index}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 hover:bg-blue-600 text-blue-400 hover:text-white transition-colors duration-200 shadow-md"
                  whileHover={{ scale: 1.15, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={link.label}
                >
                  <link.icon size={22} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
              Quick Links
              <span className="inline-block w-5 h-1 bg-blue-800 rounded" />
            </h4>
            <ul className="flex flex-col gap-2">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="inline-block px-4 py-2 rounded-full bg-slate-800 text-slate-200 hover:bg-blue-600 hover:text-white font-medium transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
              Contact
              <span className="inline-block w-5 h-1 bg-blue-800 rounded" />
            </h4>
            <ul className="flex flex-col gap-2 text-slate-200">
              <li>
                <a
                  href="mailto:tejas.kaushik@outlook.com"
                  className="inline-block px-4 py-2 rounded-full bg-slate-800 hover:bg-blue-600 hover:text-white transition-colors duration-200"
                >
                  tejas.kaushik@outlook.com
                </a>
              </li>
              <li>
                <a
                  href="tel:15195663902"
                  className="inline-block px-4 py-2 rounded-full bg-slate-800 hover:bg-blue-600 hover:text-white transition-colors duration-200"
                >
                  +1 (519) 566-3902
                </a>
              </li>
              <li>
                <span className="inline-block px-4 py-2 rounded-full bg-slate-800">
                  Windsor, ON
                </span>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Copyright */}
        <motion.div
          className="border-t border-slate-700 mt-12 pt-8 text-center text-slate-400 text-sm"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <p>
            &copy; {new Date().getFullYear()} <span className="text-blue-400 font-bold">Tejas Kaushik</span>. All rights reserved.
          </p>
        </motion.div>
      </div>
    </footer>
  );
}