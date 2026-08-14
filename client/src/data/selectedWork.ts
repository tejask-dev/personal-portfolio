import stellarImage from '@/assets/Stellar/stellar-current.png';
import clientWorkImage from '@/assets/MortgageWebsite.png';
import researchImage from '@/assets/Youreka/Research Paper.png';

export type SelectedWork = {
  slug: string;
  title: string;
  label: string;
  role: string;
  period: string;
  description: string;
  proof: string;
  image?: string;
  imageAlt?: string;
  treatment: 'product' | 'research';
};

/**
 * Deliberately small homepage payload. Detailed project copy and secondary
 * imagery stay behind the lazy-loaded case-study route.
 */
export const selectedWork: SelectedWork[] = [
  {
    slug: 'stellar-learning',
    title: 'Stellar Learning',
    label: 'Education platform',
    role: 'Former CTO',
    period: '2025—2026',
    description: 'Free exam preparation built to stay free.',
    proof: '40,000+ learners reported by Stellar',
    image: stellarImage,
    imageAlt: 'Stellar Learning homepage showing free exam preparation and 40,000+ learners.',
    treatment: 'product',
  },
  {
    slug: 'web-solutions-venture',
    title: 'Client web venture',
    label: 'Independent client work',
    role: 'Founder + developer',
    period: '2025',
    description: 'Three small-business websites, from scope to handoff.',
    proof: 'Three client projects delivered',
    image: clientWorkImage,
    imageAlt: 'A mortgage business website delivered through the client web venture.',
    treatment: 'product',
  },
  {
    slug: 'global-health-research',
    title: 'Global health research',
    label: 'Youreka Canada',
    role: 'Co-author',
    period: '2025',
    description: 'A 34-country study of pediatric HIV treatment access.',
    proof: '1st place at the national symposium',
    image: researchImage,
    imageAlt: 'The published paper title, authors, and abstract heading in the Youreka Canada Journal.',
    treatment: 'research',
  },
];
