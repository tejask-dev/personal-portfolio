export const profile = {
  name: 'Tejass Kaushik',
  shortName: 'Tejass',
  email: 'tejas.kaushik@outlook.com',
  uwoEmail: 'tkaushi3@uwo.ca',
  location: 'Windsor, Ontario, Canada',
  education: 'Incoming Western University Computer Science and Ivey AEO, Class of 2030',
  headline: 'I build software, test ideas, and keep what works.',
  intro:
    'Software and product builder. Former CTO at Stellar Learning; now testing new ideas and working on what comes next.',
  socials: {
    linkedin: 'https://www.linkedin.com/in/tejasskaushik/',
    github: 'https://github.com/tejask-dev',
    instagram: 'https://www.instagram.com/tejass_kaushik007/',
  },
  /**
   * Proof strip: max four metrics, every value verified.
   * Public figures are kept conservative and checked against first-party
   * sources before being surfaced in the active homepage.
   */
  proof: [
    { value: '40,000+', label: 'learners reported by Stellar Learning' },
    { value: '3', label: 'client projects delivered through my web venture' },
    { value: '1st', label: 'nationally, Youreka Canada research symposium' },
  ],
  // Kept as structured source data for legacy components and future pages.
  tagline: 'Building and testing new software and product ideas.',
  metrics: [
    { value: '40,000+', label: 'Learners reported by Stellar Learning' },
    { value: '3', label: 'Client projects delivered' },
    { value: '1st', label: 'National Youreka research winner' },
  ],
  focusAreas: ['Applied AI products', 'Education technology', 'Financial systems', 'Global health research'],
  techStack: ['Python', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Firebase', 'SQL', 'OpenAI API'],
  leadership: [
    { title: 'Founder, Coding Club', description: 'Founded and led programming workshops for students.', icon: 'Code' },
    { title: 'President, Science Olympiad', description: 'Founded the team and led it to regional competition wins.', icon: 'FlaskConical' },
    { title: 'Vice President, Target Alpha', description: 'Led finance education and investment analysis initiatives.', icon: 'TrendingUp' },
    { title: 'Founder, Top Score Tutoring', description: 'Built a tutoring initiative supporting more than 40 students.', icon: 'GraduationCap' },
  ],
  badges: ['Western CS + Ivey AEO', 'Software Builder', 'Founder', 'Researcher'],
} as const;

export type Proof = (typeof profile.proof)[number];
