/** Public narrative shared by the scroll experience and the no-JavaScript page. */
export const diveChapters = [
  {
    id: "surface", depth: "00", label: "The surface", eyebrow: "01 / A different perspective",
    title: ["There's more", "beneath the surface."],
    body: "A product is what you see. The interesting work is everything that makes it possible.",
    note: "Scroll to follow the descent", href: "#current-work", link: "Straight to Anticipy",
  },
  {
    id: "connections", depth: "06", label: "Below the waterline", eyebrow: "02 / Follow the whole journey",
    title: ["Interfaces connect.", "Systems deliver."],
    body: "At Anticipy, my work crosses connected apps, private AI workflows, and the devices in your hand.",
    note: "Founding Software Engineer / Anticipation Labs", href: "/case-studies/anticipy", link: "Explore the engineering",
  },
  {
    id: "fieldwork", depth: "14", label: "The living reef", eyebrow: "03 / Closer to the details",
    title: ["Follow the curiosity.", "Check the evidence."],
    body: "From leading technology at Stellar Learning to research and hands-on device testing, I like getting close enough to understand what really works.",
    note: "Build. Test. Learn. Repeat.", href: "#about", link: "Follow my background",
  },
  {
    id: "depth", depth: "24", label: "A deeper look", eyebrow: "04 / The work, in context",
    title: ["The depth", "is in the details."],
    body: "The decisions, the collaboration, the things that shipped—and the things still being built. Here's the work behind the view.",
    note: "Continue to the field notes", href: "#current-work", link: "See my work at Anticipy",
  },
] as const;

const esc = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
export function scrollDiveStaticHtml(base = "/") {
  return `<section class="sd-descent sd-static" id="descent" aria-label="Beneath the surface: a field expedition"><div class="sd-static-heading"><span>Open Water / A deeper look</span><a href="#current-work">Back to the work ↑</a></div><ol class="sd-stories">${diveChapters.map(chapter => `<li class="sd-chapter" id="dive-${chapter.id}"><div class="sd-copy"><p class="sd-eyebrow">${chapter.depth} m / ${esc(chapter.eyebrow)}</p><h2>${esc(chapter.title[0])}<br/><em>${esc(chapter.title[1])}</em></h2><p class="sd-description">${esc(chapter.body)}</p><a class="sd-story-link" href="${chapter.href.startsWith("/") ? esc(base + chapter.href.slice(1)) : esc(chapter.href)}">${esc(chapter.link)} ↗</a></div></li>`).join("")}</ol></section>`;
}
