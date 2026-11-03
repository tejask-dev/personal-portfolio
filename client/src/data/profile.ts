export const profile = {
  name: "Tejass Kaushik",
  shortName: "Tejass",
  email: "tejas.kaushik@outlook.com",
  location: "Ontario, Canada",
  education: "Western University Computer Science and Ivey AEO",
  headline: "I build AI products people use.",
  intro:
    "I’m COO at Anticipation Labs, where our main focus is Elda: a bracelet in development for older adults. I lead customer discovery and test our software. Before that, I was CTO of Stellar Learning, a free exam-prep platform with 40,000+ learners. I also build my own apps, from chemistry tools to software used in a 27,000-can food drive.",
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
    { value: "40,000+", label: "learners on Stellar Learning, where I was CTO" },
    { value: "27,000+", label: "cans collected in the campaign using my app" },
    { value: "1st", label: "national, 2025 Youreka research team" },
    { value: "2026", label: "Stan Launchpad founder camp" },
  ],
  about: [
    "I’m Tejass. I’m COO at Anticipation Labs. My main focus is Elda, where I lead customer discovery, test our software and help with recruiting. I’ve visited care homes and spoken with older adults and caregivers. Anticipy is our earlier product; I worked on its connected apps, private AI workflows and prototype testing. Before Anticipation Labs, I was CTO of Stellar Learning.",
    "I study Computer Science at Western University and hold Ivey AEO status. I like building things that make a complicated task feel straightforward, whether that’s exploring a molecule or organizing a school food drive.",
    "I build with AI tools on purpose. I write the spec and acceptance criteria, use Claude Code and Codex for implementation, review the changes, and test the result in a browser, on a phone or on prototype hardware.",
    "I love boats and yachts, so I wanted an ocean in my portfolio.",
  ],
  contact: "I’m open to software engineering roles, internships and founding-team conversations. Tell me what you’re building.",
  ocean: "An explorable ocean with a superyacht, a lighthouse, two reefs, two cave systems and Dakota, a dolphin who is convinced she’s a shark. I built it because I love boats. The world needs WebGL and a few megabytes; the portfolio works without it.",
} as const;

export type Proof = (typeof profile.proof)[number];

export const moleculeProject = {
  slug: "molecule-ai",
  title: "MoleculeAI",
  role: "Product and development",
  period: "Independent project",
  status: "Live",
  description: "An organic-chemistry app I built to turn molecule names and drawings into chemical properties, functional groups and interactive 3D structures.",
  proof: "React / TypeScript / FastAPI / RDKit / PubChem",
  image: "/portfolio/molecule-desktop.webp",
  imageAlt: "MoleculeAI showing molecule search, an interactive structure and chemical properties.",
  artifactLabel: "MoleculeAI, live app",
  sourceHref: "https://github.com/tejask-dev/OrganicChem-WebApp",
  sourceLabel: "View code",
  href: "https://organic-chem-web-app.vercel.app/",
  treatment: "product",
} as const;
