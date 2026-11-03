export const moreProjects = [
  { id: "prommatch", title: "PromMatch", body: "Student matchmaking with questionnaires, profile recommendations and mutual matches. Weighted answers meet semantic similarity.", stage: "React / FastAPI / PostgreSQL + pgvector", href: "https://prom-match.vercel.app/", linkLabel: "Visit app" },
  { id: "acs-candrive", title: "ACS can-drive app", body: "Built in five days: donation tracking, leaderboards and collection coordination for a school campaign that collected 27,000+ cans.", stage: "Shipped / Community project", href: "https://github.com/tejask-dev/ACS_CanDrive-WebApp", linkLabel: "View code" },
  { id: "relaypass", title: "RelayPass", body: "Signed permissions that narrow as work passes between AI agents. Revoking a parent also revokes its descendants, enforced in code.", stage: "Hackathon prototype / Simulated services", href: "https://github.com/tejask-dev/Egoist-Ideathon---RelayPass", linkLabel: "View code" },
  { id: "docubridge", title: "DocuBridge", body: "An internship prototype for exploring Excel and CSV files with charts, summaries and questions about the data.", stage: "Python / Flask / Pandas / React / Plotly", href: "/case-studies/docubridge", linkLabel: "Read case" },
  { id: "soma-ai", title: "Soma AI", body: "Conversational teen-health education. Our team reported 300+ people tried it; we closed the project in 2026.", stage: "Python / Flask / React", href: "/case-studies/soma-ai", linkLabel: "Read case" },
  { id: "open-water", title: "Open Water", body: "This site’s optional ocean: captain a yacht, swim through reefs, race a tender or follow a cinematic descent.", stage: "React / Three.js / React Three Fiber", href: "#ocean", linkLabel: "Take a look" },
] as const;

const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function moreProjectsHtml(base = "/") {
  return `<section class="eh-more-projects" aria-labelledby="more-projects-title"><header><p class="pv-eyebrow">And a few more</p><h3 id="more-projects-title">Built along the way.</h3></header><div>${moreProjects.map(p => `<article class="eh-project-compact"><div><h4>${escape(p.title)}</h4><p class="pv-eyebrow">${escape(p.stage)}</p></div><p>${escape(p.body)}</p><a id="read-${p.id}" class="pv-text-link" href="${p.href.startsWith('/') ? base + p.href.slice(1) : p.href}"${p.href.startsWith('https:') ? ' target="_blank" rel="noreferrer"' : ''}>${escape(p.linkLabel)} <span aria-hidden="true">↗</span></a></article>`).join('')}</div></section>`;
}
