export type Point = { x: number; z: number };
export type Destination = Point & {
  id: "anticipy" | "stellar" | "research" | "about";
  number: string;
  name: string;
  project: string;
  href: string;
  r: number;
  dock: Point;
};
export type Island = Point & { id: string; r: number; height: number };
export type Ramp = Point & {
  id: string;
  heading: number;
  length: number;
  width: number;
  height: number;
  launchSpeed: number;
};
export type RaceGate = Point & {
  id: string;
  heading: number;
  halfWidth: number;
  minLift?: number;
};
export type RaceCourse = {
  id: "reef-slalom" | "jump-circuit" | "lighthouse-loop" | "atoll-grand-tour" | "harbor-sprint";
  name: string;
  description: string;
  difficulty: "Easy" | "Intermediate" | "Advanced";
  start: Point & { heading: number };
  gates: readonly RaceGate[];
  rampIds: readonly string[];
};

export const WORLD_RADIUS = 360;
export const COURSE_RADIUS = 338;
export const HOME = { x: 0, z: 35, heading: -0.35 } as const;

/** Fictional harbor coordinates. Reading is always available without travelling. */
export const destinations: readonly Destination[] = [
  {
    id: "anticipy",
    number: "01",
    name: "Signal Station",
    project: "Anticipy",
    href: "/case-studies/anticipy",
    x: 5,
    z: -65,
    r: 14,
    dock: { x: -19, z: -43 },
  },
  {
    id: "stellar",
    number: "02",
    name: "Learning Atoll",
    project: "Stellar Learning",
    href: "/case-studies/stellar-learning",
    x: 100,
    z: -215,
    r: 17,
    dock: { x: 112, z: -182 },
  },
  {
    id: "research",
    number: "03",
    name: "The Observatory",
    project: "Youreka research",
    href: "/case-studies/global-health-research",
    x: 185,
    z: -35,
    r: 15,
    dock: { x: 170, z: -7 },
  },
  {
    id: "about",
    number: "04",
    name: "The Anchorage",
    project: "Meet Tejass",
    href: "#about",
    x: -145,
    z: 30,
    r: 16,
    dock: { x: -120, z: 47 },
  },
];
export const islands: readonly Island[] = [
  { id: "west-reef", x: -175, z: 105, r: 15, height: 7 },
  { id: "outer-reef", x: -255, z: 30, r: 18, height: 9 },
  { id: "north-reef", x: -195, z: -110, r: 22, height: 13 },
  { id: "east-reef", x: 225, z: -135, r: 25, height: 16 },
  { id: "south-reef", x: 10, z: 260, r: 28, height: 12 },
];
export const LIGHTHOUSE = { id: "lighthouse", x: -75, z: -135, r: 9, height: 34.5 } as const;
export const DIVE_BUOY = { id: "dive-buoy", x: -35, z: -15, r: 1 } as const;
export const obstacles = [...destinations, ...islands, LIGHTHOUSE] as const;
/** Local forward is (sin heading, -cos heading); entry at -length/2, lip at +length/2. */
export const ramps: readonly Ramp[] = [
  {
    id: "harbor-jump",
    x: 105,
    z: 90,
    heading: 0,
    length: 22,
    width: 15,
    height: 3,
    launchSpeed: 9,
  },
  {
    id: "outer-jump",
    x: 245,
    z: 105,
    heading: Math.PI,
    length: 26,
    width: 16,
    height: 4,
    launchSpeed: 10,
  },
];

const headingTo = (from: Point, to: Point) =>
  Math.atan2(to.x - from.x, -(to.z - from.z));
function gates(
  start: Point,
  points: Array<
    Point & { halfWidth?: number; minLift?: number; heading?: number }
  >,
): RaceGate[] {
  return points.map((point, index) => ({
    ...point,
    id: `gate-${index + 1}`,
    halfWidth: point.halfWidth ?? 18,
    heading:
      point.heading ?? headingTo(index ? points[index - 1] : start, point),
  }));
}
const reefStart = {
  x: -40,
  z: 160,
  heading: headingTo({ x: -40, z: 160 }, { x: -90, z: 150 }),
};
const jumpStart = { x: 105, z: 170, heading: 0 };
const lighthouseStart = {
  x: -105, z: -60,
  heading: headingTo({ x: -105, z: -60 }, { x: -135, z: -70 }),
};
const atollStart = {
  x: 45, z: -105,
  heading: headingTo({ x: 45, z: -105 }, { x: 55, z: -155 }),
};
const harborStart = { x: 105, z: 165, heading: 0 };
export const raceCourses: readonly RaceCourse[] = [
  {
    id: "reef-slalom",
    name: "Reef slalom",
    difficulty: "Easy",
    description:
      "Seven gates around the western reefs. Pick your line and keep your momentum.",
    start: reefStart,
    rampIds: [],
    gates: gates(reefStart, [
      { x: -90, z: 150 },
      { x: -155, z: 175 },
      { x: -205, z: 140 },
      { x: -230, z: 70 },
      { x: -215, z: -5 },
      { x: -260, z: -60 },
      { x: -290, z: -115, halfWidth: 20 },
    ]),
  },
  {
    id: "jump-circuit",
    name: "Jump circuit",
    difficulty: "Intermediate",
    description:
      "Two ramps, nine gates, one lap. Clear the elevated gates in the air.",
    start: jumpStart,
    rampIds: ["harbor-jump", "outer-jump"],
    gates: gates(jumpStart, [
      { x: 105, z: 130 },
      { x: 105, z: 65, minLift: 1.2, heading: 0, halfWidth: 16 },
      { x: 160, z: 25 },
      { x: 220, z: 45 },
      { x: 245, z: 75, heading: Math.PI },
      { x: 245, z: 140, minLift: 1.2, heading: Math.PI, halfWidth: 16 },
      { x: 220, z: 195 },
      { x: 155, z: 215 },
      { x: 105, z: 190, halfWidth: 20 },
    ]),
  },
  {
    id: "lighthouse-loop",
    name: "Lighthouse loop",
    difficulty: "Advanced",
    description:
      "Eight tighter gates around the lighthouse. Brake into the bends, then carry speed back to the start.",
    start: lighthouseStart,
    rampIds: [],
    gates: gates(lighthouseStart, [
      { x: -135, z: -70, halfWidth: 14 },
      { x: -145, z: -130, halfWidth: 14 },
      { x: -125, z: -185, halfWidth: 14 },
      { x: -65, z: -195, halfWidth: 14 },
      { x: -15, z: -160, halfWidth: 14 },
      { x: -30, z: -110, halfWidth: 14 },
      { x: -70, z: -80, halfWidth: 14 },
      { x: -110, z: -60, halfWidth: 16 },
    ]),
  },
  {
    id: "atoll-grand-tour",
    name: "Atoll grand tour",
    difficulty: "Intermediate",
    description:
      "The long route: fourteen sweeping gates past Learning Atoll, the eastern reef and the Observatory. Wide turns reward a steady line.",
    start: atollStart,
    rampIds: [],
    gates: gates(atollStart, [
      { x: 55, z: -155, halfWidth: 22 },
      { x: 45, z: -225, halfWidth: 22 },
      { x: 65, z: -290, halfWidth: 22 },
      { x: 140, z: -285, halfWidth: 22 },
      { x: 195, z: -235, halfWidth: 22 },
      { x: 180, z: -175, halfWidth: 22 },
      { x: 165, z: -125, halfWidth: 22 },
      { x: 200, z: -80, halfWidth: 22 },
      { x: 265, z: -70, halfWidth: 22 },
      { x: 285, z: -15, halfWidth: 22 },
      { x: 220, z: 30, halfWidth: 22 },
      { x: 150, z: 0, halfWidth: 22 },
      { x: 100, z: -35, halfWidth: 22 },
      { x: 50, z: -100, halfWidth: 22 },
    ]),
  },
  {
    id: "harbor-sprint",
    name: "Harbor sprint",
    difficulty: "Intermediate",
    description:
      "One clean jump, six gates, a short dash to Signal Station. Hold straight over the lip, then carve west after landing.",
    start: harborStart,
    rampIds: ["harbor-jump"],
    gates: gates(harborStart, [
      { x: 105, z: 125 },
      { x: 105, z: 65, minLift: 1.2, heading: 0, halfWidth: 16 },
      { x: 70, z: 25 },
      { x: 10, z: 15 },
      { x: -45, z: -5 },
      { x: -60, z: -55, halfWidth: 20 },
    ]),
  },
];
export const races = raceCourses;
