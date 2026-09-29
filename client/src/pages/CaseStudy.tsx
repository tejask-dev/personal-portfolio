import { useEffect, useRef, type CSSProperties } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link, useRoute } from "wouter";
import { getCaseStudy } from "@/data/projects";
import { useSeo } from "@/lib/seo";

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
          description: study.summary,
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

  if (!study) {
    return (
      <main className="case-page case-empty" id="main">
        <div className="case-shell">
          <p className="section-label">404 / Case study</p>
          <h1 ref={headingRef} tabIndex={-1}>
            This case study could not be found.
          </h1>
          <Link className="text-link" href="/#work">
            <ArrowLeft size={17} /> Open the work index
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="case-page">
      <a className="skip-link" href="#main">
        Skip to case study
      </a>
      <nav className="case-nav" aria-label="Case study navigation">
        <Link href="/#voyage">
          <ArrowLeft size={17} /> Return to water
        </Link>
        <Link className="wordmark" href="/">
          Tejass Kaushik<span>.</span>
        </Link>
        <Link className="case-index-link" href="/#work">
          Work index <ArrowUpRight size={15} />
        </Link>
      </nav>

      <main id="main">
        <header className="case-hero case-shell">
          <p className="section-label">{study.kicker}</p>
          {study.status && <p className="case-status">{study.status}</p>}
          <h1 ref={headingRef} tabIndex={-1}>
            {study.title}
          </h1>
          <p className="case-thesis">{study.thesis}</p>

          <div className="case-metrics" aria-label="Project context">
            {study.metrics.map((metric) => (
              <div key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>
        </header>

        <figure className="case-artifact case-shell">
          <div
            className={`case-image-wrap${study.imageTreatment ? ` case-image-wrap--${study.imageTreatment}` : ""}`}
          >
            <img
              src={study.image}
              alt={study.imageAlt}
              loading="eager"
              decoding="async"
              width={study.imageTreatment === "illustration" ? 1440 : undefined}
              height={study.imageTreatment === "illustration" ? 900 : undefined}
              style={
                { viewTransitionName: "project-artifact" } as CSSProperties
              }
            />
          </div>
          {study.imageCaption && (
            <figcaption className="case-image-caption">
              {study.imageCaption}
            </figcaption>
          )}
        </figure>

        <article className="case-story case-shell">
          <aside aria-label="Project details">
            <p className="section-label">The work</p>
            <dl>
              <div>
                <dt>Role</dt>
                <dd>{study.role}</dd>
              </div>
              <div>
                <dt>Period</dt>
                <dd>{study.period}</dd>
              </div>
              <div>
                <dt>Focus</dt>
                <dd>{study.stack.join(", ")}</dd>
              </div>
            </dl>
          </aside>

          <div className="case-sections">
            <div>
              <p className="case-summary">{study.summary}</p>
            </div>
            {study.sections.map((section) => (
              <section key={section.heading}>
                <h2>{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}

            <section className="case-lesson">
              <span>A working principle</span>
              <p>{study.lesson}</p>
            </section>

            {study.links.length > 0 && (
              <div
                className="case-links"
                aria-label="Project sources and links"
              >
                {study.links.map((link) => (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    key={link.href}
                  >
                    {link.label}
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </article>

        <section className="case-next">
          <div className="case-shell">
            <p className="section-label section-label-light">
              Open Water / Keep exploring
            </p>
            <Link href="/#voyage">
              Return to water <ArrowUpRight aria-hidden="true" />
            </Link>
            <Link className="case-next-index" href="/#work">
              Or go straight to the work index{" "}
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
