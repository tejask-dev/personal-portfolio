import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useLocation } from 'wouter';

type SectionDefinition = {
  id: 'top' | 'work' | 'about' | 'contact';
  label: string;
  index: string;
  surface: 'dark' | 'light';
};

type MeasuredSection = SectionDefinition & { position: number };

const homeSections: SectionDefinition[] = [
  { id: 'top', label: 'Hero', index: '01', surface: 'dark' },
  { id: 'work', label: 'Work', index: '02', surface: 'light' },
  { id: 'about', label: 'About', index: '03', surface: 'light' },
  { id: 'contact', label: 'Contact', index: '04', surface: 'dark' },
];

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export default function ScrollNavigator() {
  const [location] = useLocation();
  const isHome = location === '/';
  const isCaseStudy = location.startsWith('/case-studies/');
  const enabled = isHome || isCaseStudy;
  const rootRef = useRef<HTMLElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const percentageRef = useRef<HTMLSpanElement | null>(null);
  const draggingRef = useRef(false);
  const activeIdRef = useRef<SectionDefinition['id']>('top');
  const [activeId, setActiveId] = useState<SectionDefinition['id']>('top');
  const [desktopControl, setDesktopControl] = useState(false);
  const [sections, setSections] = useState<MeasuredSection[]>(
    homeSections.map((section, index) => ({ ...section, position: index / (homeSections.length - 1) })),
  );

  useLayoutEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add('custom-scroll-ready');
    return () => document.documentElement.classList.remove('custom-scroll-ready');
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let frame = 0;
    let measurementTimer = 0;
    let disposed = false;

    const desktopQuery = window.matchMedia('(min-width: 901px) and (hover: hover) and (pointer: fine)');
    const updateControlMode = () => setDesktopControl(desktopQuery.matches);
    updateControlMode();
    desktopQuery.addEventListener('change', updateControlMode);

    const measure = () => {
      const maximumScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

      if (isHome) {
        const measured = homeSections.map((section) => {
          const target = document.getElementById(section.id);
          const offset = target ? target.getBoundingClientRect().top + window.scrollY : 0;
          return { ...section, position: clamp(offset / maximumScroll) };
        });
        setSections(measured);
      }

      update();
    };

    const update = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const rawMaximumScroll = document.documentElement.scrollHeight - window.innerHeight;
        const maximumScroll = Math.max(1, rawMaximumScroll);
        const progress = clamp(window.scrollY / maximumScroll);
        const percentage = Math.round(progress * 100);
        const root = rootRef.current;
        const progressElement = progressRef.current;

        root?.style.setProperty('--scroll-progress', String(progress));
        if (root) root.dataset.scrollable = rawMaximumScroll > 4 ? 'true' : 'false';
        progressElement?.setAttribute('aria-valuenow', String(percentage));
        progressElement?.setAttribute('aria-valuetext', `${percentage}% scrolled`);
        if (percentageRef.current) percentageRef.current.textContent = String(percentage).padStart(2, '0');

        const probeY = window.innerHeight * 0.5;
        const darkSurface = Array.from(
          document.querySelectorAll<HTMLElement>(
            '.hero-surface, .contact, .site-footer, .case-lesson, .case-next',
          ),
        ).some((element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.top <= probeY && bounds.bottom >= probeY;
        });
        root?.setAttribute('data-surface', darkSurface ? 'dark' : 'light');

        if (!isHome) return;

        const readingLine = window.scrollY + window.innerHeight * 0.36;
        let nextActive = homeSections[0];
        for (const section of homeSections) {
          const target = document.getElementById(section.id);
          if (target && target.getBoundingClientRect().top + window.scrollY <= readingLine) nextActive = section;
        }
        if (progress > 0.985) nextActive = homeSections[homeSections.length - 1];

        if (activeIdRef.current !== nextActive.id) {
          activeIdRef.current = nextActive.id;
          setActiveId(nextActive.id);
        }
      });
    };

    measure();
    measurementTimer = window.setTimeout(measure, 700);
    document.fonts?.ready.then(() => {
      if (!disposed) measure();
    });
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);

    const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(measure) : null;
    if (resizeObserver) resizeObserver.observe(document.body);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(measurementTimer);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', measure);
      window.removeEventListener('load', measure);
      desktopQuery.removeEventListener('change', updateControlMode);
      resizeObserver?.disconnect();
    };
  }, [enabled, isHome, location]);

  if (!enabled) return null;

  const activeSection = homeSections.find((section) => section.id === activeId) ?? homeSections[0];

  const scrollToPointer = (clientY: number) => {
    const track = progressRef.current;
    if (!track || !desktopControl) return;
    const bounds = track.getBoundingClientRect();
    const progress = clamp((clientY - bounds.top) / Math.max(1, bounds.height));
    const maximumScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({ top: maximumScroll * progress, behavior: 'instant' });
  };

  const handleTrackKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!desktopControl) return;
    const maximumScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const pageStep = window.innerHeight * 0.82;
    const lineStep = Math.max(48, window.innerHeight * 0.08);
    let nextPosition: number | undefined;

    if (event.key === 'ArrowDown') nextPosition = window.scrollY + lineStep;
    if (event.key === 'ArrowUp') nextPosition = window.scrollY - lineStep;
    if (event.key === 'PageDown') nextPosition = window.scrollY + pageStep;
    if (event.key === 'PageUp') nextPosition = window.scrollY - pageStep;
    if (event.key === 'Home') nextPosition = 0;
    if (event.key === 'End') nextPosition = maximumScroll;

    if (nextPosition === undefined) return;
    event.preventDefault();
    window.scrollTo({ top: Math.min(maximumScroll, Math.max(0, nextPosition)), behavior: 'instant' });
  };

  return (
    <aside
      className={`scroll-navigator ${isCaseStudy ? 'scroll-navigator--reading' : ''}`}
      data-surface={isHome ? activeSection.surface : 'light'}
      data-scrollable="false"
      aria-label={isHome ? 'Page sections and scroll progress' : 'Reading progress'}
      ref={rootRef}
    >
      <div
        className="scroll-navigator__track"
        role={desktopControl ? 'scrollbar' : 'progressbar'}
        aria-label={isHome ? 'Page scroll position' : 'Case study reading position'}
        aria-controls="main"
        aria-orientation={desktopControl ? 'vertical' : undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        tabIndex={desktopControl ? 0 : -1}
        ref={progressRef}
        onKeyDown={handleTrackKeyDown}
        onPointerDown={(event) => {
          if (!desktopControl) return;
          draggingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          scrollToPointer(event.clientY);
        }}
        onPointerMove={(event) => {
          if (draggingRef.current) scrollToPointer(event.clientY);
        }}
        onPointerUp={(event) => {
          draggingRef.current = false;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => { draggingRef.current = false; }}
      >
        <span className="scroll-navigator__fill" aria-hidden="true" />
        <span className="scroll-navigator__thumb" aria-hidden="true" />
      </div>

      <span className="scroll-navigator__readout" aria-hidden="true">
        {isHome ? activeSection.index : 'READ'} / <span ref={percentageRef}>00</span>%
      </span>

      {isHome && (
        <ol className="scroll-navigator__sections">
          {sections.map((section) => (
            <li
              key={section.id}
              style={{ '--section-position': section.position } as CSSProperties}
            >
              <a
                href={`#${section.id}`}
                className={activeId === section.id ? 'is-active' : ''}
                aria-current={activeId === section.id ? 'location' : undefined}
                aria-label={`Go to ${section.label}`}
              >
                <span className="scroll-navigator__section-label">{section.index} / {section.label}</span>
                <span className="scroll-navigator__marker" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
