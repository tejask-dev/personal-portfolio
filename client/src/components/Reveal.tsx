import { createElement, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  delay?: number;
  distance?: number;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li' | 'span';
};

/** A small, dependency-free reveal that becomes plain content without JavaScript. */
export default function Reveal({ children, delay = 0, distance = 24, className = '', as = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window)) return;

    element.classList.add('will-reveal');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add('is-visible');
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return createElement(
    as,
    {
      ref,
      className: `scroll-reveal ${className}`.trim(),
      style: { '--reveal-delay': `${delay}s`, '--reveal-distance': `${distance}px` } as CSSProperties,
    },
    children,
  );
}
