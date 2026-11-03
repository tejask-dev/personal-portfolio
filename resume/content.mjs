// Shared public content for the Jake-format PDF and accessible HTML resume.
export const resume = {
  name: "Tejass Kaushik",
  location: "Ontario, Canada",
  description: "Tejass Kaushik, COO at Anticipation Labs working on Elda, former CTO of Stellar Learning, and a Western University Computer Science student with Ivey AEO.",
  contacts: [
    { label: "tejas.kaushik@outlook.com", href: "mailto:tejas.kaushik@outlook.com" },
    { label: "tejasskaushik.com", href: "https://tejasskaushik.com/" },
    { label: "github.com/tejask-dev", href: "https://github.com/tejask-dev" },
    { label: "linkedin.com/in/tejasskaushik", href: "https://www.linkedin.com/in/tejasskaushik/" },
  ],
  education: {
    title: "Western University",
    dates: "Student",
    detail: "Computer Science; Ivey Advanced Entry Opportunity (AEO)",
  },
  experience: [
    {
      title: "Anticipation Labs",
      href: "https://www.anticipationlabs.com/",
      dates: "Aug. 2026 to present",
      detail: "COO (current); previously Founding Software Engineer",
      bullets: [
        "Lead customer discovery, test software and help with recruiting for Elda, a screenless bracelet in development for older adults.",
        "Visited care homes and spoke with older adults and caregivers to guide product decisions.",
        "For Anticipy, directed AI-assisted connected-app repairs and private AI workflows; tested phone and wearable prototypes.",
        "Scoped and tested a consent-page redirect repair for Anticipy, restoring the browser journey to provider sign-in.",
      ],
    },
    {
      title: "Stellar Learning",
      href: "https://stellarlearning.app/",
      dates: "Aug. 2025 to Jul. 2026",
      detail: "Chief Technology Officer",
      bullets: [
        "Led technology work at a free exam-prep platform with 40,000+ learners, 80+ courses and 130+ volunteers.",
        "Changed IB question generation after AP prompts produced off-syllabus questions; shipped IB practice features with the team.",
        "Improved the AP question and lesson generation pipelines.",
      ],
    },
    {
      title: "DocuBridge",
      href: "https://github.com/tejask-dev/Docubridge-Intership",
      dates: "Jul. 2025 to Aug. 2025",
      detail: "Software Engineering Intern",
      bullets: [
        "Built a Python/Flask and React prototype for Excel and CSV exploration, with charts, summaries and natural-language questions.",
        "Connected worksheet selection to Pandas analysis and Plotly charts.",
      ],
    },
  ],
  research: {
    title: "Youreka Canada",
    href: "https://yourekacanada.org/youreka-journal-2025",
    dates: "2025",
    detail: "Co-author and student researcher",
    bullets: [
      "Co-authored a 34-country study of adolescent fertility and pediatric HIV treatment coverage, leading writing and analysis and creating graphs in R.",
      "Published as the national first-place team study in the 2025 Youreka Canada Journal.",
    ],
  },
  projects: [
    {
      title: "MoleculeAI",
      href: "https://github.com/tejask-dev/OrganicChem-WebApp",
      stack: "React, FastAPI, RDKit",
      body: "Chemistry search, a molecule editor, chemical properties and interactive 3D structures.",
    },
    {
      title: "PromMatch",
      href: "https://github.com/tejask-dev/PromMatch",
      stack: "React, FastAPI, PostgreSQL, pgvector",
      body: "Student matchmaking with weighted questionnaires, semantic profile similarity and mutual matches.",
    },
    {
      title: "ACS can-drive app",
      href: "https://github.com/tejask-dev/ACS_CanDrive-WebApp",
      stack: "",
      body: "Built tracking and leaderboards in five days for a school campaign that collected 27,000+ cans.",
    },
    {
      title: "RelayPass",
      href: "https://github.com/tejask-dev/Egoist-Ideathon---RelayPass",
      stack: "Authorization prototype",
      body: "Signed agent permissions that narrow on delegation, with inherited revocation enforced in code.",
    },
    {
      title: "Open Water",
      href: "https://github.com/tejask-dev/personal-portfolio",
      stack: "React, TypeScript, Three.js",
      body: "Designed yacht exploration and underwater regions alongside an accessible portfolio reading path.",
    },
  ],
  skills: [
    { label: "Languages", value: "Python, TypeScript, R" },
    { label: "Frameworks and libraries", value: "React, FastAPI, Flask, Pandas, Plotly, Three.js, RDKit" },
    { label: "Data and tools", value: "PostgreSQL, pgvector, Git, Vercel, browser and device testing" },
  ],
};
