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
      "Set product priorities and acceptance criteria for connected apps, privacy and private AI workflows.",
      "Directed AI-assisted implementation, independent review and release checks.",
      "Hands-on phone and prototype wearable testing, alongside the upcoming Fellowship experience and early operations.",
    ],
    teamContext:
      anticipyNarrative.team,
    evidenceNote: anticipyNarrative.evidence,
    decision: {
      label: "Browser journey / engineering decision",
      title: "Getting past the consent page.",
      body: [
        "The server reported a successful redirect, but the browser was still stuck before the provider's sign-in page. The fix kept the existing consent and expiry, let the browser finish the path, and allowed a retry of the saved authorization attempt.",
        "I made this failure a priority, shared what I saw on my phone, and required a browser test before release. Claude and Codex did the diagnosis, fix and review. The deployed fix was checked through the provider sign-in screens. That doesn't show every connector or write action works.",
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
        heading: "From intention",
        body: [anticipyNarrative.context],
      },
      {
        heading: "Installed is a step.",
        body: [
          anticipyNarrative.statusSummary,
        ],
      },
    ],
    lesson: "Hard work pays off. Working on Anticipy gave me the opportunity to go to Stan Launchpad, and I went. That was great.",
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
    status: "Former role · IB partly shipped",
    thesis: "Question generation and practice for IB and AP.",
    summary: "At Stellar Learning, I worked on IB Diploma question generation and practice. I helped decide how to make the algorithm better, and I improved the AP question and lesson harnesses too. My teammates and AI tools handled a lot of the actual algorithm development and API prompting.",
    shortDescription: "IB Diploma question generation and practice; improvements to AP question and lesson systems.",
    proof: "IB curriculum adaptation · generation and practice systems · AP improvements",
    contributions: [
      "Worked on the IB Diploma question-generation and practice systems.",
      "Helped decide how to change the algorithm when the AP approach did not fit the IB curriculum.",
      "Improved the AP question and lesson harnesses, with teammates and AI tools contributing much of the implementation."
    ],
    teamContext: "Stellar’s reported 40,000+ learners, 80+ courses and 130+ volunteers describe the organization, not my individual impact.",
    evidenceNote: "My account of the work, collaboration and unfinished IB scope was updated on 12 October 2026. The improvement in question accuracy is my observation, not a measured benchmark. Organization figures were checked on 2 October 2026.",
    decision: {
      "label": "The challenge / adapting to IB",
      "title": "The AP approach did not work for IB.",
      "body": [
        "We tried to copy the AP prompting and algorithms over to IB, and it didn't work. I was doing IB myself. The questions didn't seem accurate enough for the IB curriculum, so I decided the approach needed to change.",
        "I was still learning the technical side, and it was really difficult. The algorithm broke a lot, and so did the connectors. After I worked on the algorithm, with teammates and AI tools doing much of the development, the questions seemed much more accurate. That surprised me. I don't have a before-and-after benchmark, so that's my observation."
      ],
      "source": "https://stellarlearning.app/"
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
      "The public Stellar Learning homepage. Shown as platform context, not as a claim of personal ownership of every feature. Organization figures checked 2 October 2026.",
    artifactSource: {
      label: "Visit the live platform",
      href: "https://stellarlearning.app/",
    },
    sections: [
      {
        "heading": "A shared place to prepare",
        "body": [
          "Stellar brings lessons, practice, mock exams, flashcards and an AI tutor into one study system. It serves students preparing for several exam formats, with a team of volunteers contributing to the experience."
        ]
      },
      {
        "heading": "Some shipped; much remained unfinished.",
        "body": [
          "Some of the IB work shipped, but a lot remained unfinished. I've since stepped down as CTO."
        ]
      }
    ],
    lesson: "I'd do a lot of things differently at Stellar. Next time, I'd seek out help from people who really know the technical environment.",
    links: [
      {
        label: "Stellar Learning",
        href: "https://stellarlearning.app/",
        note: "Source for the product description and organization-reported figures; checked 2 October 2026.",
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
    summary: "I did much of the writing and data analysis for our paper on adolescent fertility and pediatric HIV treatment coverage in Sub-Saharan Africa, and managed a lot of the work. I coded the graphs in R. My co-authors were Liyona Wang, Shikai Jin and Elijah Murtagh. Our study appears in the 2025 Youreka Canada Journal as the national first-place study.",
    shortDescription:
      "A published study, a team award, and a careful reading of what the data supports.",
    proof: "Co-author · national first-place study, 2025 Youreka Journal",
    contributions: [
      "Handled much of the paper’s writing, data analysis and coordination.",
      "Coded graphs in R while learning how to use it for the research.",
      "Helped lead revisions to our hypotheses when the initial tests did not support them."
    ],
    teamContext: "The paper and first-place recognition belong to all four of us: Liyona Wang, Shikai Jin, Elijah Murtagh and me. An AI tool helped me research many sources, and AI also helped me learn R.",
    evidenceNote: "The final journal identifies the four authors and first-place recognition on PDF page 4; the 34-country sample is described on page 5. My account of the writing, analysis, R work and AI assistance was added on 12 October 2026; the journal does not establish the division of work.",
    decision: {
      label: "Research interpretation / team study",
      title: "Keep the claim at the level of the data.",
      body: [
        "The paper reports a weak negative association: r = −0.3464. Higher adolescent fertility was associated with lower pediatric treatment coverage in this sample.",
        "A country-level correlation can't tell us why any one child gets treatment. We used aggregated estimates, excluded countries with missing data, and compared observations from different years. Those choices limit what we can conclude. The result shows an association; it doesn't establish a cause.",
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
      "R",
      "Public health data",
      "Correlation analysis",
      "Research communication"
    ],
    imageAsset: "research",
    artifactLabel: "Published study / evidence summary",
    imageTreatment: "paper",
    imageAlt:
      "Original summary of the final journal: four co-authors, a 34-country sample and national first-place team recognition.",
    imageCaption:
      "Original evidence summary linked to the final 2025 Youreka Canada Journal, PDF pages 4–5. The published author line spells my name “Tejas.” No journal page or figure is reproduced.",
    artifactSource: {
      label: "Read the final journal",
      href: "https://drive.google.com/file/d/1lTrTsLfvYSEkUlYoGWTSYcoekdeiJqu4/view",
    },
    sections: [
      {
        "heading": "The research question",
        "body": [
          "Our team asked whether adolescent fertility rates were associated with pediatric antiretroviral treatment coverage across Sub-Saharan Africa. We paired country-level indicators for 34 countries to examine that relationship."
        ]
      },
      {
        "heading": "Learning R while doing the research",
        "body": [
          "Learning R and getting the graphs to work was hard. My code broke and didn't work for a long time. AI helped me get it working, and I was surprised by how well it was able to teach me.",
          "Our first hypotheses didn't hold up when we tested them, so we changed them. That was a team effort, but I helped lead a lot of it."
        ]
      },
      {
        "heading": "A result with limits",
        "body": [
          "The study compares 2022 treatment coverage with fertility observations from 2016 to 2022.",
          "Our study was published in the 2025 Youreka Canada Journal and received national first-place recognition as a team."
        ]
      }
    ],
    lesson: "I'd tackle research differently next time. I did a lot of the work myself, and I'd learn how to delegate tasks properly.",
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
      "During my internship at DocuBridge, I developed a prototype where you could upload an Excel or CSV file, explore charts and summaries, and ask questions about the data.",
    shortDescription:
      "An Excel and CSV analysis prototype connecting a Python backend to a React interface.",
    proof:
      "Public backend source · upload, sheet selection, analysis and questions",
    contributions: [
      "Developed the spreadsheet-analysis prototype during my internship.",
      "Connected the data analysis and generated questions to an interface you can inspect.",
    ],
    teamContext:
      "This was an internship prototype. The public repository shows the implemented paths, not production adoption, financial accuracy or who wrote every line.",
    evidenceNote:
      "Role and period are my account. You can inspect the implementation in the public backend at commit a6c9d2b, checked 29 September 2026.",
    decision: {
      label: "Inspectable implementation choice",
      title: "Select the sheet before asking the question.",
      body: [
        "The upload path lists Excel worksheets and records a selected sheet. The analysis and question paths then load that selected sheet; CSV files take a separate parser path.",
        "The analysis also returns column names, numeric columns, summary statistics and charts alongside the generated answers. You can inspect how the code produces them; this isn't an accuracy benchmark.",
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
        heading: "Learning the technical skills",
        body: ["Honestly, one problem I ran into was learning the technical skills I needed to actually build something like this."],
      },
      {
        heading: "A prototype with a visible path",
        body: [
          "You can inspect the upload, worksheet selection, analysis, chart and question endpoints in the public repository.",
          "I built this as a prototype. I don't have evidence of production reliability, accurate forecasts or customer savings, and I don't present it as financial advice.",
        ],
      },
    ],
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
    role: "Backend and model-integration contributor",
    period: "2025–2026",
    status: "Closed in 2026",
    thesis: "A health-education experiment that ran into infrastructure limits.",
    summary:
      "I worked on the backend and model integration for Soma, a teen-health education experiment we built as a team. It closed in 2026. You can still see the source and the old interface.",
    shortDescription:
      "Backend and model integration for a team-built health-education experiment that closed.",
    proof: "Flask backend and model integration · closed in 2026",
    contributions: [
      "Worked on the backend using Python and Flask.",
      "Integrated the model for the conversational experience.",
      "Connected the React interface with the backend conversation flow.",
    ],
    teamContext:
      "Our team reported that more than 300 people tried Soma. That tells us people tried it; it doesn't tell us how many kept using it or whether it helped their health.",
    evidenceNote: "Role, trial count and closure are the team’s and my account. My account of the infrastructure-related closure was added on 12 October 2026. The public source supports the Flask, React and OpenRouter implementation description.",
    decision: {
      "label": "Why the project ended / my account",
      "title": "Infrastructure limited what we could continue.",
      "body": [
        "We ended Soma because of infrastructure limitations in Sub-Saharan Africa. That is my account of why we stopped.",
        "The project closed in 2026. Its source and historical interface remain available as a record of the implementation."
      ]
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
          "The repository still has the Flask backend, OpenRouter connection and React frontend. You can inspect the work there, but the service is closed.",
          "The source shows what we built. It doesn't show clinical validation.",
        ],
      },
    ],
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
