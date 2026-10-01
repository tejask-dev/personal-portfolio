import { createFishing, createDocking, createFishCourse, type FishingInput } from "./gameController.ts";

export const createV4Games = () => ({
  fishing: createFishing(), docking: createDocking(), fishCourse: createFishCourse(),
  fishingInput: {} as FishingInput,
  dockingAssisted: false,
});
export type V4Games = ReturnType<typeof createV4Games>;
