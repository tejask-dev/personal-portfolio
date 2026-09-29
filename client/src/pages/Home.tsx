import { useEffect } from "react";
import { Link } from "wouter";
import { profile } from "@/data/profile";
import { selectedWork } from "@/data/selectedWork";
import { voyage } from "@/features/open-water/voyage";
import { useSeo } from "@/lib/seo";
import OpenWaterExperience, {
  Arrow,
  Sailmark,
} from "@/features/open-water/OpenWaterExperience";
import portrait from "@/assets/Professional photo shoot seteve jobs kinda photo must use.jpeg";

export default function Home() {
  useSeo({ path: "/" });
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
        Skip to selected work
      </a>
      <main id="main">
        <OpenWaterExperience />
        <section
          id="work"
          className="ow-work ow-shell"
          aria-labelledby="work-title"
        >
          <header className="ow-section-header">
            <p className="ow-micro">01 / Selected coordinates</p>
            <div>
              <h2 id="work-title">
                Different waters.
                <br />
                <em>The same curiosity.</em>
              </h2>
              <p>
                Products, platforms, and a question worth researching.
                <br />
                Here’s what I’ve been working on.
              </p>
            </div>
            <span className="ow-section-compass" aria-hidden="true">
              ↗
            </span>
          </header>
          <div className="ow-work-list">
            {selectedWork
              .filter((p) => p.slug !== "soma-ai")
              .map((project, index) => (
                <article
                  className={`ow-work-row ow-work-${project.slug}`}
                  key={project.slug}
                >
                  <div className="ow-work-description">
                    <span className="ow-micro">
                      {String(index + 1).padStart(2, "0")} / {project.label}
                    </span>
                    <h3>
                      <Link href={`/case-studies/${project.slug}`}>
                        {project.title}
                      </Link>
                    </h3>
                    <p>{project.description}</p>
                    <dl>
                      <div>
                        <dt>My role</dt>
                        <dd>{project.role}</dd>
                      </div>
                      <div>
                        <dt>Context</dt>
                        <dd>{project.proof}</dd>
                      </div>
                    </dl>
                    <Link
                      id={`read-${project.slug}`}
                      className="ow-read-link"
                      href={`/case-studies/${project.slug}`}
                    >
                      Read the work <Arrow />
                    </Link>
                  </div>
                  {project.image && (
                    <Link
                      className={`ow-work-artifact ow-work-artifact-${project.treatment}`}
                      href={`/case-studies/${project.slug}`}
                      aria-label={`Read the ${project.title} case study`}
                    >
                      <img
                        src={project.image}
                        alt={project.imageAlt || ""}
                        loading="lazy"
                        width="900"
                        height="580"
                      />
                      <span>
                        View case study <Arrow />
                      </span>
                    </Link>
                  )}
                </article>
              ))}
          </div>
          <div className="ow-archive">
            <span className="ow-micro">From the archive</span>
            <Link href="/case-studies/soma-ai">
              <strong>Soma AI</strong>
              <span>A team-built health experiment. Now closed.</span>
              <Arrow />
            </Link>
          </div>
        </section>
        <section id="about" className="ow-about" aria-labelledby="about-title">
          <div className="ow-shell ow-about-grid">
            <figure>
              <img
                src={portrait}
                alt="Tejass Kaushik behind his sticker-covered laptop, photographed in black and white."
                width="420"
                height="336"
                loading="lazy"
              />
              <figcaption>Tejass Kaushik / In his element.</figcaption>
            </figure>
            <div>
              <p className="ow-micro">04 / The anchorage</p>
              <h2 id="about-title" tabIndex={-1}>
                A builder.
                <br />
                <em>Always curious.</em>
              </h2>
              <p>
                I’m Tejass, a Founding Software Engineer at Anticipation Labs,
                building Anticipy. Previously, I was CTO at Stellar Learning.
              </p>
              <p>
                I study Computer Science at Western University and hold Ivey AEO
                status. I like turning ideas into things people can use, and
                learning what it takes to make them last.
              </p>
              <p>
                I also love water, boats, and yachts. So this little corner of
                the internet became a place to explore.
              </p>
              <span className="ow-about-note">
                The work is real. This archipelago is imagined.
              </span>
            </div>
          </div>
        </section>
        <section
          id="contact"
          className="ow-contact ow-shell"
          aria-labelledby="contact-title"
        >
          <p className="ow-micro">Good things start with a conversation</p>
          <div>
            <h2 id="contact-title">
              What’s on
              <br />
              <em>your horizon?</em>
            </h2>
            <a
              className="ow-contact-arrow"
              href={`mailto:${profile.email}`}
              aria-label="Email Tejass"
            >
              <Arrow />
            </a>
          </div>
          <a className="ow-email" href={`mailto:${profile.email}`}>
            {profile.email}
          </a>
          <div className="ow-contact-bottom">
            <a href={profile.socials.linkedin} target="_blank" rel="noreferrer">
              LinkedIn <Arrow />
            </a>
            <a href={profile.socials.github} target="_blank" rel="noreferrer">
              GitHub <Arrow />
            </a>
            <a
              href={profile.socials.instagram}
              target="_blank"
              rel="noreferrer"
            >
              Instagram <Arrow />
            </a>
            <a href="#voyage">Back to the water ↑</a>
          </div>
        </section>
      </main>
      <footer className="ow-footer ow-shell">
        <span>
          <Sailmark />
          Tejass Kaushik
        </span>
        <p>Open Water / An independent portfolio</p>
        <p>Fictional waters. Real work.</p>
      </footer>
      <details className="ow-world-credits ow-shell">
        <summary>World credits</summary>
        <p>
          Yacht:{" "}
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
          . Adapted from a converted GLB: flag removed, geometry simplified and
          quantized, materials and scale changed for Open Water.
        </p>
        <p>
          The architecture and procedural fallback yacht were adapted from the
          original Open Water prototype. This world, its instruments, and its
          races are fictional.
        </p>
      </details>
    </div>
  );
}
