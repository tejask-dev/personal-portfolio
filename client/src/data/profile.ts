export const profile = {
  name: "Tejass Kaushik",
  shortName: "Tejass",
  email: "tejas.kaushik@outlook.com",
  location: "Windsor, Ontario, Canada",
  education: "Western University Computer Science and Ivey AEO",
  headline: "I build AI products across apps and devices.",
  intro:
    "Founding Software Engineer at Anticipation Labs, working across connected apps, AI workflows, and mobile/wearable validation. Former CTO at Stellar Learning. Western University Computer Science and Ivey AEO.",
  socials: {
    linkedin: "https://www.linkedin.com/in/tejasskaushik/",
    github: "https://github.com/tejask-dev",
    instagram: "https://www.instagram.com/tejass_kaushik007/",
  },
  /**
   * Source distinctions must survive every display. Organization figures are
   * reported by Stellar; research recognition
   * belongs to the team. These are not interchangeable personal metrics.
   */
  proof: [
    { value: "40,000+", label: "learners reported by Stellar Learning" },
    {
      value: "1st",
      label: "national recognition for the Youreka research team",
    },
  ],
  // Kept as structured source data for legacy components and future pages.
  tagline: "Building Anticipy at Anticipation Labs.",
  metrics: [
    { value: "40,000+", label: "Learners reported by Stellar Learning" },
    {
      value: "1st",
      label: "National recognition for the Youreka research team",
    },
  ],
  focusAreas: [
    "Applied AI products",
    "Education technology",
    "Financial systems",
    "Global health research",
  ],
  techStack: [
    "Python",
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "Firebase",
    "SQL",
    "OpenAI API",
  ],
  leadership: [
    {
      title: "Founder, Coding Club",
      description: "Founded and led programming workshops for students.",
      icon: "Code",
    },
    {
      title: "President, Science Olympiad",
      description: "Founded the team and led it to regional competition wins.",
      icon: "FlaskConical",
    },
    {
      title: "Vice President, Target Alpha",
      description: "Led finance education and investment analysis initiatives.",
      icon: "TrendingUp",
    },
    {
      title: "Founder, Top Score Tutoring",
      description:
        "Built a tutoring initiative supporting more than 40 students.",
      icon: "GraduationCap",
    },
  ],
  badges: [
    "Western CS + Ivey AEO",
    "Software Engineer",
    "Builder",
    "Researcher",
  ],
} as const;

export type Proof = (typeof profile.proof)[number];
