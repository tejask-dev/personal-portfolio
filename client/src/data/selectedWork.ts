import stellarImage from "@/assets/Stellar/stellar-current.png";
import somaImage from "@/assets/SomaAI.png";
import researchImage from "@/assets/Youreka/Research Paper.png";

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
  treatment: "product" | "research";
};

/** Small homepage payload; detailed copy stays behind the case-study route. */
export const selectedWork: SelectedWork[] = [
  {
    slug: "anticipy",
    title: "Anticipy",
    label: "Signal Station / Current work",
    role: "Founding Software Engineer at Anticipation Labs",
    period: "Current",
    description:
      "An AI wearable being built to turn conversations into approved actions.",
    proof:
      "Fellowship application flows, deployment infrastructure, early operations",
    image: `${import.meta.env.BASE_URL}open-water/anticipy-sequence.svg`,
    imageAlt:
      "Illustrative concept diagram: conversation, proposed action, user approval, then connected software action. Not a product screenshot.",
    treatment: "product",
  },
  {
    slug: "stellar-learning",
    title: "Stellar Learning",
    label: "Learning Atoll / Education platform",
    role: "Former CTO",
    period: "2025 to 2026",
    description: "Free exam preparation built to stay free.",
    proof: "40,000+ learners reported by Stellar Learning",
    image: stellarImage,
    imageAlt:
      "Stellar Learning homepage showing free exam preparation and its reported 40,000+ learners.",
    treatment: "product",
  },
  {
    slug: "global-health-research",
    title: "Global health research",
    label: "The Observatory / Youreka Canada",
    role: "Co-author",
    period: "2025",
    description: "A 34-country study of pediatric HIV treatment access.",
    proof: "1st place at the national symposium, 2025 Youreka Journal",
    image: researchImage,
    imageAlt:
      "Original research manuscript title and author line. The final study is included in the 2025 Youreka Canada Journal.",
    treatment: "research",
  },
  {
    slug: "soma-ai",
    title: "Soma AI",
    label: "Archive / Closed health experiment",
    role: "Developer and backend contributor",
    period: "2025 to 2026",
    description:
      "A team-built teen health product that did not become durable.",
    proof: "300+ people tried it, team-reported / experiment closed",
    image: somaImage,
    imageAlt:
      "Historical Soma AI landing page for a team-built teen health experiment.",
    treatment: "product",
  },
];
