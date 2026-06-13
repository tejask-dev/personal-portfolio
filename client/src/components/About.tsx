'use client';
import { motion } from 'framer-motion';
import { BrainCircuit, Compass, GraduationCap, Handshake, LineChart, MapPin, ShieldCheck } from 'lucide-react';
import { profile } from '@/data/profile';
import ScrollTextReveal from './ScrollTextReveal';

const values = [
  { icon: ShieldCheck, title: 'Trust first', copy: 'I build AI that earns confidence through clarity, privacy, and responsible product decisions.' },
  { icon: Handshake, title: 'Access over exclusivity', copy: 'My ventures focus on helping more people learn, build financial literacy, and navigate new opportunities.' },
  { icon: LineChart, title: 'Outcomes matter', copy: 'I care about adoption, measurable learning gains, and products people return to.' },
];

const skillGroups = [
  { title: 'Core stack', skills: profile.techStack.slice(0, 5) },
  { title: 'Product stack', skills: profile.techStack.slice(5, 8) },
  { title: 'AI and data', skills: profile.techStack.slice(8) },
];

export default function About() {
  return (
    <section id="about" className="section-shell">
      {/* Mirrored scrim: the robot drifts into the left rail here, so the
          right text column gets a readability gradient. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[64%] bg-gradient-to-l from-[#070312]/85 via-[#070312]/45 to-transparent lg:block"
      />
      <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        {/* The fixed robot stage drifts into this rail on desktop — the
            character is the visual for this section, not a photo. */}
        <div aria-hidden="true" className="hidden lg:block" />

        <div>
          <p className="eyebrow">About</p>
          <ScrollTextReveal
            text="A young founder combining technical depth with business strategy."
            className="section-title"
          />

          <div className="mt-7 grid gap-5 text-base leading-8 text-[#ede9fe] md:text-lg">
            <p>
              Born in India and raised in Canada, I bring a multicultural perspective to technology, entrepreneurship, and leadership. That background shapes how I think about opportunity: talent is everywhere, but access is uneven.
            </p>
            <p>
              My work focuses on using AI and software to solve practical problems in education, finance, productivity, and community impact. As an incoming Western Computer Science + Ivey student, I am building the bridge between engineering, product, and strategy.
            </p>
            <p>
              The long-term goal is simple: build products that are useful enough to earn trust, clear enough to scale, and ambitious enough to matter.
            </p>
          </div>

          <p className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#d8b4fe]">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {profile.location} · Incoming Western Computer Science + Ivey, Class of 2030
          </p>

          <div className="mt-10 rounded-[1.5rem] border border-[#f8fbff]/10 bg-[#f8fbff]/[0.06] p-5 md:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[#a855f7]/14 p-2 text-[#c084fc]">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-[#f8fbff]">Currently focused on</h3>
                <p className="text-sm text-[#d8b4fe]">The areas guiding my next chapter.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {profile.focusAreas.map((focus) => (
                <span key={focus} className="rounded-2xl border border-[#f8fbff]/10 bg-[#070312]/55 px-4 py-3 text-sm font-semibold text-[#ede9fe]">
                  {focus}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {values.map(({ icon: Icon, title, copy }) => (
              <motion.article
                key={title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55 }}
                className="rounded-2xl border border-[#f8fbff]/10 bg-[#16091f]/72 p-5 backdrop-blur transition hover:-translate-y-1 hover:border-[#a855f7]/45"
              >
                <Icon className="h-5 w-5 text-[#c084fc]" />
                <h3 className="mt-4 text-lg font-semibold text-[#f8fbff]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#d8b4fe]">{copy}</p>
              </motion.article>
            ))}
          </div>

          <div className="mt-10 rounded-[1.5rem] border border-[#f8fbff]/10 bg-[#f8fbff]/[0.06] p-5 md:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[#a855f7]/14 p-2 text-[#c084fc]">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-[#f8fbff]">Skills and Stack</h3>
                <p className="text-sm text-[#d8b4fe]">Grouped for clarity, not volume.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {skillGroups.map((group) => (
                <div key={group.title}>
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-[#ddd6fe]">
                    <GraduationCap className="h-4 w-4" />
                    {group.title}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {group.skills.map((skill) => (
                      <span key={skill} className="rounded-full border border-[#f8fbff]/10 bg-[#070312]/60 px-3 py-1.5 text-xs font-semibold text-[#f8fbff]/86">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
