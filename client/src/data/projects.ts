import somaImage from "../assets/SomaAI.png";
import stellarImage from "../assets/Stellar/stellar-current.png";
import docubridgeImage from "../assets/Docubridge.png";
import researchImage from "../assets/Youreka/Research Paper.png";
import mortgageImage from "../assets/MortgageWebsite.png";
import { caseStudyContent, type CaseStudyContent } from "./caseStudyContent";

export type { CaseStudySection } from "./caseStudyContent";
export type CaseStudy = CaseStudyContent & { image: string };

const images: Record<CaseStudyContent["imageAsset"], string> = {
  anticipy: `${import.meta.env.BASE_URL}open-water/anticipy-sequence.svg`,
  stellar: stellarImage,
  soma: somaImage,
  research: researchImage,
  docubridge: docubridgeImage,
  mortgage: mortgageImage,
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
