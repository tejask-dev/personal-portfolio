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

/** Fictional coordinates, in scene units. Dock points remain outside collision bounds. */
export const destinations: readonly Destination[] = [
  {
    id: "anticipy",
    number: "01",
    name: "Signal Station",
    project: "Anticipy",
    href: "/case-studies/anticipy",
    x: -28,
    z: -48,
    r: 9.8,
    dock: { x: -15, z: -32 },
  },
  {
    id: "stellar",
    number: "02",
    name: "Learning Atoll",
    project: "Stellar Learning",
    href: "/case-studies/stellar-learning",
    x: 27,
    z: -75,
    r: 12,
    dock: { x: 42, z: -59 },
  },
  {
    id: "research",
    number: "03",
    name: "The Observatory",
    project: "Youreka research",
    href: "/case-studies/global-health-research",
    x: 48,
    z: -25,
    r: 10,
    dock: { x: 63, z: -10 },
  },
  {
    id: "about",
    number: "04",
    name: "The Anchorage",
    project: "Meet Tejass",
    href: "#about",
    x: -75,
    z: 24,
    r: 10,
    dock: { x: -60, z: 37 },
  },
];

export const WORLD_RADIUS = 180;
export const COURSE_RADIUS = 165;
