import somaImage from '../assets/SomaAI.png';
import stellarImage from '../assets/Stellar/stellar-current.png';
import docubridgeImage from '../assets/Docubridge.png';
import researchImage from '../assets/Youreka/Research Paper.png';
import mortgageImage from '../assets/MortgageWebsite.png';

export type CaseStudySection = {
  heading: string;
  body: string[];
};

export type CaseStudy = {
  slug: string;
  title: string;
  kicker: string;
  role: string;
  period: string;
  thesis: string;
  summary: string;
  metrics: { value: string; label: string }[];
  stack: string[];
  image: string;
  imageAlt: string;
  imageCaption?: string;
  imageTreatment?: 'cover' | 'paper';
  sections: CaseStudySection[];
  lesson: string;
  links: { label: string; href: string }[];
  flagship: boolean;
  status?: string;
};

export const caseStudies: CaseStudy[] = [
  {
    slug: 'stellar-learning',
    title: 'Stellar Learning',
    kicker: 'Education platform',
    role: 'Former CTO / technology lead',
    period: '2025 to 2026',
    thesis: 'Free exam preparation built to give more learners access to serious practice.',
    summary:
      'I served as CTO and technology lead at Stellar Learning, a volunteer-built platform for AP, IB, SAT, and competitive-math preparation. Its public site reports 40,000+ learners, 80+ courses, and 130+ volunteers.',
    metrics: [
      { value: '40,000+', label: 'learners' },
      { value: '80+', label: 'courses' },
      { value: '130+', label: 'volunteers' },
    ],
    stack: ['Technology leadership', 'Product engineering', 'Volunteer collaboration'],
    image: stellarImage,
    imageAlt: 'Stellar Learning homepage for free AP, IB, SAT, and competitive-math preparation',
    sections: [
      {
        heading: 'The premise',
        body: [
          'Stellar brings lessons, practice, mock exams, flashcards, and an AI tutor into one free study system. The constraint is central to the product: useful preparation should not depend on another subscription.',
        ],
      },
      {
        heading: 'My role',
        body: [
          'As CTO, I helped set technical priorities and turn the team\'s product goals into work contributors could ship. On a large volunteer project, clear scope and dependable collaboration mattered as much as code.',
        ],
      },
      {
        heading: 'Where it stands',
        body: [
          'The platform reports 40,000+ learners across 80+ courses, supported by 130+ volunteers. I have since stepped down from the CTO role.',
        ],
      },
    ],
    lesson:
      'Technical leadership is less about owning every decision than making good work easier for a team to deliver.',
    links: [{ label: 'Visit Stellar Learning', href: 'https://stellarlearning.app/' }],
    flagship: true,
  },
  {
    slug: 'soma-ai',
    title: 'Soma AI',
    kicker: 'Closed experiment',
    role: 'Developer and backend contributor',
    period: '2025 to 2026',
    status: 'Closed',
    thesis: 'A team-built experiment in conversational teen and sexual-health education.',
    summary:
      'I contributed to Soma\'s Flask backend and model integration. More than 300 people tried it, according to the team, but it did not become a durable product. We shut it down in 2026.',
    metrics: [
      { value: '300+', label: 'people tried it, team-reported' },
      { value: 'Closed', label: 'final status' },
    ],
    stack: ['Flask', 'Python', 'React', 'OpenRouter'],
    image: somaImage,
    imageAlt: 'Historical Soma AI landing page for its conversational teen health experiment',
    imageCaption: 'Historical interface, shown for context. The project is closed.',
    sections: [
      {
        heading: 'The experiment',
        body: [
          'Soma explored whether a conversational interface could make teen and sexual-health information easier to approach. It was built by a team and tested as an early product, not positioned as clinical care.',
        ],
      },
      {
        heading: 'My contribution',
        body: [
          'I worked as a developer and backend contributor, connecting the React experience to a Python and Flask service and supporting the OpenRouter-powered conversation flow.',
        ],
      },
      {
        heading: 'Why we stopped',
        body: [
          'More than 300 people tried Soma according to the team\'s reporting. That early reach did not lead to repeat value, clear ownership, or a sustainable reason to continue. We shut the project down.',
        ],
      },
    ],
    lesson:
      'A launch number is not product-market fit. Without repeat value and clear ownership, the right decision was to stop.',
    links: [{ label: 'View the closed project repository', href: 'https://github.com/tejask-dev/SomaAI' }],
    flagship: false,
  },
  {
    slug: 'global-health-research',
    title: 'Global health research',
    kicker: 'Youreka Canada',
    role: 'Co-author and student researcher',
    period: '2024 to 2025',
    thesis: 'A 34-country study of adolescent fertility and pediatric HIV treatment coverage in Sub-Saharan Africa.',
    summary:
      'With YoYo Wang, Shikai Jin, and Elijah Murtagh, I studied the relationship between adolescent fertility rates and pediatric antiretroviral treatment coverage. The paper reported a modest negative correlation (r = -0.3464) and was included in the 2025 Youreka Canada Journal.',
    metrics: [
      { value: '34', label: 'countries studied' },
      { value: '-0.3464', label: 'reported correlation' },
      { value: '2025', label: 'Youreka Journal' },
    ],
    stack: ['Public health data', 'Correlation analysis', 'Research communication'],
    image: researchImage,
    imageTreatment: 'paper',
    imageAlt:
      'Title and author line from the study on adolescent fertility and pediatric antiretroviral treatment in Sub-Saharan Africa',
    sections: [
      {
        heading: 'The question',
        body: [
          'Our team asked whether adolescent fertility rates were associated with pediatric antiretroviral treatment coverage across Sub-Saharan Africa. The analysis paired country-level indicators for 34 countries.',
        ],
      },
      {
        heading: 'What the data said',
        body: [
          'The paper reported r = -0.3464: a modest negative relationship, with higher adolescent fertility associated with lower pediatric treatment coverage in the sample. It was an association, not evidence that one variable caused the other.',
        ],
      },
      {
        heading: 'Limits and recognition',
        body: [
          'The analysis also examined PEPFAR funding per capita and HIV testing per capita while interpreting the cross-country relationship. The study received national recognition through Youreka and was included in its 2025 Journal.',
        ],
      },
    ],
    lesson:
      'Good research is not a race toward the strongest claim. It is the work of saying exactly what the evidence can support.',
    links: [
      {
        label: 'Read the 2025 journal',
        href: 'https://drive.google.com/file/d/1lTrTsLfvYSEkUlYoGWTSYcoekdeiJqu4/view?usp=sharing',
      },
      { label: 'Youreka Canada Journal', href: 'https://yourekacanada.org/research-1' },
    ],
    flagship: true,
  },
  {
    slug: 'docubridge',
    title: 'DocuBridge',
    kicker: 'Internship prototype',
    role: 'Software engineering intern',
    period: 'Summer 2025',
    thesis: 'A prototype for exploring financial data from uploaded Excel and CSV files.',
    summary:
      'During my internship, I worked on a financial-analysis prototype that accepted spreadsheet data and returned charts, summary views, and AI-assisted questions. It was a practical build, not a claim of a production financial system.',
    metrics: [
      { value: 'Excel + CSV', label: 'supported inputs' },
      { value: 'Prototype', label: 'project stage' },
    ],
    stack: ['Python', 'Flask', 'React', 'TypeScript', 'Pandas', 'Plotly', 'OpenRouter'],
    image: docubridgeImage,
    imageAlt: 'DocuBridge prototype interface for exploring uploaded financial spreadsheets',
    sections: [
      {
        heading: 'What I built',
        body: [
          'The prototype accepted Excel and CSV uploads, then exposed exploratory views for summaries, trends, ratios, anomalies, forecasts, and charts. A question-and-answer layer used the uploaded dataset as context.',
        ],
      },
      {
        heading: 'How it worked',
        body: [
          'A Python and Flask backend handled spreadsheet analysis with Pandas and related statistical tools. The React and TypeScript interface presented results through Plotly visualizations, with OpenRouter supporting natural-language questions.',
        ],
      },
      {
        heading: 'What it taught me',
        body: [
          'The useful challenge was turning a messy spreadsheet into an interface someone could inspect. It reinforced that generated analysis is only valuable when the underlying numbers remain visible and reviewable.',
        ],
      },
    ],
    lesson:
      'In financial software, an answer is only as useful as the path a person has to inspect it.',
    links: [{ label: 'View the prototype repository', href: 'https://github.com/tejask-dev/Docubridge-Intership' }],
    flagship: false,
  },
  {
    slug: 'web-solutions-venture',
    title: 'Client web venture',
    kicker: 'Independent client work',
    role: 'Founder and developer',
    period: '2025',
    thesis: 'Three client websites delivered through Ontario\'s Summer Company program.',
    summary:
      'I ran a small web-services venture through the Summer Company program, working with three clients from scoping through handoff. The largest engagement was approximately $10,000 USD.',
    metrics: [
      { value: '3', label: 'client projects' },
      { value: '~$10K', label: 'largest engagement, USD' },
    ],
    stack: ['React', 'TypeScript', 'Tailwind CSS', 'Client delivery'],
    image: mortgageImage,
    imageAlt: 'Mortgage business website created through the client-services venture',
    sections: [
      {
        heading: 'The work',
        body: [
          'I worked with three small-business clients on website projects, handling discovery, scope, implementation, revisions, and handoff. The industries included mortgage services, landscaping, and international trade.',
        ],
      },
      {
        heading: 'Why it mattered',
        body: [
          'The largest engagement was worth approximately $10,000 USD. More important than the number was the responsibility behind it: a client had paid for a clear outcome on a real timeline.',
        ],
      },
    ],
    lesson:
      'Client work turns ambiguity into commitments: a defined scope, a real deadline, and an outcome another person is paying for.',
    links: [],
    flagship: true,
  },
];

export const flagshipStudies = caseStudies.filter((study) => study.flagship);
export const secondaryStudies = caseStudies.filter((study) => !study.flagship);

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return caseStudies.find((study) => study.slug === slug);
}
