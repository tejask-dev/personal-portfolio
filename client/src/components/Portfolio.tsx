'use client';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Github } from 'lucide-react';
import ScrollTextReveal from './ScrollTextReveal';
import somaAI from '../assets/SomaAI.png';
import docubridge from '../assets/Docubridge.png';
import researchPaper from '../assets/Youreka/Research Paper.png';
import stellarImage from '../assets/Stellar/image.png';

const filters = ['All', 'AI/ML', 'Web', 'Research', 'Client Work'] as const;
type Filter = (typeof filters)[number];

const projects = [
  {
    title: 'Soma AI',
    category: 'AI/ML' as Filter,
    image: somaAI,
    description: 'An AI-powered mental health companion offering private, personalized conversations — built end-to-end as a real product, not a demo.',
    problem: 'Students and young people need accessible, judgment-free mental health support that meets them where they are.',
    solution: 'Designed and shipped an LLM-driven companion with careful conversation design, privacy-first handling, and a calm product experience.',
    tech: ['Python', 'OpenAI API', 'React', 'Node.js'],
    impact: '300+ users',
    live: 'https://somaai-5qe3.onrender.com/',
    caseStudy: '/case-studies/soma-ai',
    github: 'https://github.com/tejask-dev',
    role: 'Founder & Developer',
  },
  {
    title: 'Stellar Learning',
    category: 'AI/ML' as Filter,
    image: stellarImage,
    description: 'An AI-powered personalized learning platform helping students practice, adapt, and build academic confidence at meaningful scale.',
    problem: 'Students need adaptive learning support that responds faster than static practice tools.',
    solution: 'Led product engineering for AI-personalized learning, progress tracking, and student growth loops.',
    tech: ['React', 'Firebase', 'Node.js', 'AI/ML', 'Tailwind CSS'],
    impact: '10K+ signups, 5K+ active users',
    live: 'https://stellarlearning.app/',
    caseStudy: 'https://stellarlearning.app/',
    github: 'https://github.com/tejask-dev',
    role: 'CTO',
  },
  {
    title: 'DocuBridge',
    category: 'AI/ML' as Filter,
    image: docubridge,
    description: 'AI document processing and financial analysis platform for uploading, extracting, and analyzing complex financial documents.',
    problem: 'Financial review is slowed by scattered documents and manual extraction workflows.',
    solution: 'Contributed to upload, extraction, and AI-supported analysis workflows for financial document review.',
    tech: ['React', 'TypeScript', 'Node.js', 'AI/ML'],
    impact: 'Internship engineering work',
    live: null,
    caseStudy: '/case-studies/docubridge',
    github: 'https://github.com/tejask-dev/Docubridge-Intership',
    role: 'Software Engineering Intern',
  },
  {
    title: 'HIV Treatment Research',
    category: 'Research' as Filter,
    image: researchPaper,
    description: 'Data-driven global health research analyzing the relationship between adolescent fertility rates and pediatric ART access in Sub-Saharan Africa.',
    problem: 'Global health access gaps require rigorous data storytelling and careful research interpretation.',
    solution: 'Analyzed public health indicators across countries, presenting findings at a national symposium.',
    tech: ['Python', 'Data Analysis', 'Statistics', 'Research Methods'],
    impact: '1st place national',
    live: null,
    caseStudy: 'https://github.com/tejask-dev/hiv-child-treatment-graphs',
    github: 'https://github.com/tejask-dev/hiv-child-treatment-graphs',
    role: 'Researcher',
  },
  {
    title: 'Web Solutions Venture',
    category: 'Client Work' as Filter,
    image: null,
    visual: 'clients',
    description: 'A client-services venture built through the Summer Company Program, delivering strategy-led web design for business owners.',
    problem: 'Local businesses need credible digital presences that communicate trust and convert attention into revenue.',
    solution: 'Packaging web design, brand positioning, and product thinking for real estate, landscaping, and international business clients.',
    tech: ['React', 'TypeScript', 'Tailwind CSS', 'Strategy'],
    impact: '3 clients, one $10K USD project',
    live: null,
    caseStudy: '#contact',
    github: 'https://github.com/tejask-dev',
    role: 'Founder',
  },
];

export default function Portfolio() {
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const visibleProjects = useMemo(
    () => (activeFilter === 'All' ? projects : projects.filter((project) => project.category === activeFilter)),
    [activeFilter],
  );

  return (
    <section id="portfolio" className="section-shell">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Portfolio</p>
            <ScrollTextReveal
              text="Selected projects with a clear problem, product thesis, and path to impact."
              className="section-title max-w-4xl"
            />
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Project filters">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#c084fc] ${
                  activeFilter === filter
                    ? 'border-[#c084fc] bg-[#a855f7] text-white'
                    : 'border-[#f8fbff]/12 bg-[#f8fbff]/[0.06] text-[#f8fbff] hover:border-[#c084fc]/60'
                }`}
                aria-selected={activeFilter === filter}
                role="tab"
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <motion.div layout className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visibleProjects.map((project) => (
              <motion.article
                layout
                key={project.title}
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.45 }}
                className="group overflow-hidden rounded-[1.5rem] border border-[#f8fbff]/10 bg-[#16091f]/76 shadow-xl shadow-black/10 backdrop-blur transition hover:-translate-y-1 hover:border-[#c084fc]/55 hover:shadow-2xl"
              >
                <div className="relative h-52 overflow-hidden">
                  {project.image ? (
                    <img
                      src={project.image}
                      alt={`${project.title} preview`}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(216,180,254,0.42),transparent_32%),linear-gradient(135deg,#16091f_0%,#4c1d95_48%,#7c3aed_100%)] p-5 transition duration-700 group-hover:scale-105">
                      <div className="absolute right-5 top-5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white/85 backdrop-blur">
                        Client Work
                      </div>
                      <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/15 bg-[#070312]/70 p-4 shadow-2xl backdrop-blur">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-200">{project.title}</p>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {['3 clients', '$10K', 'Strategy'].map((label) => (
                            <span key={label} className="rounded-full bg-white/10 px-3 py-2 text-center text-xs font-bold text-white">
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#16091f] via-transparent to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full bg-[#070312]/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#e9d5ff] backdrop-blur">
                    {project.category}
                  </span>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#c084fc]">{project.role}</p>
                      <h3 className="mt-1 text-xl font-semibold text-[#f8fbff]">{project.title}</h3>
                    </div>
                    <span className="shrink-0 rounded-full border border-[#c084fc]/30 bg-[#a855f7]/10 px-3 py-1 text-xs font-semibold text-[#e9d5ff]">
                      {project.impact}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-[#ede9fe]">{project.description}</p>

                  <div className="mt-4 grid gap-3 text-sm">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#e9d5ff]">Problem</p>
                      <p className="mt-1 leading-6 text-[#ede9fe]">{project.problem}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#e9d5ff]">Solution</p>
                      <p className="mt-1 leading-6 text-[#ede9fe]">{project.solution}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.tech.map((tech) => (
                      <span key={tech} className="rounded-full border border-[#f8fbff]/10 bg-[#f8fbff]/[0.06] px-3 py-1 text-xs text-[#ddd6fe]">
                        {tech}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex gap-3">
                    {project.live && (
                      <a
                        href={project.live}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-full border border-[#f8fbff]/14 px-4 py-2.5 text-sm font-bold text-[#f8fbff] transition hover:border-[#c084fc]/70 hover:text-[#f0abfc]"
                      >
                        Live
                      </a>
                    )}
                    <a
                      href={project.caseStudy}
                      target={project.caseStudy.startsWith('http') ? '_blank' : undefined}
                      rel={project.caseStudy.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#f8fbff] px-4 py-2.5 text-sm font-bold text-[#070312] transition hover:bg-[#e9d5ff]"
                    >
                      Case Study
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${project.title} GitHub`}
                      className="inline-flex items-center justify-center rounded-full border border-[#f8fbff]/14 px-4 py-2.5 text-[#f8fbff] transition hover:border-[#c084fc]/70 hover:text-[#f0abfc]"
                    >
                      <Github className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
