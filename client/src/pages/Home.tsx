import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { profile, moleculeProject } from "@/data/profile";
import { selectedWork } from "@/data/selectedWork";
import { voyage } from "@/features/open-water/voyage";
import { useSeo } from "@/lib/seo";
import { isInteractiveReturnFocus } from "@/lib/portfolioReturn";
import { LabsFeature } from "@/components/portfolio-v4/Flagship";
import EngineeringNotes from "@/components/editorial/EngineeringNotes";
import "./portfolio-v3.css";
import "./editorial-home.css";
import portrait from "@/assets/portrait-tejass.jpeg";

const OpenWaterExperience = lazy(
  () => import("@/features/open-water/OpenWaterExperience"),
);
const ScrollDive = lazy(() => import("@/features/scroll-dive/ScrollDive"));

const featuredWork = [
  selectedWork.find(project => project.slug === "stellar-learning")!,
  moleculeProject,
  selectedWork.find(project => project.slug === "global-health-research")!,
];

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
    return voyage.returnPending
      ? isInteractiveReturnFocus(voyage.returnFocus)
      : needsOcean(hash);
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
    const onHashChange = () => {
      if (needsOcean(window.location.hash.slice(1))) setWorldOpen(true);
      setNavigation(value => value + 1);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  useEffect(() => {
    const target = window.location.hash.slice(1);
    if (worldOpen && !worldReady) return;
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
        if (target === "voyage" && section?.id === "voyage") window.scrollTo({ top: scrollY + section.getBoundingClientRect().top, behavior: "instant" });
        const heading = fallback ?? (target === "top" ? document.getElementById("hero-title") : target === "voyage"
          ? document.getElementById(voyage.sailing || voyage.expedition.mode !== "surface" ? "yacht-controls" : "take-helm")
          : document.getElementById(`${target}-title`) ?? section);
        if (heading && heading.tabIndex < 0) heading.tabIndex = -1;
        heading?.focus({ preventScroll: true });
      } else window.scrollTo({ top: 0, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [worldOpen, worldReady, navigation]);
  const closeWorld = () => {
    restoreOpenFocus.current = true;
    voyage.paused = true;
    voyage.expedition.userPaused = true;
    setWorldReady(false);
    setDescentOwnsScene(false);
    setWorldOpen(false);
    if (needsOcean(window.location.hash.slice(1))) history.replaceState(null, "", "#ocean");
  };
  const openWorld = () => {
    setWorldOpen(true);
    history.replaceState(null, "", "#voyage");
    setNavigation(value => value + 1);
  };
  return (
    <div
      className="open-water-page"
      id="top"
      onClickCapture={(event) => {
        const helmLink = (event.target as Element).closest<HTMLAnchorElement>('a[href="#voyage"]');
        // Native scrolling does not emit hashchange when the hash is unchanged.
        // Reapply the helm's viewport alignment after the native anchor action.
        if (helmLink && window.location.hash === "#voyage" && event.button === 0 &&
          !event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey &&
          (!helmLink.target || helmLink.target === "_self") && !helmLink.hasAttribute("download"))
          setNavigation(value => value + 1);
        const link = (event.target as HTMLElement).closest<HTMLAnchorElement>(
          'a[href*="/case-studies/"]',
        );
        if (link && !link.closest("#voyage") && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
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
          <a href="#work">Work</a>
          <a href="#about">About</a>
          <a href="#ocean">Open Water</a>
          <a href={`${import.meta.env.BASE_URL}resume`}>Resume</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>
      <main id="main">
        <section className="portfolio-v3 eh-hero pv-shell" aria-labelledby="hero-title">
          <p className="pv-eyebrow">Tejass Kaushik / Software engineer / {profile.location}</p>
          <h1 id="hero-title" tabIndex={-1}>{profile.headline}</h1>
          <p className="eh-hero-role">{profile.intro}</p>
          <div className="eh-hero-actions">
            <a className="pv-button" href="#work">
              See the work ↓
            </a>
            <a className="pv-text-link" href={`mailto:${profile.email}`}>
              Email me <Arrow />
            </a>
          </div>
          <dl className="pv-context-facts eh-proof" aria-label="A few things I’ve been part of">
            {profile.proof.map(item => <div key={item.value}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
          </dl>
        </section>
        <div className="portfolio-v3">
          <LabsFeature />
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
              <p>Three things I’m proudest of, then everything else.</p>
            </header>
            <div className="pv-work-grid">
              {featuredWork.map((project, index) => {
                const href = "href" in project ? project.href : `/case-studies/${project.slug}`;
                const external = href.startsWith("https:");
                const image = <><img src={project.image.startsWith("/portfolio/") ? `${import.meta.env.BASE_URL}${project.image.slice(1)}` : project.image} alt={project.imageAlt} loading="lazy" decoding="async" width="900" height="580"/><span>{project.artifactLabel}</span></>;
                return <article className="pv-project" key={project.slug}>
                  {external ? <a className={`pv-project-image pv-project-image--${project.treatment}`} href={href} target="_blank" rel="noreferrer" aria-label={`Visit ${project.title}`}>{image}</a> : <Link className={`pv-project-image pv-project-image--${project.treatment}`} href={href} aria-label={`Read the ${project.title} case study`}>{image}</Link>}
                  <div className="pv-project-heading"><span className="pv-project-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><h3>
                    {external ? <a id={`read-${project.slug}`} href={href} target="_blank" rel="noreferrer">{project.title}<Arrow/></a> : <Link id={`read-${project.slug}`} href={href}>{project.title}<Arrow/></Link>}
                  </h3></div>
                  <p className="pv-project-description">{project.description}</p>
                  <dl className="pv-project-meta"><div><dt>My role</dt><dd>{project.role}</dd></div><div><dt>Stage</dt><dd>{project.status}</dd></div><div><dt>Period</dt><dd>{project.period}</dd></div></dl>
                  <p className="pv-project-proof">{project.proof}</p>
                  {project.sourceHref && <p className="pv-project-proof"><a className="pv-text-link" href={project.sourceHref} target="_blank" rel="noreferrer">{project.sourceLabel}<Arrow/></a></p>}
                </article>;
              })}
            </div>
            <EngineeringNotes />
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
                {profile.about.map((paragraph, index) => <p key={paragraph} className={index === 0 ? "pv-lead" : undefined}>{paragraph}</p>)}
                <p className="eh-about-links">
                  <a className="pv-text-link" href={`${import.meta.env.BASE_URL}resume`}>
                    Resume <Arrow />
                  </a>
                  <a
                    className="pv-text-link"
                    href={`${import.meta.env.BASE_URL}Tejass-Kaushik-Resume.pdf`}
                    download
                  >
                    Download PDF <Arrow />
                  </a>
                  <a
                    className="pv-text-link"
                    href={profile.socials.linkedin}
                    target="_blank"
                    rel="noreferrer"
                  >
                    LinkedIn <Arrow />
                  </a>
                  <a className="pv-text-link" href={profile.socials.github} target="_blank" rel="noreferrer">GitHub <Arrow/></a>
                </p>
              </div>
            </div>
          </section>
          <section id="ocean" className="eh-ocean" aria-labelledby="ocean-title">
            <div className="pv-shell eh-ocean-intro">
              <p className="pv-eyebrow">Optional / Something I built for fun</p>
              <h2 id="ocean-title" tabIndex={-1}>Open Water.</h2>
              <p>{profile.ocean}</p>
              {!worldOpen && <>
                <button className="eh-ocean-poster" type="button" onClick={openWorld} aria-label="Explore the Open Water ocean">
                  <img src={`${import.meta.env.BASE_URL}portfolio/open-water-poster.webp`} alt="A white superyacht on turquoise water, with islands and a lighthouse on the horizon." loading="lazy" decoding="async" width="1600" height="900"/>
                  <span>Take a different route <Arrow/></span>
                </button>
                <button type="button" id="open-ocean" ref={openButton} className="pv-button" onClick={openWorld}>Explore Open Water <Arrow/></button>
              </>}
            </div>
            {worldOpen && <div className="eh-ocean-mounted">
              <button type="button" className="pv-text-link eh-ocean-close" onClick={closeWorld}>Close Open Water</button>
              <WorldErrorBoundary onReady={opened}>
                <Suspense fallback={<p className="pv-shell eh-ocean-loading" role="status">Loading Open Water…</p>}>
                  <WorldReady onReady={opened}/>
                  <OpenWaterExperience presentationPaused={descentOwnsScene}/>
                  <ScrollDive onSceneActive={setDescentOwnsScene}/>
                </Suspense>
              </WorldErrorBoundary>
            </div>}
          </section>
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
                <p>{profile.contact}</p>
                <p className="eh-location">{profile.location}</p>
                <a className="pv-button" href={`mailto:${profile.email}`}>
                  Email me <Arrow />
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
        <p>Built with React, Three.js and curiosity.</p>
        <a href="#top">Back to top ↑</a>
      </footer>
      <details className="portfolio-v3 pv-world-credits">
        <summary>World credits</summary>
        <p>
          Underwater film by JUN HO LEE, via Pexels, edited for Open Water with
          Higgsfield Katana. Native scroll animation uses Motion. <a href={`${import.meta.env.BASE_URL}assets/open-water-v5/CREDITS.md`}>Descent sources and license</a>.
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
