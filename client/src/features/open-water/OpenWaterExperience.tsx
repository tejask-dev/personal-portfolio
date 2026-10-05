import RegionFieldGuide from "./ui/RegionFieldGuide";
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { destinations, raceCourses, HOME } from "./data/world";
import {
  encounters,
  lensStops,
  reefPlaces,
  type EncounterId,
} from "./data/encounters";
import { REEF_CENTER } from "./data/reefTerrain";
import {
  createBoat,
  distance,
  steerTo,
  stepBoat,
  isBoatPoseSafe,
  type BoatState,
  type Input,
} from "./systems/boatController";
import {
  cancelRace,
  startRace,
  restartRace,
  type RaceState,
} from "./systems/raceController";
import {
  cloneBoat,
  expeditionReducer,
  initialExpedition,
  returnedBoat,
  safeBoatPose,
  isChallengeActivity,
  type Panel,
} from "./systems/expeditionController";
import {
  createReef,
  moveReef,
  safeReefSegment,
  resolveReefPose,
  stepReef,
  type ReefInput,
  type ReefPose,
  type ReefState,
} from "./systems/reefController";
import { voyage } from "./voyage";
import { getRegion, regionPortals, isRegionPoseSafe, safeRegionRestore, type RegionId, type RegionPose } from "./data/regions";
import type { VesselId } from "./data/vessels";
import { createFishing, createDocking, createFishCourse, startFishing, castFishing, hookFishing, releaseFishing, stepFishing, startDocking, stepDocking, startFishCourse, stepFishCourse, FISH_COURSE_START, DOCKING_BERTH } from "./systems/gameController";
import VoyageDeck, { type VoyageDeckPanel } from "./ui/VoyageDeck";
import RacePanel, { raceTime } from "./ui/RacePanel";
import ExpeditionPanels, {
  panelTitle,
  ReefPositionControls,
  type SceneBridge,
} from "./ui/ExpeditionPanels";
import EncounterCard, { type ObservedEncounter } from "./ui/EncounterCard";
import FieldIllustration from "./ui/FieldIllustration";
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
const nativeHref = (href: string) =>
  href.startsWith("/") ? `${import.meta.env.BASE_URL}${href.slice(1)}` : href;

export default function OpenWaterExperience({ presentationPaused = false }: { presentationPaused?: boolean }) {
  const [, navigate] = useLocation();
  const boat = useRef(voyage.boat),
    race = useRef(voyage.race),
    reef = useRef(voyage.reef);
  const input = useRef<Input>({}),
    reefInput = useRef<ReefInput>({}),
    bridge = useRef<SceneBridge | null>(null);
  const root = useRef<HTMLElement>(null),
    helm = useRef<HTMLDivElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLElement | null>(null);
  const activatingControl = useRef<HTMLElement | null>(null);
  const throttleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(new Set<string>()),
    blockedKeys = useRef(new Set<string>()),
    gestureEpoch = useRef(0);
  const [state, dispatch] = useReducer(expeditionReducer, undefined, () =>
    voyage.hasExplored
      ? { ...voyage.expedition, quiet: voyage.expedition.quiet || matchMedia("(prefers-reduced-motion: reduce)").matches, panel: null, userPaused: true }
      : initialExpedition(
          matchMedia("(prefers-reduced-motion: reduce)").matches,
        ),
  );
  const latest = useRef(state);
  latest.current = state;
  const games = useRef(voyage.games);
  const [deckPanel, setDeckPanel] = useState<VoyageDeckPanel>(null);
  const [visibilityAssist, setVisibilityAssist] = useState(false);
  const [, setGameRevision] = useState(0);
  const pendingReefPose = useRef<RegionPose | null>(null);
  const refreshGames = useCallback(() => setGameRevision(n => n + 1), []);
  const navContext = { regionId: state.region, actor: state.actor === "diver" ? "diver" as const : "fish" as const };
  const [diving, setDiving] = useState(false);
  const [panelEntry, setPanelEntry] = useState(0);
  const [observed, setObserved] = useState<ObservedEncounter | null>(null);
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [visible, setVisible] = useState(true),
    [tabVisible, setTabVisible] = useState(!document.hidden);
  const failedRef = useRef(failed);
  failedRef.current = failed;
  const [telemetry, setTelemetry] = useState<BoatState>({ ...boat.current }),
    [reefTelemetry, setReefTelemetry] = useState<ReefState>({
      ...reef.current,
    }),
    [raceTelemetry, setRaceTelemetry] = useState<RaceState>({
      ...race.current,
    });
  const [landmarks, setLandmarks] = useState<LandmarkProjection[]>([]),
    [resetKey, setResetKey] = useState(0);
  const [yachtModel, setYachtModel] = useState<
      "loading" | "licensed" | "procedural"
    >("loading"),
    [animalModel, setAnimalModel] = useState("idle");
  const [daylight, setDaylight] = useState(true),
    [cameraMode, setCameraMode] = useState<"aerial" | "follow">("aerial");
  const [guideHidden, setGuideHidden] = useState(false),
    [metGuide, setMetGuide] = useState(false);
  const [fishApart, setFishApart] = useState(false),
    [camouflage, setCamouflage] = useState(false),
    [outline, setOutline] = useState(false),
    [cleaner, setCleaner] = useState<0 | 1 | 2>(0);
  const [quality, setQuality] = useState<"low" | "high">(() =>
      window.innerWidth < 700 ? "low" : "high",
    ),
    [sound, setSound] = useState(false),
    [cruise, setCruise] = useState(false);
  const [lens, setLens] = useState(65.43),
    [photoCamera, setPhotoCamera] = useState({ yaw: 0, zoom: 1 });
  const slowSamples = useRef(0),
    previousRacePhase = useRef(race.current.phase);
  const [fps, setFps] = useState({ fps: 0, draws: 0, triangles: 0 });
  const updatePerformance = useCallback(
    (sample: { fps: number; draws: number; triangles: number }) => {
      setFps(sample);
      slowSamples.current = sample.fps < 25 ? slowSamples.current + 1 : 0;
      if (slowSamples.current >= 2) setQuality("low");
    },
    [],
  );
  const racing =
    raceTelemetry.phase === "countdown" || raceTelemetry.phase === "racing";
  const quiet = state.quiet || failed;
  const paused =
    presentationPaused ||
    quiet ||
    state.userPaused ||
    !visible ||
    !tabVisible ||
    Boolean(state.panel) ||
    state.mode === "entering" ||
    state.activity === "lighthouse";
  const active =
    state.sailing ||
    state.mode !== "surface" ||
    state.activity === "lighthouse";
  const canDive =
    state.mode === "surface" && !racing && !isChallengeActivity(state.activity) && safeBoatPose(boat.current);
  const destination =
    state.mode === "surface" && !racing && active
      ? destinations.find(
          (d) =>
            boat.current.arrived === d.id ||
            distance(boat.current, d.dock) < 11,
        )
      : undefined;
  const releaseKeys = useCallback(() => {
    input.current = {};
    reefInput.current = {};
    games.current.fishingInput = {};
    setCruise(false);
    if (throttleTimer.current) {
      clearTimeout(throttleTimer.current);
      throttleTimer.current = null;
    }
    for (const key of held.current) blockedKeys.current.add(key);
  }, []);
  const stopped = useCallback(() => {
    releaseKeys();
    gestureEpoch.current++;
  }, [releaseKeys]);
  const notify = (text: string) => dispatch({ type: "NOTICE", text });
  const focusWater = () =>
    requestAnimationFrame(() => {
      root.current?.scrollIntoView({ block: "start", behavior: "instant" });
      helm.current?.focus({ preventScroll: true });
    });
  const refreshBoat = () => {
    setTelemetry({ ...boat.current });
    setRaceTelemetry({ ...race.current });
  };
  const pauseTravel = () => {
    stopped();
    reef.current.target = null;
    reef.current.current = false;
  };
  const freezeBoat = (clearCourse = false) => {
    boat.current.speed = 0;
    boat.current.turn = 0;
    if (clearCourse) {
      games.current.dockingAssisted = false;
      boat.current.target = null;
      boat.current.route = [];
      boat.current.arrived = null;
    }
    refreshBoat();
  };
  const rememberTrigger = () => {
    // Keep the original outside control while navigating between modal pages.
    if (!latest.current.panel)
      trigger.current =
        activatingControl.current ?? (document.activeElement as HTMLElement);
  };
  const restoreTriggerFocus = () =>
    requestAnimationFrame(() => {
      const candidates = [
        trigger.current,
        helm.current,
        root.current?.querySelector<HTMLElement>("#open-work-index"),
      ];
      const target = candidates.find(
        (element) =>
          element &&
          element !== document.body &&
          element.isConnected &&
          element.getClientRects().length &&
          !element.matches(":disabled") &&
          !element.closest("[inert], dialog:not([open])"),
      );
      target?.focus({ preventScroll: true });
    });
  const openPanel = (panel: Panel) => {
    setDeckPanel(null);
    setObserved(null);
    setDiving(false);
    setPanelEntry((n) => n + 1);
    rememberTrigger();
    pauseTravel();
    refreshBoat();
    setReefTelemetry({ ...reef.current });
    dispatch({ type: "PANEL", panel, racing });
  };
  const closePanel = () => {
    stopped();
    refreshBoat();
    setReefTelemetry({ ...reef.current });
    dispatch({ type: "PANEL", panel: null });
    restoreTriggerFocus();
  };
  const start = () => {
    if (isChallengeActivity(state.activity) || state.mode === "entering") {
      dispatch({ type: "PAUSE", value: true });
      notify("Resume or leave your current challenge before free exploration.");
      return;
    }
    setObserved(null);
    pauseTravel();
    voyage.hasExplored = true;
    dispatch({ type: "SAIL" });
    requestAnimationFrame(() => {
      root.current?.scrollIntoView({ block: "start", behavior: "instant" });
      helm.current?.focus({ preventScroll: true });
    });
  };
  const returnBoat = () => {
    pendingReefPose.current = null;
    setDeckPanel(null);
    setObserved(null);
    setDiving(false);
    pauseTravel();
    if (state.mode === "entering") {
      if (state.returnBoat)
        Object.assign(boat.current, cloneBoat(state.returnBoat), {
          speed: 0,
          turn: 0,
        });
      dispatch({ type: "CANCEL_DIVE" });
    } else if (state.mode === "reef") {
      const result = returnedBoat(state.returnBoat);
      Object.assign(boat.current, result.boat);
      dispatch({ type: "RETURN", recovered: result.recovered });
    } else {
      freezeBoat();
      dispatch({ type: "OPENING" });
      if (racing) dispatch({ type: "PAUSE", value: true });
    }
    setPhotoCamera({ yaw: 0, zoom: 1 });
    setResetKey((k) => k + 1);
    refreshBoat();
    focusWater();
  };
  const beginDive = (requestedPose?: ReefPose) => {
    const previous = cloneBoat(boat.current);
    dispatch({ type: "DIVE", boat: previous, racing });
    if (racing || !safeBoatPose(previous) || state.mode !== "surface" || isChallengeActivity(state.activity)) return;
    pauseTravel();
    const context = { regionId: "crown" as const, actor: "diver" as const };
    pendingReefPose.current = resolveReefPose(requestedPose ?? getRegion("crown").spawn, createReef(context), context).pose;
    freezeBoat();
    voyage.hasExplored = true;
    setResetKey((k) => k + 1);
    focusWater();
  };
  const dive = () => beginDive();
  const onReefReady = useCallback((id: number) => {
    if (latest.current.mode !== "entering" || latest.current.transitionId !== id) return;
    const regionId = latest.current.region;
    const context = { regionId, actor: latest.current.actor === "diver" ? "diver" as const : "fish" as const };
    const initial = createReef(context);
    const resolved = resolveReefPose(pendingReefPose.current ?? initial, initial, context);
    Object.assign(reef.current, initial, resolved.pose);
    voyage.actorSafePose = { ...reef.current, ...safeRegionRestore(reef.current, { regionId, actor: "diver" }).pose };
    pendingReefPose.current = null;
    setReefTelemetry({ ...reef.current });
    if (
      latest.current.mode === "entering" &&
      latest.current.transitionId === id &&
      !failedRef.current &&
      !latest.current.quiet &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      setDiving(true);
    dispatch({ type: "REEF_READY", id });
  }, []);
  const onDiveEnd = useCallback(() => setDiving(false), []);
  const onReefError = useCallback(() => {
    pendingReefPose.current = null;
    dispatch({ type: "CANCEL_DIVE" });
    dispatch({
      type: "NOTICE",
      text: "This destination could not load. Your previous view and vessel are preserved. Choose another region or try again.",
    });
  }, []);
  const onError = useCallback(() => {
    setDiving(false);
    setFailed(true);
    input.current = {};
    reefInput.current = {};
    dispatch({ type: "FAIL" });
  }, []);
  const onReady = useCallback(() => setReady(true), []);
  const updateTelemetry = useCallback((value: BoatState) => {
    setTelemetry({ ...value });
    if (
      latest.current.activity === "escort" &&
      latest.current.mode === "surface" &&
      !value.target
    )
      dispatch({
        type: "ACTIVITY_DONE",
        pause: true,
        notice:
          "At the reef approach. Choose Explore reef whenever you’re ready.",
      });
    const current = race.current;
    if (
      current.phase === "finished" &&
      current.courseId &&
      current.finishTime !== null
    ) {
      const best = Math.min(
        voyage.bestTimes[current.courseId] ?? Infinity,
        current.finishTime,
      );
      voyage.bestTimes[current.courseId] = best;
      if (previousRacePhase.current !== "finished")
        dispatch({
          type: "NOTICE",
          text: `${raceCourses.find((c) => c.id === current.courseId)?.name ?? "Course"} complete. Your time ${raceTime(current.finishTime)}. Session best ${raceTime(best)}.`,
        });
    }
    previousRacePhase.current = current.phase;
    setRaceTelemetry({ ...current });
  }, []);
  const updateReef = useCallback((value: ReefState) => {
    if (isRegionPoseSafe(value, { regionId: latest.current.region, actor: "diver" })) voyage.actorSafePose = { ...value };
    setReefTelemetry({ ...value });
    const activity = latest.current.activity;
    if (
      (activity === "current" && !value.current) ||
      (activity === "escort" && latest.current.mode === "reef" && !value.target)
    )
      dispatch({
        type: "ACTIVITY_DONE",
        pause: true,
        notice:
          activity === "current"
            ? "The current opens into clear water. Resume swimming whenever you like."
            : "Dakota is waiting by the school. You’re free to explore.",
      });
  }, []);
  const updateLandmarks = useCallback(
    (points: LandmarkProjection[]) =>
      setLandmarks((previous) =>
        JSON.stringify(previous) === JSON.stringify(points) ? previous : points,
      ),
    [],
  );
  const read = (href: string) => {
    setDeckPanel(null);
    setObserved(null);
    setDiving(false);
    pauseTravel();
    dispatch({ type: "PAUSE", value: true });
    dispatch({ type: "PANEL", panel: null });
    voyage.expedition = { ...latest.current, panel: null, userPaused: true };
    voyage.hasExplored = active;
    voyage.paused = true;
    voyage.returnFocus =
      state.mode === "reef" ? "yacht-controls" : "open-work-index";
    voyage.returnPending = true;
    voyage.returnScroll = window.scrollY;
    if (href.startsWith("#")) {
      voyage.returnPending = false;
      requestAnimationFrame(() => {
        document
          .getElementById(href.slice(1))
          ?.scrollIntoView({ behavior: "instant" });
        document
          .getElementById(`${href.slice(1)}-title`)
          ?.focus({ preventScroll: true });
      });
    } else navigate(href);
  };
  const travel = (id: string) => {
    if (racing || isChallengeActivity(state.activity)) {
      notify(
        "Your activity is preserved. Leave the challenge before setting a new course.",
      );
      return;
    }
    if (state.mode !== "surface") return;
    const d = destinations.find((item) => item.id === id);
    if (!d) return;
    if (quiet) {
      read(d.href);
      return;
    }
    stopped();
    steerTo(boat.current, d.dock, d.id);
    dispatch({ type: "SAIL" });
    refreshBoat();
    focusWater();
  };
  const plotCourse = useCallback((point: { x: number; z: number }) => {
    const s = latest.current;
    if (
      !s.sailing ||
      s.userPaused ||
      s.quiet ||
      s.panel ||
      s.activity !== "none" ||
      race.current.phase === "countdown" ||
      race.current.phase === "racing"
    )
      return;
    if (s.mode === "reef") {
      const result = resolveReefPose(
        {
          ...reef.current,
          x: point.x - getRegion(s.region).worldOrigin.x,
          z: point.z - getRegion(s.region).worldOrigin.z,
        },
        reef.current,
        { regionId: s.region, actor: s.actor === "diver" ? "diver" : "fish" },
      );
      reef.current.target = result.pose;
      reef.current.current = false;
    } else if (s.mode === "surface") steerTo(boat.current, point);
    helm.current?.focus({ preventScroll: true });
  }, []);
  const setPose = (pose: ReefPose, still = true, focusAfter = true, stepped = false) => {
    if (racing) {
      notify("Choose Free sail before visiting the reef. Your run is paused.");
      return;
    }
    if (state.mode === "entering") return;
    if (isChallengeActivity(state.activity) && !(state.activity === "fish-course" && stepped)) {
      notify("Leave the challenge before choosing a different viewpoint.");
      return;
    }
    pauseTravel();
    if (state.mode !== "reef") { beginDive(pose); return; }
    const result = resolveReefPose(pose, reef.current, navContext);
    if (state.activity === "fish-course") {
      // Step controls sweep actual geometry, preserving the same gate crossing
      // rule as swimming. A stepped course is explicitly untimed.
      games.current.fishCourse.assisted = true;
      const from = { ...reef.current };
      const steps = Math.max(1, Math.ceil(Math.hypot(result.pose.x-from.x,result.pose.y-from.y,result.pose.z-from.z)/.18));
      for (let i=1;i<=steps;i++) {
        const t=i/steps;
        moveReef(reef.current, { x:from.x+(result.pose.x-from.x)*t, y:from.y+(result.pose.y-from.y)*t, z:from.z+(result.pose.z-from.z)*t, heading:result.pose.heading }, navContext);
        stepFishCourse(games.current.fishCourse, reef.current, 1 / 60);
      }
      setReefTelemetry({ ...reef.current }); refreshGames();
      dispatch({ type: "PAUSE", value: true }); setResetKey(n => n + 1);
      if (focusAfter) focusWater();
      return;
    }
    if (still || quiet) {
      if (stepped) moveReef(reef.current, result.pose, navContext);
      else Object.assign(reef.current, result.pose);
      setReefTelemetry({ ...reef.current });
      setResetKey((k) => k + 1);
    } else reef.current.target = result.pose;
    dispatch({ type: "PANEL", panel: null });
    dispatch({ type: "ACTIVITY", activity: "none" });
    dispatch({ type: "PAUSE", value: still || quiet });
    notify(result.notice || `View selected at depth ${(-reef.current.y).toFixed(1)}. Resume to swim from here.`);
    if (focusAfter) focusWater();
  };
  const encounter = (id: EncounterId) => {
    if (state.mode === "entering") return;
    if (isChallengeActivity(state.activity) && ["reef", "dakota", "lighthouse", "current", "fish", "camouflage", "cleaner"].includes(id)) {
      pauseTravel(); dispatch({ type: "PAUSE", value: true });
      notify("Your challenge is paused. Leave it before starting another encounter."); return;
    }
    if (state.mode === "reef" && state.region !== "crown" && ["dakota", "fish", "camouflage", "cleaner"].includes(id)) {
      pauseTravel(); setObserved(null); setDeckPanel("chart");
      dispatch({ type: "PANEL", panel: null }); dispatch({ type: "PAUSE", value: true });
      notify(id === "dakota" ? "Dakota waits in Crown Reef. Choose it on the chart to meet up." : "This field station is in Crown Reef. Its animals and ledges are marked on the chart."); return;
    }
    setDiving(false);
    if (observed && id !== "dakota") setObserved(null);
    if (id === "reef") {
      if (state.mode === "reef") {
        openPanel(null);
        focusWater();
      } else dive();
      return;
    }
    const competing = ["lighthouse", "current", "photo"];
    if (racing && competing.includes(id)) {
      openPanel("map");
      notify(
        "Your run is paused. Choose Free sail before starting another activity.",
      );
      return;
    }
    if (id === "dakota") {
      if (state.panel === "dakota" || observed === "dakota") {
        setObserved(null);
        if (racing || quiet) return;
        pauseTravel();
        setMetGuide(true);
        setGuideHidden(false);
        if (state.mode === "reef") {
          const destination = resolveReefPose({ x: -4, z: 7, y: -3.5, heading: -Math.PI / 2 }, reef.current, navContext).pose;
          if (!safeReefSegment(reef.current, destination, false, navContext)) {
            notify("Dakota is across the garden. Reach the open sand, or choose a clear view from the chart, before following."); return;
          }
          reef.current.target = destination;
        } else steerTo(boat.current, getRegion("crown").surfaceEntrance);
        dispatch({ type: "ACTIVITY", activity: "escort", racing });
        focusWater();
      } else if (quiet || racing) {
        setMetGuide(true);
        openPanel("dakota");
      } else {
        pauseTravel();
        freezeBoat(true);
        setMetGuide(true);
        setGuideHidden(false);
        dispatch({ type: "SAIL" });
        setObserved("dakota");
        focusWater();
      }
      return;
    }
    if (id === "lighthouse") {
      pauseTravel();
      freezeBoat();
      dispatch({ type: "ACTIVITY", activity: "lighthouse", racing });
      voyage.hasExplored = true;
      setResetKey((k) => k + 1);
      focusWater();
      return;
    }
    if (id === "current") {
      const path = getRegion(state.mode === "surface" ? "crown" : state.region).currentPath;
      if (!path.length) {
        pauseTravel(); dispatch({ type: "PAUSE", value: true }); setDeckPanel("chart");
        notify("The currents run through Crown Reef and Driftwall. The caves are calm; choose an open reef on the chart."); return;
      }
      const first = { ...path[0], heading: Math.atan2(path[1].x-path[0].x, -(path[1].z-path[0].z)) };
      if (state.mode !== "reef") { beginDive(first); return; }
      if (quiet) { setPose(first, true); notify("Current channel, still view. Follow the marked sand in Quiet view."); return; }
      pauseTravel();
      if (Math.hypot(reef.current.x-first.x, reef.current.y-first.y, reef.current.z-first.z)>1) {
        if (!safeReefSegment(reef.current, first, false, navContext)) {
          setDeckPanel("chart"); dispatch({ type: "PAUSE", value: true });
          notify("The current starts beyond the stone. Swim around it, or choose the current entry in Quiet view."); return;
        }
        reef.current.target=first;
        notify("Swim to the sand channel, then choose Ride current.");
        dispatch({type:"PANEL",panel:null}); dispatch({type:"PAUSE",value:false});
      } else {
        reef.current.current=true; reef.current.currentNode=1;
        dispatch({type:"ACTIVITY",activity:"current"});
      }
      focusWater(); return;
    }
    if (["fish", "camouflage", "cleaner"].includes(id) && !quiet && !racing) {
      rememberTrigger();
      pauseTravel();
      freezeBoat(true);
      if (state.mode === "surface") dive();
      else dispatch({ type: "PANEL", panel: null });
      setObserved(id as ObservedEncounter);
      focusWater();
      return;
    }
    const entry = encounters.find((e) => e.id === id);
    if (entry?.panel) openPanel(entry.panel);
  };
  const freeSail = () => {
    cancelRace(race.current);
    pauseTravel();
    freezeBoat(true);
    dispatch({ type: "PAUSE", value: true });
    setRaceTelemetry({ ...race.current });
    notify("Free sail selected. Choose Resume, or another activity.");
  };
  const changeRegion = (region: RegionId, portalId?: string) => {
    if (state.mode === "entering" || racing || ["fishing", "docking", "fish-course"].includes(state.activity)) {
      notify("Leave the current challenge before travelling. Your progress is preserved."); return;
    }
    if (state.mode === "surface" && !safeBoatPose(boat.current)) {
      notify("Reach clear water before diving. Your vessel needs a safe place to wait."); return;
    }
    const portal = portalId ? regionPortals.find(p => p.id === portalId && p.from === state.region && p.to === region) : null;
    if (portalId && (!portal || Math.hypot(reef.current.x - portal.position.x, reef.current.y - portal.position.y, reef.current.z - portal.position.z) > portal.radius)) {
      notify("Swim closer to that passage, or travel directly from the chart."); return;
    }
    pendingReefPose.current = portal?.arrival ?? getRegion(region).spawn;
    pauseTravel(); freezeBoat(); setObserved(null); setDeckPanel(null);
    dispatch({ type: "REGION", region, boat: cloneBoat(boat.current), racing });
    voyage.hasExplored = true; focusWater();
  };
  const switchVessel = (vessel: VesselId): boolean => {
    if (state.mode !== "surface" || racing || ["fishing", "docking"].includes(state.activity)) { notify("Leave your current activity before changing vessels."); return false; }
    if (boat.current.vesselId === vessel) return true;
    pauseTravel(); freezeBoat(true);
    if (vessel === "tender") {
      const anchor = cloneBoat(boat.current);
      if (!isBoatPoseSafe(anchor)) { notify("Find clear water before launching the tender."); return false; }
      let launched: BoatState | null = null;
      for (let i = 0; i < 16 && !launched; i++) {
        const angle = anchor.heading + i * Math.PI / 8;
        const candidate = { ...createBoat("tender"), x: anchor.x + Math.cos(angle) * 24, z: anchor.z + Math.sin(angle) * 24, heading: anchor.heading };
        if (isBoatPoseSafe(candidate)) launched = candidate;
      }
      if (!launched) { notify("There is not enough room to launch here. Sail to open water."); return false; }
      voyage.anchoredYacht = anchor; Object.assign(boat.current, launched);
    } else {
      const returned = returnedBoat(voyage.anchoredYacht);
      Object.assign(boat.current, returned.boat, { vesselId: "superyacht" });
      voyage.anchoredYacht = null;
    }
    setDeckPanel(null); dispatch({ type: "SAIL" }); dispatch({ type: "PAUSE", value: true });
    refreshBoat(); setResetKey(n => n + 1); notify(vessel === "tender" ? "Tender launched. The superyacht is anchored here until you return." : "Back aboard your superyacht, at rest.");
    return true;
  };
  const changeActor = (actor: "diver" | "nemo" | "dory") => {
    if (state.mode !== "reef" || state.activity === "fish-course") { notify("Enter a reef and leave the course before changing perspective."); return; }
    pauseTravel(); setObserved(null);
    let recovered = false;
    if (actor === "diver" && !isRegionPoseSafe(reef.current, { regionId: state.region, actor: "diver" })) {
      Object.assign(reef.current, safeRegionRestore(voyage.actorSafePose, { regionId: state.region, actor: "diver" }).pose);
      recovered = true;
    } else if (state.actor === "diver") voyage.actorSafePose = { ...reef.current };
    dispatch({ type: "ACTOR", actor });
    setDeckPanel(null);
    dispatch({ type: "PAUSE", value: quiet });
    focusWater();
    if (recovered) notify("Back at your last safe diving position. The passage was too small for a diver.");
    setReefTelemetry({ ...reef.current }); setResetKey(n => n + 1);
  };
  const endChallenge = () => {
    pauseTravel(); freezeBoat(true);
    Object.assign(games.current.fishing, createFishing(quiet));
    Object.assign(games.current.docking, createDocking());
    Object.assign(games.current.fishCourse, createFishCourse());
    games.current.dockingAssisted = false;
    dispatch({ type: "ACTIVITY", activity: "none" }); refreshGames();
    notify("Challenge ended. Your vessel and discoveries are kept.");
  };
  const beginChallenge = (activity: "fishing" | "docking" | "fish-course") => {
    if (racing || ["fishing", "docking", "fish-course"].includes(state.activity)) { notify("Leave your current challenge before starting another."); return; }
    if (activity === "fish-course" && (state.mode !== "reef" || state.region !== "crown")) { notify("The Shoal Run starts in Crown Reef. Choose it from the chart first."); return; }
    if (activity !== "fish-course" && state.mode !== "surface") { notify("Return aboard to try this challenge."); return; }
    if (activity !== "fish-course" && !safeBoatPose(boat.current)) { notify("Find clear water before beginning."); return; }
    if (activity === "docking" && boat.current.vesselId !== "superyacht") { notify("Return to the superyacht for the docking challenge."); return; }
    pauseTravel(); freezeBoat(true); setObserved(null);
    if (activity === "fishing") startFishing(games.current.fishing, quiet);
    if (activity === "docking") startDocking(games.current.docking);
    if (activity === "fish-course") {
      Object.assign(reef.current, FISH_COURSE_START, { target: null, current: false });
      if (state.actor === "diver") dispatch({ type: "ACTOR", actor: "nemo" });
      startFishCourse(games.current.fishCourse, reef.current, quiet);
      setReefTelemetry({ ...reef.current });
    }
    dispatch({ type: "ACTIVITY", activity });
    setDeckPanel(activity === "fish-course" ? "fish" : activity);
    refreshGames(); setResetKey(n => n + 1); focusWater();
  };
  const fishingAction = (action: "cast" | "hook" | "reel" | "ease" | "release" | "advance", aim?: number) => {
    const g = games.current;
    if (state.activity !== "fishing") return;
    if (action === "cast") castFishing(g.fishing, aim);
    if (action === "hook") hookFishing(g.fishing);
    if (action === "reel") g.fishingInput = { reel: !g.fishingInput.reel };
    if (action === "ease") g.fishingInput = { ease: true };
    if (action === "release") { releaseFishing(g.fishing); g.fishingInput = {}; }
    if (quiet) {
      g.fishing.assisted = true;
      for (let i = 0; i < 120; i++) stepFishing(g.fishing, g.fishingInput, 1 / 60);
    }
    dispatch({ type: "PAUSE", value: false }); refreshGames(); setResetKey(n => n + 1);
  };
  const dockAssist = () => {
    if (state.activity !== "docking") return;
    if (!games.current.dockingAssisted) {
      steerTo(boat.current, {
        x: DOCKING_BERTH.x-Math.sin(DOCKING_BERTH.heading)*40,
        z: DOCKING_BERTH.z+Math.cos(DOCKING_BERTH.heading)*40,
      }, "dock-approach");
    }
    games.current.dockingAssisted = true;
    dispatch({ type: "PAUSE", value: false }); setCameraMode("aerial");
    if (quiet) {
      for (let i = 0; i < 240; i++) advanceGames(1 / 60, true);
      refreshBoat(); refreshGames(); setResetKey(n => n + 1);
    }
  };
  const advanceGames = useCallback((dt: number, assistedStep = false) => {
    const s = latest.current, g = games.current;
    if (s.activity === "fishing") stepFishing(g.fishing, g.fishingInput, dt);
    if (s.activity === "docking") {
      if (g.dockingAssisted) {
        if (assistedStep) stepBoat(boat.current, {}, dt);
        if (!boat.current.target && boat.current.arrived === "dock-approach") {
          // An aligned runway leaves enough turning room for the whole hull.
          // Aim beyond the berth by the ordinary arrival tolerance; the real
          // controller brings the stopped hull near its center without a snap.
          steerTo(boat.current, {
            x: DOCKING_BERTH.x+Math.sin(DOCKING_BERTH.heading)*3,
            z: DOCKING_BERTH.z-Math.cos(DOCKING_BERTH.heading)*3,
          }, "dock-berth");
        }
        if (!boat.current.target && boat.current.arrived === "dock-berth" && Math.hypot(boat.current.x-DOCKING_BERTH.x,boat.current.z-DOCKING_BERTH.z)<5) {
          boat.current.speed *= Math.exp(-dt * 4); boat.current.turn = 0;
          const error = Math.atan2(Math.sin(DOCKING_BERTH.heading-boat.current.heading),Math.cos(DOCKING_BERTH.heading-boat.current.heading));
          const candidate={...boat.current,heading:boat.current.heading+error*Math.min(1,dt*2)};
          if (isBoatPoseSafe(candidate)) boat.current.heading=candidate.heading;
        }
      }
      stepDocking(g.docking, boat.current, dt);
    }
    if (s.activity === "fish-course") stepFishCourse(g.fishCourse, reef.current, dt);
  }, []);
  const beginRace = (id: string) => {
    if (failed || state.mode !== "surface") return;
    if (["fishing", "docking"].includes(state.activity)) { notify("Leave the current challenge before launching a race."); return; }
    if (boat.current.vesselId === "superyacht" && !switchVessel("tender")) return;
    setDeckPanel(null);
    pauseTravel();
    startRace(race.current, id, boat.current);
    dispatch({ type: "QUIET", value: false });
    dispatch({ type: "SAIL" });
    setCameraMode("follow");
    setResetKey((k) => k + 1);
    refreshBoat();
    voyage.hasExplored = true;
    focusWater();
  };
  const stopActivity = () => {
    pauseTravel(); freezeBoat(true);
    if (isChallengeActivity(state.activity)) {
      dispatch({ type: "PAUSE", value: true });
      notify("Challenge paused. Resume when ready, or choose Leave challenge.");
    } else dispatch({ type: "ACTIVITY", activity: "none" });
    focusWater();
  };
  const setQuiet = (value: boolean) => {
    pauseTravel();
    freezeBoat();
    dispatch({ type: "QUIET", value });
    setResetKey((k) => k + 1);
  };
  useEffect(() => {
    voyage.expedition = { ...state, panel: null };
    voyage.sailing = state.sailing;
    voyage.paused = state.userPaused;
    voyage.daylight = daylight;
    voyage.cameraMode = cameraMode;
  }, [state, daylight, cameraMode]);
  useEffect(() => {
    stopped();
  }, [state.mode, state.panel, state.quiet, stopped]);
  useEffect(() => {
    if (state.panel) {
      dialog.current?.showModal();
      if (dialog.current) dialog.current.scrollTop = 0;
    } else if (dialog.current?.open) dialog.current.close();
  }, [state.panel, panelEntry]);
  useEffect(() => {
    if (state.mode === "entering" && failed) onReefReady(state.transitionId);
  }, [state.mode, state.transitionId, failed, onReefReady]);
  useEffect(() => {
    if (!quiet) return;
    // Reduced motion may turn on during a game, including after graphics fail.
    // Keep completed catches/rings; the remaining challenge becomes untimed.
    games.current.fishing.assisted = true;
    games.current.fishCourse.assisted = true;
    refreshGames();
  }, [quiet, refreshGames]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    if (root.current) observer.observe(root.current);
    const blur = () => stopped();
    const visibility = () => {
      setTabVisible(!document.hidden);
      stopped();
    };
    const release = (e: globalThis.KeyboardEvent) => {
      held.current.delete(e.key);
      blockedKeys.current.delete(e.key);
    };
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => {
      if (query.matches) {
        stopped();
        dispatch({ type: "QUIET", value: true });
      }
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("keyup", release);
    query.addEventListener("change", preference);
    return () => {
      observer.disconnect();
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("keyup", release);
      query.removeEventListener("change", preference);
      input.current = {};
      reefInput.current = {};
      if (throttleTimer.current) {
        clearTimeout(throttleTimer.current);
        throttleTimer.current = null;
      }
    };
  }, [stopped]);
  useEffect(() => {
    if (!sound) return;
    let context: AudioContext | undefined;
    try {
      context = new AudioContext();
      const buffer = context.createBuffer(
        1,
        context.sampleRate * 3,
        context.sampleRate,
      );
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = (last + (Math.random() * 2 - 1) * 0.025) / 1.025;
        data[i] = last * 2.5;
      }
      const noise = context.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 650;
      const gain = context.createGain();
      gain.gain.value = tabVisible && visible && !presentationPaused && !state.userPaused ? 0.07 : 0;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      noise.start();
      void context.resume();
    } catch {
      setSound(false);
    }
    return () => {
      if (context) void context.close();
    };
  }, [sound, tabVisible, visible, presentationPaused, state.userPaused]);
  useEffect(() => {
    if (paused) {
      stopped();
      setDiving(false);
    }
  }, [paused, stopped]);
  const keys: Record<string, keyof ReefInput> = {
    w: "forward",
    ArrowUp: "forward",
    s: "backward",
    ArrowDown: "backward",
    a: "left",
    ArrowLeft: "left",
    d: "right",
    ArrowRight: "right",
    q: "rise",
    e: "descend",
  };
  const keyboard = (event: KeyboardEvent<HTMLDivElement>, down: boolean) => {
    if (event.target !== event.currentTarget) return;
    const key = keys[event.key] ?? keys[event.key.toLowerCase()];
    if (event.key === "Tab") {
      stopped();
      return;
    }
    if (event.key === "Escape" && down) {
      setObserved(null);
      stopActivity();
      document.getElementById("exp-resume")?.focus({ preventScroll: true });
      return;
    }
    if (!key) return;
    // A repeated key whose first press belonged to another control cannot
    // acquire the helm merely because focus moved while it remained held.
    if (down && event.repeat && !held.current.has(event.key)) return;
    if (down) held.current.add(event.key);
    else {
      held.current.delete(event.key);
      blockedKeys.current.delete(event.key);
    }
    if (blockedKeys.current.has(event.key)) return;
    if (!active || paused || diving || state.activity === "lighthouse" || state.mode === "entering") return;
    event.preventDefault();
    if (state.activity === "fishing") return;
    if (down && state.activity === "docking") games.current.dockingAssisted = false;
    if (down) setObserved(null);
    if (down && (state.activity === "escort" || state.activity === "current"))
      dispatch({ type: "ACTIVITY_DONE", pause: false });
    if (state.mode === "reef") {
      reefInput.current[key] = down;
      if (down) {
        reef.current.current = false;
        reef.current.target = null;
      }
    } else if (key !== "rise" && key !== "descend") {
      input.current[key] = down;
      if (down) setCruise(false);
    }
  };
  const stepControl = (key: keyof ReefInput) => {
    if (state.mode === "entering") return;
    if (state.activity === "fishing") { notify("Your vessel is anchored while fishing. Use the line controls, or leave the challenge."); return; }
    if (state.activity === "docking") games.current.dockingAssisted = false;
    setObserved(null);
    if (state.activity === "escort" || state.activity === "current")
      dispatch({ type: "ACTIVITY_DONE", pause: false });
    if (state.mode === "surface" && (key === "left" || key === "right")) {
      input.current = {};
    } else pauseTravel();
    if (state.mode === "reef") {
      if (!quiet) {
        // Touch uses the same swept swimming controller as the keyboard. A
        // short stroke keeps the animal swimming and animating; Quiet view
        // retains the explicit still steps below.
        reefInput.current[key] = true;
        dispatch({ type: "PAUSE", value: false });
        throttleTimer.current = setTimeout(() => {
          reefInput.current[key] = false;
          throttleTimer.current = null;
        }, 260);
        return;
      }
      const p = reef.current,
        next = { ...p };
      if (key === "left" || key === "right")
        next.heading += ((key === "left" ? -1 : 1) * Math.PI) / 12;
      else if (key === "rise" || key === "descend")
        next.y += (key === "rise" ? 1 : -1) * 0.5;
      else {
        const sign = key === "forward" ? 1 : -1;
        next.x += Math.sin(p.heading) * sign;
        next.z -= Math.cos(p.heading) * sign;
      }
      setPose(next, true, true, true);
    } else if (key === "left" || key === "right") {
      const candidate = { ...boat.current, heading: boat.current.heading + ((key === "left" ? -1 : 1) * Math.PI) / 18 };
      if (isBoatPoseSafe(candidate)) Object.assign(boat.current, candidate);
      else notify("The hull needs more turning room here. Move into the channel first.");
      if (state.activity === "docking") stepDocking(games.current.docking, boat.current, 1 / 60);
      refreshBoat(); refreshGames();
      setResetKey((k) => k + 1);
    } else if (quiet) {
      if (state.activity === "docking") {
        for (let i=0;i<30;i++) {
          stepBoat(boat.current, { [key]: true }, 1 / 60);
          stepDocking(games.current.docking, boat.current, 1 / 60);
        }
        refreshBoat(); refreshGames(); setResetKey(n => n + 1);
      } else notify("Enable motion to sail, or open a destination directly from the map.");
    } else {
      input.current[key as keyof Input] = true;
      dispatch({ type: "PAUSE", value: false });
      throttleTimer.current = setTimeout(() => {
        input.current[key as keyof Input] = false;
        throttleTimer.current = null;
      }, 260);
    }
  };
  const status = failed
    ? "Reading view · the whole field guide is here"
    : state.mode === "entering"
      ? `Preparing ${getRegion(state.region).name}`
      : state.activity === "lighthouse"
        ? `Lighthouse optics · ${Math.round(lens)}° · choose a bearing`
        : state.mode === "reef"
          ? `${getRegion(state.region).name} · ${(-reefTelemetry.y).toFixed(1)} depth · ${quiet ? "Quiet view" : state.userPaused ? "At rest" : "Free exploration"}`
          : racing
            ? `${raceTelemetry.phase === "countdown" ? "At the line" : "Time trial"} · ${raceTime(raceTelemetry.elapsed)}${paused ? " · paused" : ""}`
            : destination
              ? `Moored · ${destination.project}`
              : active
                ? `${state.userPaused || quiet ? "At anchor" : "Underway"} · ${Math.round(((telemetry.heading * 180) / Math.PI + 360) % 360)}°`
                : "A portfolio you can sail through";
  const lensPreview = lensStops.reduce(
    (best, s) =>
      Math.abs(s.bearing - lens) < Math.abs(best.bearing - lens) ? s : best,
    lensStops[0],
  );
  const lensAligned = Math.abs(lensPreview.bearing - lens) <= 7;
  return (
    <section
      ref={root}
      id="voyage"
      onClickCapture={(event) => {
        // WebKit pointer activation need not focus a button. Capture the actual
        // control for this event only; programmatic scene events use focus.
        const control =
          event.target instanceof Element
            ? event.target.closest<HTMLElement>(
                "button, a[href], [role='button']",
              )
            : null;
        activatingControl.current = control;
        // Clear after native capture and bubble listeners have both run.
        setTimeout(() => {
          if (activatingControl.current === control)
            activatingControl.current = null;
        }, 0);
      }}
      className={`ow-experience exp ${active ? "exp-active" : "exp-opening"} ${state.mode === "reef" ? "exp-underwater" : ""} ${state.activity === "lighthouse" ? "exp-at-lighthouse" : ""} ${observed ? "exp-observing" : ""} ${ready ? "is-ready" : ""} ${failed ? "exp-fallback" : ""}`}
      aria-label="Open Water, an interactive portfolio"
      data-race-phase={raceTelemetry.phase}
      data-race-checkpoint={raceTelemetry.checkpoint}
      data-race-elapsed={raceTelemetry.elapsed.toFixed(3)}
      data-airborne={telemetry.airborne}
      data-jump-count={telemetry.jumpCount}
      data-yacht-model={yachtModel}
      data-character-model={animalModel}
      data-boat-x={telemetry.x.toFixed(3)}
      data-boat-z={telemetry.z.toFixed(3)}
      data-boat-heading={telemetry.heading.toFixed(4)}
      data-boat-speed={telemetry.speed.toFixed(3)}
      data-render-fps={fps.fps.toFixed(1)}
      data-render-draws={fps.draws}
      data-render-triangles={fps.triangles}
      data-observed={observed ?? "none"}
      data-mode={state.mode}
      data-vessel={telemetry.vesselId}
      data-region={state.region}
      data-actor={state.actor}
      data-activity={state.activity}
      data-fishing-phase={games.current.fishing.phase}
      data-fishing-released={games.current.fishing.released.length}
      data-docking-phase={games.current.docking.phase}
      data-fish-course-phase={games.current.fishCourse.phase}
      data-fish-course-checkpoint={games.current.fishCourse.gateIndex}
      data-reef-x={reefTelemetry.x.toFixed(3)}
      data-reef-z={reefTelemetry.z.toFixed(3)}
      data-reef-y={reefTelemetry.y.toFixed(3)}
      data-reef-heading={reefTelemetry.heading.toFixed(5)}
      data-quality={quality}
      data-state={
        failed
          ? "FALLBACK"
          : state.panel
            ? "READING"
            : paused
              ? "PAUSED"
              : state.mode === "reef"
                ? "REEF"
                : active
                  ? "SAILING"
                  : "INTRO"
      }
    >
      <nav className="exp-nav" aria-label="Ocean navigation">
        <a
          className="exp-brand"
          href="#top"
          onClick={(e) => {
            if (active) {
              e.preventDefault();
              returnBoat();
            }
          }}
        >
          <Sailmark />
          <span>
            <strong>Tejass Kaushik</strong>
            <small>Software engineer</small>
          </span>
        </a>
        <span className="exp-wordmark" aria-hidden="true">
          Open Water <i>Field notes / 001</i>
        </span>
        <div className="exp-nav-links">
          {active && (
            <button id="back-opening" onClick={returnBoat} aria-label={state.mode !== "surface" ? "Return to boat" : "Return"}>
              <span className="exp-return-full">{state.mode !== "surface" ? "Return to boat" : "Return"}</span>
              <span className="exp-return-compact" aria-hidden="true">{state.mode !== "surface" ? "Boat" : "Return"}</span>
            </button>
          )}
          <button id="open-work-index" onClick={() => openPanel("work")}>
            Project guide <Arrow />
          </button>
          {active ? <>
            <button onClick={() => read("/case-studies/anticipy")}>Anticipy</button>
            <button onClick={() => read("#about")}>About</button>
          </> : <a href="#about" onClick={() => pauseTravel()}>About</a>}
          <button
            className="exp-nav-contact"
            onClick={() => openPanel("radio")}
          >
            Contact <Arrow />
          </button>
          <button onClick={() => openPanel("map")}>
            Map <span aria-hidden="true">⊕</span>
          </button>
        </div>
      </nav>
      <div className="exp-scene" aria-hidden="true">
        <div className="exp-poster">
          <span className="exp-poster-lighthouse" />
          <span className="exp-poster-reef" />
        </div>
        {!failed && (
          <SceneBoundary onError={onError}>
            <Suspense fallback={null}>
              <Scene
                region={state.region}
                actor={state.actor}
                visibilityAssist={visibilityAssist}
                anchoredYacht={voyage.anchoredYacht}
                games={games}
                onGameTick={advanceGames}
                onGameTelemetry={refreshGames}
                boat={boat}
                race={race}
                input={input}
                reef={reef}
                reefInput={reefInput}
                mode={state.mode}
                diving={diving}
                onDiveEnd={onDiveEnd}
                transitionId={state.transitionId}
                activity={state.activity}
                inspection={observed}
                panel={state.panel}
                quiet={quiet}
                quality={quality}
                guideHidden={guideHidden}
                characterRequested={metGuide || state.mode !== "surface"}
                fishApart={fishApart}
                camouflageRevealed={camouflage}
                camouflageOutline={outline}
                cleanerMoment={cleaner}
                lensBearing={lens}
                photoCamera={photoCamera}
                bridge={bridge}
                gestureEpoch={gestureEpoch}
                cruise={cruise}
                resetKey={resetKey}
                sailing={active}
                paused={paused}
                daylight={daylight}
                cameraMode={cameraMode}
                onTelemetry={updateTelemetry}
                onReefTelemetry={updateReef}
                onLandmarks={updateLandmarks}
                onYachtModel={setYachtModel}
                onAnimalModel={setAnimalModel}
                onReady={onReady}
                onError={onError}
                onReefReady={onReefReady}
                onReefError={onReefError}
                onCourse={plotCourse}
                onEncounter={encounter}
                onRegion={changeRegion}
                onCompanion={() => { pauseTravel(); setDeckPanel("fish"); dispatch({type:"PAUSE",value:true}); }}
                onPerformance={updatePerformance}
              />
            </Suspense>
          </SceneBoundary>
        )}
        {failed && (
          <div className="exp-static-habitat">
            {state.mode === "reef" ? <RegionFieldGuide region={state.region} pose={reefTelemetry} /> : <FieldIllustration kind="lighthouse" />}
            <p>
              {state.mode === "reef"
                ? `${getRegion(state.region).name} / still field guide · east ${reefTelemetry.x.toFixed(1)}, north ${(-reefTelemetry.z).toFixed(1)}, depth ${(-reefTelemetry.y).toFixed(1)}`
                : "The archipelago / illustrated field guide"}
            </p>
          </div>
        )}
      </div>
      <div
        id="yacht-controls"
        ref={helm}
        className="exp-water-controls"
        tabIndex={active ? 0 : -1}
        role="group"
        aria-label={
          state.mode === "reef"
            ? "Reef controls. W A S D or arrows to swim. Q to rise, E to descend. Escape stops. Tab leaves controls."
            : "Yacht controls. W or up accelerates, S or down reverses, A D or arrows steer. Escape stops. Tab leaves controls."
        }
        onKeyDown={(e) => keyboard(e, true)}
        onKeyUp={(e) => keyboard(e, false)}
        onBlur={releaseKeys}
      />
      {!active && (
        <>
          <div className="exp-intro">
            <p className="exp-kicker">
              <span />
              Open Water / a portfolio to explore
            </p>
            <h2>Open<br /><em>Water.</em></h2>
            <p className="exp-role"><strong>A few minutes out at sea.</strong></p>
            <p className="exp-statement">Captain a yacht.<br />Find another way through.</p>
            <p className="exp-context">Four underwater regions, a lighthouse, and a dolphin with very firm opinions about being a shark.</p>
            <div className="exp-opening-actions">
              <button className="exp-primary" onClick={() => openPanel("map")}>Explore the map <Arrow /></button>
              <a className="exp-text-link" href="#work" onClick={() => pauseTravel()}>Back to selected work <span>↑</span></a>
            </div>
            <p className="exp-opening-proof">Play is optional. Every project opens directly from the guide.</p>
            <button
              className="exp-opening-settings"
              onClick={() => openPanel("settings")}
            >
              {quiet ? "Quiet view" : "Motion on"} ·{" "}
              {sound ? "Sound on" : "Sound off"}
            </button>
          </div>
          <div className="exp-invitation">
            <span className="exp-kicker">For the curious</span>
            <p>
              An open ocean.
              <br />
              <em>A different perspective.</em>
            </p>
            <button id="take-helm" onClick={start}>
              {quiet ? "Explore in Quiet view" : "Take the helm"}
              <Arrow />
            </button>
            <button className="exp-invite-reef" onClick={dive}>
              Dive into the interactive reef ↓
            </button>
          </div>
          <div className="exp-location-tag">
            <span>A field expedition</span>
            <p>
              Reefs, caves, and
              <br />
              room to wander.
            </p>
          </div>
          <div className="exp-opening-bottom">
            <span>Sunlit channels / twelve encounters</span>
            <button onClick={() => openPanel("settings")}>
              {quiet ? "Quiet view" : "Motion on"} ·{" "}
              {sound ? "Sound on" : "Sound off"}
            </button>
            <a href="#descent">Scenic scroll dive ↓</a>
          </div>
        </>
      )}
      {active &&
        !state.panel &&
        !observed &&
        state.activity === "none" &&
        !diving && (
          <div className="exp-world-labels">
            {landmarks
              .filter(
                (l) =>
                  l.visible && l.x > 15 && l.x < 80 && l.y > 22 && l.y < 68,
              )
              .reduce<LandmarkProjection[]>((visible, landmark) => {
                const width = root.current?.clientWidth ?? 1440;
                const height = (root.current?.clientHeight ?? 960) - 90;
                // Keep labels attached to their subjects without letting nearby
                // encounters cover one another. Every encounter stays in the chart.
                if (visible.length < 3 && visible.every(other =>
                  Math.abs(other.x - landmark.x) * width / 100 > 210 ||
                  Math.abs(other.y - landmark.y) * height / 100 > 64
                )) visible.push(landmark);
                return visible;
              }, [])
              .map((l) => (
                <button
                  key={l.id}
                  style={{ left: `${l.x}%`, top: `${l.y}%` }}
                  onClick={() => {
                    const d = destinations.find((d) => d.id === l.id);
                    if (d) read(d.href);
                    else if(l.id.startsWith("region-")) changeRegion(l.id.slice(7) as RegionId);
                    else encounter(l.id as EncounterId);
                  }}
                >
                  <span aria-hidden="true">+</span>
                  {(
                    {
                      dakota: "Meet Dakota",
                      fish: "The silver shoal",
                      camouflage: "Hiding in plain sight",
                      cleaner: "Cleaner station",
                      current: "Ride the current",
                      lighthouse: "Visit the lighthouse",
                      reef: "Explore Crown Reef",
                      artifact: "Inspect the workbench",
                      radio: "Tune the harbor radio",
                    } as Record<string, string>
                  )[l.id] ??
                    destinations.find((d) => d.id === l.id)?.project ??
                    (l.id.startsWith("region-") ? getRegion(l.id.slice(7) as RegionId).name : "Explore")}
                </button>
              ))}
          </div>
        )}
      {active && (
        <>
          <div className="exp-heading">
            <p className="exp-kicker">
              {state.activity === "lighthouse"
                ? "The lighthouse / optics"
                : state.mode === "reef"
                  ? `Below the surface / ${state.actor === "diver" ? "free diving" : "swimming as " + state.actor}`
                  : "The archipelago / open water"}
            </p>
            <h2>
              {state.activity === "lighthouse"
                ? "Look a little closer."
                : state.mode === "reef"
                  ? getRegion(state.region).name
                  : "The water is yours."}
            </h2>
          </div>
          {state.activity !== "lighthouse" && (
            <div className="exp-discovery-rail">
              {(state.mode === "reef"
                ? state.region === "crown"
                  ? ["fish", "camouflage", "cleaner", "current", "photo"]
                  : getRegion(state.region).cave ? ["photo"] : ["current", "photo"]
                : ["dakota", "reef", "lighthouse", "artifact", "playground"]
              ).map((id) => {
                const e = encounters.find((e) => e.id === id)!;
                return (
                  <button
                    key={id}
                    onClick={() => encounter(e.id)}
                    disabled={racing && ["reef", "lighthouse"].includes(id)}
                  >
                    <span>{e.number}</span>
                    {
                      (
                        {
                          dakota: "Meet Dakota",
                          reef: "Explore reef",
                          lighthouse: "Lighthouse",
                          artifact: "Workbench",
                          playground: "Playground",
                          fish: "Fish school",
                          camouflage: "Camouflage",
                          cleaner: "Cleaner station",
                          current: "Ride current",
                          photo: "Photo",
                        } as Record<string, string>
                      )[id]
                    }
                  </button>
                );
              })}
            </div>
          )}
          {state.activity === "lighthouse" && (
            <div className="exp-lens-reticle" aria-hidden="true">
              <span>
                {Math.round(lens).toString().padStart(3, "0")}° /{" "}
                {lensAligned ? "Aligned" : "Scanning"}
              </span>
            </div>
          )}
          {state.activity === "lighthouse" && (
            <section className="exp-lens-panel" aria-label="Lighthouse optics">
              <div className="exp-lens-reading">
                <span className="exp-kicker">
                  Optics / bearing{" "}
                  {Math.round(lens).toString().padStart(3, "0")}°
                </span>
                <h3>
                  {lensAligned ? lensPreview.name : "Between destinations"}
                </h3>
                <p>
                  {lensAligned
                    ? lensPreview.role
                    : "Turn the lens, or choose a named bearing below."}
                </p>
                <p>
                  {lensAligned
                    ? lensPreview.note
                    : "The lighthouse helps you read the shape of this world. Every project is also in the work index."}
                </p>
                {lensAligned && (
                  <button
                    className="exp-primary"
                    onClick={() => read(`/case-studies/${lensPreview.slug}`)}
                  >
                    Read the work ↗
                  </button>
                )}
              </div>
              <label className="exp-label">
                Turn the lens
                <input
                  type="range"
                  min="40"
                  max="155"
                  step=".1"
                  value={lens}
                  onChange={(e) => {
                    const v = Number(e.target.value),
                      snap = lensStops.find((s) => Math.abs(s.bearing - v) < 7);
                    setLens(snap ? snap.bearing : v);
                  }}
                />
              </label>
              <div className="exp-bearing-stops">
                {lensStops.map((s) => (
                  <button
                    key={s.label}
                    aria-pressed={Math.abs(lens - s.bearing) < 7}
                    onClick={() => setLens(s.bearing)}
                  >
                    <strong>{s.label}</strong>
                    {s.name}
                  </button>
                ))}
              </div>
              <button className="exp-link" onClick={stopActivity}>
                Close optics / return to your view ↖
              </button>
            </section>
          )}
          {diving && (
            <div className="exp-dive-curtain">
              <div>
                <span className="exp-kicker">A change of perspective</span>
                <p>{getRegion(state.region).name}.</p>
                <button onClick={onDiveEnd}>Skip transition →</button>
              </div>
            </div>
          )}
          {state.mode === "entering" && (
            <div className="exp-loading" role="status">
              <span className="exp-kicker">A change of perspective</span>
              <h3>Preparing {getRegion(state.region).name}.</h3>
              <p>
                Your boat will wait exactly here. Work and contact are available
                while the reef loads.
              </p>
              <button onClick={returnBoat}>Cancel dive</button>
            </div>
          )}
          {state.mode === "reef" && state.activity !== "lighthouse" && (
            <span className="exp-region-label">{getRegion(state.region).name} / {state.actor === "diver" ? "Free diving" : `Swimming as ${state.actor === "nemo" ? "Nemo" : "Dory"}`}</span>
          )}
          {destination && !state.panel && state.activity === "none" && (
            <aside className="exp-arrival">
              <span className="exp-kicker">
                {destination.number} / You have arrived
              </span>
              <h3>{destination.project}</h3>
              <button id="arrival-read" onClick={() => read(destination.href)}>
                Read the work <Arrow />
              </button>
            </aside>
          )}
          {state.mode === "surface" && raceTelemetry.phase !== "idle" && (
            <RacePanel
              race={raceTelemetry}
              best={
                raceTelemetry.courseId
                  ? voyage.bestTimes[raceTelemetry.courseId]
                  : undefined
              }
              paused={paused}
              onStart={(c) => beginRace(c.id)}
              onRestart={() => {
                if (race.current.courseId) beginRace(race.current.courseId);
              }}
              onExit={freeSail}
            />
          )}
          {(state.activity === "escort" ||
            state.activity === "current" ||
            reefTelemetry.target) && (
            <aside className="exp-travel-note">
              <span>
                {state.activity === "escort"
                  ? "Following Dakota · your pace, your choice"
                  : state.activity === "current"
                    ? "Riding the current"
                    : "Swimming to your chosen point"}
              </span>
              <button onClick={stopActivity}>Stop</button>
            </aside>
          )}
          {state.activity !== "lighthouse" && state.mode !== "entering" && (
            <div className="exp-bottom-controls">
              <div className="exp-motion-controls">
                <button
                  id="exp-resume"
                  onClick={() => {
                    pauseTravel();
                    dispatch({ type: "PAUSE", value: !state.userPaused });
                    focusWater();
                  }}
                  aria-pressed={state.userPaused}
                >
                  {state.userPaused ? "Resume" : "Pause"}
                </button>
                <button onClick={() => openPanel("settings")}>
                  {quiet ? "Quiet view" : "Motion"} / settings
                </button>
                <button onClick={() => openPanel("bearings")}>
                  Bearings ⊕
                </button>
                {state.mode === "surface" && (
                  <button
                    onClick={() =>
                      setCameraMode((c) =>
                        c === "aerial" ? "follow" : "aerial",
                      )
                    }
                  >
                    {cameraMode === "aerial" ? "Aerial" : "Follow"} ⌖
                  </button>
                )}
              </div>
              <div
                className="exp-movement-pad"
                aria-label={
                  state.mode === "reef"
                    ? "Single tap reef controls"
                    : "Boat steering controls"
                }
              >
                {(
                  [
                    ["left", "↶", "Turn left"],
                    [
                      "forward",
                      "↑",
                      state.mode === "reef" ? "Swim forward" : "Accelerate",
                    ],
                    [
                      "backward",
                      "↓",
                      state.mode === "reef" ? "Swim back" : "Reverse",
                    ],
                    ["right", "↷", "Turn right"],
                    ...(state.mode === "reef"
                      ? [
                          ["rise", "+", "Rise"],
                          ["descend", "−", "Descend"],
                        ]
                      : []),
                  ] as [keyof ReefInput, string, string][]
                ).map(([key, glyph, label]) => (
                  <button
                    key={key}
                    aria-label={label}
                    onClick={() => stepControl(key)}
                    onBlur={releaseKeys}
                  >
                    {glyph}
                  </button>
                ))}
                {state.mode === "surface" && !quiet && state.activity !== "fishing" && (
                  <button
                    className="exp-cruise"
                    aria-pressed={cruise}
                    onClick={() => {
                      if (state.activity === "docking") games.current.dockingAssisted = false;
                      const next = !cruise;
                      setCruise(next);
                      dispatch({ type: "PAUSE", value: false });
                      if (!next) input.current.forward = false;
                    }}
                  >
                    Cruise {cruise ? "on" : "off"}
                  </button>
                )}
              </div>
            </div>
          )}
          <p className="exp-active-status" aria-hidden="true">
            {reefTelemetry.notice || state.notice || status}
          </p>
          <span className="sr-only" role="status">
            {reefTelemetry.notice || state.notice || ""}
          </span>
          <span className="exp-control-hint">
            {state.mode === "reef"
              ? "W A S D swim · Q / E depth · Esc stop"
              : "W A S D steer · click water to set a course · Esc stop"}
          </span>
        </>
      )}
      {active && !state.panel && !observed && state.mode !== "entering" && state.activity !== "lighthouse" && <VoyageDeck
        panel={deckPanel}
        onPanel={panel => { setDeckPanel(panel); setObserved(null); pauseTravel(); if (panel && !["fishing", "docking", "fish-course"].includes(state.activity)) dispatch({ type: "PAUSE", value: true }); }}
        region={state.region} mode={state.mode} actor={state.actor} vessel={telemetry.vesselId}
        pose={reefTelemetry} boat={telemetry} fishing={games.current.fishing} docking={games.current.docking} fishCourse={games.current.fishCourse}
        quiet={quiet} visibilityAssist={visibilityAssist} onVisibilityAssist={setVisibilityAssist}
        onRegion={changeRegion} onActor={changeActor} onVessel={switchVessel} onChallenge={beginChallenge}
        onEndChallenge={endChallenge} onFishingAction={fishingAction} onDockAssist={dockAssist}
        onPhoto={() => { setDeckPanel(null); setPhotoCamera({ yaw: 0, zoom: 1 }); openPanel("photo"); }}
        onPose={pose => setPose(pose, true, false)} onReturn={returnBoat}
        onResume={() => { setDeckPanel(null); dispatch({ type: "PAUSE", value: false }); focusWater(); }}
        activity={racing ? "racing" : state.activity} paused={paused} reeling={Boolean(games.current.fishingInput.reel)}
      />}
      {failed && !active && (
        <span className="exp-fallback-note">
          Still waters. The complete work and field guide are available.
        </span>
      )}
      {observed && !state.panel && !diving && state.mode !== "entering" && (
        <EncounterCard
          id={observed}
          paused={paused}
          fishApart={fishApart}
          camouflage={camouflage}
          outline={outline}
          cleaner={cleaner}
          onClose={() => {
            setObserved(null);
            restoreTriggerFocus();
          }}
          onEncounter={encounter}
          onFish={setFishApart}
          onCamouflage={setCamouflage}
          onOutline={() => setOutline((v) => !v)}
          onCleaner={setCleaner}
          onResume={() => dispatch({ type: "PAUSE", value: false })}
          onGuideHide={() => {
            setGuideHidden(true);
            setObserved(null);
          }}
          onRead={() => openPanel("work")}
          onDetails={() => openPanel(observed)}
        />
      )}
      <dialog
        ref={dialog}
        className={`exp-dialog ${state.panel === "photo" ? "exp-photo-dialog" : ""}`}
        aria-labelledby="exp-panel-title"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href], button, input, select, textarea, [tabindex]',
          )).filter(el => el.tabIndex >= 0 && !el.matches(":disabled") && el.getClientRects().length && !el.closest("[inert]"));
          const first = controls[0], last = controls.at(-1);
          if (!first) { event.preventDefault(); return; }
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault(); last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault(); first.focus();
          }
        }}
        onCancel={(e) => {
          e.preventDefault();
          closePanel();
        }}
        onClose={() => {
          if (latest.current.panel) dispatch({ type: "PANEL", panel: null });
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) closePanel();
        }}
      >
        <div className="exp-dialog-inner">
          <div className="exp-dialog-bar">
            <span className="exp-kicker">Open Water / Field notes</span>
            <div>
              {active && (
                <button onClick={returnBoat}>
                  {state.mode !== "surface" ? "Return to boat" : "Return"} ↖
                </button>
              )}
              <button onClick={() => openPanel("work")}>Project guide</button>
              <button onClick={() => openPanel("radio")}>Contact</button>
              <button onClick={() => openPanel("map")}>Map</button>
              <button
                onClick={closePanel}
                aria-label={`Close ${state.panel ?? "panel"}`}
              >
                Close ×
              </button>
            </div>
          </div>
          <h2 id="exp-panel-title">
            {state.panel ? panelTitle[state.panel] : "Field notes"}
          </h2>
          <ExpeditionPanels
            panelEntry={panelEntry}
            state={state}
            boat={telemetry}
            race={raceTelemetry}
            reef={reefTelemetry}
            failed={failed}
            onOpen={openPanel}
            onEncounter={encounter}
            onTravel={travel}
            onRead={read}
            onPose={setPose}
            onRace={beginRace}
            onFreeSail={freeSail}
            onQuiet={setQuiet}
            lens={lens}
            onLens={setLens}
            bridge={bridge}
            guideHidden={guideHidden}
            onGuideHidden={setGuideHidden}
            fishApart={fishApart}
            onFishApart={setFishApart}
            camouflage={camouflage}
            onCamouflage={setCamouflage}
            outline={outline}
            onOutline={setOutline}
            cleaner={cleaner}
            onCleaner={setCleaner}
            quality={quality}
            onQuality={setQuality}
            sound={sound}
            onSound={setSound}
            onPhotoCamera={(yaw, zoom) => setPhotoCamera({ yaw, zoom })}
          />
          {racing && state.panel !== "playground" && (
            <div className="exp-paused-run">
              <p>
                Your{" "}
                {raceCourses.find((c) => c.id === raceTelemetry.courseId)?.name}{" "}
                run is paused and preserved.
              </p>
              <button onClick={freeSail}>Free sail</button>
            </div>
          )}
        </div>
      </dialog>
    </section>
  );
}
