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
  id: "reef-slalom" | "jump-circuit";
  name: string;
  description: string;
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
    x: 10,
    z: -45,
    r: 14,
    dock: { x: -12, z: -20 },
  },
  {
    id: "stellar",
    number: "02",
    name: "Learning Atoll",
    project: "Stellar Learning",
    href: "/case-studies/stellar-learning",
    x: 65,
    z: -140,
    r: 17,
    dock: { x: 90, z: -112 },
  },
  {
    id: "research",
    number: "03",
    name: "The Observatory",
    project: "Youreka research",
    href: "/case-studies/global-health-research",
    x: 125,
    z: -20,
    r: 15,
    dock: { x: 153, z: 2 },
  },
  {
    id: "about",
    number: "04",
    name: "The Anchorage",
    project: "Meet Tejass",
    href: "#about",
    x: -105,
    z: 65,
    r: 16,
    dock: { x: -78, z: 88 },
  },
];
export const islands: readonly Island[] = [
  { id: "west-reef", x: -175, z: 105, r: 15, height: 7 },
  { id: "outer-reef", x: -255, z: 30, r: 18, height: 9 },
  { id: "north-reef", x: -195, z: -110, r: 22, height: 13 },
  { id: "east-reef", x: 225, z: -135, r: 25, height: 16 },
  { id: "south-reef", x: 10, z: 260, r: 28, height: 12 },
];
export const obstacles = [...destinations, ...islands] as const;
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
export const raceCourses: readonly RaceCourse[] = [
  {
    id: "reef-slalom",
    name: "Reef slalom",
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
    description:
      "Two ramps, nine gates, one lap. Clear the elevated gates in the air.",
    start: jumpStart,
    rampIds: ramps.map((ramp) => ramp.id),
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
];
export const races = raceCourses;
