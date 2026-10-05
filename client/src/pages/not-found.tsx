import { Link, useLocation } from "wouter";
import { useSeo } from "@/lib/seo";
import { profile } from "@/data/profile";
import "./portfolio-v3.css";

export default function NotFound() {
  const [location] = useLocation();
  useSeo({ title: "Page not found | Tejass Kaushik", description: "This page could not be found. Browse selected work or contact Tejass Kaushik.", path: location, noIndex: true });
  return <main className="portfolio-v3 pv-empty" id="main"><div className="pv-shell"><p className="pv-eyebrow">404 / Uncharted water</p><h1>This page could not be found.</h1><p>The work is still here. Start with a project or get in touch.</p><Link className="pv-button" href="/#work">See selected work ↗</Link>{" "}<a className="pv-text-link" href={`mailto:${profile.email}`}>Contact Tejass ↗</a></div></main>;
}
