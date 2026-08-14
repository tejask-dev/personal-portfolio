import { useEffect } from 'react';
import { Link } from 'wouter';
import Reveal from '@/components/Reveal';
import { profile } from '@/data/profile';
import { selectedWork } from '@/data/selectedWork';
import { useSeo } from '@/lib/seo';
import portrait from '@/assets/Professional photo shoot seteve jobs kinda photo must use.jpeg';
import gdgPortrait from '@/assets/Tejas GDG Toro.png';

function Arrow({ direction = 'up' }: { direction?: 'up' | 'down' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" fill="none">
      {direction === 'up' ? (
        <path d="M4 14 14 4m0 0H6m8 0v8" />
      ) : (
        <path d="M9 3v12m0 0 5-5m-5 5-5-5" />
      )}
    </svg>
  );
}

function Navigation() {
  return (
    <nav className="site-nav shell" aria-label="Primary navigation">
      <a className="wordmark" href="#top" aria-label="Tejass Kaushik, home">
        Tejass K.<span aria-hidden="true">/</span>
      </a>
      <div className="site-links">
        <a href="#work">Work</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </div>
    </nav>
  );
}

export default function Home() {
  useSeo({ path: '/' });

  useEffect(() => {
    const target = window.location.hash.slice(1);
    window.requestAnimationFrame(() => {
      if (target) document.getElementById(target)?.scrollIntoView();
      else window.scrollTo({ top: 0, behavior: 'instant' });
    });
  }, []);

  return (
    <div className="portfolio" id="top">
      <a className="skip-link" href="#main">Skip to content</a>

      <div className="hero-surface">
        <Navigation />
      </div>

      <main id="main">
        <div className="hero-surface">
          <header className="hero shell">
            <div className="hero-kicker hero-enter hero-enter-1">
              <span>Builder / technologist</span>
              <span>Windsor, Ontario</span>
            </div>

            <div className="hero-composition">
              <h1 className="hero-name" aria-label="Tejass Kaushik">
                <span className="hero-name-mask"><span className="hero-name-line hero-enter-2">Tejass</span></span>
                <span className="hero-name-mask"><span className="hero-name-line hero-enter-3">Kaushik</span></span>
              </h1>

              <div className="hero-copy hero-enter hero-enter-4">
                <p className="hero-statement">I build software, test ideas, and keep what works.</p>
                <p className="hero-context">Former CTO at Stellar Learning. Now building again.</p>
                <a className="arrow-link arrow-link-light" href="#work">
                  See selected work <Arrow direction="down" />
                </a>
              </div>

              <figure className="hero-portrait hero-enter-5">
                <div className="hero-portrait-mask">
                  <img
                    src={portrait}
                    width="420"
                    height="336"
                    alt="Tejass Kaushik seated behind a sticker-covered laptop in a black-and-white portrait."
                    loading="eager"
                    {...{ fetchpriority: 'high' }}
                  />
                </div>
                <figcaption>Portrait / Windsor</figcaption>
              </figure>
            </div>

            <dl className="hero-proof hero-enter hero-enter-6" aria-label="Selected evidence">
              <div>
                <dt>40,000+</dt>
                <dd>learners reported by Stellar</dd>
              </div>
              <div>
                <dt>3</dt>
                <dd>client projects delivered</dd>
              </div>
              <div>
                <dt>1st</dt>
                <dd>Youreka national symposium</dd>
              </div>
            </dl>
          </header>
        </div>

      <section className="selected-work" id="work" aria-labelledby="work-title">
        <header className="section-heading shell">
          <p className="section-label">01 / Selected work</p>
          <h2 id="work-title">Three things<br />worth opening.</h2>
        </header>

        <div className="work-list">
          {selectedWork.map((project, index) => (
            <article className={`work-entry work-entry--${project.treatment}`} key={project.slug}>
              <div className="work-entry-inner shell">
                <Reveal className="work-heading">
                  <p className="work-index">
                    {String(index + 1).padStart(2, '0')} / {String(selectedWork.length).padStart(2, '0')}
                  </p>
                  <div className="work-title-wrap">
                    <p className="work-label">{project.label}</p>
                    <h3><Link href={`/case-studies/${project.slug}`}>{project.title}</Link></h3>
                  </div>
                  <div className="work-summary">
                    <p>{project.description}</p>
                    <dl>
                      <div><dt>Role</dt><dd>{project.role}</dd></div>
                      <div><dt>When</dt><dd>{project.period}</dd></div>
                    </dl>
                  </div>
                </Reveal>

                {project.treatment === 'product' && project.image && (
                  <Reveal className="work-media work-media--product" distance={18}>
                    <Link href={`/case-studies/${project.slug}`} aria-label={`Read the ${project.title} case study`}>
                      <img src={project.image} alt={project.imageAlt} width="1440" height="1000" loading="lazy" />
                    </Link>
                  </Reveal>
                )}

                {project.treatment === 'research' && project.image && (
                  <Reveal className="work-media work-media--research" distance={18}>
                    <Link href={`/case-studies/${project.slug}`} aria-label={`Read the ${project.title} case study`}>
                      <img src={project.image} alt={project.imageAlt} width="821" height="276" loading="lazy" />
                    </Link>
                  </Reveal>
                )}

                <div className="work-footer">
                  <p>{project.proof}</p>
                  <Link className="arrow-link" href={`/case-studies/${project.slug}`}>
                    View case study <Arrow />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="about" id="about" aria-labelledby="about-title">
        <div className="about-intro shell">
          <p className="section-label">02 / About</p>
          <Reveal className="about-statement">
            <h2 id="about-title">Back to<br /><em>building.</em></h2>
            <p>
              I&apos;m a builder in Windsor, Ontario. I served as CTO at Stellar Learning, where I helped
              build a free exam-preparation platform that reports 40,000+ learners. Since stepping down,
              I&apos;m back to building and testing new ideas. I&apos;m starting Computer Science at Western
              alongside Ivey AEO in 2026.
            </p>
          </Reveal>
        </div>

        <div className="about-detail shell">
          <Reveal as="article" className="about-photo">
            <img
              src={gdgPortrait}
              width="652"
              height="405"
              alt="Tejass Kaushik at GDG Cloud Toronto DevFest 2025."
              loading="lazy"
            />
            <p>GDG Cloud Toronto DevFest, 2025.</p>
          </Reveal>

          <div className="trajectory">
            <p className="section-label">Where things stand</p>
            <div className="trajectory-list">
              <Reveal className="trajectory-row">
                <time>Now</time><strong>Building again</strong><span>Testing ideas and working on what comes next</span>
              </Reveal>
              <Reveal className="trajectory-row" delay={0.04}>
                <time>2025—26</time><strong>Stellar Learning</strong><span>CTO / technology lead</span>
              </Reveal>
              <Reveal className="trajectory-row" delay={0.08}>
                <time>2026</time><strong>Western + Ivey</strong><span>Computer Science / AEO</span>
              </Reveal>
            </div>

            <div className="more-work">
              <span>More case notes</span>
              <Link href="/case-studies/docubridge">DocuBridge <Arrow /></Link>
              <Link href="/case-studies/web-solutions-venture">Client web venture <Arrow /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="contact" id="contact" aria-labelledby="contact-title">
        <div className="shell">
          <p className="section-label section-label-light">03 / Contact</p>
          <Reveal className="contact-heading">
            <h2 id="contact-title">Have an idea<br /><em>worth testing?</em></h2>
            <p>Feel free to reach out to me at either address.</p>
          </Reveal>

          <div className="email-list">
            <a href={`mailto:${profile.email}`}>
              <span>{profile.email}</span><Arrow />
            </a>
            <a href={`mailto:${profile.uwoEmail}`}>
              <span>{profile.uwoEmail}</span><Arrow />
            </a>
          </div>

          <div className="contact-meta">
            <div className="social-links" aria-label="Social profiles">
              <a href={profile.socials.linkedin} target="_blank" rel="noreferrer">LinkedIn <Arrow /></a>
              <a href={profile.socials.github} target="_blank" rel="noreferrer">GitHub <Arrow /></a>
              <a href={profile.socials.instagram} target="_blank" rel="noreferrer">Instagram <Arrow /></a>
            </div>
            <p>Windsor, Ontario, Canada</p>
          </div>
        </div>

      </section>
      </main>

      <footer className="site-footer">
        <div className="footer shell">
          <span>© {new Date().getFullYear()} Tejass Kaushik</span>
          <a href="#top">Back to top <span aria-hidden="true">↑</span></a>
        </div>
      </footer>
    </div>
  );
}
