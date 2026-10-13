import { useEffect, useRef, type CSSProperties } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link, useRoute } from "wouter";
import { caseStudies, getCaseStudy } from "@/data/projects";
import { voyage } from "@/features/open-water/voyage";
import { profile } from "@/data/profile";
import { useSeo } from "@/lib/seo";
import { socialMetadata } from "@/lib/socialMetadata";
import "./portfolio-v3.css";
import DocuBridgeWorkbench from "@/components/editorial/DocuBridgeWorkbench";
import { AnticipyDeepDive } from "@/components/portfolio-v4/Flagship";

export default function CaseStudy() {
  const [, params] = useRoute("/case-studies/:slug");
  const study = params?.slug ? getCaseStudy(params.slug) : undefined;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    headingRef.current?.focus({ preventScroll: true });
  }, [params?.slug]);
  useSeo(
    study
      ? {
          title: `${study.title} | Work by Tejass Kaushik`,
          description: socialMetadata(`/case-studies/${study.slug}`).description,
          path: `/case-studies/${study.slug}`,
        }
      : {
          title: "Case study not found | Tejass Kaushik",
          description:
            "The requested case study could not be found on Tejass Kaushik's portfolio.",
          path: params?.slug ? `/case-studies/${params.slug}` : "/case-studies",
          noIndex: true,
        },
  );

  if (!study)
    return (
      <main className="case-page portfolio-v3 pv-empty" id="main">
        <div className="pv-shell">
          <p className="pv-eyebrow">404 / Case study</p>
          <h1 ref={headingRef} tabIndex={-1}>
            This case study could not be found.
          </h1>
          <Link className="pv-text-link" href="/#work">
            <ArrowLeft size={18} /> Open the work index
          </Link>
        </div>
      </main>
    );

  const next =
    caseStudies[(caseStudies.indexOf(study) + 1) % caseStudies.length];
  return (
    <div className="case-page portfolio-v3 pv-case" onClickCapture={(event) => {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
      // An explicit reading destination supersedes saved back-navigation focus.
      if (link && !event.metaKey && !event.ctrlKey && !event.shiftKey && /\/#(?:work|about|voyage|contact)$/.test(link.getAttribute("href") ?? "")) {
        voyage.returnPending = false;
      }
    }}>
      <a className="skip-link" href="#main">
        Skip to case study
      </a>
      <nav className="pv-case-nav" aria-label="Case study navigation">
        <Link className="pv-wordmark" href="/">
          Tejass Kaushik<span> / Open Water</span>
        </Link>
        <div>
          <Link href="/#voyage">Return to water</Link>
          <Link href="/#work">Selected work</Link>
          <Link href="/#about">About</Link>
          <a href={`mailto:${profile.email}`}>
            Contact <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>
      </nav>
      <main id="main">
        <header className="pv-case-hero pv-shell">
          <div className="pv-case-breadcrumb">
            <Link href="/#work">
              <ArrowLeft size={16} aria-hidden="true" /> All projects
            </Link>
            <span>{study.kicker}</span>
          </div>
          <p className="pv-stage">{study.status}</p>
          <h1 ref={headingRef} tabIndex={-1}>
            {study.title}
          </h1>
          <p className="pv-case-thesis">{study.thesis}</p>
          <dl className="pv-case-facts">
            <div>
              <dt>My role</dt>
              <dd>{study.role}</dd>
            </div>
            <div>
              <dt>Period</dt>
              <dd>{study.period}</dd>
            </div>
            <div>
              <dt>Focus</dt>
              <dd>{study.stack.slice(0, 3).join(" · ")}</dd>
            </div>
          </dl>
          <p className="pv-case-summary">{study.summary}</p>
        </header>
        {study.slug === "anticipy" ? <AnticipyDeepDive /> : <>
        <figure className="pv-case-artifact pv-shell" id="artifact">
          <div className="pv-artifact-label">
            <span>{study.artifactLabel}</span>
            <span aria-hidden="true">
              Field note / {study.kicker.split(" / ")[0]}
            </span>
          </div>
          <div
            className={`pv-case-image pv-case-image--${study.imageTreatment ?? "cover"}`}
          >
            <img
              src={study.image}
              alt={study.imageAlt}
              loading="eager"
              decoding="async"
              style={
                { viewTransitionName: "project-artifact" } as CSSProperties
              }
            />
          </div>
          <figcaption>
            <p>{study.imageCaption}</p>
            {study.artifactSource && (
              <a
                href={study.artifactSource.href}
                target="_blank"
                rel="noreferrer"
              >
                {study.artifactSource.label}
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            )}
          </figcaption>
        </figure>
        <article className="pv-case-reading pv-shell">
          <aside className="pv-reading-index" aria-label="On this page">
            <p className="pv-eyebrow">In this case</p>
            <nav>
              <a href="#context">Context</a>
              <a href="#contribution">My contribution</a>
              <a href="#decision">{study.decision.label.split(" / ")[0]}</a>
              <a href="#outcome">Outcome & limits</a>
              <a href="#sources">Sources</a>
            </nav>
            <p>{study.stack.join(" / ")}</p>
          </aside>
          <div className="pv-case-prose">
            <section id="context">
              <p className="pv-eyebrow">01 / Context</p>
              <h2>{study.sections[0].heading}</h2>
              {study.sections[0].body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </section>
            <section id="contribution">
              <p className="pv-eyebrow">02 / Scope</p>
              <h2>My part in the work.</h2>
              <ul className="pv-contributions">
                {study.contributions.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <div className="pv-team-context">
                <h3>Team & project context</h3>
                <p>{study.teamContext}</p>
              </div>
            </section>
            <section className="pv-decision" id="decision">
              <p className="pv-eyebrow">03 / {study.decision.label}</p>
              <h2>{study.decision.title}</h2>
              {study.decision.label.includes("team context") && (
                <p>This section describes the team’s product context; my own scope is listed under My contribution.</p>
              )}
              {study.decision.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {study.slug === "docubridge" && <DocuBridgeWorkbench />}
              {study.decision.source && (
                <a
                  className="pv-text-link"
                  href={study.decision.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  Inspect the source{" "}
                  <ArrowUpRight size={17} aria-hidden="true" />
                </a>
              )}
            </section>
            <section id="outcome">
              <p className="pv-eyebrow">04 / Outcome & limits</p>
              {study.sections.slice(1).map((section) => (
                <div key={section.heading}>
                  <h2>{section.heading}</h2>
                  {section.body.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              ))}
              <dl className="pv-context-facts">
                {study.metrics.map((metric) => (
                  <div key={metric.label}>
                    <dt>{metric.label}</dt>
                    <dd>{metric.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
            {study.lesson && <div className="pv-takeaway">
              <span className="pv-eyebrow">What I carry forward</span>
              <p>{study.lesson}</p>
            </div>}
            <section id="sources">
              <p className="pv-eyebrow">05 / Follow the evidence</p>
              <h2>Sources & context.</h2>
              <p className="pv-evidence-note">{study.evidenceNote}</p>
              <ul
                className="pv-source-list"
                aria-label="Project sources and links"
              >
                {study.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} target="_blank" rel="noreferrer">
                      {link.label}
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </a>
                    {link.note && <p>{link.note}</p>}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </article>
        </>}
        <section className="pv-case-contact">
          <div className="pv-shell">
            <p className="pv-eyebrow">A next conversation</p>
            <h2>
              Have something
              <br />
              <em>in mind?</em>
            </h2>
            <p>
              I’d like to hear what you’re building and where I could
              contribute.
            </p>
            <a
              className="pv-button"
              href={`mailto:${profile.email}?subject=${encodeURIComponent(`Engineering opportunity — ${study.title}`)}`}
            >
              Contact about opportunities{" "}
              <ArrowUpRight size={20} aria-hidden="true" />
            </a>
            <a className="pv-email" href={`mailto:${profile.email}`}>
              {profile.email}
            </a>
          </div>
        </section>
        <footer className="pv-case-end pv-shell">
          <Link href="/#voyage">
            <ArrowLeft size={18} aria-hidden="true" /> Return to water
          </Link>
          <Link href={`/case-studies/${next.slug}`}>
            <span>Next case</span>
            <strong>{next.title}</strong>
            <ArrowUpRight size={22} aria-hidden="true" />
          </Link>
        </footer>
      </main>
    </div>
  );
}
