import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { profile } from "@/data/profile";
import { selectedWork } from "@/data/selectedWork";
import { voyage } from "@/features/open-water/voyage";
import { useSeo } from "@/lib/seo";
import { AnticipyFeature } from "@/components/portfolio-v4/Flagship";
import EngineeringNotes from "@/components/editorial/EngineeringNotes";
import "./portfolio-v3.css";
import "./editorial-home.css";
import portrait from "@/assets/Professional photo shoot seteve jobs kinda photo must use.jpeg";

const OpenWaterExperience = lazy(
  () => import("@/features/open-water/OpenWaterExperience"),
);
const ScrollDive = lazy(() => import("@/features/scroll-dive/ScrollDive"));

/** Remember the visitor’s choice across routes; the scene itself unmounts on exit. */
let worldWasOpened = false;

function Arrow() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 15 15 5M5 5h10v10" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function Sailmark() {
  return (
    <svg viewBox="0 0 32 42" fill="none" aria-hidden="true">
      <path
        d="M16 4 6 25h10V4Zm2 0v21h8L18 4ZM5 29c4-4 6 4 11 0s7 4 11 0M3 34c5-4 8 4 13 0s8 4 13 0M7 39c4-3 6 3 9 0s6 3 9 0"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

class WorldErrorBoundary extends Component<
  { children: ReactNode; onReady: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <>
          <WorldReady onReady={this.props.onReady} />
          <p id="ocean-load-error" className="eh-ocean-fallback" role="status" tabIndex={-1}>
            Open Water couldn’t load. <a href="#work">See the work</a> or{" "}
            <a href="#contact">get in touch</a> instead.
          </p>
        </>
      );
    return this.props.children;
  }
}

function ProjectImage({ src }: { src: string }) {
  const image = useRef<HTMLImageElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    if (image.current) observer.observe(image.current);
    return () => observer.disconnect();
  }, []);
  return (
    <img
      ref={image}
      src={near ? src : undefined}
      alt=""
      loading="lazy"
      decoding="async"
      width="900"
      height="580"
    />
  );
}

const oceanHashes = ["voyage", "descent"];
const needsOcean = (hash: string) => oceanHashes.includes(hash) || hash.startsWith("dive-");

// Navigation can settle once either both lazy modules or their fallback render.
function WorldReady({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

export default function Home() {
  useSeo({ path: "/" });
  const [copyStatus, setCopyStatus] = useState("");
  const [descentOwnsScene, setDescentOwnsScene] = useState(false);
  const [worldOpen, setWorldOpen] = useState(() => {
    const hash = window.location.hash.slice(1);
    return (
      worldWasOpened ||
      oceanHashes.includes(hash) ||
      hash.startsWith("dive-")
    );
  });
  const [worldReady, setWorldReady] = useState(false);
  const [navigation, setNavigation] = useState(0);
  const opened = useCallback(() => setWorldReady(true), []);
  const openButton = useRef<HTMLButtonElement>(null);
  const restoreOpenFocus = useRef(false);
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopyStatus("Email address copied.");
    } catch {
      setCopyStatus("Select the email address above to copy it.");
    }
  };
  useEffect(() => {
    if (worldOpen) worldWasOpened = true;
  }, [worldOpen]);
  useEffect(() => {
    const onHashChange = () => {
      if (needsOcean(window.location.hash.slice(1))) setWorldOpen(true);
      setNavigation(value => value + 1);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  useEffect(() => {
    const target = window.location.hash.slice(1);
    if ((needsOcean(target) || (worldOpen && voyage.returnPending)) && !worldReady) return;
    const frame = requestAnimationFrame(() => {
      if (restoreOpenFocus.current) {
        restoreOpenFocus.current = false;
        openButton.current?.focus();
        return;
      }
      if (voyage.returnPending) {
        window.scrollTo({ top: voyage.returnScroll, behavior: "instant" });
        const original = document.getElementById(voyage.returnFocus);
        const focusTarget = original?.getClientRects().length && !original.closest("[inert]")
          ? original : document.getElementById(worldOpen ? "take-helm" : "work-title");
        focusTarget?.focus({ preventScroll: true });
        voyage.returnPending = false;
      } else if (target) {
        const fallback = needsOcean(target) ? document.getElementById("ocean-load-error") : null;
        const section = document.getElementById(target) ?? fallback;
        section?.scrollIntoView({ behavior: "instant" });
        const heading = fallback ?? (target === "voyage"
          ? document.getElementById(voyage.sailing || voyage.expedition.mode !== "surface" ? "yacht-controls" : "take-helm")
          : document.getElementById(`${target}-title`) ?? section);
        if (heading && heading.tabIndex < 0) heading.tabIndex = -1;
        heading?.focus({ preventScroll: true });
      } else window.scrollTo({ top: 0, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [worldOpen, worldReady, navigation]);
  const closeWorld = () => {
    worldWasOpened = false;
    restoreOpenFocus.current = true;
    voyage.paused = true;
    voyage.expedition.userPaused = true;
    setWorldReady(false);
    setDescentOwnsScene(false);
    setWorldOpen(false);
    if (needsOcean(window.location.hash.slice(1))) history.replaceState(null, "", "#ocean-title");
  };
  return (
    <div
      className="open-water-page"
      id="top"
      onClickCapture={(event) => {
        const link = (event.target as HTMLElement).closest<HTMLAnchorElement>(
          'a[href*="/case-studies/"]',
        );
        if (link && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
          voyage.returnPending = true;
          voyage.returnScroll = window.scrollY;
          voyage.returnFocus =
            link.id || `read-${link.getAttribute("href")?.split("/").pop()}`;
        }
      }}
    >
      <a className="skip-link" href="#work" onClick={() => document.getElementById("work-title")?.focus({ preventScroll: true })}>
        Skip to work
      </a>
      <header className="portfolio-v3 eh-header">
        <a className="eh-brand" href="#top">
          <Sailmark />
          Tejass Kaushik
        </a>
        <nav aria-label="Primary">
          <a href="#work">Selected work</a>
          <Link id="nav-anticipy" href="/case-studies/anticipy">Anticipy</Link>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>
      <main id="main">
        <section className="portfolio-v3 eh-hero pv-shell" aria-labelledby="hero-title">
          <p className="pv-eyebrow">Tejass Kaushik / Software engineer</p>
          <h1 id="hero-title">{profile.headline}</h1>
          <p className="eh-hero-role">{profile.intro}</p>
          <p className="eh-hero-proof">
            At Anticipy, I made the real browser journey the acceptance test
            for connecting an app—not just a successful server response.
          </p>
          <div className="eh-hero-actions">
            <a className="pv-button" href="#work">
              View selected work <Arrow />
            </a>
            <a className="pv-text-link" href="#contact">
              Contact <Arrow />
            </a>
          </div>
        </section>
        <div className="portfolio-v3">
          <AnticipyFeature />
          <section
            id="work"
            tabIndex={-1}
            className="pv-work pv-shell"
            aria-labelledby="work-title"
          >
            <header className="pv-section-heading">
              <p className="pv-eyebrow">01 / The work</p>
              <h2 id="work-title" tabIndex={-1}>
                The work,
                <br />
                <em>in context.</em>
              </h2>
              <p>
                Product engineering, platform leadership, and questions worth
                investigating. My role and the evidence behind each.
              </p>
            </header>
            <div className="pv-work-grid">
              {selectedWork
                .filter((project) => project.slug !== "anticipy")
                .map((project, index) => {
                  const compact = project.slug === "soma-ai";
                  return (
                    <article
                      className={`pv-project${compact ? " eh-project-compact" : ""}`}
                      key={project.slug}
                    >
                      {!compact && <Link
                        className={`pv-project-image pv-project-image--${project.treatment}`}
                        href={`/case-studies/${project.slug}`}
                        aria-label={`Read the ${project.title} case study · ${project.artifactLabel}`}
                      >
                        <ProjectImage src={project.image} />
                        <span>{project.artifactLabel}</span>
                      </Link>}
                      <div className="pv-project-heading">
                        <span className="pv-project-number" aria-hidden="true">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <h3>
                          <Link
                            id={`read-${project.slug}`}
                            href={`/case-studies/${project.slug}`}
                          >
                            {project.title}
                            <Arrow />
                          </Link>
                        </h3>
                      </div>
                      <p className="pv-project-description">
                        {project.description}
                      </p>
                      {!compact && (
                        <dl className="pv-project-meta">
                          <div>
                            <dt>My role</dt>
                            <dd>{project.role}</dd>
                          </div>
                          <div>
                            <dt>Stage</dt>
                            <dd>{project.status}</dd>
                          </div>
                          <div>
                            <dt>Period</dt>
                            <dd>{project.period}</dd>
                          </div>
                        </dl>
                      )}
                      <p className="pv-project-proof">{project.proof}</p>
                      {project.sourceHref && !compact && (
                        <p className="pv-project-proof">
                          <a
                            className="pv-text-link"
                            href={project.sourceHref}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {project.sourceLabel} <Arrow />
                          </a>
                        </p>
                      )}
                    </article>
                  );
                })}
            </div>
          </section>
          <section
            className="eh-ocean"
            aria-labelledby="ocean-title"
          >
            <div className="pv-shell eh-ocean-intro">
            <p className="pv-eyebrow">Optional / A different kind of portfolio</p>
            <h2 id="ocean-title">Open Water.</h2>
            <p>
              An interactive world and a scrolling dive, built to carry the
              same work differently. Sail the yacht, meet Dakota, or follow
              a scuba descent through the portfolio.
            </p>
            </div>
            {!worldOpen ? (
              <button
                type="button"
                id="open-ocean"
                ref={openButton}
                className="pv-button eh-open-ocean"
                onClick={() => { setWorldOpen(true); history.replaceState(null, "", "#voyage"); }}
              >
                Explore Open Water <Arrow />
              </button>
            ) : (
              <WorldErrorBoundary onReady={opened}>
                <Suspense fallback={<p role="status">Loading Open Water…</p>}>
                  <div className="eh-ocean-mounted">
                    <button
                      type="button"
                      className="pv-text-link eh-ocean-close"
                      onClick={closeWorld}
                    >
                      Close Open Water
                    </button>
                    <WorldReady onReady={opened} />
                    <OpenWaterExperience presentationPaused={descentOwnsScene} />
                    <ScrollDive onSceneActive={setDescentOwnsScene} />
                  </div>
                </Suspense>
              </WorldErrorBoundary>
            )}
          </section>
          <section
            id="about"
            className="pv-about"
            aria-labelledby="about-title"
          >
            <div className="pv-shell pv-about-grid">
              <figure>
                <img
                  src={portrait}
                  alt="Tejass Kaushik behind his sticker-covered laptop, photographed in black and white."
                  width="420"
                  height="336"
                  loading="lazy"
                />
                <figcaption>Tejass Kaushik / At the keyboard.</figcaption>
              </figure>
              <div className="pv-about-copy">
                <p className="pv-eyebrow">02 / A little about me</p>
                <h2 id="about-title" tabIndex={-1}>
                  Curiosity,
                  <br />
                  <em>put to work.</em>
                </h2>
                <p className="pv-lead">
                  I’m Tejass, a Founding Software Engineer at Anticipation
                  Labs, building Anticipy. Previously, I was CTO at Stellar
                  Learning.
                </p>
                <p>
                  I study Computer Science at Western University and hold
                  Ivey AEO status.
                </p>
                <p>
                  I work with AI tools as part of the engineering process: set
                  the problem, make the acceptance criteria concrete, review
                  the result, and test what a person will actually
                  experience—sometimes in a browser, sometimes on a phone
                  with a prototype pendant on the bench.
                </p>
                <p>I also love water, boats, and yachts—hence Open Water.</p>
                <p className="eh-about-links">
                  <a className="pv-text-link" href={`${import.meta.env.BASE_URL}resume.html`}>
                    View my resume <Arrow />
                  </a>
                  <a
                    className="pv-text-link"
                    href={`${import.meta.env.BASE_URL}Tejass-Kaushik-Resume.pdf`}
                    download
                  >
                    Download resume <Arrow />
                  </a>
                  <a
                    className="pv-text-link"
                    href={profile.socials.linkedin}
                    target="_blank"
                    rel="noreferrer"
                  >
                    More on LinkedIn <Arrow />
                  </a>
                </p>
              </div>
            </div>
          </section>
          <EngineeringNotes />
          <section
            id="contact"
            className="pv-contact pv-shell"
            aria-labelledby="contact-title"
          >
            <p className="pv-eyebrow">03 / Start a conversation</p>
            <div className="pv-contact-grid">
              <h2 id="contact-title" tabIndex={-1}>
                What are
                <br />
                <em>you building?</em>
              </h2>
              <div className="pv-contact-copy">
                <p>
                  Open to engineering opportunities and collaborations. I’d
                  like to hear what you’re building and where I could
                  contribute.
                </p>
                <a className="pv-button" href={`mailto:${profile.email}`}>
                  Contact about opportunities <Arrow />
                </a>
                <a className="pv-email" href={`mailto:${profile.email}`}>
                  {profile.email}
                </a>
                <div className="pv-copy-row">
                  <button type="button" className="pv-copy" onClick={copyEmail}>
                    Copy email
                  </button>
                  <span role="status">{copyStatus}</span>
                </div>
                <div className="pv-socials">
                  <a
                    href={profile.socials.linkedin}
                    target="_blank"
                    rel="noreferrer"
                  >
                    LinkedIn <Arrow />
                  </a>
                  <a
                    href={profile.socials.github}
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub <Arrow />
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      <footer className="portfolio-v3 pv-footer">
        <span>
          <Sailmark />
          Tejass Kaushik
        </span>
        <p>Open Water / An independent portfolio</p>
        <a href="#top">Back to top ↑</a>
      </footer>
      <details className="portfolio-v3 pv-world-credits">
        <summary>World credits</summary>
        <p>
          The scrolling descent, diver, reef, fish and fallback illustration are
          original Open Water artwork created with Codex assistance. Native scroll
          animation uses Motion. <a href={`${import.meta.env.BASE_URL}assets/open-water-v5/CREDITS.md`}>Descent sources and license</a>.
        </p>
        <p>
          The V4 superyacht, tender, Nemo and Dory models, regional reefs, caves,
          and activity objects are original Open Water art, created with Codex
          and Claude assistance.
        </p>
        <p>
          Dakota and the Crown Reef school-fish meshes: <a href="https://quaternius.com/packs/animatedfish.html" target="_blank" rel="noreferrer">Quaternius Animated Fish</a>, <a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noreferrer">CC0</a>. Dakota’s rig, animation and materials were adapted for this world. <a href={`${import.meta.env.BASE_URL}assets/open-water-v3/WILDLIFE-CREDITS.md`}>Adaptation notes</a>.
        </p>
        <p>
          The surface architecture grew from the original Open Water prototype.
          This world, its instruments, and its challenges are fictional.
        </p>
        <details>
          <summary>Earlier edition / V3 vessel attribution</summary>
          <p>
          Earlier Open Water editions used{" "}
          <a
            href="https://sketchfab.com/3d-models/motoryacht-35-0bdd7a0de7254426890bb5745bb7da6d"
            target="_blank"
            rel="noreferrer"
          >
            motoryacht 35
          </a>{" "}
          by{" "}
          <a
            href="https://sketchfab.com/angeloraffaelecatalano"
            target="_blank"
            rel="noreferrer"
          >
            angelo raffaele catalano
          </a>
          , licensed under{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY 4.0
          </a>
          . The retained V3 asset was adapted from a converted GLB: flag removed,
          geometry simplified and quantized, materials and scale changed for
          Open Water. <a href={`${import.meta.env.BASE_URL}assets/open-water-v3/YACHT-LOD-CREDITS.md`}>V3 adaptation notes</a>.
          </p>
        </details>
      </details>
    </div>
  );
}
