'use client';
import { motion } from 'framer-motion';
import { Brain, Building2, Rocket, Sparkles } from 'lucide-react';
import { profile } from '@/data/profile';
import ScrollTextReveal from './ScrollTextReveal';

const cards = [
  {
    icon: Brain,
    title: 'Computer Science',
    copy: 'Software systems, applied AI, data, and product engineering as the technical foundation for ambitious ideas.',
    detail: 'AI · Systems · Data · Product Engineering',
    accentColor: 'from-blue-500/20 to-indigo-500/10',
    borderColor: 'hover:border-blue-500/40',
  },
  {
    icon: Building2,
    title: 'Ivey Business School',
    copy: 'Business strategy, finance, leadership, and decision-making to understand markets, teams, and scale.',
    detail: 'Strategy · Finance · Leadership · Entrepreneurship',
    accentColor: 'from-violet-500/20 to-blue-500/10',
    borderColor: 'hover:border-violet-500/40',
  },
  {
    icon: Rocket,
    title: 'Founder Path',
    copy: 'Building products, ventures, and client work through university with a bias toward real users and measurable outcomes.',
    detail: 'Products · Startups · Client Work · Ventures',
    accentColor: 'from-sky-500/20 to-blue-500/10',
    borderColor: 'hover:border-sky-500/40',
  },
];

export default function WesternIvey() {
  return (
    <section id="western-ivey" className="section-shell">
      <div className="mx-auto max-w-7xl">

        {/* Section header */}
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div>
            <p className="eyebrow">Next Chapter</p>
            <ScrollTextReveal
              text="Western Computer Science + Ivey: technical depth meets business strategy."
              className="section-title max-w-4xl"
            />
          </div>
          <p className="text-lg leading-8 text-[#ede9fe]">
            Starting in Fall 2026, I'll be pursuing Computer Science at Western University with the Ivey Business School pathway — combining software engineering, AI, entrepreneurship, and strategic thinking.
          </p>
        </div>

        {/* Main feature block */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7 }}
          className="relative mt-10 overflow-hidden rounded-[2rem] border border-[#a855f7]/20 bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(99,102,241,0.07),rgba(248,251,255,0.03))] p-6 backdrop-blur-xl md:p-10"
        >
          {/* Decorative glow spots */}
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#a855f7] opacity-[0.07] blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-[#6366f1] opacity-[0.06] blur-3xl" />

          {/* Header badges */}
          <div className="relative mb-8 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#a855f7] px-4 py-2 text-sm font-bold text-[#070312]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {profile.education}
            </span>
            <span className="rounded-full border border-[#f8fbff]/14 bg-[#f8fbff]/[0.07] px-4 py-2 text-sm font-semibold text-[#ddd6fe]">
              Founder path through university
            </span>
            <span className="rounded-full border border-[#f8fbff]/14 bg-[#f8fbff]/[0.07] px-4 py-2 text-sm font-semibold text-[#ddd6fe]">
              Fall 2026
            </span>
          </div>

          {/* Three pillars */}
          <div className="relative grid gap-4 md:grid-cols-3">
            {cards.map(({ icon: Icon, title, copy, detail, accentColor, borderColor }, index) => (
              <motion.article
                key={title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`group relative overflow-hidden rounded-[1.4rem] border border-[#f8fbff]/[0.09] bg-[#070312]/50 p-5 transition ${borderColor}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${accentColor} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
                <div className="relative">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#a855f7]/20 bg-[#a855f7]/12 text-[#c084fc]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#f8fbff]">{title}</h3>
                  <p className="mt-2.5 text-sm leading-6 text-[#ede9fe]">{copy}</p>
                  <p className="mt-4 text-xs font-semibold tracking-wide text-[#c084fc]/70">{detail}</p>
                </div>
              </motion.article>
            ))}
          </div>

          {/* Bottom context line */}
          <p className="relative mt-8 border-t border-[#f8fbff]/[0.08] pt-6 text-sm leading-7 text-[#d8b4fe]">
            The goal is simple: use four years to build the technical and strategic foundation to create products that scale, and to graduate with a company already in motion.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
