import { anticipyArtifact, anticipyNarrative, anticipyWebsite } from "../components/portfolio-v4/content.ts";

export type CaseStudySection = { heading: string; body: string[] };
export type CaseStudyContent = {
  slug: string;
  title: string;
  kicker: string;
  role: string;
  period: string;
  status: string;
  thesis: string;
  summary: string;
  shortDescription: string;
  proof: string;
  contributions: string[];
  teamContext: string;
  evidenceNote: string;
  decision: { label: string; title: string; body: string[]; source?: string };
  metrics: { value: string; label: string }[];
  stack: string[];
  imageAsset:
    | "anticipy"
    | "stellar"
    | "soma"
    | "research"
    | "docubridge";
  artifactLabel: string;
  imageAlt: string;
  imageCaption: string;
  imageTreatment?: "cover" | "paper" | "illustration";
  artifactSource?: { label: string; href: string };
  sections: CaseStudySection[];
  lesson?: string;
  links: { label: string; href: string; note?: string }[];
  flagship: boolean;
};

/** Shared copy for the interactive and static case-study pages. */
export const caseStudyContent: CaseStudyContent[] = [
  {
    slug: "anticipy", title: "Anticipy", kicker: "01 / Current work",
    role: "COO at Anticipation Labs", period: "Current", status: "Prototype",
    thesis: anticipyNarrative.title, summary: anticipyNarrative.summary,
    shortDescription: "Making an AI pendant keep its promises across connected apps and prototype hardware.",
    proof: "Connected-app repair deployed · private AI prototype · hands-on device testing",
    contributions: [anticipyNarrative.personal], teamContext: anticipyNarrative.team,
    evidenceNote: anticipyNarrative.evidence,
    decision: { label: "The hard part", title: "Following through, with permission.", body: ["Connected services, private data and physical devices each need to work together. I focus on the points where a promising demo becomes a reliable experience."], source: anticipyWebsite },
    metrics: [], stack: ["Product engineering", "AI workflows", "Wearable testing", "TypeScript / Python"],
    imageAsset: "anticipy", artifactLabel: "Anticipy / Product website", imageTreatment: "cover",
    imageAlt: anticipyArtifact.alt, imageCaption: anticipyArtifact.caption,
    artifactSource: { label: "Visit Anticipy", href: anticipyWebsite },
    sections: [{ heading: "Context", body: [anticipyNarrative.context] }, { heading: "Result", body: [anticipyNarrative.statusSummary] }],
    lesson: anticipyNarrative.personalLesson,
    links: [...anticipyNarrative.sources], flagship: true,
  },
  {
    slug: "stellar-learning", title: "Stellar Learning", kicker: "02 / Education",
    role: "CTO", period: "Aug 2025–Jul 2026", status: "Shipped",
    thesis: "Better practice starts with the right questions.",
    summary: "As CTO at Stellar Learning, I worked on IB question generation and practice, and improved the AP question and lesson systems. I was studying IB myself, so I could see when a generated question missed what students actually needed. That perspective shaped the changes I pushed for with the team.",
    shortDescription: "IB question generation and practice for a free learning platform serving 40,000+ learners.",
    proof: "IB practice features shipped · AP question and lesson improvements",
    contributions: [
      "Worked on the IB question-generation and practice systems.",
      "Pushed for a different approach when our AP system did not fit the IB curriculum.",
      "Improved the AP question and lesson systems with the volunteer team."
    ],
    teamContext: "Teammates and AI tools contributed much of the algorithm development and API prompting.",
    evidenceNote: "The figures below describe Stellar’s whole platform.",
    decision: { label: "The hard part", title: "IB was not AP with a different label.", body: [
      "We tried carrying the AP prompting and algorithms over to IB. The questions did not fit the curriculum well enough. I pushed for a change and worked with teammates to improve the approach while learning the technical details myself.",
      "The revised questions looked better in review. We did not have a before-and-after accuracy benchmark."
    ] },
    metrics: [{ value: "40,000+", label: "platform learners" }, { value: "80+", label: "platform courses" }, { value: "130+", label: "platform volunteers" }],
    stack: ["Technology leadership", "Question generation", "Curriculum design"], imageAsset: "stellar",
    artifactLabel: "Stellar Learning / Public website", imageAlt: "Stellar Learning’s free exam-preparation platform.", imageCaption: "Stellar Learning’s public website.",
    artifactSource: { label: "Visit Stellar Learning", href: "https://stellarlearning.app/" },
    sections: [
      { heading: "A shared place to prepare.", body: ["Stellar brings lessons, practice, mock exams, flashcards and an AI tutor into one free study platform. A volunteer team supports students preparing for several exam systems."] },
      { heading: "IB practice reached students.", body: ["Some of the IB work shipped during my time as CTO, alongside improvements to AP questions and lessons. The full IB programme was still unfinished when I stepped down in July 2026."] }
    ],
    lesson: "I’d bring in someone with deeper experience in the technical stack earlier, and establish a shared set of curriculum-specific questions to measure progress.",
    links: [{ label: "Stellar Learning", href: "https://stellarlearning.app/", note: "Product and platform figures." }], flagship: true,
  },
  {
    slug: "global-health-research", title: "Global health research", kicker: "03 / Youreka Canada",
    role: "Co-author and student researcher", period: "2024–2025", status: "Published",
    thesis: "A 34-country study of access to pediatric HIV treatment.",
    summary: "I handled much of the writing, data analysis and coordination for our study of adolescent fertility and pediatric HIV treatment coverage in Sub-Saharan Africa. I also learned R to code and refine the graphs. Our four-person team’s paper was published in the 2025 Youreka Canada Journal and received national first-place recognition.",
    shortDescription: "Writing, analysis and R graphs for a national first-place team study across 34 countries.",
    proof: "Published research · 34 countries · national first-place team",
    contributions: ["Wrote and revised substantial sections of the paper.", "Analyzed country-level data and coded the graphs in R.", "Coordinated the work and helped revise our hypotheses when initial tests did not support them."],
    teamContext: "My co-authors were Liyona Wang, Shikai Jin and Elijah Murtagh.", evidenceNote: "",
    decision: { label: "The hard part", title: "Let the data change the question.", body: [
      "Our initial hypotheses did not hold up. We revised them as a team instead of forcing the results to fit. I was learning R at the same time, working through broken code to turn our analysis into graphs.",
      "We found a weak negative association, r = −0.3464. Country-level estimates, missing data and observations from different years limit the interpretation: this is an association, not proof of causation."
    ] },
    metrics: [{ value: "34", label: "countries studied" }, { value: "1st", label: "national team recognition" }, { value: "2025", label: "journal publication" }],
    stack: ["R", "Public health data", "Research communication"], imageAsset: "research", imageTreatment: "paper",
    artifactLabel: "Research / Study overview", imageAlt: "Overview of the published four-author, 34-country study and its national first-place recognition.", imageCaption: "Study overview. The full paper is linked below.",
    artifactSource: { label: "Read the journal", href: "https://drive.google.com/file/d/1lTrTsLfvYSEkUlYoGWTSYcoekdeiJqu4/view" },
    sections: [
      { heading: "A question about treatment access.", body: ["We asked whether adolescent fertility rates were associated with pediatric antiretroviral treatment coverage across Sub-Saharan Africa, pairing country-level indicators for 34 countries."] },
      { heading: "Published, and recognized as a team.", body: ["Our study appears in the 2025 Youreka Canada Journal as the national first-place team paper. I came away with a published paper, working R graphs and a much clearer understanding of how to argue from data."] }
    ],
    lesson: "I’d divide the analysis and writing responsibilities earlier. I took on too much myself; clearer ownership would have given us more time to review each other’s work.",
    links: [{ label: "2025 Youreka Canada Journal", href: "https://drive.google.com/file/d/1lTrTsLfvYSEkUlYoGWTSYcoekdeiJqu4/view", note: "Authors and recognition: page 4. Sample: page 5. Correlation: page 6." }, { label: "Youreka research archive", href: "https://yourekacanada.org/research-1" }], flagship: true,
  },
  {
    slug: "docubridge", title: "DocuBridge", kicker: "04 / Internship",
    role: "Software engineering intern", period: "Summer 2025", status: "Prototype",
    thesis: "Ask a spreadsheet a question. See where the answer came from.",
    summary: "During my DocuBridge internship, I built a prototype for uploading Excel and CSV files, exploring charts and summaries, and asking questions about the data. It connected a Python analysis backend to a React interface. I learned much of the stack while building it, working from file upload through to the answer a person sees.",
    shortDescription: "A spreadsheet-analysis prototype with charts, summaries and natural-language questions.",
    proof: "Excel and CSV uploads · worksheet selection · charts and questions",
    contributions: ["Developed the Python, Flask and Pandas analysis backend.", "Connected spreadsheet uploads, charting and natural-language questions to the React interface.", "Carried the selected worksheet through the analysis and question endpoints."],
    teamContext: "Built during my software engineering internship at DocuBridge.", evidenceNote: "",
    decision: { label: "The hard part", title: "Keep the answer tied to the selected sheet.", body: [
      "An Excel file can contain several worksheets. The upload flow lists them and stores the person’s selection, which the analysis and question endpoints then use. CSV files follow their own parsing path.",
      "Alongside generated answers, the interface exposes column names, summary statistics and charts. That gives the person something concrete to inspect."
    ] },
    metrics: [], stack: ["Python / Flask", "Pandas", "React / TypeScript", "Plotly", "OpenRouter"], imageAsset: "docubridge",
    artifactLabel: "DocuBridge / Prototype interface", imageAlt: "DocuBridge interface for exploring an uploaded spreadsheet.", imageCaption: "The spreadsheet-analysis prototype.",
    artifactSource: { label: "View the source", href: "https://github.com/tejask-dev/Docubridge-Intership" },
    sections: [
      { heading: "Make a spreadsheet easier to explore.", body: ["The prototype puts uploaded data, charts and a question-and-answer interface in one place. The goal was to make exploration more approachable without hiding the underlying table."] },
      { heading: "A working prototype with public source.", body: ["The repository contains the upload, worksheet-selection, analysis, chart and question paths. This remained an internship prototype; production adoption and answer accuracy were not measured."] }
    ],
    lesson: "I’d build a small set of reference spreadsheets and expected answers earlier, so every change could be checked against known results.",
    links: [{ label: "Prototype repository", href: "https://github.com/tejask-dev/Docubridge-Intership" }, { label: "Analysis backend", href: "https://github.com/tejask-dev/Docubridge-Intership/blob/a6c9d2b4e81b9fa3bc6d61d9958f03936174ee2f/Backend/app.py" }], flagship: false,
  },
  {
    slug: "soma-ai", title: "Soma AI", kicker: "05 / Health education",
    role: "Backend and model integration", period: "2025–2026", status: "Sunset 2026",
    thesis: "A conversational starting point for teen health education.",
    summary: "Our team built Soma to make teen health education easier to access through conversation. I worked on the Python and Flask backend, integrated the language model through OpenRouter, and connected it to the React interface. More than 300 people tried it, according to our team’s count. We sunset the project in 2026.",
    shortDescription: "Backend and model integration for a health-education experiment tried by 300+ people.",
    proof: "300+ people tried it, team reported · sunset in 2026",
    contributions: ["Built backend conversation paths using Python and Flask.", "Integrated the language model through OpenRouter.", "Connected the React interface to the backend conversation flow."],
    teamContext: "Soma was a team project intended for education, not clinical care.", evidenceNote: "",
    decision: { label: "The hard part", title: "The infrastructure has to fit the people using it.", body: ["We ran into infrastructure limitations in Sub-Saharan Africa that made the project difficult to continue. Building the conversational interface was only part of making the service accessible."] },
    metrics: [{ value: "300+", label: "people tried it, team reported" }, { value: "2026", label: "project sunset" }],
    stack: ["Python / Flask", "React", "OpenRouter"], imageAsset: "soma",
    artifactLabel: "Soma / Historical interface", imageAlt: "Soma’s health-education conversation interface.", imageCaption: "Soma’s interface before the project closed in 2026.",
    artifactSource: { label: "View the source", href: "https://github.com/tejask-dev/SomaAI" },
    sections: [
      { heading: "A more approachable way to ask.", body: ["Soma explored whether a conversational interface could make teen health information easier to access. We built a web experience around that idea."] },
      { heading: "An experiment we chose to close.", body: ["More than 300 people tried Soma before we ended the project. That count describes trial, not continued use or a measured health benefit. The code remains available."] }
    ],
    lesson: "I’d test the service in its intended environment earlier, including the connectivity and infrastructure it needs to keep working.",
    links: [{ label: "Soma repository", href: "https://github.com/tejask-dev/SomaAI" }, { label: "Conversation backend", href: "https://github.com/tejask-dev/SomaAI/blob/ad97c49f766a5d38a5fa1c84a0ddfcc930fd6832/Backend/app.py" }], flagship: false,
  },
];
