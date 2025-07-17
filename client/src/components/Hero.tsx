import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Linkedin, Twitter, Instagram } from "lucide-react";

// Only import tejas2.jpg to tejas14.jpg for the slideshow
const heroImages = Array.from({ length: 13 }, (_, i) =>
  new URL(`../assets/tejas${i + 2}.jpg`, import.meta.url).href
);

export default function Hero() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="hero"
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 pt-16"
    >
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* LEFT CONTENT */}
          <motion.div
            className="space-y-7"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-blue-900 leading-tight mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Hi, I'm{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-sky-500 to-blue-400">
                Tejas Kaushik
              </span>
            </motion.h1>

            <motion.p
              className="text-lg text-slate-700 max-w-xl font-medium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              I’m a high school student, researcher, and developer passionate about building products, solving real-world problems, and making social impact through technology, education, leadership, and research.
            </motion.p>

            <motion.p
              className="text-slate-600 text-md max-w-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              From founding <span className="font-semibold text-blue-600">VolunTrack</span> to winning national pitch competitions and conducting award-winning global health research — my journey blends coding, entrepreneurship, and service. I believe in building what matters and learning relentlessly.
            </motion.p>

            {/* CTA Button */}
            <motion.div
              className="flex flex-wrap gap-4 pt-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <a
                href="#portfolio"
                className="inline-block px-8 py-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-400 text-white text-lg font-bold shadow-md hover:from-blue-700 hover:to-blue-500 hover:-translate-y-1 transform transition-all duration-200"
              >
                Explore My Work
              </a>
            </motion.div>

            {/* Socials */}
            <motion.div
              className="flex space-x-5 pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <a
                href="https://www.linkedin.com/in/tejasskaushik/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-blue-100 shadow hover:bg-blue-600 hover:text-white text-blue-700 transition-all duration-200"
                aria-label="LinkedIn"
              >
                <Linkedin size={25} />
              </a>
              <a
                href="https://github.com/tejask-dev"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-blue-100 shadow hover:bg-blue-600 hover:text-white text-blue-700 transition-all duration-200"
                aria-label="GitHub"
              >
                <Github size={25} />
              </a>
              <a
                href="https://x.com/Tejass_Kaushik"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-blue-100 shadow hover:bg-blue-600 hover:text-white text-blue-700 transition-all duration-200"
                aria-label="Twitter"
              >
                <Twitter size={25} />
              </a>
              <a
                href="https://www.instagram.com/tejas_kaushik007/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-blue-100 shadow hover:bg-blue-600 hover:text-white text-pink-600 transition-all duration-200"
                aria-label="Instagram"
              >
                <Instagram size={25} />
              </a>
            </motion.div>
          </motion.div>

          {/* RIGHT IMAGE - Animated Slideshow */}
          <motion.div
            className="relative w-full h-full flex justify-center items-center"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="w-full max-w-md h-[430px] relative overflow-hidden rounded-2xl shadow-2xl bg-white border-4 border-blue-100">
              <AnimatePresence mode="wait">
                <motion.img
                  key={heroImages[currentImageIndex]}
                  src={heroImages[currentImageIndex]}
                  alt="Tejas Kaushik"
                  className="absolute top-0 left-0 w-full h-full object-cover"
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.04 }}
                  transition={{ duration: 1 }}
                />
              </AnimatePresence>
              {/* Animated blue ring */}
              <motion.div
                key={currentImageIndex}
                className="absolute inset-0 rounded-2xl pointer-events-none"
                initial={{ boxShadow: "0 0 0 0 #3b82f6" }}
                animate={{ boxShadow: "0 0 0 8px #3b82f655" }}
                transition={{ duration: 1 }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}