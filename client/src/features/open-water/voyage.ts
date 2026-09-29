import { createBoat } from "./systems/boatController";

// Route changes preserve the voyage without persisting any visitor data.
export const voyage = {
  boat: createBoat(),
  sailing: false,
  paused: false,
  daylight: false,
  cameraMode: "aerial" as "aerial" | "follow",
  returnFocus: "",
  returnPending: false,
  returnScroll: 0,
};
