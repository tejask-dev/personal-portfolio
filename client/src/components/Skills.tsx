import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { animate, motion, useInView } from 'framer-motion';
import type { Application, SPEObject } from '@splinetool/runtime';
import { BrainCircuit, Briefcase, Code2, Layers3, Sparkles } from 'lucide-react';
import ScrollTextReveal from './ScrollTextReveal';
import SceneErrorBoundary from './SceneErrorBoundary';

const Spline = lazy(() => import('@splinetool/react-spline'));

type SkillCopy = {
  label: string;
  shortDescription: string;
};

const splineCopy: Record<string, SkillCopy> = {
  js: { label: 'JavaScript', shortDescription: 'Interactive web experiences and product logic.' },
  ts: { label: 'TypeScript', shortDescription: 'Scalable frontend and backend web development.' },
  html: { label: 'HTML', shortDescription: 'Semantic, accessible page structure for polished digital experiences.' },
  css: { label: 'CSS', shortDescription: 'Responsive layouts, motion, and visual systems with restraint.' },
  react: { label: 'React', shortDescription: 'Modern component-based interfaces that feel fast and intuitive.' },
  nextjs: { label: 'Next.js', shortDescription: 'Production-ready full-stack web apps with strong deployment ergonomics.' },
  tailwind: { label: 'Tailwind CSS', shortDescription: 'Clean, responsive, premium UI systems.' },
  nodejs: { label: 'Node.js', shortDescription: 'APIs, automations, and server logic for product-scale workflows.' },
  express: { label: 'Express', shortDescription: 'Lean backend services for experiments and real user-facing apps.' },
  postgres: { label: 'PostgreSQL', shortDescription: 'Structured data models, queries, and dependable persistence.' },
  mongodb: { label: 'MongoDB', shortDescription: 'Flexible document storage for fast-moving product iterations.' },
  firebase: { label: 'Firebase', shortDescription: 'Authentication, database, and app backend infrastructure.' },
  git: { label: 'Git', shortDescription: 'Version control and disciplined collaborative development.' },
  github: { label: 'GitHub', shortDescription: 'Collaboration, reviews, automation, and public code presence.' },
  docker: { label: 'Docker', shortDescription: 'Portable development environments and deployment-ready services.' },
  aws: { label: 'AWS', shortDescription: 'Cloud primitives for scalable infrastructure and experimentation.' },
  linux: { label: 'Linux', shortDescription: 'Command-line fluency for servers, tooling, and developer workflows.' },
  vercel: { label: 'Vercel', shortDescription: 'Fast deployment pipelines for polished web experiences.' },
  npm: { label: 'NPM', shortDescription: 'Package management and ecosystem fluency across JavaScript projects.' },
  prettier: { label: 'Prettier', shortDescription: 'Clean formatting that keeps teams focused on product decisions.' },
  wordpress: { label: 'WordPress', shortDescription: 'Content-driven sites for practical business and community needs.' },
  nginx: { label: 'Nginx', shortDescription: 'Routing, reverse proxies, and performance-minded server delivery.' },
  vue: { label: 'Vue', shortDescription: 'Adaptable front-end development across modern component frameworks.' },
  vim: { label: 'Vim', shortDescription: 'Fast terminal editing and practical developer environment fluency.' },
};

const skillGroups = [
  {
    icon: Code2,
    title: 'Programming',
    skills: ['Python', 'Java', 'TypeScript', 'JavaScript', 'C / C++', 'R'],
  },
  {
    icon: Layers3,
    title: 'Web & Product',
    skills: ['React', 'Next.js', 'Tailwind CSS', 'Framer Motion', 'Firebase', 'Supabase', 'Git / GitHub'],
  },
  {
    icon: BrainCircuit,
    title: 'AI & Data',
    skills: ['OpenAI API', 'LangChain', 'Hugging Face', 'Pandas', 'Flask', 'Prompt Engineering'],
  },
  {
    icon: Briefcase,
    title: 'Business & Leadership',
    skills: ['Product Strategy', 'Entrepreneurship', 'Finance', 'Public Speaking', 'Team Leadership', 'Research'],
  },
];

function SkillsFallback() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {skillGroups.map(({ icon: Icon, title, skills }) => (
        <motion.article
          key={title}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.45 }}
          className="rounded-[1.35rem] border border-[#f8fbff]/10 bg-[#140a2a]/70 p-5 backdrop-blur transition hover:-translate-y-1 hover:border-[#c084fc]/45"
        >
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#c084fc]/20 bg-[#a855f7]/12 text-[#d8b4fe]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="text-base font-bold text-[#f8fbff]">{title}</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span key={skill} className="rounded-full border border-[#f8fbff]/10 bg-[#f8fbff]/[0.06] px-3 py-1.5 text-xs font-semibold text-[#ede9fe]">
                {skill}
              </span>
            ))}
          </div>
        </motion.article>
      ))}
    </div>
  );
}

export default function Skills() {
  const [loaded, setLoaded] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const keyboardRef = useRef<SPEObject | null>(null);
  const targetScale = useRef(0.4);
  const revealed = useRef(false);
  const inView = useInView(stageRef, { once: true, margin: '-20% 0px' });

  // Abhiz-style reveal: the keyboard springs up from nothing and the keycaps
  // pop in one by one the first time the section scrolls into view.
  useEffect(() => {
    if (!loaded || !inView || revealed.current) return;
    revealed.current = true;
    const app = appRef.current;
    const keyboard = keyboardRef.current;
    if (!app || !keyboard) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finalScale = targetScale.current;
    if (reducedMotion) {
      keyboard.scale.x = finalScale;
      keyboard.scale.y = finalScale;
      keyboard.scale.z = finalScale;
      app.getAllObjects().forEach((object) => {
        if (object.name === 'keycap') object.visible = true;
      });
      return;
    }

    animate(0.001, finalScale, {
      type: 'spring',
      stiffness: 64,
      damping: 9,
      onUpdate: (value) => {
        keyboard.scale.x = value;
        keyboard.scale.y = value;
        keyboard.scale.z = value;
      },
    });
    app
      .getAllObjects()
      .filter((object) => object.name === 'keycap')
      .forEach((keycap, index) => {
        window.setTimeout(() => {
          keycap.visible = true;
        }, 350 + index * 65);
      });
  }, [loaded, inView]);

  useEffect(() => {
    if (!loaded) return undefined;

    const timeout = window.setTimeout(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('#skills-spline canvas');
      canvas?.setAttribute('aria-label', 'Interactive 3D keyboard showing Tejass Kaushik skill categories');
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [loaded]);

  return (
    <section id="skills" className="section-shell">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Skills & Stack</p>
            <ScrollTextReveal
              text="A hands-on engineering toolkit for building products people actually use."
              className="section-title max-w-4xl"
            />
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#c084fc]/25 bg-[#a855f7]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#e9d5ff]">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Hover or tap the keys
          </div>
        </div>

        {/* The keyboard floats directly over the galaxy background — no card,
            no border. A feathered glow pool grounds it in the scene. */}
        <motion.div
          ref={stageRef}
          initial={{ opacity: 0, y: 70 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-4"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(124,58,237,0.16),rgba(56,189,248,0.05)_55%,transparent_75%)] blur-3xl"
          />
          <div
            id="skills-spline"
            className="relative h-[480px] w-full md:h-[640px]"
            role="img"
            aria-label="Interactive 3D keyboard where each key represents a technical skill"
          >
            <SceneErrorBoundary
              fallback={
                <div className="flex h-full items-center justify-center px-6 text-center text-sm font-semibold uppercase tracking-[0.2em] text-[#d8b4fe]/80">
                  3D view unavailable on this device — skills listed below
                </div>
              }
            >
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-sm font-semibold uppercase tracking-[0.2em] text-[#d8b4fe]/80">
                  Loading skills interface
                </div>
              }
            >
              <Spline
                scene="/assets/skills-keyboard.spline"
                onLoad={(app) => {
                  appRef.current = app;
                  const width = window.innerWidth;
                  const isMobile = width < 768;
                  const keyboard = app.findObjectByName('keyboard');
                  if (keyboard) {
                    // The scene camera has a fixed world-per-pixel ratio, so
                    // the keyboard must shrink with the viewport to stay in frame.
                    targetScale.current = isMobile ? 0.13 : width < 1100 ? 0.26 : 0.4;
                    keyboardRef.current = keyboard;
                    // Start collapsed; the in-view effect springs it up.
                    keyboard.scale.x = 0.001;
                    keyboard.scale.y = 0.001;
                    keyboard.scale.z = 0.001;
                    keyboard.position.x = 0;
                    keyboard.position.y = isMobile ? 0 : -40;
                    keyboard.position.z = 0;
                    keyboard.rotation.x = 0;
                    keyboard.rotation.y = isMobile ? Math.PI / 6 : Math.PI / 12;
                    keyboard.rotation.z = 0;
                  }

                  app.getAllObjects().forEach((object) => {
                    if (object.name === 'keycap') {
                      object.visible = false;
                    }
                    if (object.name === 'keycap-desktop' || object.name === 'text-desktop') {
                      object.visible = !isMobile;
                    }
                    if (object.name === 'keycap-mobile' || object.name === 'text-mobile') {
                      object.visible = isMobile;
                    }
                    if (object.name === 'text-desktop-dark' || object.name === 'text-mobile-dark') {
                      object.visible = false;
                    }
                  });

                  const showSkill = (event: { target: { name: string } }) => {
                    const skill = splineCopy[event.target.name];
                    if (!skill) return;
                    app.setVariable('heading', skill.label);
                    app.setVariable('desc', skill.shortDescription);
                  };
                  app.addEventListener('mouseHover', showSkill);
                  app.addEventListener('keyDown', showSkill);
                  // Taps on touch devices arrive as mouseDown, not keyDown.
                  app.addEventListener('mouseDown', showSkill);
                  app.addEventListener('keyUp', () => {
                    app.setVariable('heading', '');
                    app.setVariable('desc', '');
                  });

                  setLoaded(true);
                }}
                style={{ width: '100%', height: '100%' }}
              />
            </Suspense>
            </SceneErrorBoundary>
          </div>
        </motion.div>

        <div className="mt-8">
          <SkillsFallback />
        </div>
      </div>
    </section>
  );
}
