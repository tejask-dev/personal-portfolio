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
  lesson: string;
  links: { label: string; href: string; note?: string }[];
  flagship: boolean;
};

/** Shared by the live pages and static HTML. Scope and outcomes are deliberately separate. */
export const caseStudyContent: CaseStudyContent[] = [
  {
    slug: "anticipy",
    title: "Anticipy",
    kicker: "01 / Current product work",
    role: "Founding Software Engineer at Anticipation Labs",
    period: "Current",
    status: "Being built",
    thesis: anticipyNarrative.title,
    summary: anticipyNarrative.summary,
    shortDescription:
      "Connected apps, private AI workflows, and prototype hardware—with the decisions and evidence behind each.",
    proof: "Deployed connector repair · locally validated AI prototype · hands-on device testing",
    contributions: [
      "Product priorities and acceptance criteria across connected apps, privacy, and private AI workflows.",
      "Direction of AI-assisted implementation, independent review, and release verification.",
      "Hands-on phone and prototype wearable testing, alongside the Fellowship experience and early operations.",
    ],
    teamContext:
      anticipyNarrative.team,
    evidenceNote: anticipyNarrative.evidence,
    decision: {
      label: "Browser journey / engineering decision",
      title: "A connection must finish the journey.",
      body: [
        "A successful server redirect still left a person stranded before provider sign-in. The repair preserved consent and expiry while allowing the browser to finish the path and retry the saved authorization attempt.",
        "I prioritized the failure, supplied device observations, and required browser-tested release evidence. Claude and Codex contributed diagnosis, implementation, and review. The deployed correction was verified through provider sign-in screens; this does not establish every connector or write action.",
      ],
      source: anticipyWebsite,
    },
    metrics: [
      { value: "Current", label: "engineering role" },
      { value: "Mixed stages", label: "deployed repairs, local prototypes, ongoing validation" },
    ],
    stack: [
      "Product engineering",
      "AI workflows",
      "Mobile / wearable validation",
      "TypeScript / Python",
      "Release engineering",
    ],
    imageAsset: "anticipy",
    artifactLabel: "Main Anticipy website",
    imageTreatment: "cover",
    imageAlt: anticipyArtifact.alt,
    imageCaption: anticipyArtifact.caption,
    artifactSource: {
      label: "Visit anticipy.ai",
      href: anticipyWebsite,
    },
    sections: [
      {
        heading: "A useful journey",
        body: [anticipyNarrative.context],
      },
      {
        heading: "Installed is a step.",
        body: [
          anticipyNarrative.statusSummary,
        ],
      },
    ],
    lesson:
      "A green check, a deployed artifact, and a useful experience are different kinds of evidence. Good engineering follows the journey far enough to know which one it has.",
    links: [
      {
        label: "Anticipy",
        href: anticipyWebsite,
        note: "Public product description. Personal contribution is described separately above.",
      },
      {
        label: "Anticipation Labs",
        href: "https://www.anticipationlabs.com/",
        note: "The team behind Anticipy.",
      },
    ],
    flagship: true,
  },
  {
    slug: "stellar-learning",
    title: "Stellar Learning",
    kicker: "02 / Education platform",
    role: "Former CTO / technology lead",
    period: "2025–2026",
    status: "Former role · live platform",
    thesis: "Leading technology for free exam preparation.",
    summary:
      "I served as CTO and technology lead at Stellar Learning, helping translate a volunteer team's product goals into technical work. The platform brings free AP, IB, SAT and competitive-math preparation into one study experience.",
    shortDescription:
      "Technology leadership inside a volunteer-built exam-preparation platform.",
    proof: "40,000+ learners reported by Stellar Learning",
    contributions: [
      "Platform architecture and product development across web, mobile, and AI-enabled learning.",
      "Contributing to practice systems and the Nova AI tutoring experience.",
      "Technical priorities and coordination within a distributed volunteer organization.",
    ],
    teamContext:
      "Stellar reports 40,000+ learners, 80+ courses and 130+ volunteers. Those figures describe the organization's platform and collective work, not learners I personally acquired.",
    evidenceNote:
      "Role and contribution are my account. Organization figures were checked on Stellar's public homepage on 29 September 2026.",
    decision: {
      label: "Product constraint / team context",
      title: "Free access is part of the brief.",
      body: [
        "Stellar presents lessons, practice and exam preparation as a free service. That commitment defines the product context in which the team works.",
        "My role was to help translate product goals into technical priorities within a volunteer organization. The platform's reach belongs to the collective effort; it is not an individual engineering result.",
      ],
      source: "https://stellarlearning.app/",
    },
    metrics: [
      { value: "40,000+", label: "learners, reported by Stellar" },
      { value: "80+", label: "courses, reported by Stellar" },
      { value: "130+", label: "volunteers, reported by Stellar" },
    ],
    stack: [
      "Technology leadership",
      "Product engineering",
      "Volunteer collaboration",
    ],
    imageAsset: "stellar",
    artifactLabel: "Public product screen",
    imageAlt:
      "Stellar Learning homepage showing its free exam-preparation platform.",
    imageCaption:
      "The public Stellar Learning homepage. Shown as platform context, not as a claim of personal ownership of every feature. Organization figures checked 29 September 2026.",
    artifactSource: {
      label: "Visit the live platform",
      href: "https://stellarlearning.app/",
    },
    sections: [
      {
        heading: "A shared place to prepare",
        body: [
          "Stellar brings lessons, practice, mock exams, flashcards and an AI tutor into one study system. It serves students preparing for several exam formats, with a team of volunteers contributing to the experience.",
        ],
      },
      {
        heading: "The platform, and my part in it",
        body: [
          "I have since stepped down from the CTO role. Stellar's reported 40,000+ learners, 80+ courses and 130+ volunteers remain useful context for the organization I worked within.",
          "These are organization-reported figures, not audited usage, learning gains or a measure of my individual impact.",
        ],
      },
    ],
    lesson:
      "Technical leadership means making the next piece of work clear enough for other people to contribute.",
    links: [
      {
        label: "Stellar Learning",
        href: "https://stellarlearning.app/",
        note: "Source for the product description and organization-reported figures; checked 29 September 2026.",
      },
    ],
    flagship: true,
  },
  {
    slug: "global-health-research",
    title: "Global health research",
    kicker: "03 / Youreka Canada",
    role: "Co-author and student researcher",
    period: "2024–2025",
    status: "Published · team recognition",
    thesis: "What a 34-country study can tell us about treatment access.",
    summary:
      "With Liyona Wang, Shikai Jin and Elijah Murtagh, I co-authored a study of adolescent fertility and pediatric HIV treatment coverage in Sub-Saharan Africa. It appears in the 2025 Youreka Canada Journal as the national first-place study.",
    shortDescription:
      "A published study, a team award, and a careful reading of what the data supports.",
    proof: "Co-author · national first-place study, 2025 Youreka Journal",
    contributions: [
      "Co-author and student researcher on the four-person study.",
      "Co-author of the paper included in the 2025 Youreka Canada Journal.",
    ],
    teamContext:
      "The study and national first-place recognition belong to the research team: Liyona Wang, Shikai Jin, Elijah Murtagh and me. The analysis compared country-level indicators across 34 countries.",
    evidenceNote:
      "The final journal identifies the authors and team recognition. The image below is an earlier manuscript excerpt, not the final published author page.",
    decision: {
      label: "Research interpretation / team study",
      title: "Keep the claim at the level of the data.",
      body: [
        "The paper reports a weak negative association: r = −0.3464. Higher adolescent fertility was associated with lower pediatric treatment coverage in this sample.",
        "Country-level correlation cannot establish why an individual child receives treatment. Aggregated estimates, missing-country exclusions and mixed observation years limit the inference. The result is an association, not a causal explanation.",
      ],
      source:
        "https://drive.google.com/file/d/1lTrTsLfvYSEkUlYoGWTSYcoekdeiJqu4/view",
    },
    metrics: [
      { value: "34", label: "countries in the team study" },
      { value: "1st", label: "national recognition for the team" },
      { value: "2025", label: "Youreka Canada Journal" },
    ],
    stack: [
      "Public health data",
      "Correlation analysis",
      "Research communication",
    ],
    imageAsset: "research",
    artifactLabel: "Original manuscript excerpt",
    imageTreatment: "paper",
    imageAlt:
      "Title and author line from the original research manuscript on adolescent fertility and pediatric antiretroviral treatment access.",
    imageCaption:
      "Original manuscript excerpt, preceding the final journal and its author listing. The linked 2025 journal is the source for publication, authorship and the team's national first-place recognition.",
    artifactSource: {
      label: "Read the final journal",
      href: "https://drive.google.com/file/d/1lTrTsLfvYSEkUlYoGWTSYcoekdeiJqu4/view",
    },
    sections: [
      {
        heading: "The research question",
        body: [
          "Our team asked whether adolescent fertility rates were associated with pediatric antiretroviral treatment coverage across Sub-Saharan Africa. We paired country-level indicators for 34 countries to examine that relationship.",
        ],
      },
      {
        heading: "A result with limits",
        body: [
          "The study compares 2022 treatment coverage with fertility observations from 2016 to 2022. Countries with missing indicators were excluded; estimated and aggregated values do not capture every local circumstance.",
          "The 2025 Youreka Canada Journal includes the paper and identifies it as the national first-place study. That is recognition of the team's research, not evidence of clinical or policy impact.",
        ],
      },
    ],
    lesson:
      "The useful result is the one you can explain with its uncertainty intact.",
    links: [
      {
        label: "2025 Youreka Canada Journal",
        href: "https://drive.google.com/file/d/1lTrTsLfvYSEkUlYoGWTSYcoekdeiJqu4/view",
        note: "Authors and recognition: PDF page 4. Sample: page 5. Correlation: page 6. Figure: page 12.",
      },
      {
        label: "Youreka research archive",
        href: "https://yourekacanada.org/research-1",
        note: "The organization's journal archive.",
      },
    ],
    flagship: true,
  },
  {
    slug: "docubridge",
    title: "DocuBridge",
    kicker: "04 / Internship prototype",
    role: "Software engineering intern",
    period: "Summer 2025",
    status: "Prototype",
    thesis: "From uploaded spreadsheets to inspectable answers.",
    summary:
      "During my software engineering internship, I developed a prototype for exploring uploaded Excel and CSV data through charts, summaries and natural-language questions.",
    shortDescription:
      "An Excel and CSV analysis prototype connecting a Python backend to a React interface.",
    proof:
      "Public backend source · upload, sheet selection, analysis and questions",
    contributions: [
      "Development of the spreadsheet-analysis prototype during my internship.",
      "Connecting data analysis and generated questions with an inspectable interface.",
    ],
    teamContext:
      "This case describes an internship prototype. The public repository documents implemented paths, not production adoption, financial accuracy or authorship of every line.",
    evidenceNote:
      "Role and period are my account. Implementation details below are inspectable in the public backend at commit a6c9d2b, checked 29 September 2026.",
    decision: {
      label: "Inspectable implementation choice",
      title: "Select the sheet before asking the question.",
      body: [
        "The upload path lists Excel worksheets and records a selected sheet. The analysis and question paths then load that selected sheet; CSV files take a separate parser path.",
        "The analysis response also returns column names, numeric columns, summary statistics and charts. It exposes structured data alongside generated answers, giving the interface material a reader can inspect. This is a description of the source, not an accuracy benchmark.",
      ],
      source:
        "https://github.com/tejask-dev/Docubridge-Intership/blob/a6c9d2b4e81b9fa3bc6d61d9958f03936174ee2f/Backend/app.py#L364-L374",
    },
    metrics: [
      { value: "Excel + CSV", label: "input formats in the source" },
      { value: "Prototype", label: "project stage" },
    ],
    stack: [
      "Python",
      "Flask",
      "Pandas",
      "React",
      "TypeScript",
      "Plotly",
      "OpenRouter",
    ],
    imageAsset: "docubridge",
    artifactLabel: "Prototype interface",
    imageAlt:
      "DocuBridge prototype interface for exploring uploaded financial spreadsheets.",
    imageCaption:
      "Interface from the internship prototype. Shown as an existing project artifact; displayed analyses are not a verified financial result or a live demo.",
    artifactSource: {
      label: "Inspect the analysis backend",
      href: "https://github.com/tejask-dev/Docubridge-Intership/blob/a6c9d2b4e81b9fa3bc6d61d9958f03936174ee2f/Backend/app.py",
    },
    sections: [
      {
        heading: "Make a spreadsheet easier to inspect",
        body: [
          "The prototype accepts Excel and CSV uploads, then provides exploratory summaries, trends, ratios, anomalies, forecasts and charts. A question-and-answer layer uses the uploaded dataset as context.",
          "Python, Flask and Pandas handle the data paths. React and TypeScript present the interface, with Plotly charts and an OpenRouter connection for natural-language questions.",
        ],
      },
      {
        heading: "A prototype with a visible path",
        body: [
          "The repository preserves upload, worksheet selection, analysis, chart and question endpoints. Those are concrete implementation artifacts that can be inspected independently of this portfolio.",
          "The work is presented as a prototype. It is not evidence of production reliability, validated forecasts, financial advice or customer savings.",
        ],
      },
    ],
    lesson:
      "An answer becomes more useful when the underlying data and the path to it stay visible.",
    links: [
      {
        label: "Analysis backend · pinned source",
        href: "https://github.com/tejask-dev/Docubridge-Intership/blob/a6c9d2b4e81b9fa3bc6d61d9958f03936174ee2f/Backend/app.py",
        note: "Upload and selected-sheet handling; analysis response; question endpoints. Source inspected without executing the historical application.",
      },
      {
        label: "Prototype repository",
        href: "https://github.com/tejask-dev/Docubridge-Intership",
        note: "Public project source. Repository marketing claims are not treated as measured outcomes.",
      },
    ],
    flagship: false,
  },
  {
    slug: "soma-ai",
    title: "Soma AI",
    kicker: "05 / Closed experiment",
    role: "Developer and backend contributor",
    period: "2025–2026",
    status: "Closed in 2026",
    thesis: "Building an experiment, and knowing when to stop.",
    summary:
      "I contributed to the backend and model integration for a team-built teen-health education experiment. Soma closed in 2026; its source and historical interface remain a record of the work.",
    shortDescription:
      "Backend and model integration for a team-built health-education experiment that closed.",
    proof: "Flask backend and model integration · closed in 2026",
    contributions: [
      "Backend development using Python and Flask.",
      "Model integration supporting the conversational experience.",
      "Connecting the React experience with the backend conversation flow.",
    ],
    teamContext:
      "Soma was a team-built educational experiment. The team reported that more than 300 people tried it. That count is not a measure of active or retained users, clinical value or product-market fit.",
    evidenceNote:
      "Role, trial count and closure are the team's and my account. The public source supports the Flask, React and OpenRouter implementation description.",
    decision: {
      label: "Decision to close / personal reflection",
      title: "A trial count was not a reason to keep going.",
      body: [
        "My account of the closure is that early interest did not become enough repeat value, clear ownership or a sustainable reason to continue. We closed the project in 2026.",
        "That is a reflection on the experience, not a measured retention study. I distinguish the fact that people tried the product from evidence that it deserved to become an ongoing service.",
      ],
    },
    metrics: [
      { value: "Closed", label: "project status since 2026" },
      { value: "Team-built", label: "educational experiment" },
    ],
    stack: ["Python", "Flask", "React", "OpenRouter"],
    imageAsset: "soma",
    artifactLabel: "Historical interface",
    imageAlt:
      "Historical Soma AI landing page for a team-built teen-health education experiment that is now closed.",
    imageCaption:
      "Historical interface. Soma is closed. The educational experiment is not presented as clinical care or as a validated health service.",
    artifactSource: {
      label: "View the archived work",
      href: "https://github.com/tejask-dev/SomaAI",
    },
    sections: [
      {
        heading: "A more approachable interface",
        body: [
          "Soma explored whether a conversational interface could make teen and sexual-health information easier to approach. I contributed to its backend and model integration as part of the team.",
        ],
      },
      {
        heading: "What remains",
        body: [
          "The repository contains the Flask backend, OpenRouter connection code and React frontend. It preserves an implementation to inspect, not evidence of a currently operating service.",
          "The project is closed. Its value in this portfolio is the engineering work and the candid reflection on stopping an experiment, without clinical, privacy or efficacy claims.",
        ],
      },
    ],
    lesson:
      "Separate the satisfaction of building something from the evidence for continuing it.",
    links: [
      {
        label: "Soma backend · pinned source",
        href: "https://github.com/tejask-dev/SomaAI/blob/ad97c49f766a5d38a5fa1c84a0ddfcc930fd6832/Backend/app.py",
        note: "Historical implementation, checked 29 September 2026. Deployment instructions in the repository do not supersede the closed status.",
      },
      {
        label: "Project repository",
        href: "https://github.com/tejask-dev/SomaAI",
        note: "Public source for the team-built experiment.",
      },
    ],
    flagship: false,
  },
];
