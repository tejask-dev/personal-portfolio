export const engineeringNotes = [
  {
    id: "relaypass-note", title: "RelayPass", stage: "Authorization prototype / public code",
    body: "A delegated agent should receive only the permission it needs. RelayPass explores signed permissions that narrow as work passes between agents, with deterministic checks before disclosure or action.",
    decision: "Revoking a parent permission also invalidates its descendants. That boundary is enforced in code, rather than left to a model’s interpretation.",
    credit: "Built with Claude. The Passport adapter, travel agents, downstream services and purchases are simulated; this is not a live merchant integration.",
    href: "https://github.com/tejask-dev/Egoist-Ideathon---RelayPass/blob/0cee5e98971ce597d290cfefcead50da6d7b4508/README.md#what-is-real",
    linkLabel: "Inspect the prototype and its limits",
  },
  {
    id: "open-water-note", title: "Open Water", stage: "This portfolio / React + Three.js",
    body: "A portfolio has two different jobs: make the work easy to read, and give someone a reason to explore. Here, the reading pages remain useful without graphics or JavaScript.",
    decision: "The ocean is optional. Movement, activities and return positions share one expedition state; reduced motion and a field guide provide other ways through the world.",
    credit: "I directed the experience and acceptance criteria. Codex and Claude contributed implementation, art and review. Original and adapted assets are credited in the world.",
    href: "https://github.com/tejask-dev/personal-portfolio",
    linkLabel: "See the portfolio repository",
  },
] as const;
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function engineeringNotesHtml() {
  return `<section class="engineering-notes pv-shell" id="engineering-notes" aria-labelledby="notes-title"><header><p class="pv-eyebrow">Small builds / concrete decisions</p><h2 id="notes-title">On the workbench.</h2><p>Two projects that show how I think about boundaries.</p></header><div class="engineering-notes-grid">${engineeringNotes.map(n => `<article id="${n.id}"><p class="pv-eyebrow">${escape(n.stage)}</p><h3>${escape(n.title)}</h3><p>${escape(n.body)}</p><p>${escape(n.decision)}</p><p class="engineering-note-credit">${escape(n.credit)}</p><a class="pv-text-link" href="${n.href}">${escape(n.linkLabel)} ↗</a></article>`).join('')}</div></section>`;
}
