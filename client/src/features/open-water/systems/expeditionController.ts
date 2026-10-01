import { createBoat, isBoatPoseSafe, type BoatState } from "./boatController.ts";
import { HOME } from "../data/world.ts";
import type { RegionId } from "../data/regions.ts";
export type ControlledActor = "diver" | "nemo" | "dory";
export const isChallengeActivity = (activity: Expedition["activity"]) =>
  activity === "fishing" || activity === "docking" || activity === "fish-course";

export type Panel =
  | "map"
  | "work"
  | "dakota"
  | "fish"
  | "photo"
  | "camouflage"
  | "cleaner"
  | "bearings"
  | "artifact"
  | "radio"
  | "playground"
  | "settings"
  | null;
export type Expedition = {
  mode: "surface" | "entering" | "reef";
  region: RegionId;
  actor: ControlledActor;
  previousRegion: RegionId | null;
  sailing: boolean;
  quiet: boolean;
  userPaused: boolean;
  panel: Panel;
  activity: "none" | "escort" | "current" | "lighthouse" | "fishing" | "docking" | "fish-course";
  transitionId: number;
  returnBoat: BoatState | null;
  notice: string;
};
export const initialExpedition = (quiet = false): Expedition => ({
  mode: "surface",
  region: "crown",
  actor: "diver",
  previousRegion: null,
  sailing: false,
  quiet,
  userPaused: false,
  panel: null,
  activity: "none",
  transitionId: 0,
  returnBoat: null,
  notice: "",
});
export function cloneBoat(boat: BoatState): BoatState {
  return {
    ...boat,
    target: boat.target ? { ...boat.target } : null,
    route: boat.route.map((p) => ({ ...p })),
  };
}
export function safeBoatPose(boat: BoatState): boolean {
  return isBoatPoseSafe(boat);
}
export function returnedBoat(snapshot: BoatState | null): {
  boat: BoatState;
  recovered: boolean;
} {
  const valid = snapshot && safeBoatPose(snapshot);
  return {
    boat: {
      ...createBoat(snapshot?.vesselId),
      x: valid ? snapshot.x : HOME.x,
      z: valid ? snapshot.z : HOME.z,
      heading: valid ? snapshot.heading : HOME.heading,
    },
    recovered: !valid,
  };
}
export type ExpeditionAction =
  | { type: "SAIL" }
  | { type: "PANEL"; panel: Panel; racing?: boolean }
  | { type: "PAUSE"; value: boolean }
  | { type: "QUIET"; value: boolean }
  | { type: "ACTIVITY"; activity: Expedition["activity"]; racing?: boolean }
  | { type: "ACTIVITY_DONE"; pause: boolean; notice?: string }
  | { type: "DIVE"; boat: BoatState; racing: boolean }
  | { type: "REGION"; region: RegionId; boat: BoatState; racing: boolean }
  | { type: "ACTOR"; actor: ControlledActor }
  | { type: "REEF_READY"; id: number }
  | { type: "CANCEL_DIVE" }
  | { type: "RETURN"; recovered?: boolean }
  | { type: "NOTICE"; text: string }
  | { type: "FAIL" }
  | { type: "OPENING" };
/** Only this reducer grants an activity camera or commits a dive. Async asset
 * readiness is keyed to a monotonically increasing transition, never a boolean. */
export function expeditionReducer(
  state: Expedition,
  action: ExpeditionAction,
): Expedition {
  switch (action.type) {
    case "ACTOR":
      if (state.mode !== "reef") return state;
      if (state.activity === "fish-course") return { ...state, userPaused: true, notice: "Leave the fish course before changing perspective." };
      return { ...state, actor: action.actor, activity: "none", panel: null, userPaused: true };
    case "REGION": {
      if (state.mode === "entering") return state;
      if (action.racing || ["fishing", "docking", "fish-course"].includes(state.activity))
        return { ...state, userPaused: true, notice: "Finish or leave the current challenge before travelling. Your progress is paused." };
      if (state.mode === "surface" && !safeBoatPose(action.boat))
        return { ...state, notice: "Reach clear water before diving. Your vessel needs a safe place to wait." };
      return { ...state, mode: "entering", region: action.region,
        previousRegion: state.mode === "reef" ? state.region : null,
        sailing: true, userPaused: false, panel: null, activity: "none",
        returnBoat: state.returnBoat ?? cloneBoat(action.boat),
        transitionId: state.transitionId + 1, notice: "Preparing your next destination. Your original vessel is waiting." };
    }
    case "SAIL":
      if (isChallengeActivity(state.activity))
        return { ...state, userPaused: true, notice: "Your challenge is paused. Resume it or choose Leave challenge before free exploration." };
      if (state.mode === "entering") return state;
      return {
        ...state,
        sailing: true,
        panel: null,
        activity: "none",
        userPaused: false,
        notice: "",
      };
    case "PANEL":
      return {
        ...state,
        panel: action.panel,
        userPaused:
          state.userPaused ||
          Boolean(action.racing) ||
          Boolean(action.panel && state.sailing),
        activity: action.panel && !["fishing", "docking", "fish-course"].includes(state.activity) ? "none" : state.activity,
      };
    case "PAUSE":
      return {
        ...state,
        userPaused: action.value,
        activity: action.value && !["fishing", "docking", "fish-course"].includes(state.activity) ? "none" : state.activity,
      };
    case "QUIET":
      return {
        ...state,
        quiet: action.value,
        activity: isChallengeActivity(state.activity) ? state.activity : "none",
        userPaused: state.userPaused || action.value,
        notice: action.value
          ? isChallengeActivity(state.activity)
            ? "Quiet view. Your challenge is preserved, with untimed or step controls."
            : "Quiet view. Choose any reef position for a still view."
          : "Motion enabled. Choose Resume when you are ready.",
      };
    case "ACTIVITY":
      if (state.mode === "entering") return state;
      if (action.activity !== "none" && ["fishing", "docking", "fish-course"].includes(state.activity) && action.activity !== state.activity)
        return { ...state, userPaused: true, notice: "Leave your current challenge before starting another." };
      if ((["fishing", "docking"].includes(action.activity) && state.mode !== "surface") ||
          (action.activity === "fish-course" && (state.mode !== "reef" || state.region !== "crown" || state.actor === "diver")))
        return { ...state, notice: "This activity needs the right vessel or swimming perspective." };
      if (action.racing && action.activity !== "none")
        return {
          ...state,
          notice:
            "Choose Free sail before starting another activity. Your run is paused.",
          userPaused: true,
        };
      return {
        ...state,
        activity: action.activity,
        panel: null,
        sailing: true,
        userPaused: action.activity === "none",
        notice: "",
      };
    case "ACTIVITY_DONE":
      return {
        ...state,
        activity: "none",
        userPaused: state.userPaused || action.pause,
        notice: action.notice ?? "",
      };
    case "DIVE":
      if (["fishing", "docking", "fish-course"].includes(state.activity))
        return { ...state, userPaused: true, notice: "Leave the current challenge before diving. Your progress is preserved." };
      if (action.racing)
        return {
          ...state,
          notice: "Choose Free sail, then Explore reef. Your run is preserved.",
          userPaused: true,
        };
      if (state.mode !== "surface") return state;
      if (!safeBoatPose(action.boat))
        return {
          ...state,
          notice:
            "Reach clear water before diving. Your boat needs a safe place to wait.",
        };
      return {
        ...state,
        mode: "entering",
        region: "crown",
        previousRegion: null,
        sailing: true,
        userPaused: false,
        panel: null,
        activity: "none",
        transitionId: state.transitionId + 1,
        returnBoat: cloneBoat(action.boat),
        notice: "Preparing the reef. Your boat will wait here.",
      };
    case "REEF_READY":
      if (state.mode !== "entering" || state.transitionId !== action.id)
        return state;
      return {
        ...state,
        mode: "reef",
        previousRegion: null,
        notice:
          "Welcome below the surface. Return to your boat whenever you like.",
      };
    case "CANCEL_DIVE":
      return state.mode !== "entering"
        ? state
        : {
            ...state,
            mode: state.previousRegion ? "reef" : "surface",
            region: state.previousRegion ?? state.region,
            previousRegion: null,
            transitionId: state.transitionId + 1,
            returnBoat: state.previousRegion ? state.returnBoat : null,
            userPaused: true,
            notice: "Dive canceled. Your boat and course are waiting, paused.",
          };
    case "RETURN":
      return {
        ...state,
        mode: "surface",
        actor: "diver",
        previousRegion: null,
        activity: "none",
        panel: null,
        transitionId: state.transitionId + 1,
        returnBoat: null,
        userPaused: true,
        notice: action.recovered
          ? "Your saved position was unavailable. Returned safely to the starting anchorage."
          : "Back aboard, at rest. Choose Resume when you are ready.",
      };
    case "FAIL":
      return {
        ...state,
        activity: isChallengeActivity(state.activity) ? state.activity : "none",
        userPaused: true,
        notice:
          "The scene became unavailable. Your activity is paused; continue with assisted field-guide controls, work or contact.",
      };
    case "OPENING":
      return {
        ...initialExpedition(state.quiet),
        transitionId: state.transitionId + 1,
      };
    case "NOTICE":
      return { ...state, notice: action.text };
  }
}
