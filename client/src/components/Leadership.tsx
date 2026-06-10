'use client';
import { motion } from 'framer-motion';
import { Code2, FlaskConical, GraduationCap, Heart, MessageSquare, TrendingUp } from 'lucide-react';
import { profile } from '@/data/profile';
import ScrollTextReveal from './ScrollTextReveal';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Code: Code2,
  FlaskConical: FlaskConical,
  TrendingUp: TrendingUp,
  MessageSquare: MessageSquare,
  Heart: Heart,
  GraduationCap: GraduationCap,
};

export default function Leadership() {
  return (
    <section id="leadership" className="section-shell">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="eyebrow">Leadership</p>
          <ScrollTextReveal
            text="Builder, organizer, and community leader beyond the code."
            className="section-title mx-auto max-w-4xl"
          />
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#ede9fe]">
            Leadership is where technical depth meets people. Each role below reflects a real initiative — built from scratch, grown with purpose.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {profile.leadership.map((item, index) => {
            const Icon = iconMap[item.icon] ?? GraduationCap;
            return (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                className="group rounded-[1.5rem] border border-[#f8fbff]/10 bg-[#16091f]/76 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-[#a855f7]/50"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#a855f7]/20 bg-[#a855f7]/10 text-[#c084fc] transition group-hover:bg-[#a855f7]/18">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold leading-tight text-[#f8fbff]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#d8b4fe]">{item.description}</p>
              </motion.article>
            );
          })}
        </div>

        {/* Builder ethos callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 rounded-[1.5rem] border border-[#a855f7]/18 bg-[linear-gradient(135deg,rgba(59,130,246,0.10),rgba(248,251,255,0.03))] p-6 md:p-8"
        >
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { label: 'Organizations built or led', value: '6+' },
              { label: 'Students mentored or coached', value: '40+' },
              { label: 'Competitions represented', value: '4+' },
            ].map((stat) => (
              <div key={stat.label} className="text-center md:text-left">
                <p className="text-3xl font-bold text-[#e9d5ff]">{stat.value}</p>
                <p className="mt-1.5 text-sm text-[#ede9fe]">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
