'use client';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

interface ScrollTextRevealProps {
  text: string;
  as?: 'h1' | 'h2' | 'p';
  className?: string;
}

export default function ScrollTextReveal({ text, as = 'h2', className = '' }: ScrollTextRevealProps) {
  const ref = useRef<HTMLHeadingElement & HTMLParagraphElement>(null);
  const words = text.split(' ');
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 84%', 'end 36%'],
  });

  const Tag = as;

  return (
    <Tag ref={ref} className={className}>
      {words.map((word, index) => {
        return (
          <RevealWord key={`${word}-${index}`} word={word} index={index} total={words.length} progress={scrollYProgress} />
        );
      })}
    </Tag>
  );
}

function RevealWord({
  word,
  index,
  total,
  progress,
}: {
  word: string;
  index: number;
  total: number;
  progress: ReturnType<typeof useScroll>['scrollYProgress'];
}) {
  const start = index / total;
  const end = (index + 1) / total;
  const color = useTransform(progress, [start, end], ['rgba(244,239,229,0.42)', '#f8fbff']);
  const opacity = useTransform(progress, [start, end], [0.45, 1]);

  return (
    <motion.span style={{ color, opacity }} className="inline-block pr-[0.24em]">
      {word}
    </motion.span>
  );
}
