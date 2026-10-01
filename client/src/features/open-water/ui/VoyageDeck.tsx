import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { getRegion, portalsFrom, regionIds, sampleRegionFloor, type RegionId } from "../data/regions";
import type { VesselId } from "../data/vessels";
import type { Expedition } from "../systems/expeditionController";
import type { BoatState } from "../systems/boatController";
import type { ReefPose, ReefState } from "../systems/reefController";
import { DOCKING_BERTH, FISHING_CATCHES, FISH_COURSE_GATES, FISH_COURSE_SECONDS, dockingFit, type FishingState, type DockingState, type FishCourseState } from "../systems/gameController";
import "../voyage-deck.css";

export type VoyageDeckPanel = "chart" | "fleet" | "fish" | "fishing" | "docking" | "help" | null;
export type VoyageDeckProps = {
  panel: VoyageDeckPanel;
  onPanel: (panel: VoyageDeckPanel) => void;
  region: RegionId;
  mode: Expedition["mode"];
  actor: "diver" | "nemo" | "dory";
  vessel: VesselId;
  pose: ReefState;
  boat: BoatState;
  fishing: FishingState;
  docking: DockingState;
  fishCourse: FishCourseState;
  quiet: boolean;
  visibilityAssist: boolean;
  onVisibilityAssist: (value: boolean) => void;
  onRegion: (id: RegionId, portalId?: string) => void;
  onActor: (actor: "diver" | "nemo" | "dory") => void;
  onVessel: (vessel: VesselId) => void;
  onChallenge: (challenge: "fishing" | "docking" | "fish-course") => void;
  onEndChallenge: () => void;
  onFishingAction: (action: "cast" | "hook" | "reel" | "ease" | "release" | "advance", aim?: number) => void;
  onDockAssist: () => void;
  onPose: (pose: ReefPose) => void;
  onReturn: () => void;
  onPhoto: () => void;
  onResume: () => void;
  activity: string;
  paused: boolean;
  reeling: boolean;
};

const titles: Record<Exclude<VoyageDeckPanel, null>, string> = {
  chart: "Four places. One ocean.", fleet: "Your expedition, afloat.", fish: "A smaller point of view.",
  fishing: "A little patience.", docking: "An unhurried arrival.", help: "Make yourself at home.",
};
const chartPoints: Record<RegionId, [number, number]> = { crown: [132, 51], driftwall: [266, 39], cathedral: [60, 99], lantern: [181, 119] };
const dialogue = {
  dakota: ["Dakota. Shark by identification, dolphin by silhouette. Your guide either way.", "The yacht will wait. I have personally checked its patience.", "A good shortcut still leaves you a way home."],
  nemo: ["Small fish. Very large itinerary.", "See that little passage? Finally, a door in my size.", "The coral has plenty of room around it. That's where I swim."],
  dory: ["I found a beautiful view. Let's stay long enough to notice it.", "Blue water, blue fish. I like a coordinated expedition.", "We can take the scenic route. The chart remembers the way back."],
} as const;

function Icon({ kind }: { kind: "chart" | "fleet" | "fish" | "play" | "help" }) {
  const paths = {
    chart: <><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z"/><path d="M9 3v16M15 5v16"/></>,
    fleet: <><path d="m3 15 3 5h12l3-5ZM6 15V9h11v6M9 9V5h5v4"/><path d="M2 23c2-2 4 0 6 0s4-2 6 0 4 0 8-1"/></>,
    fish: <><path d="M4 12c4-8 10-8 14 0-4 8-10 8-14 0Zm14 0 4-5v10Z"/><circle cx="8" cy="11" r=".7" fill="currentColor"/></>,
    play: <><path d="M5 18 8 5h8l3 13-5-4h-4Z"/><path d="M9 9v4M7 11h4M15 10h.01M16 12h.01"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 2-2.5 2-2.5 4M12 17h.01"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}

function RegionMap({ selected }: { selected: RegionId }) {
  return <svg className="vd-map" viewBox="0 0 340 156" role="img" aria-label="Crown Reef connects to Driftwall and Blue Cathedral. Blue Cathedral connects to Lantern Grotto. All four are available directly from the chart.">
    <path d="M0 26Q90 8 172 28T340 18M0 70Q110 46 205 67T340 58M0 124Q84 94 192 121T340 111" className="vd-contour"/>
    <path d="m132 51 134-12M132 51 60 99l121 20" className="vd-passage"/>
    <path d="M305 109v-17m-4 5 4-5 4 5" className="vd-north"/><text x="302" y="122" className="vd-map-caption">N</text>
    {regionIds.map((id, index) => {
      const [x, y] = chartPoints[id];
      return <g key={id} className={selected === id ? "is-selected" : ""}>
        <ellipse cx={x} cy={y} rx={id === "driftwall" ? 25 : 20} ry={id === "lantern" ? 13 : 17} className={`vd-map-island vd-map-${id}`}/>
        <circle cx={x} cy={y} r="12" className="vd-map-marker"/>
        <text x={x} y={y + 4} textAnchor="middle" className="vd-map-number">0{index + 1}</text>
      </g>;
    })}
  </svg>;
}

function FishPortrait({ name }: { name: "nemo" | "dory" }) {
  return <svg viewBox="0 0 126 66" className={`vd-fish-portrait vd-fish-${name}`} aria-hidden="true">
    <path d="m89 31 24-18-1 38-23-15" className="vd-fish-tail"/>
    <path d="M17 35c6-18 22-25 42-23 18 1 29 8 37 21-9 15-24 20-41 20-20 0-30-7-38-18Z" className="vd-fish-body"/>
    {name === "nemo" ? <><path d="M39 16c-6 9-6 24 0 32M65 15c-4 11-4 24 1 34M88 24v18" stroke="#fff3da" strokeWidth="9" fill="none"/><path d="m53 37 10-3-2 12Z" fill="#9a4c25"/></> : <><path d="M42 19c23-1 40 4 43 14-4 10-20 9-28 2l15-3c-7-5-17-7-30-7Z" fill="#183449"/><path d="m58 36 9-1-2 9Z" fill="#e2c66d"/></>}
    <circle cx="29" cy="30" r="5.3" fill="#f6f1e7"/><circle cx="27.5" cy="30" r="2.7" fill="#173942"/>
    <path d="M21 38q5 4 10 0" stroke="#173942" strokeWidth="1.4" fill="none"/>
  </svg>;
}

function Readout({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return <div className="vd-readout"><span>{label}</span><strong>{value}</strong>{children}</div>;
}

export default function VoyageDeck(props: VoyageDeckProps) {
  const { panel, mode, region, actor, vessel, pose, activity, fishing, docking, fishCourse, quiet, paused, reeling } = props;
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const previousPanel = useRef<VoyageDeckPanel>(null);
  const [aim, setAim] = useState(0.5);
  const [speaker, setSpeaker] = useState<keyof typeof dialogue | null>(null);
  const [line, setLine] = useState(0);
  const habitat = getRegion(region);
  const underwater = mode === "reef";
  const traveling = mode === "entering";
  const busy = ["fishing", "docking", "fish-course", "racing", "race"].includes(activity);
  const available = !traveling && !busy;
  const surface = mode === "surface";
  const titleId = `${id}-title`, drawerId = `${id}-drawer`;
  const nearbyPortals = underwater ? portalsFrom(region).filter(p => Math.hypot(p.position.x - pose.x, p.position.y - pose.y, p.position.z - pose.z) <= p.radius) : [];
  useEffect(() => {
    if (panel && previousPanel.current !== panel) heading.current?.focus({ preventScroll: true });
    else if (!panel && previousPanel.current && opener.current?.isConnected) opener.current.focus({ preventScroll: true });
    previousPanel.current = panel;
  }, [panel]);
  const close = () => props.onPanel(null);
  const switchPanel = (next: Exclude<VoyageDeckPanel, null>, button: HTMLButtonElement) => {
    opener.current = button;
    props.onPanel(panel === next ? null : next);
  };
  const talk = (name: keyof typeof dialogue) => {
    setLine(speaker === name ? (line + 1) % dialogue[name].length : 0);
    setSpeaker(name);
  };
  const mapDisabled = !available;
  const activeGame = activity === "fishing" || activity === "docking" || activity === "fish-course";
  const fit = dockingFit(props.boat);
  const maxDepth = Math.max(3, -sampleRegionFloor(region, pose.x, pose.z), ...habitat.chambers.map(cell => -cell.min[1]));
  const changePose = (patch: Partial<ReefPose>) => props.onPose({ x: pose.x, y: pose.y, z: pose.z, heading: pose.heading, ...patch });
  const quietViews = underwater && quiet ? <details className="vd-quiet">
    <summary>Choose a still position</summary>
    <p>Move your view across the habitat and choose a depth. Stone and the seafloor keep the route clear.</p>
    {busy && <p className="vd-note">Leave the challenge before choosing a different still view. Use the direction controls to take it one step at a time.</p>}
    <fieldset className="vd-position-grid" disabled={busy} aria-label="Still viewpoint">
      <label>East / west <output>{pose.x.toFixed(1)}</output><input type="range" min={-habitat.bounds.x} max={habitat.bounds.x} step="0.1" value={pose.x} onChange={e => changePose({ x: Number(e.target.value) })}/></label>
      <label>North / south <output>{pose.z.toFixed(1)}</output><input type="range" min={-habitat.bounds.z} max={habitat.bounds.z} step="0.1" value={pose.z} onChange={e => changePose({ z: Number(e.target.value) })}/></label>
      <label>Depth <output>{(-pose.y).toFixed(1)}</output><input type="range" min={actor === "diver" ? 1 : 0.35} max={maxDepth} step="0.1" value={-pose.y} onChange={e => changePose({ y: -Number(e.target.value) })}/></label>
      <label>Look around <output>{Math.round(pose.heading * 180 / Math.PI)}°</output><input type="range" min="-180" max="180" step="1" value={Math.atan2(Math.sin(pose.heading), Math.cos(pose.heading)) * 180 / Math.PI} onChange={e => changePose({ heading: Number(e.target.value) * Math.PI / 180 })}/></label>
    </fieldset>
  </details> : null;

  return <div className={`voyage-deck ${panel ? "vd-open" : ""} ${underwater ? "vd-underwater" : ""}`} data-testid="voyage-deck">
    <nav className="vd-toolbar" aria-label="Expedition activities">
      {([
        ["chart", "Chart", "chart"], ["fleet", "Aboard", "fleet"], ["fish", "Fish", "fish"], ["fishing", "Play", "play"], ["help", "Help", "help"],
      ] as const).map(([next, label, icon]) => <button key={next} type="button" className={panel === next || next === "fishing" && panel === "docking" ? "is-active" : ""} aria-expanded={panel === next || next === "fishing" && panel === "docking"} aria-controls={drawerId} onClick={e => switchPanel(next, e.currentTarget)} data-testid={`voyage-${next}`}><Icon kind={icon}/><span>{label}</span></button>)}
    </nav>
    {(underwater || traveling) && <button type="button" className="vd-return" onClick={props.onReturn} data-testid="voyage-return"><span aria-hidden="true">↥</span> {traveling ? "Cancel travel" : "Return aboard"}<span className="vd-return-vessel">{vessel === "superyacht" ? "Superyacht" : "Tender"}</span></button>}
    {panel && <section id={drawerId} className="vd-drawer" role="region" aria-labelledby={titleId} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
      <header className="vd-heading"><div><span className="vd-eyebrow">OPEN WATER / {panel === "chart" ? "FIELD CHART" : panel === "fleet" ? "THE FLEET" : panel === "fish" ? "MEET THE RESIDENTS" : panel === "help" ? "FIRST BEARINGS" : "OFF DUTY"}</span><h2 ref={heading} id={titleId} tabIndex={-1}>{titles[panel]}</h2></div><button type="button" className="vd-close" aria-label="Close expedition panel" onClick={close}>×</button></header>
      <div className="vd-body">
        {panel === "chart" && <>
          <RegionMap selected={region}/>
          <p className="vd-intro">Two reefs. Two worlds below the rock. Every destination is open from the start.</p>
          {busy && <p className="vd-note">Leave your current challenge to travel. Your yacht stays where you left it.</p>}
          <div className="vd-regions">{regionIds.map((next, index) => {
            const place = getRegion(next);
            const here = underwater && region === next;
            return <article key={next} className={`vd-region ${here ? "is-here" : ""}`} style={{ "--region-color": place.palette.water } as CSSProperties}>
              <span className="vd-region-number">0{index + 1}{here ? " / YOU ARE HERE" : place.cave ? " / CAVE" : " / REEF"}</span>
              <h3>{place.name}</h3><p>{place.subtitle}</p>
              <button type="button" onClick={() => props.onRegion(next)} disabled={mapDisabled || here} data-testid={`region-${next}`}>{here ? "Here, now" : surface ? "Dive here" : "Travel here"}<span aria-hidden="true">↗</span></button>
            </article>;
          })}</div>
          {underwater && <div className="vd-landmarks"><h3>Places in {habitat.name}</h3>{habitat.landmarks.map(place => <button type="button" key={place.id} disabled={traveling || busy} onClick={() => props.onPose(place)} title={place.description}>{place.name}<span aria-hidden="true">↗</span></button>)}</div>}
          {nearbyPortals.length > 0 && <div className="vd-portals"><h3>A passage nearby</h3>{nearbyPortals.map(portal => <button type="button" className="vd-primary" disabled={mapDisabled} key={portal.id} onClick={() => props.onRegion(portal.to, portal.id)}>{portal.label} <span aria-hidden="true">→</span></button>)}</div>}
          {quietViews}
        </>}

        {panel === "fleet" && <>
          <svg className="vd-yacht-drawing" viewBox="0 0 350 102" aria-hidden="true"><path d="m17 71 26 20h246l43-30-43 10Z"/><path d="M54 70V50h210l25 20M86 50V32h126l29 18M117 32V19h56l16 13M147 19V8"/><path d="M99 39h101M66 58h177M35 94q27-4 51 0t51 0 51 0 51 0 51 0" className="vd-yacht-detail"/><path d="M39 70h250" className="vd-yacht-teak"/></svg>
          <p className="vd-intro">Room to take the long way. A deliberate superyacht for the open channels; a quick tender for the playground.</p>
          <div className="vd-fleet-list">{(["superyacht", "tender"] as const).map(next => <article key={next} className={next === vessel ? "is-here" : ""}><div><span className="vd-eyebrow">{next === vessel ? "CURRENT VESSEL" : next === "tender" ? "READY TO LAUNCH" : "YOUR HOME AFLOAT"}</span><h3>{next === "superyacht" ? "The superyacht" : "The sport tender"}</h3><p>{next === "superyacht" ? "Broad decks, an easy wake, and a swim platform that doubles as a fishing spot." : "Light on its feet. Built for the slalom, ramps and a little unnecessary speed."}</p></div><button type="button" className={next === vessel ? "vd-secondary" : "vd-primary"} disabled={!surface || !available || next === vessel} onClick={() => props.onVessel(next)} data-testid={`vessel-${next}`}>{next === vessel ? "You're aboard" : next === "tender" ? "Launch tender" : "Return to superyacht"}</button></article>)}</div>
          {!surface && <p className="vd-note">Return aboard before changing vessels. Your original mooring is waiting.</p>}
          {surface && <button type="button" className="vd-text-action" onClick={() => props.onPanel("docking")}>Try a captain's arrival <span aria-hidden="true">→</span></button>}
        </>}

        {panel === "fish" && <>
          <p className="vd-intro">The same ocean feels different a few inches above the sand.</p>
          <div className="vd-residents">{(["nemo", "dory"] as const).map(name => <article key={name}><FishPortrait name={name}/><h3>{name === "nemo" ? "Nemo" : "Dory"}</h3><p>{name === "nemo" ? "Clownfish. Small passages, big plans." : "Blue tang. A scenic-route enthusiast."}</p><button type="button" className="vd-secondary" onClick={() => talk(name)}>Say hello</button><button type="button" className="vd-primary" disabled={!underwater || !available || actor === name} onClick={() => props.onActor(name)} data-testid={`swim-${name}`}>{actor === name ? "You're swimming" : `Swim as ${name === "nemo" ? "Nemo" : "Dory"}`}</button></article>)}</div>
          <div className="vd-game-teaser">
            <span className="vd-eyebrow">DORY’S FIELD NOTES / DRIFTWALL</span>
            <h3>A view worth keeping.</h3>
            <p>“Find the fan corals. Leave room for the blue. Then wait for a fish to wander into the frame.”</p>
            <button type="button" className="vd-secondary" disabled={!available || traveling} data-testid="dory-photo-excursion" onClick={() => {
              if (!underwater || region !== "driftwall") { props.onRegion("driftwall"); return; }
              props.onPose(getRegion("driftwall").landmarks.find(place => place.id === "wall")!);
              props.onPhoto();
            }}>{underwater && region === "driftwall" ? "Frame Dory’s view" : "Meet Dory at Driftwall"} <span aria-hidden="true">↗</span></button>
            <p className="vd-note">Your fieldbook stays in this visit. Save a photograph only when you choose.</p>
          </div>
          <button type="button" className="vd-text-action" onClick={() => talk("dakota")}>A word from Dakota, the shark <span aria-hidden="true">↗</span></button>
          {underwater && habitat.cave && <p className="vd-note">Dakota waits back in Crown Reef’s open channels. “Too much shark for those tiny doorways.”</p>}
          {speaker && <blockquote className="vd-dialogue" aria-live="polite"><span>{speaker[0].toUpperCase() + speaker.slice(1)}</span>“{dialogue[speaker][line]}”</blockquote>}
          {!underwater && <div className="vd-inline-action"><p>Dive into a reef to swim with the residents.</p><button type="button" className="vd-primary" disabled={!available} onClick={() => props.onRegion("crown")}>Visit Crown Reef ↗</button></div>}
          {underwater && actor !== "diver" && <button type="button" className="vd-secondary" disabled={!available} onClick={() => props.onActor("diver")} data-testid="return-to-diver">Return to diving</button>}
          {underwater && <div className="vd-game-teaser"><span className="vd-eyebrow">THE SHOAL RUN / SIX RINGS</span><h3>A small fish, a quick lap.</h3><p>Follow six rings through Crown Reef. Forty-five seconds, or your own pace in Quiet view.</p><button type="button" className="vd-primary" disabled={!available || actor === "diver" || region !== "crown"} onClick={() => props.onChallenge("fish-course")}>Start the shoal run</button>{region !== "crown" ? <p className="vd-note">The course is in Crown Reef. You can travel there from the chart.</p> : actor === "diver" ? <p className="vd-note">Choose Nemo or Dory to take the course.</p> : null}</div>}
          {activity === "fish-course" && <div className="vd-game-status"><div className="vd-readouts"><Readout label="Rings" value={`${fishCourse.gateIndex} / ${FISH_COURSE_GATES.length}`}/><Readout label={fishCourse.assisted ? "At your pace" : "Remaining"} value={fishCourse.assisted ? "No timer" : `${Math.max(0, FISH_COURSE_SECONDS - fishCourse.elapsed).toFixed(1)}s`}/></div><p role="status">{fishCourse.notice}</p></div>}
          {quietViews}
        </>}

        {panel === "fishing" && <>
          {activity !== "fishing" ? <><p className="vd-intro">A cast from the swim platform. Three catches, three releases, and nowhere else to be.</p><div className="vd-inline-action"><button type="button" className="vd-primary" disabled={!surface || vessel !== "superyacht" || !available} onClick={() => props.onChallenge("fishing")} data-testid="start-fishing">Go fishing</button><p>{!surface ? "Return aboard to cast a line." : vessel !== "superyacht" ? "The fishing platform is aboard the superyacht." : busy ? "Leave your current challenge first." : "Catch and release. Quiet view keeps the bite waiting for you."}</p></div><div className="vd-game-teaser"><span className="vd-eyebrow">SOMETHING DIFFERENT</span><h3>A captain's arrival.</h3><p>Bring the whole yacht alongside. Line up the bow, ease off, and hold a gentle arrival.</p><button type="button" className="vd-secondary" onClick={() => props.onPanel("docking")}>Try docking →</button><button type="button" className="vd-text-action" onClick={() => props.onPanel("fish")}>Or swim a lap as a fish →</button></div></> : <>
            <div className="vd-readouts"><Readout label="Released" value={`${fishing.released.length} / 3`}/><Readout label="On the line" value={fishing.phase === "finished" ? "Everyone's home" : FISHING_CATCHES[Math.min(fishing.round, 2)].name}/></div>
            {fishing.phase === "casting" && <><label className="vd-aim-label" htmlFor={`${id}-aim`}>Choose your cast <span>Follow the silver school</span></label><div className="vd-cast-water" aria-hidden="true"><span className="vd-school" style={{ left: `${fishing.schoolPosition * 100}%` }}>‹‹‹</span><span className="vd-cast-marker" style={{ left: `${aim * 100}%` }}>⌖</span><i/></div><input id={`${id}-aim`} type="range" min="0" max="1" step="0.01" value={aim} onChange={event => setAim(Number(event.target.value))} aria-valuetext={`${Math.round(aim * 100)} percent across the cove`}/><button type="button" className="vd-primary" onClick={() => props.onFishingAction("cast", aim)} data-testid="cast-line">Cast the line ↗</button></>}
            {fishing.phase === "waiting" && <div className="vd-float-scene" aria-hidden="true"><span>│</span><i>◉</i><em/></div>}
            {fishing.phase === "bite" && <button type="button" className="vd-primary" onClick={() => props.onFishingAction("hook")} data-testid="hook-fish">A bite — set the hook</button>}
            {fishing.phase === "reeling" && <><label className="vd-meter">Line tension <strong>{Math.round(fishing.tension * 100)}%</strong><meter min={0} max={1} low={0.12} high={0.86} optimum={0.45} value={fishing.tension}/></label><label className="vd-meter">Bringing it close <strong>{Math.round(fishing.progress * 100)}%</strong><progress max="1" value={fishing.progress}/></label><div className="vd-actions"><button type="button" className={reeling ? "vd-primary" : "vd-secondary"} aria-pressed={reeling} onClick={() => props.onFishingAction(reeling ? "ease" : "reel")} data-testid="reel-fish">{reeling ? "Reeling — tap to ease" : "Reel in"}</button><button type="button" className="vd-secondary" onClick={() => props.onFishingAction("ease")}>Ease the line</button></div></>}
            {fishing.phase === "landed" && <div className="vd-catch"><span aria-hidden="true">◁</span><h3>{FISHING_CATCHES[fishing.round].name}</h3><p>A brief introduction. Then back to the ocean.</p><button type="button" className="vd-primary" onClick={() => props.onFishingAction("release")} data-testid="release-fish">Release this fish ↗</button></div>}
            {fishing.phase === "finished" && <div className="vd-catch"><span aria-hidden="true">≈</span><h3>A good day on the water.</h3><p>Three fish met. Three fish released.</p></div>}
            <p className="vd-feedback" role="status">{fishing.notice}</p>
            {quiet && fishing.phase !== "landed" && fishing.phase !== "finished" && <button type="button" className="vd-secondary" onClick={() => props.onFishingAction("advance")} data-testid="fishing-advance">Advance two quiet seconds →</button>}
          </>}
        </>}

        {panel === "docking" && <>
          <p className="vd-intro">A good arrival barely makes a ripple. Settle the whole hull inside the berth, with the bow aligned.</p>
          {activity !== "docking" ? <><button type="button" className="vd-primary" disabled={!surface || vessel !== "superyacht" || !available} onClick={() => props.onChallenge("docking")} data-testid="start-docking">Begin the arrival</button>{!surface || vessel !== "superyacht" ? <p className="vd-note">Take the helm of the superyacht to try this berth.</p> : null}</> : <>
            <svg viewBox="0 0 300 110" className="vd-berth" aria-hidden="true"><path d="M38 24h224v66H38Z"/><path d="m77 57 28-18h122v38H105Z" className={fit.fits ? "is-fit" : ""}/><path d="M164 57H111m8-7-8 7 8 7" className="vd-berth-arrow"/><path d="M18 99h264" className="vd-quay"/></svg>
            <div className="vd-readouts"><Readout label="To the berth" value={`${fit.distance.toFixed(0)} units`}/><Readout label="Settled" value={`${docking.settled.toFixed(1)} / ${DOCKING_BERTH.settleSeconds}s`}/></div>
            <ul className="vd-dock-checks"><li className={fit.fits ? "is-met" : ""}>{fit.fits ? "✓" : "○"} Whole hull inside</li><li className={fit.aligned ? "is-met" : ""}>{fit.aligned ? "✓" : "○"} Bow aligned</li><li className={fit.slow && fit.stable ? "is-met" : ""}>{fit.slow && fit.stable ? "✓" : "○"} Slow and steady</li></ul>
            <p className="vd-feedback" role="status">{docking.notice}</p>
            {docking.phase !== "finished" && <button type="button" className="vd-secondary" onClick={props.onDockAssist} data-testid="dock-assist">{quiet ? "Take one guided step" : "Guide the approach"} →</button>}
          </>}
          <button type="button" className="vd-text-action" onClick={() => props.onPanel("fishing")}>Back to fishing & play ←</button>
        </>}

        {panel === "help" && <>
          <p className="vd-intro">Sail a little. Stay a while. Your work and contact links are always in the main navigation.</p>
          <dl className="vd-help"><div><dt>On the water</dt><dd><kbd>W</kbd><kbd>S</kbd> forward / reverse. <kbd>A</kbd><kbd>D</kbd> steer. Arrow keys work too. Click clear water to set a course; steering takes control back.</dd></div><div><dt>Below the surface</dt><dd>Use the same direction keys. <kbd>Q</kbd> rises; <kbd>E</kbd> dives. Use the on-screen controls on a phone.</dd></div><div><dt>A quieter expedition</dt><dd>Quiet view keeps the scene still. Choose named views or an exact position in the chart. Challenges have step controls or an untimed route.</dd></div><div><dt>Leave whenever you like</dt><dd>Return aboard brings you back to the vessel you left. The chart can take you directly to every habitat.</dd></div></dl>
          <label className="vd-check"><input type="checkbox" checked={props.visibilityAssist} onChange={event => props.onVisibilityAssist(event.target.checked)}/><span>Brighter underwater visibility<small>Lift the darker cave views without changing the route.</small></span></label>
          {quietViews}
        </>}
      </div>
      {activeGame && <footer className="vd-game-footer">{paused && !quiet && <button type="button" className="vd-primary" onClick={props.onResume}>Resume challenge</button>}<button type="button" className="vd-secondary" onClick={props.onEndChallenge} data-testid="leave-challenge">Leave challenge</button></footer>}
    </section>}
  </div>;
}
