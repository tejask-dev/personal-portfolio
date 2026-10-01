import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { selectedWork } from "@/data/selectedWork";
import {
  encounters,
  reefPlaces,
  lensStops,
  contactEmail,
  linkedIn,
  type EncounterId,
} from "../data/encounters";
import { destinations, islands, raceCourses, ramps } from "../data/world";
import { resolveReefPose, type ReefPose } from "../systems/reefController";
import type { Expedition, Panel } from "../systems/expeditionController";
import type { BoatState } from "../systems/boatController";
import type { RaceState } from "../systems/raceController";
import FieldIllustration from "./FieldIllustration";

export type SceneBridge = {
  capture: () => Promise<Blob>;
  preview: (canvas: HTMLCanvasElement) => void;
};
const nativeHref = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
const source =
  "https://github.com/tejask-dev/Docubridge-Intership/blob/a6c9d2b4e81b9fa3bc6d61d9958f03936174ee2f/Backend/app.py";
const stages = [
  {
    name: "Input",
    eyebrow: "01 / A spreadsheet",
    title: "Give the data a way in.",
    body: "The prototype accepts an uploaded spreadsheet, stores its reference and returns sheet metadata. No files are uploaded here: this is a walkthrough of the public source.",
    lines: "L533-L584",
    code: ["File reference", "Available sheets"],
  },
  {
    name: "Analysis",
    eyebrow: "02 / A parsed table",
    title: "Make the work inspectable.",
    body: "The analysis path creates a dataframe and analyzer, gathers the analysis, then creates charts. Each stage leaves a structure the interface can work with.",
    lines: "L641-L662",
    code: ["Parsed dataframe", "Analysis methods", "Chart generation"],
  },
  {
    name: "Output",
    eyebrow: "03 / An explicit response",
    title: "Return more than an answer.",
    body: "The response names four top-level fields. Chart data can be retrieved separately. These are source-defined keys, not computed results from a running backend.",
    lines: "L664-L669",
    code: ["analysis", "charts", "columns", "numeric_columns"],
  },
];
export type PanelProps = {
  panelEntry: number;
  state: Expedition;
  boat: BoatState;
  race: RaceState;
  reef: ReefPose;
  failed: boolean;
  onOpen: (panel: Panel) => void;
  onEncounter: (id: EncounterId) => void;
  onTravel: (id: string) => void;
  onRead: (href: string) => void;
  onPose: (pose: ReefPose, still?: boolean) => void;
  onRace: (id: string) => void;
  onFreeSail: () => void;
  onQuiet: (value: boolean) => void;
  lens: number;
  onLens: (value: number) => void;
  bridge: MutableRefObject<SceneBridge | null>;
  guideHidden: boolean;
  onGuideHidden: (value: boolean) => void;
  fishApart: boolean;
  onFishApart: (value: boolean) => void;
  camouflage: boolean;
  onCamouflage: (value: boolean) => void;
  outline: boolean;
  onOutline: (value: boolean) => void;
  cleaner: 0 | 1 | 2;
  onCleaner: (value: 0 | 1 | 2) => void;
  quality: "low" | "high";
  onQuality: (value: "low" | "high") => void;
  sound: boolean;
  onSound: (value: boolean) => void;
  onPhotoCamera: (yaw: number, zoom: number) => void;
};
function WaterMap({
  boat,
  reef,
  mode,
  onTravel,
}: {
  boat: BoatState;
  reef: ReefPose;
  mode: Expedition["mode"];
  onTravel: (id: string) => void;
}) {
  const map = (x: number, z: number) => ({
    x: 200 + x * 0.46,
    y: 190 + z * 0.46,
  });
  const yacht = map(boat.x, boat.z),
    diver = map(reef.x - 65, reef.z - 15);
  return (
    <svg
      className="exp-world-map"
      viewBox="0 0 400 380"
      role="img"
      aria-label="Archipelago map. Work to the north and east, reef west of the anchorage, race courses in the outer water."
    >
      <defs>
        <pattern
          id="exp-map-grid"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path d="M20 0H0V20" fill="none" stroke="currentColor" opacity=".1" />
        </pattern>
      </defs>
      <rect width="400" height="380" fill="url(#exp-map-grid)" />
      <circle
        cx="200"
        cy="190"
        r="166"
        fill="none"
        stroke="currentColor"
        strokeDasharray="2 5"
        opacity=".2"
      />
      {raceCourses.map((c) => (
        <polyline
          key={c.id}
          points={[c.start, ...c.gates]
            .map((p) => `${map(p.x, p.z).x},${map(p.x, p.z).y}`)
            .join(" ")}
          stroke="#b76243"
          strokeWidth="2"
          strokeDasharray="4 5"
          fill="none"
          opacity=".7"
        />
      ))}
      {islands.map((i) => (
        <ellipse
          key={i.id}
          cx={map(i.x, i.z).x}
          cy={map(i.x, i.z).y}
          rx={i.r * 0.5}
          ry={i.r * 0.35}
          fill="#c9d2b0"
          stroke="#527970"
        />
      ))}
      {ramps.map((i) => (
        <path
          key={i.id}
          d={`M${map(i.x, i.z).x - 4} ${map(i.x, i.z).y + 3}l8-6v6Z`}
          fill="#b76243"
        />
      ))}
      <ellipse
        cx="170"
        cy="183"
        rx="18"
        ry="12"
        fill="#8ecdc0"
        stroke="#24777a"
      />
      <text x="146" y="208">
        Crown Reef
      </text>
      <path
        d="m162 114 4-16h5l4 16ZM161 115h15"
        stroke="currentColor"
        fill="#f6f1e7"
      />
      <text x="118" y="91">
        Lighthouse
      </text>
      {destinations.map((d) => {
        const p = map(d.x, d.z);
        return (
          <g key={d.id}>
            <circle cx={p.x} cy={p.y} r="12" fill="#f6f1e7" stroke="#285c60" />
            <text x={p.x} y={p.y + 4} textAnchor="middle">
              {d.number}
            </text>
            <text x={p.x + 16} y={p.y + 4}>
              {d.project}
            </text>
          </g>
        );
      })}
      <g
        transform={`translate(${yacht.x} ${yacht.y}) rotate(${(boat.heading * 180) / Math.PI})`}
      >
        <path d="M0-7 5 6 0 3-5 6Z" fill="#143b43" />
      </g>
      {mode === "reef" && (
        <circle cx={diver.x} cy={diver.y} r="5" fill="#c96543" stroke="#fff" />
      )}
      <text x="365" y="31">
        N ↑
      </text>
      <text x="18" y="360">
        FICTIONAL WATERS / NO REQUIRED ROUTE
      </text>
    </svg>
  );
}
export const panelTitle: Record<Exclude<Panel, null>, string> = {
  map: "The field guide",
  work: "The work, directly.",
  dakota: "Dakota, reef guide.",
  fish: "A little room to swim.",
  photo: "Keep a perspective.",
  camouflage: "Hiding in plain sight.",
  cleaner: "A useful arrangement.",
  bearings: "Find your bearings.",
  artifact: "From input to insight.",
  radio: "A channel to Tejass.",
  playground: "Take the long way.",
  settings: "Make yourself at home.",
};

export default function ExpeditionPanels(p: PanelProps) {
  const [stage, setStage] = useState(0),
    [trace, setTrace] = useState(false),
    [allStages, setAllStages] = useState(false);
  const [radio, setRadio] = useState(2),
    [copied, setCopied] = useState("");
  const [bearingTarget, setBearingTarget] = useState("boat"),
    [bearing, setBearing] = useState("");
  const [bearingReading, setBearingReading] = useState<{
    angle: number;
    distance: number;
    label: string;
    request: number;
  } | null>(null);
  const [caption, setCaption] = useState(
    "I’m Dakota. Reef guide. Shark. I know the way to the good stuff.",
  );
  const [photo, setPhoto] = useState<string | null>(null),
    [gallery, setGallery] = useState<string[]>([]),
    [photoStatus, setPhotoStatus] = useState("");
  const [yaw, setYaw] = useState(0),
    [zoom, setZoom] = useState(1);
  const preview = useRef<HTMLCanvasElement>(null);
  const urls = useRef(new Set<string>()),
    captureEpoch = useRef(0);
  const panel = p.state.panel,
    quiet = p.state.quiet || p.failed;
  const racing = p.race.phase === "countdown" || p.race.phase === "racing";
  useEffect(() => {
    captureEpoch.current++;
    setTrace(false);
  }, [panel]);
  useEffect(() => {
    if (panel === "radio") {
      setRadio(2);
      setCopied("");
    }
  }, [panel, p.panelEntry]);
  useEffect(
    () => () => {
      captureEpoch.current++;
      urls.current.forEach((u) => URL.revokeObjectURL(u));
      urls.current.clear();
    },
    [],
  );
  useEffect(() => {
    if (!trace || quiet || panel !== "artifact") return;
    const id = window.setTimeout(() => {
      if (stage < 2) setStage((s) => s + 1);
      else setTrace(false);
    }, 850);
    return () => clearTimeout(id);
  }, [trace, stage, quiet, panel]);
  const read = (slug: string) => p.onRead(`/case-studies/${slug}`);
  const capture = async () => {
    const epoch = ++captureEpoch.current;
    setPhotoStatus("Capturing this view…");
    try {
      if (!p.bridge.current) throw new Error("unavailable");
      const blob = await p.bridge.current.capture();
      if (epoch !== captureEpoch.current) return;
      const url = URL.createObjectURL(blob);
      urls.current.add(url);
      setPhoto((previous) => {
        if (previous && !gallery.includes(previous)) {
          URL.revokeObjectURL(previous);
          urls.current.delete(previous);
        }
        return url;
      });
      setPhotoStatus("Preview ready. Nothing has been saved or uploaded.");
    } catch {
      if (epoch === captureEpoch.current)
        setPhotoStatus(
          "This view can’t be saved yet. You can still inspect the reef or try again.",
        );
    }
  };
  const removePhoto = (url: string) => {
    setGallery((items) => items.filter((u) => u !== url));
    if (photo === url) setPhoto(null);
    urls.current.delete(url);
    URL.revokeObjectURL(url);
  };
  const clearPreview = () =>
    setPhoto((previous) => {
      if (previous && !gallery.includes(previous)) {
        URL.revokeObjectURL(previous);
        urls.current.delete(previous);
      }
      return null;
    });
  const keep = () => {
    if (!photo) return;
    if (gallery.includes(photo)) {
      setPhotoStatus("This view is already in your fieldbook.");
      return;
    }
    if (gallery.length >= 6) {
      setPhotoStatus(
        "Your fieldbook has six views. Remove one below before keeping another.",
      );
      return;
    }
    setGallery((items) => [...items, photo]);
    setPhotoStatus(
      "Kept in this visit’s fieldbook. Save image to keep a file.",
    );
  };
  const getBearings = () => {
    const origin =
      p.state.mode === "reef" ? { x: p.reef.x - 65, z: p.reef.z - 15 } : p.boat;
    const target =
      bearingTarget === "boat"
        ? (p.state.returnBoat ?? p.boat)
        : bearingTarget === "lighthouse"
          ? { x: -75, z: -135 }
          : (destinations.find((d) => d.id === bearingTarget) ??
            destinations[0]);
    const dx = target.x - origin.x,
      dz = target.z - origin.z,
      angle = ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
    const dirs = [
      "north",
      "northeast",
      "east",
      "southeast",
      "south",
      "southwest",
      "west",
      "northwest",
    ];
    const label =
      bearingTarget === "boat"
        ? "Your boat"
        : bearingTarget === "lighthouse"
          ? "The lighthouse"
          : (destinations.find((d) => d.id === bearingTarget)?.project ??
            "Your destination");
    setBearingReading((previous) => ({
      angle,
      distance: Math.hypot(dx, dz),
      label,
      request: (previous?.request ?? 0) + 1,
    }));
    setBearing(
      Math.hypot(dx, dz) < 3
        ? `${label} is here.`
        : `${label} is ${dirs[Math.round(angle / 45) % 8]}, bearing ${Math.round(angle).toString().padStart(3, "0")}°. ${Math.round(Math.hypot(dx, dz))} scene units away. Locating it does not start travel.`,
    );
  };
  useEffect(() => {
    if (panel !== "photo") return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        if (preview.current) p.bridge.current?.preview(preview.current);
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [panel, yaw, zoom, p.bridge]);
  if (!panel) return null;
  return (
    <div className={`exp-panel-content exp-panel-${panel}`}>
      {panel === "work" && (
        <>
          <p className="exp-lead">
            Five projects. Their purpose, my role, and the evidence behind the
            work.
          </p>
          <div className="exp-work-list">
            {selectedWork.map((w, i) => (
              <article key={w.slug}>
                <span className="exp-number">0{i + 1}</span>
                <div>
                  <a
                    href={nativeHref(`/case-studies/${w.slug}`)}
                    onClick={(e) => {
                      if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                        e.preventDefault();
                        read(w.slug);
                      }
                    }}
                  >
                    <h3>{w.title} ↗</h3>
                  </a>
                  <span>
                    {w.role} · {w.status} · {w.period}
                  </span>
                  <p>{w.description}</p>
                  <small>{w.proof}</small>
                  {w.sourceHref && (
                    <a
                      className="exp-source-link"
                      href={w.sourceHref}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {w.sourceLabel} ↗
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
          <button className="exp-primary" onClick={() => p.onOpen("radio")}>
            Contact about opportunities ↗
          </button>
        </>
      )}

      {panel === "map" && (
        <>
          <p className="exp-lead">
            A small world, with plenty of ways through. Your work and contact
            routes are always direct.
          </p>
          <div className="exp-map-layout">
            <div>
              <WaterMap
                boat={p.boat}
                reef={p.reef}
                mode={p.state.mode}
                onTravel={p.onTravel}
              />
              <div className="exp-map-destinations">
                {destinations.map((d) => (
                  <div key={d.id}>
                    <span>
                      {d.number} / {d.project}
                    </span>
                    <button onClick={() => p.onRead(d.href)}>Read ↗</button>
                    <button
                      disabled={racing || p.state.mode !== "surface" || quiet}
                      onClick={() => p.onTravel(d.id)}
                    >
                      Sail there
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="exp-encounter-grid">
              {encounters.map((e) => (
                <button key={e.id} onClick={() => p.onEncounter(e.id)}>
                  <span className="exp-number">
                    {e.number} / {e.verb}
                  </span>
                  <strong>{e.name}</strong>
                  <small>{e.place}</small>
                </button>
              ))}
            </div>
          </div>
          <button className="exp-link" onClick={() => p.onOpen("settings")}>
            Motion, sound and quality settings →
          </button>
        </>
      )}
      {panel === "dakota" && (
        <>
          <div className="exp-feature">
            <FieldIllustration kind="dolphin" />
            <div>
              <span className="exp-kicker">
                A dolphin who identifies as a shark
              </span>
              <p className="exp-caption" aria-live="polite">
                {caption}
              </p>
              <p>
                No itinerary to finish. Ask for a little guidance, or make your
                own way.
              </p>
            </div>
          </div>
          <div className="exp-actions">
            <button
              className="exp-primary"
              disabled={racing}
              onClick={() => p.onEncounter("reef")}
            >
              Explore reef ↓
            </button>
            <button
              disabled={racing || quiet}
              onClick={() => p.onEncounter("dakota")}
            >
              Follow Dakota
            </button>
            <button
              onClick={() => {
                setCaption("Reef, work, or a quick route back?");
                p.onOpen("bearings");
              }}
            >
              Find my bearings
            </button>
            <button
              onClick={() => {
                setCaption(
                  "The interesting part is how the work holds together. You can inspect the prototype here.",
                );
                p.onOpen("artifact");
              }}
            >
              Show me the work
            </button>
          </div>
          <label className="exp-check">
            <input
              type="checkbox"
              checked={p.guideHidden}
              onChange={(e) => p.onGuideHidden(e.target.checked)}
            />{" "}
            Hide Dakota. All navigation stays available.
          </label>
          {racing && (
            <p className="exp-note">
              Your run is paused. Choose Free sail before following Dakota or
              diving.
            </p>
          )}
        </>
      )}
      {panel === "fish" && (
        <>
          <div className="exp-feature">
            <FieldIllustration kind="fish" active={p.fishApart} />
            <div>
              <span className="exp-kicker">Observe / respond</span>
              <p className="exp-lead">Give them space. They’ll give it back.</p>
              <p>
                Swim gently toward the school and it parts around you. Move away
                and the fish gather again. No chasing, catching or points.
              </p>
              <p role="status">
                {p.fishApart
                  ? "The school opens a corridor around the visitor."
                  : "The school gathers into a loose, shared rhythm."}
              </p>
            </div>
          </div>
          <div className="exp-actions">
            <button
              aria-pressed={!p.fishApart}
              onClick={() => p.onFishApart(false)}
            >
              School together
            </button>
            <button
              aria-pressed={p.fishApart}
              onClick={() => p.onFishApart(true)}
            >
              School parts
            </button>
            <button
              className="exp-primary"
              disabled={racing}
              onClick={() =>
                p.onPose(
                  { ...reefPlaces[1], y: -3.5, heading: -Math.PI / 2 },
                  quiet,
                )
              }
            >
              Visit the silver shoal
            </button>
          </div>
        </>
      )}
      {panel === "camouflage" && (
        <>
          <div className="exp-feature">
            <FieldIllustration kind="octopus" active={p.camouflage} />
            <div>
              <span className="exp-kicker">Compare / discover</span>
              <p className="exp-lead">
                There’s more here than first meets the eye.
              </p>
              <p>
                Octopuses can change their appearance using specialized skin
                structures. This fictional resident shows two deliberately
                simplified states.
              </p>
              <a
                className="exp-link"
                href="https://ocean.si.edu/ocean-life/invertebrates/how-octopuses-and-squids-change-color"
                target="_blank"
                rel="noreferrer"
              >
                Read the Smithsonian explanation ↗
              </a>
            </div>
          </div>
          <div className="exp-actions">
            <button
              aria-pressed={!p.camouflage}
              onClick={() => p.onCamouflage(false)}
            >
              Camouflaged
            </button>
            <button
              aria-pressed={p.camouflage}
              onClick={() => p.onCamouflage(true)}
            >
              Revealed
            </button>
            <button
              aria-pressed={p.outline}
              onClick={() => p.onOutline(!p.outline)}
            >
              Show outline
            </button>
            <button
              className="exp-primary"
              disabled={racing}
              onClick={() =>
                p.onPose({ ...reefPlaces[3], y: -3.4, heading: -0.8 }, quiet)
              }
            >
              Visit the western shelf
            </button>
          </div>
          <p role="status">
            {p.camouflage
              ? "A warm coral silhouette stands out against the limestone."
              : "The resident borrows the muted color of the rock."}
            {p.outline ? " The silhouette is outlined." : ""}
          </p>
        </>
      )}
      {panel === "cleaner" && (
        <>
          <div className="exp-feature">
            <FieldIllustration kind="cleaner" active={p.cleaner === 1} />
            <div>
              <span className="exp-kicker">
                A small fish. A useful arrangement.
              </span>
              <p className="exp-lead">
                Two residents, each getting something out of it.
              </p>
              <p>
                The cleaner gets food by removing parasites and other material.
                The client receives a cleaning. This is an authored observation,
                with each moment available immediately.
              </p>
              <a
                className="exp-link"
                href="https://australian.museum/learn/animals/fishes/common-cleanerfish-labroides-dimidiatus/"
                target="_blank"
                rel="noreferrer"
              >
                About cleanerfish / Australian Museum ↗
              </a>
            </div>
          </div>
          <div className="exp-actions">
            {["Client arrives", "Cleaning", "Client leaves"].map((s, i) => (
              <button
                key={s}
                aria-pressed={p.cleaner === i}
                onClick={() => p.onCleaner(i as 0 | 1 | 2)}
              >
                {s}
              </button>
            ))}
            <button
              className="exp-primary"
              disabled={racing}
              onClick={() =>
                p.onPose({ ...reefPlaces[4], y: -4.6, heading: 1.2 }, quiet)
              }
            >
              Visit the cleaner station
            </button>
          </div>
          <p role="status">
            {
              [
                "A larger fish waits by the ledge.",
                "A small cleaner attends to the client’s side.",
                "The client leaves; the cleaner returns to the station.",
              ][p.cleaner]
            }
          </p>
        </>
      )}
      {panel === "bearings" && (
        <>
          <div className="exp-feature">
            <FieldIllustration kind="compass" />
            <div>
              <p className="exp-lead">
                A little orientation. No need to change course.
              </p>
              <p>
                The boat marker uses your saved position, wherever you chose to
                dive. These fictional bearings never use your device location.
              </p>
              <label className="exp-label">
                Locate
                <select
                  value={bearingTarget}
                  onChange={(e) => {
                    setBearingTarget(e.target.value);
                    setBearing("");
                    setBearingReading(null);
                  }}
                >
                  <option value="boat">My boat</option>
                  <option value="lighthouse">Lighthouse</option>
                  {destinations.map((d) => (
                    <option value={d.id} key={d.id}>
                      {d.project}
                    </option>
                  ))}
                </select>
              </label>
              <button className="exp-primary" onClick={getBearings}>
                Find my bearings
              </button>
            </div>
          </div>
          {bearingReading && (
            <svg
              key={bearingReading.request}
              className={`exp-bearing-chart ${quiet ? "is-quiet" : ""}`}
              viewBox="0 0 320 190"
              role="img"
              aria-label={`${bearingReading.label} highlighted relative to your position. ${bearing}`}
            >
              <path
                d="M160 15v150M75 90h170"
                stroke="currentColor"
                opacity=".2"
              />
              <circle
                cx="160"
                cy="90"
                r="65"
                fill="none"
                stroke="currentColor"
                opacity=".25"
              />
              <text x="160" y="16" textAnchor="middle">
                N
              </text>
              <circle
                className="exp-bearing-pulse"
                cx="160"
                cy="90"
                r="20"
                fill="none"
                stroke="currentColor"
              />
              <g
                transform={`translate(160 90) rotate(${bearingReading.angle})`}
              >
                <path
                  d={`M0 0V${bearingReading.distance < 3 ? 0 : -60}`}
                  stroke="currentColor"
                  strokeDasharray="3 4"
                />
                <circle
                  cx="0"
                  cy={bearingReading.distance < 3 ? 0 : -60}
                  r="7"
                  fill="#ac5036"
                />
              </g>
              <circle cx="160" cy="90" r="4" fill="currentColor" />
              <text x="160" y="182" textAnchor="middle">
                YOU → {bearingReading.label.toUpperCase()}
              </text>
            </svg>
          )}
          {bearing && (
            <p className="exp-result" role="status">
              {bearing}
            </p>
          )}
          <button className="exp-link" onClick={() => p.onOpen("map")}>
            See the whole map →
          </button>
        </>
      )}
      {panel === "artifact" && (
        <>
          <span className="exp-kicker">
            DocuBridge / Prototype · Source-backed walkthrough
          </span>
          <p className="exp-lead">
            Follow a spreadsheet from input to inspectable output.
          </p>
          <p>
            Software engineering intern · Summer 2025. A newly authored
            explanation of the public prototype, with the source alongside it.
          </p>
          <div className="exp-pipeline" aria-label="Pipeline stages">
            {stages.map((s, i) => (
              <button
                key={s.name}
                aria-pressed={stage === i}
                onClick={() => {
                  setStage(i);
                  setTrace(false);
                }}
              >
                <span>0{i + 1}</span>
                <strong>{s.name}</strong>
                <span aria-hidden="true">{i < 2 ? "→" : "↗"}</span>
              </button>
            ))}
          </div>
          {(allStages ? stages : [stages[stage]]).map((s) => (
            <article className="exp-artifact-detail" key={s.name}>
              <span className="exp-kicker">{s.eyebrow}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              <div className="exp-source-tree">
                <small>
                  {s.name === "Output"
                    ? "Structure from source"
                    : "Stage responsibilities"}
                </small>
                {s.code.map((c) => (
                  <code key={c}>{c}</code>
                ))}
              </div>
              <a
                className="exp-link"
                href={`${source}#${s.lines}`}
                target="_blank"
                rel="noreferrer"
              >
                Inspect this source ↗
              </a>
              {s.name === "Output" && (
                <a
                  className="exp-link"
                  href={`${source}#L793-L801`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Inspect chart retrieval ↗
                </a>
              )}
            </article>
          ))}
          <div className="exp-actions">
            <button
              onClick={() => {
                if (quiet) {
                  setAllStages(!allStages);
                } else if (trace) setTrace(false);
                else {
                  setStage(0);
                  setTrace(true);
                }
              }}
            >
              {quiet
                ? allStages
                  ? "One stage at a time"
                  : "Read the flow"
                : trace
                  ? "Stop trace"
                  : "Trace the flow"}
            </button>
            <button className="exp-primary" onClick={() => read("docubridge")}>
              Read the case study ↗
            </button>
            <button onClick={() => p.onOpen("radio")}>
              Contact about opportunities ↗
            </button>
          </div>
          <p className="exp-note">
            Pinned source: Backend/app.py · a6c9d2b. This walkthrough does not
            execute the historical backend or demonstrate customer adoption.
          </p>
        </>
      )}
      {panel === "radio" && (
        <>
          <div className="exp-radio-layout">
            <div>
              <FieldIllustration kind="radio" />
              <div className="exp-radio-dial" aria-hidden="true">
                <span style={{ transform: `rotate(${-55 + radio * 55}deg)` }} />
              </div>
              <div className="exp-segmented">
                {["Work", "About Tejass", "Opportunities"].map((s, i) => (
                  <button
                    key={s}
                    aria-pressed={radio === i}
                    onClick={() => {
                      setRadio(i);
                      setCopied("");
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="exp-kicker">
                Channel 0{radio + 1} /{" "}
                {["The work", "The person", "A conversation"][radio]}
              </span>
              <h3>
                {
                  [
                    "A few things I’ve helped build.",
                    "Engineer, builder, curious person.",
                    "What are you building next?",
                  ][radio]
                }
              </h3>
              <p>
                {
                  [
                    "Explore five projects across AI, education, research and the web. Each separates my role from the wider team’s outcomes.",
                    "I’m Tejass Kaushik, a software engineer drawn to work that connects thoughtful interfaces with the systems underneath.",
                    "Have an engineering opportunity in mind? I’d like to hear what you’re building and where I could contribute.",
                  ][radio]
                }
              </p>
              {radio === 0 ? (
                <button
                  className="exp-primary"
                  onClick={() => p.onOpen("work")}
                >
                  View the work ↗
                </button>
              ) : radio === 1 ? (
                <button
                  className="exp-primary"
                  onClick={() => p.onRead("#about")}
                >
                  About Tejass ↗
                </button>
              ) : (
                <>
                  <a className="exp-email" href={`mailto:${contactEmail}`}>
                    {contactEmail}
                  </a>
                  <div className="exp-actions">
                    <a className="exp-primary" href={`mailto:${contactEmail}`}>
                      Email Tejass ↗
                    </a>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(contactEmail);
                          setCopied("Email copied.");
                        } catch {
                          setCopied("Select and copy the address above.");
                        }
                      }}
                    >
                      Copy email
                    </button>
                    <a href={linkedIn} target="_blank" rel="noreferrer">
                      LinkedIn ↗
                    </a>
                  </div>
                  <p role="status">
                    {copied ||
                      "Email opens your mail app. Nothing is sent from this site."}
                  </p>
                </>
              )}
            </div>
          </div>
        </>
      )}
      {panel === "playground" && (
        <>
          <FieldIllustration kind="race" />
          <p className="exp-lead">Take a lap, or just try the ramps.</p>
          <p>
            {raceCourses.length} courses, your own pace. Work and contact stay available
            throughout. A race pauses when you open a reading panel.
          </p>
          <div className="exp-course-cards">
            {raceCourses.map((c) => (
              <article key={c.id}>
                <span className="exp-kicker">
                  {c.difficulty} · {c.gates.length} gates ·{" "}
                  {c.rampIds.length
                    ? `${c.rampIds.length} ${c.rampIds.length === 1 ? "jump" : "jumps"}`
                    : "open water"}
                </span>
                <h3>{c.name}</h3>
                <p>{c.description}</p>
                <button
                  className="exp-primary"
                  disabled={p.failed || p.state.mode !== "surface"}
                  onClick={() => p.onRace(c.id)}
                >
                  {quiet ? "Enable motion and race" : "Start"} {c.name}
                </button>
              </article>
            ))}
          </div>
          <p className="exp-note">
            Approach → takeoff → landing. Build speed before the ramp, keep your
            line in the air, then steer for the next gate. Times are local
            simulation times; session bests stay in this visit.
          </p>
          {racing && <button onClick={p.onFreeSail}>Free sail</button>}
        </>
      )}
      {panel === "photo" && (
        <>
          <p className="exp-lead">A view worth stopping for.</p>
          <p>
            Frame the scene, capture a preview, then decide whether to keep it.
            Nothing is uploaded.
          </p>
          <div className="exp-photo-preview">
            {photo ? (
              <img src={photo} alt="Your captured Open Water view" />
            ) : p.failed ? (
              <FieldIllustration kind="photo" />
            ) : (
              <canvas
                ref={preview}
                aria-label="Live still preview of your framing"
              />
            )}
          </div>
          <div className="exp-photo-controls">
            <label className="exp-label">
              Look around
              <input
                type="range"
                min="-1.1"
                max="1.1"
                step=".05"
                value={yaw}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setYaw(value);
                  clearPreview();
                  p.onPhotoCamera(value, zoom);
                }}
              />
            </label>
            <label className="exp-label">
              Framing
              <input
                type="range"
                min=".6"
                max="1.5"
                step=".05"
                value={zoom}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setZoom(value);
                  clearPreview();
                  p.onPhotoCamera(yaw, value);
                }}
              />
            </label>
          </div>
          <div className="exp-actions">
            <button
              className="exp-primary"
              disabled={p.failed || racing}
              onClick={capture}
            >
              {photo ? "Retake" : "Capture view"}
            </button>
            {photo && (
              <>
                <button onClick={keep}>Keep in fieldbook</button>
                <a href={photo} download="open-water-field-note.png">
                  Save image ↓
                </a>
              </>
            )}
          </div>
          <p role="status">{photoStatus}</p>
          {gallery.length > 0 && (
            <>
              <h3>Your fieldbook / {gallery.length} of 6</h3>
              <div className="exp-photo-grid">
                {gallery.map((u, i) => (
                  <figure key={u}>
                    <img src={u} alt={`Kept reef perspective ${i + 1}`} />
                    <figcaption>
                      <a href={u} download={`open-water-${i + 1}.png`}>
                        Save image
                      </a>
                      <button onClick={() => removePhoto(u)}>
                        Remove {i + 1}
                      </button>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </>
          )}
          <p className="exp-note">
            Images include a small credit line. Fieldbook previews clear when
            you leave this page; save an image if you want to keep it.
          </p>
        </>
      )}
      {panel === "settings" && (
        <>
          <p className="exp-lead">Explore at your own pace.</p>
          <div className="exp-settings-list">
            <div>
              <h3>Motion</h3>
              <p>
                Quiet view renders a still when you choose a new position. No
                automatic camera movement or looping wildlife.
              </p>
              <button
                aria-pressed={p.state.quiet}
                onClick={() => p.onQuiet(!p.state.quiet)}
              >
                {p.state.quiet ? "Enable motion" : "Use Quiet view"}
              </button>
            </div>
            <div>
              <h3>Sound</h3>
              <p>
                A soft, synthesized sea ambience. All information is written,
                and sound starts only when you choose it.
              </p>
              <button
                aria-pressed={p.sound}
                onClick={() => p.onSound(!p.sound)}
              >
                {p.sound ? "Mute ambience" : "Enable ambience"}
              </button>
            </div>
            <div>
              <h3>Detail</h3>
              <p>
                Low detail reduces wildlife density and rendering resolution
                while keeping every interaction.
              </p>
              <div className="exp-segmented">
                <button
                  aria-pressed={p.quality === "low"}
                  onClick={() => p.onQuality("low")}
                >
                  Low
                </button>
                <button
                  aria-pressed={p.quality === "high"}
                  onClick={() => p.onQuality("high")}
                >
                  High
                </button>
              </div>
            </div>
            <div>
              <h3>Your guide</h3>
              <button
                aria-pressed={p.guideHidden}
                onClick={() => p.onGuideHidden(!p.guideHidden)}
              >
                {p.guideHidden ? "Show Dakota" : "Hide Dakota"}
              </button>
            </div>
          </div>
          <h3>Controls</h3>
          <p>
            Focus the water to use W A S D or arrow keys. In the reef, Q rises
            and E descends. Escape stops travel. Tab always leaves the controls.
            Tap buttons and position selectors work without dragging or holding
            a key.
          </p>
          <a
            className="exp-link"
            href={`${import.meta.env.BASE_URL}assets/open-water-v3/WILDLIFE-CREDITS.md`}
            target="_blank"
            rel="noreferrer"
          >
            Wildlife credits ↗
          </a>
          <a
            className="exp-link"
            href={`${import.meta.env.BASE_URL}assets/open-water-v4/ART-CREDITS.md`}
            target="_blank"
            rel="noreferrer"
          >
            V4 art credits ↗
          </a>
        </>
      )}
    </div>
  );
}

export function ReefPositionControls({
  pose,
  onChange,
  quiet,
}: {
  pose: ReefPose;
  onChange: (pose: ReefPose) => void;
  quiet: boolean;
}) {
  const set = (key: "x" | "z" | "y", value: number) =>
    onChange(resolveReefPose({ ...pose, [key]: value }, pose).pose);
  return (
    <details className="exp-position">
      <summary>
        {quiet ? "Choose any reef position" : "Position & still viewpoints"}
      </summary>
      <div>
        <p>Choose a location and depth. Rock and sand set the safe limits.</p>
        <div className="exp-position-grid">
          <label>
            East / west
            <input
              aria-label="Reef east west position"
              type="range"
              min="-24"
              max="24"
              step="any"
              value={pose.x}
              onChange={(e) => set("x", Number(e.target.value))}
            />
            <output>{pose.x.toFixed(1)}</output>
          </label>
          <label>
            North / south
            <input
              aria-label="Reef north south position"
              type="range"
              min="-18"
              max="18"
              step="any"
              value={pose.z}
              onChange={(e) => set("z", Number(e.target.value))}
            />
            <output>{pose.z.toFixed(1)}</output>
          </label>
          <label>
            Depth
            <input
              aria-label="Reef depth"
              type="range"
              min="1"
              max="9"
              step="any"
              value={-pose.y}
              onChange={(e) => set("y", -Number(e.target.value))}
            />
            <output>{(-pose.y).toFixed(1)}</output>
          </label>
        </div>
        <div className="exp-viewpoints">
          {reefPlaces.map((place) => (
            <button
              key={place.id}
              onClick={() =>
                onChange({ ...place, y: -place.depth, heading: -Math.PI / 2 })
              }
            >
              {place.name}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}
