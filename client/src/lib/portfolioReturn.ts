import { diveChapters } from "@/features/scroll-dive/content";

// ScrollDive renders these exact IDs for its case-study links. Returning to
// one needs the lazy section mounted before native scroll and focus restore.
const interactiveReturnTargets = new Set<string>([
  "yacht-controls",
  "open-work-index",
  ...diveChapters
    .filter(chapter => chapter.href.startsWith("/case-studies/"))
    .map(chapter => `dive-link-${chapter.id}`),
]);

export const isInteractiveReturnFocus = (id: string) => interactiveReturnTargets.has(id);
