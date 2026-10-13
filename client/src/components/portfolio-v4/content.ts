/** Public editorial content only. Internal evidence stays outside the published site. */
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
  title: "Engineering Anticipy across apps, AI, and prototype hardware.",
  summary: "I decide which problems to fix first and what we need to test across connected apps, private AI workflows and prototype devices. I direct AI-assisted engineering, coordinate releases, and test on phones and hardware myself.",
  context: "We're building Anticipy, an AI wearable that turns spoken intentions into actions through connected software, with the person's approval. My work goes from the account-connection flow to testing what happens on the actual device.",
  personal: "I set the requirements, defined the privacy checks and release conditions, and coordinated the implementation and reviews.",
  assistance: "Claude and Codex did a lot of the implementation, investigation, testing and documentation under my direction, and also helped review the work. I worked with Codex on the selected work-email prototype.",
  team: "The team had already built the product foundations: workflow and memory engines, native apps, the browser engine and hardware designs. I built on their work. I didn't build Anticipy on my own.",
  company: "I've also helped with early operations and recruiting, travelled for the company, and made investor introductions. I'm not claiming those introductions raised any funding.",
  evidence: "I wrote this from my project records and my own involvement. The results are what we checked at the time, not new tests or proof of customer adoption. Internal records stay private; the public links show the product and the team.",
  personalLesson: "Hard work pays off. Working on Anticipy gave me the opportunity to go to Stan Launchpad, and I went. That was great.",
  personalLessonSource: "My account, shared on 12 October 2026.",
  statusSummary: "The released native builds had limited phone and Mac checks. On individual wearable prototypes, we verified installation and recovery. Pairing, audio and transcripts still needed more testing before we could call them ready.",
  sources: [
    { label: "Anticipy", href: anticipyWebsite, note: "Public product context; not a claim of authorship of the entire product." },
    { label: "Anticipation Labs", href: "https://www.anticipationlabs.com/", note: "The team behind Anticipy." },
  ],
} as const;

export const anticipyArtifact = {
  desktop: "portfolio/anticipy-desktop-2026-10-01.jpg",
  mobile: "portfolio/anticipy-mobile-2026-10-01.jpg",
  source: anticipyWebsite,
  caption: "The main Anticipy website, captured on 1 October 2026 at desktop and mobile widths. Website and brand: Anticipation Labs. Shown for product context; my engineering contributions and the team’s existing foundations are described separately below.",
  alt: "The Anticipy main website, showing its AI pendant and the message “Not a note taker. An action taker.”",
} as const;

export const leadStories = [
  {
    id: "connector-journey", number: "01", category: "Connected-app reliability",
    title: "Getting past the consent page.",
    intro: "The server reported success, but the person was still stuck on the consent page. We needed to test whether the browser could reach the provider's sign-in page and retry without starting a new authorization.",
    role: "I made this failure a priority and brought in what I saw on my phone. I required a browser test before release. Claude and Codex did the diagnosis, fix and review, and I later checked a Gmail retrieval task myself.",
    decision: "Keep the existing consent and expiry when retrying the saved provider attempt. Test the whole browser redirect path, including the step the first test missed.",
    outcome: "The navigation fix was deployed and checked through the Google and Notion sign-in screens. Separately, I reported one Gmail read-and-summary task that worked.",
    limit: "Those checks cover one repaired navigation path. They don't show that every connector, phone flow or write action works.",
    status: "Navigation correction deployed", contributions: ["C1", "C3"],
  },
  {
    id: "private-preparation", number: "02", category: "Private AI workflows",
    title: "A brief from one source you chose.",
    intro: "We wanted a work-preparation prototype that could turn one source you picked into a brief you could check. It couldn't quietly pull in your personal memory or whole inbox, or assume permission to act.",
    role: "I approved the flow from choosing a source to reading the brief, including the rules for consent, spending, cancellation and keeping data. Claude and Codex split the backend, web and integration work. The pieces were reviewed independently before we joined them.",
    decision: "Only process the source the person picked, while they still allow it. Check every model request against the spending limit. Discard results that arrive after they've cancelled or withdrawn consent.",
    outcome: "The combined prototype produced briefs with source citations in local tests. Those tests also checked identity, privacy, spending limits and what happened when work was cancelled or deleted. We deployed a separate account preview with AI processing disabled.",
    limit: "This was tested locally. The account preview didn't activate live work email or a live AI service.",
    status: "Locally validated prototype", contributions: ["C6", "C7", "C8", "C9"],
  },
  {
    id: "privacy-boundary", number: "03", category: "Browser-agent privacy",
    title: "Check what reaches the model.",
    intro: "Hiding a protected field in the answer is too late if its value already went into a model request. I wanted the checks where the browser first reads and captures the data.",
    role: "I required protected-field checks using synthetic test values in the actual outgoing requests and logs. AI agents implemented and reviewed the changes against the existing browser workflows.",
    decision: "Keep protected values out while allowing the workflows a person has consented to. If the change breaks something, fix it. Don't rewrite old tests just to make the new check pass.",
    outcome: "Tests in a real browser, plus a smaller check on the installed extension, covered how protected fields were read and what reached the model. The final recorded checks passed for those cases.",
    limit: "These checks used synthetic data in a limited setup. They don't prove credentials are safe everywhere. I'm leaving private diagnostics out, and I can't claim every browser or native surface was covered.",
    status: "Locally validated repair", contributions: ["C2"],
  },
] as const;

export const contributions: Contribution[] = [
  { id: "C1", title: "Connected-app recovery", group: "Connections", problem: "A person could reach consent but fail to reach the connected service.", part: "Prioritized the failure, supplied phone observations, and directed AI-assisted repair and release validation.", decision: "Reuse the authorized attempt on retry while preserving expiry and ownership.", result: "Browser-navigation correction deployed; one successful Gmail retrieval was personally reported.", status: "Deployed correction" },
  { id: "C2", title: "Privacy at capture", group: "Connections", problem: "Protected fields can leak before a model produces an answer.", part: "Set the capture-boundary acceptance standard and required actual-payload checks.", decision: "Withhold protected values without broadly refusing useful consented workflows.", result: "Bounded real-browser and extension fixtures validated the repair; universal protection is not claimed.", status: "Locally validated" },
  { id: "C3", title: "One task, consistent authority", group: "Connections", problem: "Clients and services could disagree about readiness, accounts, permissions, and receipts.", part: "Required integrated user-journey proof and honest capability labels.", decision: "A saved permission choice does not create an available capability.", result: "Local integration repairs covered task evidence, account ambiguity, cancellation, and leases; not every repair was traced to a release.", status: "Locally validated" },
  { id: "C4", title: "Native-client validation", group: "Devices", problem: "Listening, stopped, connected, and ready need to mean the same thing on the actual device.", part: "Directed release order, installed and exercised phone builds, and reported observed behavior.", decision: "Explicit Stop must remain stopped; a browser escape path must preserve consent.", result: "Native artifacts were released with bounded phone/Mac checks. Wider background and connector acceptance remained incomplete.", status: "Released · bounded checks" },
  { id: "C5", title: "Wearable bench bring-up", group: "Devices", problem: "Installing firmware is only one step toward a functioning prototype.", part: "Swapped physical units, operated USB/reset/pairing, and supplied readiness and audio observations.", decision: "Identify each device, preserve recovery, then verify installation and readback.", result: "Installation and recovery were verified on individual prototypes; audio, readiness, and pairing qualification remained incomplete.", status: "Prototype · in progress" },
  { id: "C6", title: "Identity and organizations", group: "Private AI", problem: "Adding a work organization must not expose someone's personal data to colleagues.", part: "Directed isolated implementation and review while preserving the existing personal product.", decision: "Membership is not permission to read another person's private content.", result: "Identity, invitations, sessions, and erasure behavior were validated locally. Selected account behavior reached a separate preview.", status: "Local foundation · preview" },
  { id: "C7", title: "Source-backed preparation", group: "Private AI", problem: "A private brief needs an explicit source and inspectable reasoning context.", part: "Approved the note, consent, brief, source inspection, and cancellation journey.", decision: "Use only the specifically selected source; no silent personal-memory bridge or external actions.", result: "An integrated local flow produced private briefs with bound citations and receipts; hosted AI processing remained off.", status: "Locally validated prototype" },
  { id: "C8", title: "Spending and lifecycle limits", group: "Private AI", problem: "Retries, timeouts, and late results can escape a simplistic request counter.", part: "Set bounded spending authority and required visible cancellation and retention behavior.", decision: "Admit each actual request; keep uncertain charges reserved and reject stale results.", result: "Budget and lifecycle behavior was exercised locally. No measured production savings or complete backup-erasure claim.", status: "Locally validated" },
  { id: "C9", title: "A deliberately selected email", group: "Private AI", problem: "Connecting a mailbox must not silently import an entire inbox.", part: "Continued the bounded source milestone with Codex and review agents.", decision: "Confirm the work identity and select one plain-text message; no background ingestion or mail sending.", result: "Offline integration covered selection, privacy eviction, and revocation. Live work-email activation remained blocked.", status: "Prototype · live activation pending" },
  { id: "C10", title: "Release evidence and isolation", group: "Delivery", problem: "Several services and devices make it easy to confuse tested code with a delivered experience.", part: "Set release order, preservation requirements, spending boundaries, and artifact verification expectations.", decision: "Keep new services and data separate; verify the deployed artifact and retain a compatible rollback.", result: "A separate account preview and disabled runtime were released. Intended CI savings were not measured financial results.", status: "Bounded release delivered" },
  { id: "C11", title: "The Fellowship front door", group: "Delivery", problem: "Prospective applicants needed a clear public route into the team.", part: "Contributed the responsive redesign, application navigation, asset verification, and deployment follow-through.", decision: "Use a clear approved application destination and preserve the inherited backend.", result: "The responsive recruiting experience and application navigation were prepared. Fellowship coming soon; it is not fully published yet. Earlier repository, copy, and application infrastructure were team work.", status: "Fellowship coming soon" },
  { id: "C12", title: "Direction and coordination", group: "Delivery", problem: "Parallel work needs clear priorities and an honest definition of done.", part: "Set acceptance conditions, coordinated Claude/Codex work, controlled release authority, and personally tested devices.", decision: "Challenge “connected,” “merged,” and “installed” until the relevant user behavior is demonstrated.", result: "Bounded implementation stages, reviews, releases, and unresolved findings stayed explicit. This does not imply sole architecture authorship.", status: "Ongoing contribution" },
];

export const careerJourney = [
  { period: "Current", title: "Anticipation Labs", role: "Founding Software Engineer", body: "Connected apps, private AI workflows, release verification, and hands-on mobile/wearable validation. I direct AI-assisted engineering alongside the team's existing product work.", slug: "anticipy" },
  { period: "2025–2026", title: "Stellar Learning", role: "Former CTO / technology lead", body: "IB question-generation and practice work, algorithm decisions to fit the IB curriculum, and AP improvements. Teammates and AI tools handled much of the implementation.", slug: "stellar-learning" },
  { period: "Summer 2025", title: "DocuBridge", role: "Software engineering intern", body: "A spreadsheet-analysis prototype connecting uploaded data with natural-language questions, charts, and summaries.", slug: "docubridge" },
  { period: "2024–2025", title: "Youreka Canada", role: "Co-author and student researcher", body: "Writing, data analysis and R graphs for a published 34-country study, recognized as the national first-place team study.", slug: "global-health-research" },
  { period: "2025–2026", title: "Soma", role: "Backend and model-integration contributor", body: "A team-built health-education experiment that closed in 2026 after infrastructure limitations, according to my account.", slug: "soma-ai" },
] as const;

export const connectorSteps = [
  { label: "Server response", heading: "A green response was not the destination.", body: "The server returned a successful redirect, but the browser still stopped before provider sign-in. A fixture ending at the first hop missed the real failure.", active: 2, state: "Browser arrival unproven" },
  { label: "Browser journey", heading: "Follow the path a person actually takes.", body: "The corrected flow preserved consent and reached the provider's sign-in page. The release test stopped before granting a real account.", active: 4, state: "Sign-in navigation verified" },
  { label: "Retry", heading: "Resume the attempt. Keep its boundaries.", body: "Back, reload, and retry reused the existing provider attempt. Retry did not create a fresh authorization or extend its lifetime.", active: 3, state: "Existing attempt reused" },
] as const;

export const illustrativeNote = "Prepare a launch review. Mira owns the draft. Review the launch checklist on Thursday. No launch decision has been made.";
export const illustrativeBrief = [
  { text: "Review the launch checklist on Thursday.", source: "Review the launch checklist on Thursday." },
  { text: "Mira owns the draft.", source: "Mira owns the draft." },
  { text: "A launch decision is still open.", source: "No launch decision has been made." },
] as const;

/** Compact evidence used before the product imagery in both reading layers. */
export const anticipyPreview = {
  intro: "A successful server response still left the browser stranded at consent.",
  part: "I prioritized the repair, supplied phone observations, and required browser-tested release evidence. The decision was to preserve consent and expiry while retrying the saved authorization attempt.",
  before: "Server reports success. Browser stays at consent.",
  after: "Browser reaches the provider sign-in screen.",
  attribution: "Claude and Codex contributed implementation and review on the team’s existing product.",
  followThrough: "I later reported one successful Gmail read-and-summary task. Broader connector acceptance remained separate.",
} as const;
export const anticipySnapshot = [
  { id: "connector-journey", title: "Connected apps", result: "Repaired the browser path from consent to provider sign-in.", status: "Navigation correction deployed" },
  { id: "private-preparation", title: "Private AI", result: "One selected source, explicit consent, citations, cancellation, and spending limits.", status: "Local prototype · account preview processing disabled" },
  { id: "privacy-boundary", title: "Browser privacy", result: "Required protected-value checks on what actually reaches the model.", status: "Validated within defined browser fixtures" },
] as const;
