/** Public editorial content, shared by React and the static reading path. */
export type Contribution = {
  id: string;
  title: string;
  group: "Connections" | "Private AI" | "Devices" | "Delivery";
  problem: string;
  part: string;
  decision: string;
  result: string;
  status: string;
};

export const anticipyWebsite = "https://anticipy.ai/";

export const anticipyNarrative = {
  title: "Making an AI pendant keep its promises.",
  summary: "Anticipy turns spoken intentions into actions through connected apps. As COO at Anticipation Labs, I work across product, engineering and operations: choosing what to fix, directing implementation, coordinating releases and testing the experience on phones and prototype hardware. My focus is making it work beyond a demo, across real devices.",
  context: "A wearable is useful when it follows through. Saying something to a pendant is the easy part; connecting the right account, respecting permission and completing the task is where the product has to earn trust.",
  personal: "I led work on account connections, private AI workflows and browser privacy, then tested builds on phones and wearable prototypes.",
  assistance: "I use Claude and Codex for implementation, investigation and review, alongside my own product decisions and hands-on testing.",
  team: "I built on the team’s existing workflow engine, memory system, native apps, browser engine and hardware designs.",
  company: "I also contribute to recruiting, early operations and investor introductions.",
  evidence: "The private AI and browser-privacy work was validated in local tests. Live work-email processing remains off.",
  personalLesson: "Next time, I’d test the complete phone-to-service journey earlier. A successful server response can hide a broken experience.",
  personalLessonSource: "",
  statusSummary: "We deployed the connector fix and verified installation and recovery on individual wearable prototypes. Pairing, audio and transcripts still need more testing.",
  sources: [
    { label: "Anticipy", href: anticipyWebsite, note: "The product." },
    { label: "Anticipation Labs", href: "https://www.anticipationlabs.com/", note: "The team behind it." },
  ],
} as const;

export const anticipyArtifact = {
  desktop: "portfolio/anticipy-desktop-2026-10-01.jpg",
  mobile: "portfolio/anticipy-mobile-2026-10-01.jpg",
  source: anticipyWebsite,
  caption: "Anticipy’s public website. Product and brand by Anticipation Labs.",
  alt: "Anticipy’s AI pendant on its public product website.",
} as const;

export const leadStories = [
  {
    id: "connector-journey", number: "01", category: "Connected apps",
    title: "Success on the server. Stuck on the phone.",
    intro: "The server reported success, but the browser stayed on the consent page.",
    role: "I prioritized the failure, supplied phone observations and required a complete browser test before release.",
    decision: "Retry the saved connection attempt without replacing consent or extending its expiry.",
    outcome: "The deployed fix reached Google and Notion sign-in. I later completed a Gmail read-and-summary task myself.",
    limit: "This repaired the navigation path; other connector actions need their own checks.",
    status: "Deployed", contributions: ["C1", "C3"],
  },
  {
    id: "private-preparation", number: "02", category: "Private AI",
    title: "One source in. An inspectable brief out.",
    intro: "A work brief should start with the source a person chooses, not their entire inbox.",
    role: "I defined the source-selection flow and its consent, spending and cancellation rules.",
    decision: "Process only the selected source. Cite the result and discard late responses after cancellation.",
    outcome: "The local prototype produced cited briefs and passed lifecycle checks. The separate hosted account preview kept AI processing disabled.",
    limit: "Live work-email processing is not activated.",
    status: "Local prototype", contributions: ["C6", "C7", "C8", "C9"],
  },
  {
    id: "privacy-boundary", number: "03", category: "Browser privacy",
    title: "Protect the value before it leaves the page.",
    intro: "Masking a protected value in an answer is too late if the model already received it.",
    role: "I set up acceptance checks for outgoing requests using synthetic protected values.",
    decision: "Withhold those values while preserving the browser actions a person has authorized.",
    outcome: "The recorded real-browser and installed-extension checks passed for the tested cases.",
    limit: "These checks cover the tested browser paths, not every surface.",
    status: "Locally tested", contributions: ["C2"],
  },
] as const;

export const alsoWork = [
  "Tested phone and Mac builds before release.",
  "Verified installation and recovery on wearable prototypes.",
  "Directed organization, identity and private-data controls.",
  "Set spending limits and cancellation behavior for AI requests.",
  "Helped prepare the Fellowship site and application flow.",
] as const;

/** Retained for consumers of the original contribution index. */
export const contributions: Contribution[] = [
  { id: "C1", title: "Connected-app recovery", group: "Connections", problem: "Browser stalled at consent.", part: "Prioritized repair and tested on a phone.", decision: "Reuse the authorized attempt.", result: "Navigation repair deployed.", status: "Deployed" },
  { id: "C2", title: "Browser privacy", group: "Connections", problem: "Protected values could enter a model request.", part: "Required outgoing-request checks.", decision: "Withhold values at capture.", result: "Synthetic browser checks passed.", status: "Locally tested" },
  { id: "C3", title: "Consistent permissions", group: "Connections", problem: "Clients could disagree about readiness.", part: "Required end-to-end journey checks.", decision: "Check capability as well as consent.", result: "Local integration repairs.", status: "Locally tested" },
  { id: "C4", title: "Native-client testing", group: "Devices", problem: "Device behavior needs hands-on testing.", part: "Installed and exercised phone builds.", decision: "Check the released artifact.", result: "Phone and Mac checks completed.", status: "Limited device checks" },
  { id: "C5", title: "Wearable prototypes", group: "Devices", problem: "A firmware install is only the beginning.", part: "Operated USB, reset and pairing on devices.", decision: "Verify recovery before moving ahead.", result: "Installation and recovery verified; audio testing continues.", status: "Prototype" },
  { id: "C6", title: "Identity and organizations", group: "Private AI", problem: "Work accounts must preserve personal privacy.", part: "Directed implementation and review.", decision: "Keep membership separate from content access.", result: "Local identity and erasure checks passed.", status: "Local foundation" },
  { id: "C7", title: "Source-backed briefs", group: "Private AI", problem: "A brief needs a source the reader can inspect.", part: "Defined source selection and consent.", decision: "Use only the chosen source.", result: "Cited briefs in a local prototype.", status: "Prototype" },
  { id: "C8", title: "Spending limits", group: "Private AI", problem: "Retries and late results complicate limits.", part: "Set spending and cancellation requirements.", decision: "Check each model request.", result: "Local budget and lifecycle checks.", status: "Locally tested" },
  { id: "C9", title: "Selected email", group: "Private AI", problem: "A mailbox connection is not permission to read everything.", part: "Directed a selected-message prototype.", decision: "Choose one message explicitly.", result: "Offline selection and revocation checks.", status: "Prototype" },
  { id: "C10", title: "Release coordination", group: "Delivery", problem: "Code and deployed behavior can differ.", part: "Set release order and acceptance criteria.", decision: "Verify the deployed artifact.", result: "Separate account preview released with AI off.", status: "Preview" },
  { id: "C11", title: "Fellowship website", group: "Delivery", problem: "Applicants needed a clear route into the team.", part: "Helped redesign the site and application flow.", decision: "Build on existing application infrastructure.", result: "Responsive experience prepared.", status: "Coming soon" },
  { id: "C12", title: "Product direction", group: "Delivery", problem: "Parallel work needs clear priorities.", part: "Coordinated engineering, review and device testing.", decision: "Make user behavior the acceptance criterion.", result: "Product work across apps and hardware.", status: "Ongoing" },
];

export const careerJourney = [
  { period: "Current", title: "Anticipation Labs", role: "COO", body: "Product, engineering and operations for Anticipy, from connected apps to hands-on wearable testing.", slug: "anticipy" },
  { period: "Aug 2025–Jul 2026", title: "Stellar Learning", role: "CTO", body: "IB question generation and practice, plus improvements to AP questions and lessons.", slug: "stellar-learning" },
  { period: "Summer 2025", title: "DocuBridge", role: "Software engineering intern", body: "Built a prototype for exploring spreadsheets through charts, summaries and natural-language questions.", slug: "docubridge" },
  { period: "2024–2025", title: "Youreka Canada", role: "Co-author and student researcher", body: "Writing, analysis and R graphs for a published, national first-place team study across 34 countries.", slug: "global-health-research" },
  { period: "2025–2026", title: "Soma", role: "Backend and model integration", body: "Built the backend and model integration for a team health-education experiment. Sunset in 2026.", slug: "soma-ai" },
] as const;

export const connectorSteps = [
  { label: "Server response", heading: "The browser is still waiting.", body: "The server reports success, but the person has not reached provider sign-in.", active: 2, state: "Before the repair" },
  { label: "Browser journey", heading: "Reach the provider.", body: "The corrected flow preserves consent and opens the provider’s sign-in page.", active: 4, state: "Navigation repaired" },
  { label: "Retry", heading: "Resume the same attempt.", body: "Retry reuses the saved attempt and its original expiry.", active: 3, state: "Permission preserved" },
] as const;

export const illustrativeNote = "Prepare a launch review. Mira owns the draft. Review the launch checklist on Thursday. No launch decision has been made.";
export const illustrativeBrief = [
  { text: "Review the launch checklist on Thursday.", source: "Review the launch checklist on Thursday." },
  { text: "Mira owns the draft.", source: "Mira owns the draft." },
  { text: "A launch decision is still open.", source: "No launch decision has been made." },
] as const;

export const anticipyPreview = {
  intro: "An AI wearable that turns spoken intentions into actions through connected apps.",
  part: "I’m COO at Anticipation Labs. I work across the product and the company, from fixing account connections to testing prototype hardware myself.",
  before: "A spoken intention: “Follow up on that email.”",
  after: "The right account, permission and action.",
  attribution: anticipyNarrative.assistance,
  followThrough: "See the product decisions, repairs and prototypes behind that promise.",
} as const;

export const anticipySnapshot = [
  { id: "connector-journey", title: "Connected apps", result: "Get from consent to sign-in.", status: "Deployed repair" },
  { id: "private-preparation", title: "Private AI", result: "Prepare a brief from one chosen source.", status: "Local prototype" },
  { id: "privacy-boundary", title: "Browser privacy", result: "Keep protected values out of model requests.", status: "Locally tested" },
] as const;

export const anticipyStatus = [
  { title: "Connected apps", result: "Navigation repair deployed", complete: true },
  { title: "Private AI", result: "Local prototype; hosted AI processing off", complete: false },
  { title: "Wearables", result: "Installation and recovery checked; audio testing continues", complete: false },
] as const;
