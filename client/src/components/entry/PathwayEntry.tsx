import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import "./pathway-entry.css";

export type Pathway = "interactive" | "reading";
export type BoardingStatus = "loading" | "ready" | "fallback";
const entryKey = "open-water-entry-v1";
let entered = false;
export function hasEnteredPortfolio() {
  try { return entered || sessionStorage.getItem(entryKey) === "seen"; }
  catch { return entered; }
}
export function rememberEntry() {
  entered = true;
  try { sessionStorage.setItem(entryKey, "seen"); } catch { /* Storage is optional. */ }
}

/** Original SVG artwork: the introduction never fetches the 3D world. */
function Yacht() {
  return <svg viewBox="0 0 210 100" fill="none" aria-hidden="true">
    <path d="M8 70h192l-24 19H34L8 70Z" fill="#faf5e9"/>
    <path d="m41 68 15-22h104l25 22H41Z" fill="#e5ecdd"/>
    <path d="m73 45 10-19h47l30 19H73Z" fill="#faf5e9"/>
    <path d="M83 33h45l14 9H78l5-9Zm-25 20h98l10 9H52l6-9Z" fill="#24545b"/>
    <path d="M22 77h160M48 91h119" stroke="#a4cbbf" strokeWidth="2"/>
    <path d="M99 25V13m0 2h15" stroke="#faf5e9" strokeWidth="2"/>
    <path d="M-10 91h28m-38 6h55" stroke="#bdddd2" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}

export default function PathwayEntry({ animate, onChoose, onDismiss, onBoard, boardingStatus }: {
  animate: boolean; onChoose: (pathway: Pathway) => void; onDismiss: () => void;
  onBoard: () => void; boardingStatus: BoardingStatus;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const restoreFocus = useRef(true);
  const choosing = useRef(false);
  const [boarding, setBoarding] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [arrivedAtWater, setArrivedAtWater] = useState(false);
  const [slow, setSlow] = useState(false);
  const [still, setStill] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [progress, setProgress] = useState(() => animate && !matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 100);
  const [complete, setComplete] = useState(progress === 100);
  useEffect(() => {
    if (progress < 100) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setComplete(true); return; }
    const timer = window.setTimeout(() => setComplete(true), 240);
    return () => clearTimeout(timer);
  }, [progress]);
  useLayoutEffect(() => {
    const el = dialog.current!;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    el.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      el.close(); document.body.style.overflow = previousOverflow;
      if (restoreFocus.current && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    if (!animate || complete) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let stopped = false;
    let frame = 0;
    const stop = () => {
      if (!preference.matches) return;
      stopped = true;
      cancelAnimationFrame(frame);
      setProgress(100);
      setComplete(true);
    };
    preference.addEventListener("change", stop);
    if (preference.matches) stop();
    const start = performance.now();
    const tick = (now: number) => {
      if (stopped) return;
      setProgress(Math.max(0, Math.min(100, Math.floor((now - start) / 28))));
      if (now - start < 2800) frame = requestAnimationFrame(tick);
    };
    if (!stopped) frame = requestAnimationFrame(tick);
    return () => { stopped = true; cancelAnimationFrame(frame); preference.removeEventListener("change", stop); };
  }, [animate, complete]);

  useEffect(() => {
    if (!boarding) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const settle = () => { setStill(true); setArrivedAtWater(true); };
    const reduce = () => { if (preference.matches) settle(); };
    preference.addEventListener("change", reduce);
    window.addEventListener("resize", settle);
    const arrival = window.setTimeout(() => setArrivedAtWater(true), still ? 0 : 1800);
    const waiting = window.setTimeout(() => setSlow(true), 8000);
    return () => {
      clearTimeout(arrival); clearTimeout(waiting);
      preference.removeEventListener("change", reduce);
      window.removeEventListener("resize", settle);
    };
  }, [boarding, still]);
  useEffect(() => {
    if (boarding && arrivedAtWater && boardingStatus !== "loading") setRevealing(true);
  }, [boarding, arrivedAtWater, boardingStatus]);
  useEffect(() => {
    if (!revealing) return;
    const timer = window.setTimeout(() => {
      restoreFocus.current = false;
      onChoose("interactive");
    }, still ? 120 : 700);
    return () => clearTimeout(timer);
  }, [revealing, still, onChoose]);

  const choose = (pathway: Pathway) => {
    if (choosing.current) return;
    choosing.current = true;
    if (pathway === "reading") { restoreFocus.current = false; onChoose(pathway); return; }
    const scene = dialog.current!.querySelector<HTMLElement>(".pe-seascape")!;
    const boat = dialog.current!.querySelector<HTMLElement>(".pe-vessel")!.getBoundingClientRect();
    const bounds = scene.getBoundingClientRect();
    const x = boat.left + boat.width / 2, y = boat.top + boat.height / 2;
    const originX = x - bounds.left, originY = y - bounds.top;
    // Scale around the yacht until the illustration covers every viewport edge.
    const scale = Math.max(innerWidth / Math.max(1, Math.min(originX, bounds.width - originX)) / 2,
      innerHeight / Math.max(1, Math.min(originY, bounds.height - originY)) / 2) * 1.15;
    scene.style.transformOrigin = `${originX}px ${originY}px`;
    scene.style.setProperty("--board-x", `${innerWidth / 2 - x}px`);
    scene.style.setProperty("--board-y", `${innerHeight / 2 - y}px`);
    scene.style.setProperty("--board-scale", String(scale));
    setStill(matchMedia("(prefers-reduced-motion: reduce)").matches);
    setBoarding(true);
    dialog.current!.querySelector<HTMLButtonElement>(".pe-header button")?.focus({ preventScroll: true });
    onBoard();
  };
  return <dialog ref={dialog} className="pathway-entry" data-boarding={boarding} data-revealing={revealing} data-still={still}
    aria-labelledby={boarding ? "boarding-title" : "pathway-title"} aria-describedby={boarding ? "boarding-description" : "pathway-description"}
    onKeyDown={event => {
      if (event.key !== "Tab") return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}
    onClose={() => { if (dialog.current?.isConnected && !revealing) onDismiss(); }}
    onCancel={event => { event.preventDefault(); onDismiss(); }}>
    <div className="pe-shell" data-ready={complete} data-intro={animate}>
      <header className="pe-header"><span>TEJASS KAUSHIK <span className="pe-slash">/</span> OPEN WATER</span><button type="button" onClick={onDismiss}>{boarding ? "Back to portfolio" : animate ? "Skip to portfolio" : "Close"} <span aria-hidden="true">↗</span></button></header>
      <div className="pe-main">
        <div className="pe-heading"><p className="pe-eyebrow">A portfolio you can explore</p><h2 id="pathway-title"><span><span>Choose your</span></span>{" "}<span><em>way in.</em></span></h2><p id="pathway-description">I’m Tejass. I build AI products across apps and devices.<br/>Explore the ocean, or go straight to my work.</p></div>
        <div className="pe-seascape" aria-hidden="true" style={{ "--journey": progress / 100 } as CSSProperties}>
          <div className="pe-sun"/><div className="pe-horizon"/><div className="pe-contours"/><div className="pe-wave pe-wave-back"/><div className="pe-wave pe-wave-front"/>
          <svg className="pe-wake" viewBox="0 0 400 60" fill="none"><path pathLength="1" d="M5 40Q60 20 110 35T220 30T380 35M35 54Q80 40 145 49T330 46"/></svg><div className="pe-vessel"><Yacht/></div><span className="pe-bearing">43° N / FICTIONAL WATERS</span>
        </div>
        {!complete ? <div className="pe-loading"><div className="pe-loading-label"><span>Arriving at Open Water</span><span aria-hidden="true">{String(progress).padStart(2, "0")}%</span></div><progress max="100" value={progress} aria-label="Introduction animation"/><p>Just a short introduction. You can skip it.</p></div> : <div className="pe-choices">
          <button className="pe-choice pe-choice-ocean" type="button" disabled={boarding} onClick={() => choose("interactive")}><span className="pe-choice-number">01 / INTERACTIVE</span><strong>Take to the water <span aria-hidden="true">↗</span></strong><span>Captain the yacht. Explore reefs. <br/>Find my work along the way.</span></button>
          <button className="pe-choice pe-choice-reading" type="button" disabled={boarding} onClick={() => choose("reading")}><span className="pe-choice-number">02 / PLAIN</span><strong>Read the portfolio <span aria-hidden="true">↗</span></strong><span>Projects, my contributions, <br/>and what I learned.</span></button>
        </div>}
        <p className="pe-ready" role="status">{complete ? "Choose either path. You can switch later with Choose interactions." : ""}</p>
      </div>
      <footer className="pe-footer"><span>Software / research / things I’ve built</span><span>Same work. Your pace.</span></footer>
      {boarding && <div className="pe-departure" role="status">
        <span className="pe-departure-kicker">Open Water / Your departure</span>
        <h2 id="boarding-title">Taking you to the water.</h2>
        <p id="boarding-description">{boardingStatus === "fallback" ? "A quieter arrival. Your field guide is ready." : slow && boardingStatus === "loading" ? "The ocean is taking a little longer. You can return to the portfolio anytime." : "From a different perspective. Into your hands."}</p>
        <span className="pe-departure-line" aria-hidden="true" />
      </div>}
    </div>
  </dialog>;
}
