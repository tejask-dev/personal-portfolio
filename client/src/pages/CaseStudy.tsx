import { useEffect } from 'react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Link, useRoute } from 'wouter';
import Reveal from '@/components/Reveal';
import { getCaseStudy } from '@/data/projects';
import { useSeo } from '@/lib/seo';

export default function CaseStudy() {
  const [, params] = useRoute('/case-studies/:slug');
  const study = params?.slug ? getCaseStudy(params.slug) : undefined;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [params?.slug]);

  useSeo(
    study
      ? {
          title: `${study.title} | Work by Tejass Kaushik`,
          description: study.summary,
          path: `/case-studies/${study.slug}`,
        }
      : {
          title: 'Case study not found | Tejass Kaushik',
          description: 'The requested case study could not be found on Tejass Kaushik\'s portfolio.',
          path: params?.slug ? `/case-studies/${params.slug}` : '/case-studies',
          noIndex: true,
        },
  );

  if (!study) {
    return (
      <main className="case-page case-empty" id="main">
        <div className="case-shell">
          <p className="section-label">404 / Case study</p>
          <h1>This page is still on the whiteboard.</h1>
          <Link className="text-link" href="/"><ArrowLeft size={17} /> Back home</Link>
        </div>
      </main>
    );
  }

  return (
    <div className="case-page">
      <nav className="case-nav" aria-label="Case study navigation">
        <Link href="/#work"><ArrowLeft size={17} /> Selected work</Link>
        <Link className="wordmark" href="/">Tejass Kaushik<span>.</span></Link>
        <span>{study.period}</span>
      </nav>

      <main id="main">
        <header className="case-hero case-shell">
          <p className="section-label">{study.kicker} / {study.role}</p>
          {study.status && <p className="case-status">{study.status}</p>}
          <h1>{study.title}</h1>
          <p className="case-thesis">{study.thesis}</p>

          <div className="case-metrics">
            {study.metrics.map((metric) => (
              <div key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>
        </header>

        <div className={`case-image-wrap case-shell${study.imageTreatment ? ` case-image-wrap--${study.imageTreatment}` : ''}`}>
          <img src={study.image} alt={study.imageAlt} loading="eager" />
        </div>
        {study.imageCaption && <p className="case-image-caption case-shell">{study.imageCaption}</p>}

        <article className="case-story case-shell">
          <aside>
            <p className="section-label">The build</p>
            <dl>
              <div><dt>Role</dt><dd>{study.role}</dd></div>
              <div><dt>Period</dt><dd>{study.period}</dd></div>
              <div><dt>Tools</dt><dd>{study.stack.join(', ')}</dd></div>
            </dl>
          </aside>

          <div className="case-sections">
            <Reveal><p className="case-summary">{study.summary}</p></Reveal>
            {study.sections.map((section) => (
              <Reveal as="section" key={section.heading}>
                <h2>{section.heading}</h2>
                {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </Reveal>
            ))}

            <Reveal as="section" className="case-lesson">
              <span>What I learned</span>
              <p>{study.lesson}</p>
            </Reveal>

            {study.links.length > 0 && (
              <div className="case-links">
                {study.links.map((link) => (
                  <a href={link.href} target="_blank" rel="noreferrer" key={link.href}>
                    {link.label}<ArrowUpRight size={18} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </article>

        <section className="case-next">
          <div className="case-shell">
            <p className="section-label section-label-light">Keep looking</p>
            <Link href="/#work">Return to selected work <ArrowUpRight /></Link>
          </div>
        </section>
      </main>
    </div>
  );
}
