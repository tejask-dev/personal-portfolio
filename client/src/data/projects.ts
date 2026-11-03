import { elda, anticipyArtifact } from "../components/portfolio-v4/content";
import somaImage from "../assets/SomaAI.webp";
import stellarImage from "../assets/Stellar/stellar-current.webp";
import docubridgeImage from "../assets/Docubridge.webp";

import { caseStudyContent, type CaseStudyContent } from "./caseStudyContent";

export type { CaseStudySection } from "./caseStudyContent";
export type CaseStudy = CaseStudyContent & { image: string };

const images: Record<CaseStudyContent["imageAsset"], string> = {
  elda: `${import.meta.env.BASE_URL}${elda.image}`,
  anticipy: `${import.meta.env.BASE_URL}${anticipyArtifact.desktop}`,
  stellar: stellarImage,
  soma: somaImage,
  research: `${import.meta.env.BASE_URL}portfolio/research-evidence.svg`,
  docubridge: docubridgeImage,
};

export const caseStudies: CaseStudy[] = caseStudyContent.map((study) => ({
  ...study,
  image: images[study.imageAsset],
}));
export const flagshipStudies = caseStudies.filter((study) => study.flagship);
export const secondaryStudies = caseStudies.filter((study) => !study.flagship);

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return caseStudies.find((study) => study.slug === slug);
}
