import { SITE_URL, DEFAULT_DESCRIPTION } from "./siteMetadata.ts";

/** One source for HTML, client navigation and the generated social artwork. */
export const socialCards = {
  home: { title: "AI products.\nApps to devices.", label: "Tejass Kaushik / Open Water", description: DEFAULT_DESCRIPTION, note: "Anticipy · Former CTO, Stellar Learning" },
  anticipy: { title: "Engineering\nAnticipy.", label: "01 / Connected apps · AI · Devices", description: "My work on Anticipy: repairing browser authorization, setting privacy boundaries, and testing AI workflows and prototype devices.", note: "Deployed fixes · Local prototypes · Device testing" },
  "stellar-learning": { title: "Practice for IB.\nBetter lessons for AP.", label: "02 / Stellar Learning", description: "My IB question-generation and practice work, curriculum decisions and AP improvements at Stellar Learning, with substantial teammate and AI implementation.", note: "Former CTO / Team-built platform" },
  "global-health-research": { title: "Treatment access.\nCareful inference.", label: "03 / Youreka Canada", description: "Co-author of a 34-country pediatric HIV treatment-access study, published in the 2025 Youreka Canada Journal with team recognition.", note: "Published study / National first-place team" },
  docubridge: { title: "From spreadsheet\nto inspectable work.", label: "04 / DocuBridge", description: "A spreadsheet-analysis internship prototype: upload a file, select a worksheet, inspect analysis and ask questions. Source-backed walkthrough.", note: "Internship prototype / Python + React" },
  "soma-ai": { title: "A closed\nhealth-education experiment.", label: "05 / Soma AI", description: "A closed, team-built health-education experiment. My backend and model-integration work, what remains in the source, and the decision to stop.", note: "Closed in 2026 / Engineering retrospective" },
} as const;
export function socialMetadata(route: string) {
  const slug = route.startsWith("/case-studies/") ? route.split("/")[2] : "home";
  const key = Object.hasOwn(socialCards, slug) ? slug as keyof typeof socialCards : "home";
  return { ...socialCards[key], image: `${SITE_URL}/social/${key}.png`, type: key === "home" ? "website" : "article", alt: `${socialCards[key].label}. ${socialCards[key].title.replace(/\n/g, " ")}` };
}
