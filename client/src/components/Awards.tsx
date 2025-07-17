import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

// Importing images
import Img3MT from "../assets/3MT.png";
import ImgChemistry from "../assets/Chemisty.jpg";
import ImgDebate from "../assets/DebateMedal.jpg";
import ImgHydroecology from "../assets/Hydroecology.jpg";
import ImgSymposium from "../assets/YourekaSymposium.jpg";
import ImgTargetAlpha from "../assets/TargetAlpha.jpg";

const awards = [
  {
    id: 1,
    image: Img3MT,
    alt: "3MT First Place Award",
    title: "Youreka 3MT Challenge – First Place (National)",
    description:
      "Won first place nationally in the Three Minute Thesis Challenge at Youreka, presenting complex HIV research in an accessible format.",
  },
  {
    id: 2,
    image: ImgChemistry,
    alt: "Chemical Conundrums First Place",
    title: "Chemical Conundrums – First Place",
    description:
      "Placed first in the University of Guelph Science Olympiad chemistry event, solving analytical problems and reaction-based challenges.",
  },
  {
    id: 3,
    image: ImgHydroecology,
    alt: "Hydroecology First Place",
    title: "Hydroecology – First Place",
    description:
      "Earned first place in the hydroecology event at the University of Guelph Science Olympiad, demonstrating field and lab analysis skills.",
  },
  {
    id: 4,
    image: ImgDebate,
    alt: "Ethics Bowl Second Place Medal",
    title: "Ethics Bowl – Second Place",
    description:
      "Placed second in the regional Ethics Bowl competition, excelling in structured debate on moral dilemmas despite it being my first competition.",
  },
  {
    id: 5,
    image: ImgSymposium,
    alt: "Youreka National Symposium First Place",
    title: "Youreka National Research Symposium – First Place",
    description:
      "Awarded first place nationally for the best HIV research presentation and outcomes at the Youreka Canada National Symposium.",
  },
  {
    id: 6,
    image: ImgTargetAlpha,
    alt: "Target Alpha National Executive Offer",
    title: "Target Alpha National Finalist",
    description:
      "Received recognition as a national finalist (Top 7) in the Target Alpha competition called Financial Planners Conference (FPC), showcasing innovative solutions to real-world problems.",
  },
];

export default function Awards() {
  const [current, setCurrent] = useState(0);

  const handleNext = () => {
    setCurrent((prev) => (prev + 1) % awards.length);
  };

  const handlePrev = () => {
    setCurrent((prev) => (prev - 1 + awards.length) % awards.length);
  };

  return (
    <section id="awards" className="section-padding bg-slate-50">
      <div className="container-custom">
        {/* Header */}
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-blue-800 mb-2">Awards & Honors</h2>
          <p className="text-lead text-slate-700 max-w-2xl mx-auto">
            Recognitions for academic, research, and competitive achievements
          </p>
        </motion.div>

        {/* Image Carousel */}
        <div className="relative max-w-2xl mx-auto rounded-2xl shadow-xl bg-white px-4 py-6 flex flex-col items-center">
          <div className="relative w-full flex items-center justify-center min-h-[240px]">
            <AnimatePresence mode="wait">
              <motion.img
                key={awards[current].id}
                src={awards[current].image}
                alt={awards[current].alt}
                className="w-full max-h-60 object-contain rounded-xl ring-2 ring-blue-100"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.6 }}
              />
            </AnimatePresence>

            {/* Left & Right Arrows */}
            <button
              aria-label="Previous award"
              onClick={handlePrev}
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-blue-50/80 hover:bg-blue-200 text-blue-800 rounded-full p-2 shadow-lg transition-all border border-blue-100"
            >
              <ArrowLeft size={28} />
            </button>
            <button
              aria-label="Next award"
              onClick={handleNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-blue-50/80 hover:bg-blue-200 text-blue-800 rounded-full p-2 shadow-lg transition-all border border-blue-100"
            >
              <ArrowRight size={28} />
            </button>
          </div>

          {/* Title & Description */}
          <div className="mt-6 text-center max-w-lg mx-auto">
            <h3 className="text-xl font-bold text-blue-800 mb-2">
              {awards[current].title}
            </h3>
            <p className="text-slate-700">{awards[current].description}</p>
          </div>
        </div>

        {/* Motivational Quote */}
        <motion.div
          className="mt-16 flex justify-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <blockquote className="bg-blue-50 border-l-4 border-blue-400 text-blue-900 italic rounded-xl px-6 py-7 shadow max-w-2xl mx-auto">
            “Success is not final, failure is not fatal: it is the courage to continue that counts.”
            <br />
            <span className="text-sm text-slate-600 mt-2 block">– Winston Churchill</span>
          </blockquote>
        </motion.div>
      </div>
    </section>
  );
}