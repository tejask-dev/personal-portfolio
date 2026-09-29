import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { useLocation } from "wouter";
import { selectedWork } from "@/data/selectedWork";
import { destinations, type Destination, type RaceCourse } from "./data/world";
import {
  createBoat,
  distance,
  steerTo,
  type BoatState,
  type Input,
} from "./systems/boatController";
import { voyage } from "./voyage";
import Chart from "./ui/Chart";
import RacePanel, { raceTime } from "./ui/RacePanel";
import {
  cancelRace,
  startRace,
  restartRace,
  type RaceState,
} from "./systems/raceController";
import type { LandmarkProjection } from "./scene/OpenWaterScene";
const Scene = lazy(() => import("./scene/OpenWaterScene"));
class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const nativeHref = (href: string) =>
  href.startsWith("/") ? `${import.meta.env.BASE_URL}${href.slice(1)}` : href;

export function Arrow() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 15 15 5M5 5h10v10" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
export function Sailmark() {
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

export default function OpenWaterExperience() {
  const [, navigate] = useLocation();
  const boat = useRef(voyage.boat);
  const race = useRef(voyage.race);
  const input = useRef<Input>({});
  const root = useRef<HTMLElement>(null);
  const helm = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const indexTrigger = useRef<HTMLElement | null>(null);
  const [sailing, setSailing] = useState(voyage.sailing);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [paused, setPaused] = useState(
    () =>
      voyage.paused || matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [daylight, setDaylight] = useState(voyage.daylight);
  const [cameraMode, setCameraMode] = useState(voyage.cameraMode);
  const [visible, setVisible] = useState(true);
  const [tabVisible, setTabVisible] = useState(!document.hidden);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  const [telemetry, setTelemetry] = useState<BoatState>({ ...boat.current });
  const [arriving, setArriving] = useState(false);
  const [raceTelemetry, setRaceTelemetry] = useState<RaceState>({
    ...race.current,
  });
  const [landmarks, setLandmarks] = useState<LandmarkProjection[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [yachtModel, setYachtModel] = useState<
    "loading" | "licensed" | "procedural"
  >("loading");
  const updateYachtModel = useCallback(
    (state: "loading" | "licensed" | "procedural") => setYachtModel(state),
    [],
  );
  const isQuiet =
    paused || reduced || !visible || !tabVisible || indexOpen || arriving;
  const destination =
    raceTelemetry.phase === "idle"
      ? destinations.find(
          (d) =>
            boat.current.arrived === d.id ||
            (sailing && distance(boat.current, d.dock) < 11),
        )
      : undefined;
  const target = destinations.find((d) => telemetry.target?.id === d.id);
  const status = failed
    ? "Reading mode / The work is still here"
    : reduced
      ? "Calm mode / Choose a place to read"
      : paused
        ? "At anchor / Motion paused"
        : raceTelemetry.phase === "countdown"
          ? "At the starting line / Get ready"
          : raceTelemetry.phase === "racing"
            ? `Time trial / Gate ${raceTelemetry.checkpoint + 1}`
            : raceTelemetry.phase === "finished"
              ? `Course complete / Your time ${raceTime(raceTelemetry.finishTime ?? raceTelemetry.elapsed)}${raceTelemetry.courseId && voyage.bestTimes[raceTelemetry.courseId] !== undefined ? ` / Session best ${raceTime(voyage.bestTimes[raceTelemetry.courseId])}` : ""}`
              : destination
                ? `Moored / ${destination.name}`
                : target
                  ? `On course / ${target.name}`
                  : sailing
                    ? "Underway / Make yourself at home"
                    : "At anchor / Ready when you are";
  const updateTelemetry = useCallback((value: BoatState) => {
    setTelemetry({ ...value });
    const current = race.current;
    if (
      current.phase === "finished" &&
      current.courseId &&
      current.finishTime !== null
    ) {
      voyage.bestTimes[current.courseId] = Math.min(
        voyage.bestTimes[current.courseId] ?? Infinity,
        current.finishTime,
      );
    }
    setRaceTelemetry({ ...current });
  }, []);
  const updateLandmarks = useCallback(
    (points: LandmarkProjection[]) =>
      setLandmarks((previous) =>
        JSON.stringify(previous) === JSON.stringify(points) ? previous : points,
      ),
    [],
  );
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => {
    setFailed(true);
    setSailing(false);
    cancelRace(race.current);
    setRaceTelemetry({ ...race.current });
    input.current = {};
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    if (root.current) observer.observe(root.current);
    const visibility = () => {
      setTabVisible(!document.hidden);
      input.current = {};
    };
    const blur = () => {
      input.current = {};
    };
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => {
      setReduced(query.matches);
      if (query.matches) setPaused(true);
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", blur);
    query.addEventListener("change", preference);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
      query.removeEventListener("change", preference);
      input.current = {};
    };
  }, []);
  useEffect(() => {
    voyage.sailing = sailing;
    voyage.paused = paused;
    voyage.daylight = daylight;
    voyage.cameraMode = cameraMode;
  }, [sailing, paused, daylight, cameraMode]);
  useEffect(() => {
    if (isQuiet) input.current = {};
  }, [isQuiet]);
  useEffect(() => {
    if (indexOpen) dialog.current?.showModal();
    else if (dialog.current?.open) dialog.current.close();
  }, [indexOpen]);

  const openIndex = (event?: MouseEvent<HTMLElement>) => {
    indexTrigger.current =
      event?.currentTarget ?? (document.activeElement as HTMLElement);
    setIndexOpen(true);
  };
  const closeIndex = (restoreFocus = true) => {
    setIndexOpen(false);
    dialog.current?.close();
    if (restoreFocus)
      requestAnimationFrame(() =>
        indexTrigger.current?.focus({ preventScroll: true }),
      );
  };
  const start = () => {
    if (failed || reduced || !ready) {
      openIndex();
      return;
    }
    setPaused(false);
    setSailing(true);
    requestAnimationFrame(() => {
      root.current?.scrollIntoView({ block: "start" });
      helm.current?.focus({ preventScroll: true });
    });
  };
  const selectDestination = (d: Destination) => {
    if (failed || reduced) {
      readDestination(d);
      return;
    }
    cancelRace(race.current);
    setRaceTelemetry({ ...race.current });
    steerTo(boat.current, d.dock, d.id);
    setTelemetry({ ...boat.current });
    start();
  };
  const plotCourse = useCallback(
    (point: { x: number; z: number }) => {
      if (!sailing || isQuiet) return;
      if (race.current.phase === "countdown" || race.current.phase === "racing")
        return;
      steerTo(boat.current, point);
      setTelemetry({ ...boat.current });
      helm.current?.focus({ preventScroll: true });
    },
    [sailing, isQuiet],
  );
  const beginRace = (course: RaceCourse) => {
    if (!ready || failed || reduced) return;
    startRace(race.current, course.id, boat.current);
    input.current = {};
    setRaceTelemetry({ ...race.current });
    setTelemetry({ ...boat.current });
    setPaused(false);
    setSailing(true);
    setCameraMode("follow");
    setResetKey((key) => key + 1);
    requestAnimationFrame(() => helm.current?.focus({ preventScroll: true }));
  };
  const retryRace = () => {
    restartRace(race.current, boat.current);
    input.current = {};
    setRaceTelemetry({ ...race.current });
    setTelemetry({ ...boat.current });
    setPaused(false);
    setResetKey((key) => key + 1);
    requestAnimationFrame(() => helm.current?.focus({ preventScroll: true }));
  };
  const leaveRace = () => {
    cancelRace(race.current);
    input.current = {};
    setRaceTelemetry({ ...race.current });
    requestAnimationFrame(() => helm.current?.focus({ preventScroll: true }));
  };
  const readDestination = async (d: Destination, matchCut = false) => {
    voyage.returnFocus = matchCut ? "arrival-read" : `destination-${d.id}`;
    voyage.returnPending = true;
    voyage.returnScroll = window.scrollY;
    input.current = {};
    if (d.id === "about") {
      voyage.returnPending = false;
      setIndexOpen(false);
      dialog.current?.close();
      requestAnimationFrame(() => {
        document
          .getElementById("about")
          ?.scrollIntoView({ behavior: "instant" });
        document.getElementById("about-title")?.focus({ preventScroll: true });
      });
      return;
    }
    if (matchCut && !reduced && "startViewTransition" in document) {
      setArriving(true);
      try {
        await import("@/pages/CaseStudy");
      } catch {
        setArriving(false);
        navigate(d.href);
        return;
      }
      const transitionDocument = document as Document & {
        startViewTransition: (update: () => void) => {
          finished: Promise<void>;
        };
      };
      try {
        transitionDocument.startViewTransition(() =>
          flushSync(() => navigate(d.href)),
        );
      } catch {
        setArriving(false);
        navigate(d.href);
      }
    } else navigate(d.href);
  };
  const reset = () => {
    cancelRace(race.current);
    setRaceTelemetry({ ...race.current });
    Object.assign(boat.current, createBoat());
    setTelemetry({ ...boat.current });
    setSailing(false);
    setResetKey((key) => key + 1);
    input.current = {};
    requestAnimationFrame(() => document.getElementById("take-helm")?.focus());
  };
  const keys: Record<string, keyof Input> = {
    w: "forward",
    ArrowUp: "forward",
    s: "backward",
    ArrowDown: "backward",
    a: "left",
    ArrowLeft: "left",
    d: "right",
    ArrowRight: "right",
  };
  const keyboard = (event: KeyboardEvent<HTMLDivElement>, down: boolean) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Escape" && down) {
      input.current = {};
      setPaused(true);
      document.getElementById("back-opening")?.focus({ preventScroll: true });
      return;
    }
    const key = keys[event.key] ?? keys[event.key.toLowerCase()];
    if (!key || !sailing || isQuiet) return;
    event.preventDefault();
    input.current[key] = down;
  };

  return (
    <section
      ref={root}
      id="voyage"
      className={`ow-experience ${sailing ? "is-sailing" : ""} ${daylight ? "is-daylight" : ""} ${ready ? "is-ready" : ""}`}
      aria-label="Open Water, an interactive portfolio"
      data-race-phase={raceTelemetry.phase}
      data-race-checkpoint={raceTelemetry.checkpoint}
      data-race-elapsed={raceTelemetry.elapsed.toFixed(3)}
      data-airborne={telemetry.airborne}
      data-jump-count={telemetry.jumpCount}
      data-yacht-model={yachtModel}
      data-boat-x={telemetry.x.toFixed(3)}
      data-boat-z={telemetry.z.toFixed(3)}
      data-boat-heading={telemetry.heading.toFixed(4)}
      data-boat-speed={telemetry.speed.toFixed(3)}
      data-state={
        failed
          ? "FALLBACK"
          : indexOpen
            ? "READING"
            : isQuiet
              ? "PAUSED"
              : destination
                ? "APPROACH"
                : target
                  ? "AUTOPILOT"
                  : sailing
                    ? "SAILING"
                    : "INTRO"
      }
    >
      <div className="ow-poster" aria-hidden="true">
        <div className="ow-poster-horizon" />
        <div className="ow-poster-island ow-poster-island-one" />
        <div className="ow-poster-island ow-poster-island-two" />
        <div className="ow-poster-boat" />
      </div>
      {!failed && (
        <div className="ow-scene">
          <SceneBoundary onError={onError}>
            <Suspense fallback={null}>
              <Scene
                boat={boat}
                race={race}
                input={input}
                resetKey={resetKey}
                sailing={sailing}
                paused={isQuiet}
                daylight={daylight}
                cameraMode={cameraMode}
                onTelemetry={updateTelemetry}
                onLandmarks={updateLandmarks}
                onYachtModel={updateYachtModel}
                onReady={onReady}
                onError={onError}
                onCourse={plotCourse}
              />
            </Suspense>
          </SceneBoundary>
        </div>
      )}
      <div className="ow-vignette" aria-hidden="true" />
      <div
        id="yacht-controls"
        ref={helm}
        className="ow-helm-focus"
        tabIndex={sailing ? 0 : -1}
        role="group"
        aria-label="Yacht controls. W or up to accelerate, S or down to reverse, A and D or left and right to steer. Escape pauses and releases control."
        onKeyDown={(e) => keyboard(e, true)}
        onKeyUp={(e) => keyboard(e, false)}
        onBlur={() => {
          input.current = {};
        }}
      />
      <nav className="ow-nav" aria-label="Primary navigation">
        <a className="ow-brand" href="#top" onClick={() => sailing && reset()}>
          <Sailmark />
          <span>
            <strong>Tejass Kaushik</strong>
            <small>Builder / Explorer</small>
          </span>
        </a>
        <div className="ow-title-mark" aria-hidden="true">
          Open water<span>An interactive portfolio</span>
        </div>
        <div className="ow-nav-links">
          <button id="open-work-index" onClick={openIndex}>
            Work index <Arrow />
          </button>
          <a href="#about">About</a>
          <a href="mailto:tejas.kaushik@outlook.com">
            Say hello <Arrow />
          </a>
        </div>
      </nav>
      <div
        className="ow-intro"
        aria-hidden={sailing || undefined}
        {...(sailing ? { inert: "" } : {})}
      >
        <p className="ow-eyebrow">
          <span />A portfolio you can sail through
        </p>
        <h1>
          Open
          <br />
          <em>water.</em>
        </h1>
        <p className="ow-statement">
          The work is real.
          <br />
          The coordinates aren’t.
        </p>
        <p className="ow-context">
          I’m Tejass. Building Anticipy.
          <br />
          Previously CTO at Stellar Learning.
        </p>
        <button id="take-helm" className="ow-primary" onClick={start}>
          {reduced || failed ? "Explore the work" : "Take the helm"}
          <Arrow />
        </button>
        <a className="ow-direct" href="#work">
          Or go straight to the work <span aria-hidden="true">→</span>
        </a>
        <p className="ow-explore-note">
          <span aria-hidden="true">↝</span> Find a quiet cove. Or chase a better
          lap.
        </p>
      </div>
      {!sailing && !failed && (
        <div className="ow-destination-labels">
          {destinations.slice(0, 3).map((d) => {
            const projected = landmarks.find((point) => point.id === d.id);
            if (
              !projected?.visible ||
              projected.x < 43 ||
              projected.y < 20 ||
              projected.y > 68
            )
              return null;
            return (
              <a
                id={`destination-${d.id}`}
                key={d.id}
                className={`ow-destination ow-destination-${d.id}`}
                style={{
                  left:
                    d.id === "anticipy"
                      ? `clamp(35%, calc(${projected.x}% - 176px), calc(100% - 210px))`
                      : `clamp(48%, calc(${projected.x}% - 88px), calc(100% - 210px))`,
                  top: `calc(${projected.y}% - 86px)`,
                  right: "auto",
                }}
                href={nativeHref(d.href)}
                onClick={(e) => {
                  if (
                    !e.metaKey &&
                    !e.ctrlKey &&
                    !e.shiftKey &&
                    e.button === 0
                  ) {
                    e.preventDefault();
                    readDestination(d);
                  }
                }}
              >
                <span className="ow-number">{d.number}</span>
                <span>
                  <strong>{d.name}</strong>
                  <small>{d.project}</small>
                </span>
                <Arrow />
              </a>
            );
          })}
        </div>
      )}
      {sailing && (
        <div className="ow-voyage-top">
          <button id="back-opening" onClick={reset}>
            ↖ Back to the opening
          </button>
          <p>
            {raceTelemetry.phase === "idle"
              ? "The water is yours."
              : "Find your line."}
            <span>
              {raceTelemetry.phase === "idle"
                ? "Coves, courses, and a few places worth stopping."
                : "Through the pennants. Around the islands. Over the water."}
            </span>
          </p>
        </div>
      )}
      {sailing && (
        <RacePanel
          race={raceTelemetry}
          best={
            raceTelemetry.courseId
              ? voyage.bestTimes[raceTelemetry.courseId]
              : undefined
          }
          paused={isQuiet}
          onStart={beginRace}
          onRestart={retryRace}
          onExit={leaveRace}
        />
      )}
      {destination && sailing && (
        <div className="ow-arrival">
          <div>
            <span className="ow-micro">
              {destination.number} / You have arrived
            </span>
            <h2>{destination.name}</h2>
            <p>{destination.project}</p>
          </div>
          <a
            id="arrival-read"
            href={nativeHref(destination.href)}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                readDestination(destination, true);
              }
            }}
          >
            {selectedWork.find((w) => destination.href.endsWith(w.slug))
              ?.image && (
              <img
                style={
                  {
                    viewTransitionName: "project-artifact",
                  } as React.CSSProperties
                }
                src={
                  selectedWork.find((w) => destination.href.endsWith(w.slug))
                    ?.image
                }
                alt=""
              />
            )}
            <span>
              {destination.id === "about" ? "Meet Tejass" : "Read the work"}
              <Arrow />
            </span>
          </a>
        </div>
      )}
      <div className="ow-instruments">
        <Chart
          boat={telemetry}
          race={raceTelemetry}
          onSelect={selectDestination}
        />
        <div className="ow-environment">
          <button
            onClick={() => setDaylight(!daylight)}
            aria-pressed={daylight}
          >
            <span aria-hidden="true">◐</span>
            {daylight ? "Daylight" : "Blue hour"}
          </button>
          <button
            onClick={() => {
              if (!reduced) setPaused(!paused);
              else openIndex();
            }}
            aria-pressed={paused || reduced}
          >
            <span aria-hidden="true">≈</span>
            {paused || reduced ? "Motion paused" : "Motion on"}
          </button>
          <button
            onClick={() =>
              setCameraMode(cameraMode === "aerial" ? "follow" : "aerial")
            }
            aria-pressed={cameraMode === "follow"}
          >
            <span aria-hidden="true">⌖</span>
            {cameraMode === "aerial" ? "Aerial" : "Follow"}
          </button>
        </div>
      </div>
      {sailing && (
        <div className="ow-touch-controls" aria-label="Touch steering controls">
          {(
            [
              ["left", "↶", "Steer left"],
              ["forward", "↑", "Accelerate"],
              ["backward", "↓", "Reverse"],
              ["right", "↷", "Steer right"],
            ] as const
          ).map(([key, glyph, label]) => (
            <button
              key={key}
              aria-label={label}
              disabled={isQuiet}
              onPointerDown={(e) => {
                e.currentTarget.focus({ preventScroll: true });
                e.currentTarget.setPointerCapture(e.pointerId);
                input.current[key] = true;
              }}
              onPointerUp={() => {
                input.current[key] = false;
              }}
              onPointerCancel={() => {
                input.current[key] = false;
              }}
              onLostPointerCapture={() => {
                input.current[key] = false;
              }}
            >
              {glyph}
            </button>
          ))}
        </div>
      )}
      <footer className="ow-status">
        <p className="ow-status-text" role="status">
          <span />
          {status}
        </p>
        <p className="ow-control-help">
          {sailing ? (
            <>
              <kbd>W A S D</kbd> steer <span>·</span>{" "}
              {raceTelemetry.phase === "idle"
                ? "click water to set a course"
                : "through the marked gates"}{" "}
              <span>·</span> Esc to pause
            </>
          ) : (
            <>A little exploration. A different perspective.</>
          )}
        </p>
        <p className="ow-telemetry" aria-hidden="true">
          {String(
            Math.round(((telemetry.heading * 180) / Math.PI + 360) % 360),
          ).padStart(3, "0")}
          ° <i />
          {(Math.abs(telemetry.speed) * 1.94384).toFixed(1)}
          <small>kn · simulated</small>
        </p>
      </footer>
      <dialog
        ref={dialog}
        className="ow-index-dialog"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const items = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'a[href],button:not([disabled]),[tabindex="0"]',
            ),
          ).filter((element) => element.getClientRects().length);
          const first = items[0],
            last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onCancel={(e) => {
          e.preventDefault();
          closeIndex();
        }}
        onClose={() => setIndexOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeIndex();
        }}
        aria-labelledby="index-title"
      >
        <div className="ow-index-inner">
          <div className="ow-index-top">
            <span className="ow-micro">A few places to begin</span>
            <button onClick={() => closeIndex()} aria-label="Close work index">
              Close <span aria-hidden="true">×</span>
            </button>
          </div>
          <h2 id="index-title">
            The work,
            <br />
            <em>without the voyage.</em>
          </h2>
          <p>Four places. No sailing required.</p>
          <div className="ow-index-list">
            {destinations.map((d) => (
              <a
                id={`index-${d.id}`}
                key={d.id}
                href={nativeHref(d.href)}
                onClick={(e) => {
                  if (
                    !e.metaKey &&
                    !e.ctrlKey &&
                    !e.shiftKey &&
                    e.button === 0
                  ) {
                    e.preventDefault();
                    readDestination(d);
                  }
                }}
              >
                <span>{d.number}</span>
                <div>
                  <strong>{d.project}</strong>
                  <small>{d.name}</small>
                </div>
                <Arrow />
              </a>
            ))}
          </div>
          <div className="ow-index-footer">
            <a
              href={nativeHref("/case-studies/soma-ai")}
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey) {
                  e.preventDefault();
                  navigate("/case-studies/soma-ai");
                }
              }}
            >
              From the archive: Soma AI <Arrow />
            </a>
            <a href="mailto:tejas.kaushik@outlook.com">
              Say hello <Arrow />
            </a>
          </div>
        </div>
      </dialog>
    </section>
  );
}
