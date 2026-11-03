import { inject, track, type BeforeSendEvent } from "@vercel/analytics";
import { SITE_URL } from "./siteMetadata.ts";

const publicRoutes = new Set(["/", "/resume", "/case-studies/anticipy", "/case-studies/stellar-learning", "/case-studies/global-health-research", "/case-studies/docubridge", "/case-studies/soma-ai"]);
const projectLinks = new Map([
  ["https://anticipy.ai/", "anticipy"],
  ["https://stellarlearning.app/", "stellar-learning"],
  ["https://organic-chem-web-app.vercel.app/", "molecule-ai"],
  ["https://prom-match.vercel.app/", "prom-match"],
  ["https://github.com/tejask-dev/OrganicChem-WebApp", "molecule-ai"],
  ["https://github.com/tejask-dev/PromMatch", "prom-match"],
  ["https://github.com/tejask-dev/ACS_CanDrive-WebApp", "acs-can-drive"],
  ["https://github.com/tejask-dev/Egoist-Ideathon---RelayPass", "relaypass"],
  ["https://github.com/tejask-dev/Docubridge-Intership", "docubridge"],
  ["https://github.com/tejask-dev/SomaAI", "soma-ai"],
  ["https://github.com/tejask-dev/personal-portfolio", "open-water"],
]);

export function redactAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const url = new URL(event.url);
    if (url.origin !== SITE_URL || !publicRoutes.has(url.pathname)) return null;
    return { type: event.type, url: `${SITE_URL}${url.pathname}` };
  } catch { return null; }
}

/** Only fixed category/project names leave the page, never link text or destination URLs. */
export function portfolioLinkEvent(href: string, origin: string) {
  try {
    const url = new URL(href, origin);
    if (url.protocol === "mailto:") return { name: "Email click", data: {} };
    if (!/^https?:$/.test(url.protocol)) return null;
    if (url.origin === origin) {
      if (/\/Tejass-Kaushik-Resume\.pdf$/.test(url.pathname)) return { name: "Resume download", data: {} };
      if (/\/resume(?:\.html)?$/.test(url.pathname)) return { name: "Resume view", data: {} };
      const path = url.pathname.replace(/\/$/, "");
      if (publicRoutes.has(path) && path.startsWith("/case-studies/")) return { name: "Project open", data: { project: path.split("/")[2] } };
      return null;
    }
    // Source links can point inside a repository; classify by its public repo root.
    const projectPath = url.hostname === "github.com"
      ? `/${url.pathname.split("/").filter(Boolean).slice(0, 2).join("/")}`
      : url.pathname;
    const project = projectLinks.get(`${url.origin}${projectPath}`);
    return project ? { name: "Project open", data: { project } } : { name: "Outbound link", data: {} };
  } catch { return null; }
}

export function startAnalytics() {
  inject({ mode: "production", debug: false, beforeSend: redactAnalyticsEvent });
  // Custom events require Vercel Pro/Enterprise; leave off on the current Hobby plan.
  if (import.meta.env.VITE_ANALYTICS_CUSTOM_EVENTS !== "true") return;
  document.addEventListener("click", event => {
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!anchor) return;
    const interaction = portfolioLinkEvent(anchor.getAttribute("href")!, location.origin);
    if (interaction) track(interaction.name, interaction.data);
  }, { capture: true });
}
