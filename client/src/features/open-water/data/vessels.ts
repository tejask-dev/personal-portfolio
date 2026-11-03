export type VesselId = "tender" | "superyacht";

/** Dimensions are fictional scene units, shared by art, collision and the berth.
 * The tender retains the original express boat's generous circular clearance. */
export type VesselProfile = {
  id: VesselId;
  name: string;
  length: number;
  beam: number;
  draft: number;
  hullRadius: number;
  navigationMargin: number;
  acceleration: number;
  linearDrag: number;
  quadraticDrag: number;
  coastDrag: number;
  maxSpeed: number;
  reverseSpeed: number;
  turnRate: number;
  turnResponse: number;
  turnSpeed: number;
  cruiseSpeed: number;
  arrivalRadius: number;
  canJump: boolean;
  canRace: boolean;
  /** Engine inertia, per second, while spooling up and while easing off.
   * Infinity keeps the tender's instant, race-tuned throttle. */
  throttleRise: number;
  throttleFall: number;
  /** A head-on contact keeps this share of speed; glancing contact scrapes. */
  impactRetention: number;
  /** Presentation only: natural frequencies (rad/s) of the hull riding the swell. */
  heaveFrequency: number;
  pitchFrequency: number;
  rollFrequency: number;
  /** Damping ratio shared by heave, pitch and roll. */
  motionDamping: number;
  /** Bow-up trim (rad) at full speed, and per unit of normalised acceleration. */
  speedTrim: number;
  surgeTrim: number;
  /** Bank (rad per turn-rate x speed) and its limit. */
  heel: number;
  maxHeel: number;
};

export const VESSELS: Readonly<Record<VesselId, Readonly<VesselProfile>>> = {
  tender: {
    id: "tender", name: "Sport tender", length: 10, beam: 3.4, draft: 0.9,
    hullRadius: 7.5, navigationMargin: 13,
    acceleration: 12, linearDrag: 0.32, quadraticDrag: 0.006, coastDrag: 0.48,
    maxSpeed: 28, reverseSpeed: 5, turnRate: 1, turnResponse: 5, turnSpeed: 13,
    cruiseSpeed: 22, arrivalRadius: 2.8, canJump: true, canRace: true,
    throttleRise: Infinity, throttleFall: Infinity, impactRetention: 0.65,
    heaveFrequency: 3.6, pitchFrequency: 4.2, rollFrequency: 4.6, motionDamping: 0.55,
    speedTrim: 0.045, surgeTrim: 0.03, heel: 0.004, maxHeel: 0.12,
  },
  superyacht: {
    id: "superyacht", name: "Open Water superyacht", length: 28, beam: 7.6, draft: 1.8,
    hullRadius: 14, navigationMargin: 20,
    acceleration: 4.8, linearDrag: 0.22, quadraticDrag: 0.009, coastDrag: 0.24,
    maxSpeed: 15, reverseSpeed: 3, turnRate: 0.43, turnResponse: 2.2, turnSpeed: 11,
    cruiseSpeed: 11, arrivalRadius: 3.6, canJump: false, canRace: false,
    throttleRise: 1.4, throttleFall: 4.5, impactRetention: 0.15,
    heaveFrequency: 1.7, pitchFrequency: 1.5, rollFrequency: 1.25, motionDamping: 0.62,
    speedTrim: 0.008, surgeTrim: 0.012, heel: 0.0028, maxHeel: 0.05,
  },
};

export const vesselProfile = (id: VesselId = "tender"): Readonly<VesselProfile> =>
  VESSELS[id] ?? VESSELS.tender;
