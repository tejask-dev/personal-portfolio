import { caseStudies } from "./projects";

export type SelectedWork = {
  slug: string;
  title: string;
  label: string;
  role: string;
  period: string;
  status: string;
  description: string;
  proof: string;
  image: string;
  imageAlt: string;
  artifactLabel: string;
  sourceHref?: string;
  sourceLabel?: string;
  treatment: "product" | "research";
};

/** One complete index, with the same scope and stage as the case pages. */
export const selectedWork: SelectedWork[] = caseStudies.map((study) => {
  const sourceHref = (study.slug === "anticipy" ? study.artifactSource?.href : study.decision.source) ?? study.links.find((link) =>
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[a-f0-9]{7,40}\//i.test(link.href),
  )?.href;
  return {
    slug: study.slug,
    title: study.title,
    label: study.kicker,
    role: study.role,
    period: study.period,
    status: study.status,
    description: study.shortDescription,
    proof: study.proof,
    image: study.image,
    imageAlt: study.imageAlt,
    artifactLabel: study.artifactLabel,
    sourceHref,
    sourceLabel: sourceHref?.startsWith("https://github.com/")
      ? "Inspect the source"
      : study.artifactSource?.label ?? "Read source context",
    treatment: study.imageTreatment === "paper" ? "research" : "product",
  };
});
