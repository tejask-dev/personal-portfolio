import { createBoat } from "./systems/boatController";
import { createRace } from "./systems/raceController";
import { initialExpedition } from "./systems/expeditionController";
import { createReef } from "./systems/reefController";
import { createV4Games } from "./systems/v4Games";

// Route changes preserve the voyage without persisting any visitor data.
export const voyage = {
  boat: createBoat("superyacht"),
  anchoredYacht: null as ReturnType<typeof createBoat> | null,
  games: createV4Games(),
  actorSafePose: createReef({ regionId: "crown" }),
  race: createRace(),
  bestTimes: {} as Record<string, number>,
  sailing: false,
  paused: false,
  daylight: true,
  cameraMode: "aerial" as "aerial" | "follow",
  returnFocus: "",
  returnPending: false,
  returnScroll: 0,
  expedition: initialExpedition(),
  reef: createReef({ regionId: "crown" }),
  hasExplored: false,
};
