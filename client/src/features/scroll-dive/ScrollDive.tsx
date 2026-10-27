import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "wouter";
import { useMotionValueEvent, useScroll } from "motion/react";
import { diveChapters } from "./content";
import "./scroll-dive.css";

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const mediaRoot = `${import.meta.env.BASE_URL}assets/open-water-v5/`;

function RevealHeading({ lines }: { lines: readonly string[] }) {
  let index = 0;
  return <h2 aria-label={lines.join(" ")} className="sd-heading">{lines.map((line, lineIndex) => <span key={line} className={lineIndex ? "sd-heading-line sd-heading-em" : "sd-heading-line"} aria-hidden="true">{line.split(" ").map(word => <span className="sd-word-mask" key={`${word}-${index}`}><span style={{ "--word": index++ } as CSSProperties}>{word}&nbsp;</span></span>)}</span>)}</h2>;
}

/** Native document scroll drives the reading progress and masked text. No wheel interception,
 * scroll container, scroll snapping, or writes to the controllable ocean state. */
export default function ScrollDive({ onSceneActive }: { onSceneActive: (active: boolean) => void }) {
  const section = useRef<HTMLElement>(null), depth = useRef<HTMLSpanElement>(null);
  const progress = useRef(0), frozenProgress = useRef(0), film = useRef<HTMLVideoElement>(null);
  const [saveData] = useState(() => (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true);
  const [filmFile] = useState(() => window.matchMedia("(max-width: 650px), (max-height: 560px)").matches ? "descent-mobile.mp4" : "descent-film.mp4");
  const [entered, setEntered] = useState(false), [inFrame, setInFrame] = useState(false);
  const [still, setStill] = useState(false), [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  const [tabVisible, setTabVisible] = useState(() => !document.hidden);
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    preference.addEventListener("change", update);
    update();
    return () => preference.removeEventListener("change", update);
  }, []);
  const { scrollY } = useScroll();
  const compact = reduced || failed || saveData;
  const allowed = !still && !compact;
  useEffect(() => { if (compact) setReady(false); }, [compact]);
  const measure = useCallback(() => {
    const element = section.current;
    if (!element) return;
    const rect = element.getBoundingClientRect(), height = window.innerHeight;
    const value = clamp(-rect.top / Math.max(1, rect.height - height));
    // The playable hero is entirely above the viewport before this owns frames.
    const pinned = rect.top <= 0 && rect.bottom >= height - 1;
    setInFrame(pinned);
    if (pinned) setEntered(true);
    if (allowed) { progress.current = value; frozenProgress.current = value; }
    else progress.current = frozenProgress.current;
    element.style.setProperty("--dive-progress", String(progress.current));
    element.dataset.progress = value.toFixed(4);
    if (depth.current) depth.current.textContent = String(Math.round(progress.current * 24)).padStart(2, "0");
    const chapters = element.querySelectorAll<HTMLElement>(".sd-chapter");
    chapters.forEach(chapter => {
      const bounds = chapter.getBoundingClientRect();
      const reveal = allowed ? clamp((height * .90 - bounds.top) / (height * .58)) : 1;
      chapter.style.setProperty("--reveal", String(reveal));
    });
  }, [allowed]);
  useMotionValueEvent(scrollY, "change", measure);
  useEffect(() => {
    measure();
    const resize = new ResizeObserver(measure);
    if (section.current) resize.observe(section.current);
    window.addEventListener("resize", measure);
    return () => { resize.disconnect(); window.removeEventListener("resize", measure); };
  }, [measure]);
  useEffect(() => {
    const visibility = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  const active = inFrame && allowed && tabVisible;
  useEffect(() => { onSceneActive(active); return () => onSceneActive(false); }, [active, onSceneActive]);
  useEffect(() => {
    const video = film.current;
    if (!video) return;
    let cancelled = false;
    if (active) void video.play().catch(error => {
      if (cancelled || error.name === "AbortError") return;
      if (error.name === "NotSupportedError") setFailed(true);
      else setStill(true);
    });
    else video.pause();
    return () => { cancelled = true; video.pause(); };
  }, [active, entered, compact]);
  useEffect(() => {
    if (!entered || compact || ready || still || !tabVisible) return;
    const timeout = window.setTimeout(() => setFailed(true), 12000);
    return () => window.clearTimeout(timeout);
  }, [entered, compact, ready, still, tabVisible]);
  const chapterLink = (href: string, label: string, id: string) => href.startsWith("/")
    ? <Link id={id} className="sd-story-link" href={href}>{label}<span aria-hidden="true">↗</span></Link>
    : <a id={id} className="sd-story-link" href={href}>{label}<span aria-hidden="true">↗</span></a>;
  return <section id="descent" ref={section} className={`sd-descent${compact ? " sd-reduced" : ""}${still ? " sd-still" : ""}`} aria-label="Beneath the surface: a field expedition" data-scene-active={active} data-scene-ready={ready} data-scene-failed={failed}>
    <div className="sd-sticky">
      <div className="sd-art" aria-hidden="true">
        <img className="sd-poster" src={`${mediaRoot}descent-poster.webp`} alt="" width="1440" height="810" loading="lazy"/>
        {entered && !compact && <video ref={film} src={`${mediaRoot}${filmFile}`} className={`sd-film${ready ? " is-ready" : ""}`} muted loop playsInline preload="auto" disablePictureInPicture disableRemotePlayback tabIndex={-1} onLoadedData={() => setReady(true)} onError={() => setFailed(true)}/>}
        <div className="sd-shade"/>
      </div>
    </div>
    <div className="sd-interface">
      <div className="sd-masthead"><a href="#voyage" className="sd-expedition-mark"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="16"/><path d="m18 6 5 12-5 12-5-12 5-12Zm-9 12h18"/></svg><span>Open Water <small>A field expedition</small></span></a><nav aria-label="Descent navigation"><a href="#current-work">Anticipy ↗</a><a href="#work">Work</a><a href="#contact">Contact ↗</a></nav></div>
      <div className="sd-depth" aria-hidden="true"><span>Descent</span><strong><span ref={depth}>00</span><small> / 24</small></strong><div className="sd-depth-track"><i/></div></div>
      <div className="sd-bottom"><span className="sd-scroll-cue">Keep scrolling <span aria-hidden="true">↓</span></span>{compact ? <span>Still expedition</span> : <button type="button" onClick={() => setStill(value => !value)} aria-pressed={still}>{still ? "Play scenery" : "Pause scenery"}<span aria-hidden="true">{still ? "▷" : "Ⅱ"}</span></button>}<a href="#current-work">Back to the work ↑</a></div>
    </div>
    {failed && <p className="sd-fallback-notice" role="status">A still expedition. The full story and all project links are here.</p>}
    <ol className="sd-stories">{diveChapters.map(chapter => <li className="sd-chapter" id={`dive-${chapter.id}`} key={chapter.id}><div className="sd-copy"><p className="sd-eyebrow"><span>{chapter.depth} m</span>{chapter.eyebrow}</p><RevealHeading lines={chapter.title}/><p className="sd-description">{chapter.body}</p>{chapterLink(chapter.href, chapter.link, `dive-link-${chapter.id}`)}<p className="sd-field-note">{chapter.note}</p></div></li>)}</ol>
    <div className="sd-end-cap" aria-hidden="true"><span>End of descent / Begin the field notes</span><span>↓</span></div>
  </section>;
}
