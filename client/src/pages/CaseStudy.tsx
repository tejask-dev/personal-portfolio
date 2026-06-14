import { Link, useRoute } from 'wouter';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import AdvancedScroll3D from '@/components/AdvancedScroll3D';
import ScrollTextReveal from '@/components/ScrollTextReveal';
import { useSeo } from '@/lib/seo';
import docubridge from '@/assets/Docubridge.png';
import somaAI from '@/assets/SomaAI.png';

const studies = {
  'soma-ai': {
    title: 'Soma AI',
    image: somaAI,
    label: 'AI Mental Health Companion',
    summary: 'An AI-powered mental health companion offering private, personalized conversations for emotional wellbeing, with 300+ users.',
    problem: 'Students and young people often need someone to talk to before they are ready to seek formal support. Existing options feel clinical, public, or out of reach.',
    solution: 'I designed and built Soma AI as an LLM-driven companion with careful conversation design, privacy-first data handling, and a calm interface that makes opening up feel safe.',
    impact: 'Reached 300+ users as a real shipped product and became a foundation for my work in applied AI and product design.',
    link: 'https://somaai-5qe3.onrender.com/',
    github: 'https://github.com/tejask-dev',
  },
  docubridge: {
    title: 'DocuBridge',
    image: docubridge,
    label: 'AI Document Processing',
    summary: 'A document intelligence workflow for financial analysis, extraction, and review.',
    problem: 'Financial and operational teams lose time reading fragmented documents, pulling out key figures, and turning messy files into usable decisions.',
    solution: 'I contributed to React, TypeScript, and Node.js workflows that help users upload documents, extract information, and move toward structured analysis with AI support.',
    impact: 'Supported real product development during a software engineering internship and deepened experience in applied AI for financial workflows.',
    link: 'https://github.com/tejask-dev/Docubridge-Intership',
    github: 'https://github.com/tejask-dev/Docubridge-Intership',
  },
};

export default function CaseStudy() {
  const [, params] = useRoute('/case-studies/:slug');
  const study = params?.slug ? studies[params.slug as keyof typeof studies] : undefined;

  useSeo(
    study
      ? {
          title: `${study.title} — Case Study | Tejass Kaushik`,
          description: study.summary,
          path: `/case-studies/${params?.slug}`,
        }
      : { title: 'Case study not found | Tejass Kaushik', path: '/case-studies' },
  );

  if (!study) {
    return (
      <AdvancedScroll3D>
        <main className="section-shell min-h-screen">
          <div className="mx-auto max-w-3xl">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#ddd6fe]">
              <ArrowLeft className="h-4 w-4" />
              Back home
            </Link>
            <h1 className="mt-8 text-5xl font-semibold text-[#f8fbff]">Case study not found.</h1>
          </div>
        </main>
      </AdvancedScroll3D>
    );
  }

  return (
    <AdvancedScroll3D>
      <main className="section-shell min-h-screen pt-32">
        <article className="mx-auto max-w-5xl">
          <Link href="/#portfolio" className="inline-flex items-center gap-2 text-sm font-semibold text-[#ddd6fe] transition hover:text-[#f8fbff]">
            <ArrowLeft className="h-4 w-4" />
            Back to portfolio
          </Link>

          <p className="eyebrow mt-10">{study.label}</p>
          <ScrollTextReveal text={`${study.title}: ${study.summary}`} as="h1" className="section-title max-w-5xl" />

          <img src={study.image} alt={`${study.title} product preview`} className="mt-10 max-h-[520px] w-full rounded-[2rem] border border-[#f8fbff]/10 object-cover shadow-2xl shadow-black/20" />

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              ['Problem', study.problem],
              ['Solution', study.solution],
              ['Impact', study.impact],
            ].map(([title, copy]) => (
              <section key={title} className="rounded-[1.5rem] border border-[#f8fbff]/10 bg-[#16091f]/74 p-6 backdrop-blur">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-[#ddd6fe]">{title}</h2>
                <p className="mt-4 text-sm leading-7 text-[#ede9fe]">{copy}</p>
              </section>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={study.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#a855f7] px-5 py-3 text-sm font-bold text-[#070312] transition hover:bg-[#c084fc]">
              View project
              <ExternalLink className="h-4 w-4" />
            </a>
            <a href={study.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#f8fbff]/12 px-5 py-3 text-sm font-bold text-[#f8fbff] transition hover:border-[#a855f7]/60 hover:text-[#ddd6fe]">
              View GitHub
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </article>
      </main>
    </AdvancedScroll3D>
  );
}
