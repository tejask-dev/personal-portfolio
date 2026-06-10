'use client';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import SceneErrorBoundary from './SceneErrorBoundary';

const HeroRobot3D = lazy(() => import('./HeroRobot3D'));

/**
 * Full-viewport robot layer, sandwiched between the galaxy background and the
 * page content so the character lives directly in the scene (no card, no
 * frame). Scroll choreography mirrors the reference site: anchored right
 * through the hero, drifting left as the about section passes, then rising
 * out before the skills keyboard takes over.
 */
export default function RobotStage() {
  const progressRef = useRef(0);
  const [bounds, setBounds] = useState({ about: 1600, exitStart: 2400, exitEnd: 3000 });
  const { scrollY } = useScroll();

  useEffect(() => {
    const measure = () => {
      const about = document.getElementById('about');
      const skills = document.getElementById('skills');
      if (!about || !skills) return;
      const vh = window.innerHeight;
      const aboutTop = about.offsetTop;
      const skillsTop = skills.offsetTop;
      setBounds({
        about: Math.max(1, aboutTop),
        exitStart: Math.max(1, skillsTop - vh),
        exitEnd: Math.max(2, skillsTop - vh * 0.4),
      });
    };
    measure();
    // Section heights settle as images/3D content load in.
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    const update = (value: number) => {
      progressRef.current = Math.min(1, Math.max(0, value / bounds.about));
    };
    update(scrollY.get());
    return scrollY.on('change', update);
  }, [scrollY, bounds.about]);

  const x = useTransform(scrollY, [0, bounds.about], ['21%', '-26%']);
  const y = useTransform(scrollY, [bounds.exitStart, bounds.exitEnd], ['0%', '-36%']);
  const opacity = useTransform(scrollY, [bounds.exitStart, bounds.exitEnd], [1, 0]);

  return (
    <motion.div
      aria-hidden="true"
      style={{ x, y, opacity }}
      className="fixed inset-0 z-[5]"
    >
      <SceneErrorBoundary>
        <Suspense fallback={null}>
          <HeroRobot3D progressRef={progressRef} cameraY={11.7} zoom={0.72} />
        </Suspense>
      </SceneErrorBoundary>
    </motion.div>
  );
}
