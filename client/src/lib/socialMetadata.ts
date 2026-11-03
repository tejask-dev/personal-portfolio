import { SITE_URL, DEFAULT_DESCRIPTION } from "./siteMetadata.ts";

/** One source for HTML, client navigation and the generated social artwork. */
export const socialCards = {
  home: { title: "I build AI products\npeople use.", label: "Tejass Kaushik / Software engineer", description: DEFAULT_DESCRIPTION, note: "COO, Anticipation Labs · Former CTO, Stellar Learning", proof: ["40,000+ learners at Stellar", "27,000+ cans in a school campaign", "1st nationally, research team"] },
  anticipy: { title: "Engineering\nAnticipy.", label: "01 / Anticipy", description: "My work on Anticipy, an AI pendant and companion apps: connected-app repairs, private AI workflows, privacy controls and prototype device testing.", note: "COO at Anticipation Labs", proof: ["Connected apps", "Private AI workflows", "Device testing"] },
  "stellar-learning": { title: "Practice for IB.\nBetter lessons for AP.", label: "02 / Stellar Learning", description: "As CTO of Stellar Learning, I adapted question generation and practice for the IB Diploma and improved AP lessons on a platform with 40,000+ learners.", note: "CTO · August 2025 to July 2026", proof: ["40,000+ learners", "80+ courses", "130+ volunteers"] },
  "global-health-research": { title: "Treatment access.\nCareful inference.", label: "03 / Global health research", description: "Writing, data analysis and R graphs for a 34-country pediatric HIV treatment study. Published as the 2025 Youreka Canada Journal's national first-place team study.", note: "Co-author · Youreka Canada Journal", proof: ["34 countries", "National first-place team", "Published in 2025"] },
  docubridge: { title: "From spreadsheets\nto answers.", label: "04 / DocuBridge", description: "A Python, Flask and React internship prototype for Excel and CSV analysis, with worksheet selection, charts, summaries and natural-language questions.", note: "Software engineering internship", proof: ["Excel + CSV", "Python + React", "Charts + questions"] },
  "soma-ai": { title: "Soma AI.\nHealth conversations.", label: "05 / Soma AI", description: "Backend and model integration for a conversational teen-health education app built with a team. Soma AI closed in 2026.", note: "Backend and model integration", proof: ["Teen-health education", "Flask + React", "Sunset in 2026"] },
} as const;
export function socialMetadata(route: string) {
  const slug = route.startsWith("/case-studies/") ? route.split("/")[2] : "home";
  const key = Object.hasOwn(socialCards, slug) ? slug as keyof typeof socialCards : "home";
  const card = socialCards[key];
  return { ...card, image: `${SITE_URL}/social/${key}.png`, type: key === "home" ? "website" : "article", alt: `${card.label}. ${card.title.replace(/\n/g, " ")} ${card.note}. ${card.proof.join(". ")}.` };
}
