'use client';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ScrollTextReveal from './ScrollTextReveal';

const filters = ['All', 'Startups', 'AI/Tech', 'Research', 'Leadership', 'Finance', 'Education'] as const;
type Filter = (typeof filters)[number];

const experiences = [
  {
    role: 'CTO',
    org: 'Stellar Learning',
    dates: '2025 to Present',
    description: 'Leading technical development for an AI-powered learning platform focused on personalized student experiences, product engineering, and scale.',
    impact: '10K+ signups, 5K+ active users',
    tags: ['AI/Tech', 'Education', 'Leadership', 'Startups'],
  },
  {
    role: 'Founder & Developer',
    org: 'Soma AI',
    dates: '2024 to Present',
    description: 'Built and launched an AI-powered mental health companion offering private, personalized conversations for emotional wellbeing.',
    impact: '300+ users',
    tags: ['Startups', 'AI/Tech'],
  },
  {
    role: 'Founder',
    org: 'Top Score Tutoring',
    dates: '2021 to Present',
    description: 'Founded and scaled a tutoring initiative supporting students through academic coaching, curriculum support, and confidence-building.',
    impact: '40+ students supported',
    tags: ['Education', 'Leadership', 'Startups'],
  },
  {
    role: 'Software Engineering Intern',
    org: 'DocuBridge',
    dates: 'Summer 2025',
    description: 'Worked on AI document processing and financial analysis workflows using modern web technologies and product-minded engineering.',
    impact: 'AI document workflows',
    tags: ['AI/Tech', 'Finance'],
  },
  {
    role: 'Researcher',
    org: 'Youreka Global Health',
    dates: '2025',
    description: 'Presented national award-winning research exploring pediatric ART access and adolescent fertility outcomes in Sub-Saharan Africa.',
    impact: 'National 1st place',
    tags: ['Research', 'Leadership'],
  },
  {
    role: 'Vice President',
    org: 'Target Alpha Windsor-Essex',
    dates: '2023 to 2025',
    description: 'Led finance education and investment analysis initiatives while competing nationally in case-based financial strategy.',
    impact: 'Top 7 nationally at FPC 2025',
    tags: ['Finance', 'Leadership'],
  },
  {
    role: 'Selected Participant',
    org: 'Harvard Ventures-TECH Summer Program',
    dates: '2025',
    description: 'Completed a startup and venture-focused program covering entrepreneurship, business development, and investor pitch frameworks.',
    impact: 'Harvard venture program',
    tags: ['Startups', 'Leadership'],
  },
  {
    role: 'Early Entrepreneurs Stream',
    org: 'Waterloo Catalyst',
    dates: '2025',
    description: 'Selected for a competitive entrepreneurship and innovation stream focused on validating ideas and building early-stage ventures.',
    impact: 'Selective admission',
    tags: ['Startups', 'Education'],
  },
  {
    role: 'Competitor',
    org: 'Ethics Bowl Canada',
    dates: '2023 to 2024',
    description: 'Competed in regional Ethics Bowl competitions, earning 2nd place in the first competition and developing structured ethical argumentation skills.',
    impact: '2nd place regional',
    tags: ['Research', 'Leadership', 'Education'],
  },
  {
    role: 'Competitor',
    org: 'Science Olympiad Battle STEM',
    dates: '2022',
    description: 'Placed 1st in both Chemistry and Hydroecology at the University of Guelph Battle STEM event.',
    impact: '1st place Chemistry + Hydroecology',
    tags: ['Research', 'Education'],
  },
];

export default function Experience() {
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const visible = useMemo(
    () => (activeFilter === 'All' ? experiences : experiences.filter((entry) => entry.tags.includes(activeFilter))),
    [activeFilter],
  );

  return (
    <section id="experience" className="section-shell">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Experience</p>
            <ScrollTextReveal
              text="A strategic record across startups, AI, research, finance, and leadership."
              className="section-title max-w-4xl"
            />
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Experience filters">
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
                role="tab"
                aria-selected={activeFilter === filter}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <motion.div layout className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((entry) => (
              <motion.article
                layout
                key={`${entry.org}-${entry.role}`}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.35 }}
                className="rounded-[1.5rem] border border-[#f8fbff]/10 bg-[#16091f]/76 p-5 backdrop-blur transition hover:-translate-y-1 hover:border-[#c084fc]/55"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c084fc]">{entry.role}</p>
                    <h3 className="mt-1.5 text-xl font-semibold leading-tight text-[#f8fbff]">{entry.org}</h3>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#f8fbff]/10 px-3 py-1 text-xs font-semibold text-[#ddd6fe]">
                    {entry.dates}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-[#ede9fe]">{entry.description}</p>
                <div className="mt-4 rounded-2xl border border-[#c084fc]/25 bg-[#a855f7]/10 px-4 py-2.5 text-sm font-bold text-[#e9d5ff]">
                  {entry.impact}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-[#f8fbff]/[0.07] px-3 py-1 text-xs font-semibold text-[#ddd6fe]">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
