import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { profile } from "@/data/profile";
import { selectedWork } from "@/data/selectedWork";
import { voyage } from "@/features/open-water/voyage";
import { useSeo } from "@/lib/seo";
import OpenWaterExperience, {
  Arrow,
  Sailmark,
} from "@/features/open-water/OpenWaterExperience";
import "./portfolio-v3.css";
import { AnticipyFeature, CareerJourney } from "@/components/portfolio-v4/Flagship";
import ScrollDive from "@/features/scroll-dive/ScrollDive";
import portrait from "@/assets/Professional photo shoot seteve jobs kinda photo must use.jpeg";

function ProjectImage({src}:{src:string}) {
  const image=useRef<HTMLImageElement>(null);
  const [near,setNear]=useState(false);
  useEffect(()=>{
    const observer=new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting){setNear(true);observer.disconnect();}
    },{rootMargin:"200px"});
    if(image.current)observer.observe(image.current);
    return()=>observer.disconnect();
  },[]);
  return <img ref={image} src={near?src:undefined} alt="" loading="lazy" decoding="async" width="900" height="580"/>;
}

export default function Home() {
  useSeo({ path: "/" });
  const [copyStatus, setCopyStatus] = useState("");
  const [descentOwnsScene, setDescentOwnsScene] = useState(false);
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopyStatus("Email address copied.");
    } catch {
      setCopyStatus("Select the email address above to copy it.");
    }
  };
  useEffect(() => {
    const target = window.location.hash.slice(1);
    const frame = requestAnimationFrame(() => {
      if (target)
        document
          .getElementById(target)
          ?.scrollIntoView({ behavior: "instant" });
      else
        window.scrollTo({
          top: voyage.returnPending ? voyage.returnScroll : 0,
          behavior: "instant",
        });
      if (voyage.returnPending || target === "voyage") {
        const original = document.getElementById(voyage.returnFocus);
        const focusTarget =
          original?.getClientRects().length && !original.closest("[inert]")
            ? original
            : document.getElementById(
                voyage.sailing ? "yacht-controls" : "take-helm",
              );
        focusTarget?.focus({ preventScroll: true });
        voyage.returnPending = false;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
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
      <a className="skip-link" href="#work">
        Skip to work
      </a>
      <main id="main">
        <OpenWaterExperience presentationPaused={descentOwnsScene} />
        <ScrollDive onSceneActive={setDescentOwnsScene} />
        <div className="portfolio-v3">
          <AnticipyFeature />
          <CareerJourney />
          <section
            id="work"
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
                investigating. Five projects, with my role and the evidence
                behind each.
              </p>
              <dl className="pv-context-facts" aria-label="Attributed project evidence">
                {profile.proof.map((proof) => (
                  <div key={proof.label}>
                    <dt>{proof.label}</dt>
                    <dd>{proof.value}</dd>
                  </div>
                ))}
              </dl>
            </header>
            <div className="pv-work-grid">
              {selectedWork.map((project, index) => (
                <article className="pv-project" key={project.slug}>
                  <Link
                    className={`pv-project-image pv-project-image--${project.treatment}`}
                    href={`/case-studies/${project.slug}`}
                    aria-label={`Read the ${project.title} case study · ${project.artifactLabel}`}
                  >
                    <ProjectImage src={project.image}/>
                    <span>{project.artifactLabel}</span>
                  </Link>
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
                  <p className="pv-project-proof">{project.proof}</p>
                  {project.sourceHref && (
                    <p className="pv-project-proof">
                      <a className="pv-text-link" href={project.sourceHref} target="_blank" rel="noreferrer">
                        {project.sourceLabel} <Arrow />
                      </a>
                    </p>
                  )}
                </article>
              ))}
            </div>
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
                  I like the stretch between an idea and something people can
                  actually use—and the work it takes to close it.
                </p>
                <p>
                  I’m Tejass, a Founding Software Engineer at Anticipation Labs,
                  building Anticipy. Previously, I was CTO at Stellar Learning.
                </p>
                <p>
                  I study Computer Science at Western University and hold Ivey
                  AEO status. My work has taken me from application flows and
                  backend systems to collaborative research.
                </p>
                <p>
                  I work with AI tools as part of the engineering process: set
                  the problem, make the acceptance criteria concrete, review the
                  result, and test what a person will actually experience.
                  Sometimes that means a browser. Sometimes it means a phone
                  and a prototype pendant on the bench.
                </p>
                <p>
                  I also love water, boats, and yachts. Open Water gives that
                  curiosity a place in the portfolio. The setting is imagined;
                  the work is real.
                </p>
                <a
                  className="pv-text-link"
                  href={profile.socials.linkedin}
                  target="_blank"
                  rel="noreferrer"
                >
                  More on LinkedIn <Arrow />
                </a>
              </div>
            </div>
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
                <p>
                  Have an engineering opportunity in mind? I’d like to hear what
                  you’re building and where I could contribute.
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
        <a href="#voyage">Return to water ↑</a>
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
