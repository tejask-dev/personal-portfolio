import { createBoat } from "./systems/boatController";
import { createRace } from "./systems/raceController";

// Route changes preserve the voyage without persisting any visitor data.
export const voyage = {
  boat: createBoat(),
  race: createRace(),
  bestTimes: {} as Record<string, number>,
  sailing: false,
  paused: false,
  daylight: true,
  cameraMode: "aerial" as "aerial" | "follow",
  returnFocus: "",
  returnPending: false,
  returnScroll: 0,
};
