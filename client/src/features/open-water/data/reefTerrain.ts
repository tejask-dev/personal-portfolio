/** Canonical V3 reef construction data. Copied without resampling from
 * design/open-water-v3/research-assets/reef-terrain-design.json.
 * Positions and depths use fictional scene units; Y points up. */
export const reefTerrainDefinition = {
  "status": "Canonical research terrain proposal; deterministic data, not rendered/playtested habitat or physics certification",
  "units": "fictional scene units, Y up, positive depth below mean sea",
  "version": 1,
  "worldTransform": {
    "translation": [
      -65,
      0,
      -15
    ],
    "rotationY": 0
  },
  "bounds": {
    "hardNavigableEllipse": {
      "radiusX": 24,
      "radiusZ": 18,
      "inclusive": true
    },
    "softWarningMarkerEllipse": {
      "radiusX": 21,
      "radiusZ": 15
    },
    "softBandMeaning": "Between inner marker and outer hard ellipse. Three units inset on each axis, not constant Euclidean distance. No forced current, extra collision or automatic mode change.",
    "outsideTargetPolicy": "rho=hypot(x/24,z/18); when rho>1 project x,z to x/rho,z/rho. Clamp outward travel and permit tangent sliding; show Reef boundary.",
    "quietSelectorRanges": {
      "x": [
        -24,
        24
      ],
      "z": [
        -18,
        18
      ]
    },
    "corners": "Range input rectangles do not make their corners navigable. Resolve the pair through the ellipse before depth selection."
  },
  "floor": {
    "representation": "Explicit compact irregular rectilinear grid; row-major depth rows indexed z then x",
    "interpolation": "Bilinear within the bracketing x,z cell; boundary points use the last inclusive cell. No random noise. y=-depth.",
    "xCoordinates": [
      -24,
      -18,
      -16,
      -15,
      -10,
      -8,
      -7,
      -4,
      -3,
      2,
      7,
      9,
      10,
      17,
      20,
      24
    ],
    "zCoordinates": [
      -18,
      -9,
      -8,
      -6,
      -4,
      0,
      4,
      6,
      7,
      11,
      12,
      18
    ],
    "depthRows": [
      [
        4.4,
        4.4,
        4.4,
        4.4,
        4.8228,
        4.9858,
        5.0537,
        5.2031,
        5.2348,
        5.2574,
        5.0537,
        4.9088,
        4.8228,
        4.4,
        4.4,
        4.4
      ],
      [
        4.4865,
        5.6272,
        5.935,
        6.0754,
        6.6412,
        7.5,
        6.8721,
        7.0214,
        7.0531,
        7.0758,
        7.5,
        6.7272,
        6.6412,
        5.7856,
        5.2832,
        4.4865
      ],
      [
        4.6137,
        5.7544,
        6.0622,
        6.2026,
        7.5,
        6.9314,
        6.9993,
        7.1487,
        7.1803,
        7.8,
        6.9993,
        6.6,
        6.7684,
        5.9129,
        5.4104,
        4.6137
      ],
      [
        4.8232,
        5.9639,
        7.2,
        6.4121,
        6.9779,
        7.1409,
        7.2088,
        7.3582,
        7.3899,
        7.4125,
        7.2088,
        7.0639,
        6.9779,
        6.1224,
        5.6199,
        4.8232
      ],
      [
        4.9729,
        6.1136,
        6.4214,
        6.5618,
        7.1276,
        7.2906,
        7.3585,
        7.5078,
        8.6,
        7.5622,
        7.3585,
        7.2136,
        7.5,
        6.272,
        5.7696,
        4.9729
      ],
      [
        5.0926,
        6.2333,
        6.5412,
        6.6815,
        7.2473,
        7.4103,
        7.4782,
        7.6276,
        7.6593,
        7.6819,
        7.4782,
        7.3333,
        7.2473,
        7.5,
        4.5,
        5.0926
      ],
      [
        4.9729,
        7.5,
        6.4214,
        6.5618,
        7.1276,
        7.2906,
        7.3585,
        7.5078,
        7.5395,
        7.5622,
        7.3585,
        7.2136,
        7.1276,
        6.272,
        5.7696,
        4.9729
      ],
      [
        4.8232,
        5.9639,
        6.2718,
        5.2,
        6.9779,
        7.1409,
        7.2088,
        7.3582,
        7.3899,
        7.4125,
        7.2088,
        7.0639,
        6.9779,
        6.1224,
        5.6199,
        4.8232
      ],
      [
        4.7259,
        5.8667,
        6.1745,
        6.3148,
        6.8807,
        7.0436,
        7.1115,
        7.3,
        7.2926,
        7.3152,
        7.1115,
        6.9667,
        6.8807,
        6.0251,
        5.5226,
        4.7259
      ],
      [
        4.4,
        5.3279,
        5.6357,
        5.776,
        6.3419,
        6.5048,
        6.5727,
        6.7221,
        6.7538,
        6.7765,
        6.5727,
        6.4279,
        7.5,
        5.4863,
        4.9839,
        4.4
      ],
      [
        4.4,
        5.1558,
        5.4636,
        5.6039,
        6.1698,
        6.3327,
        7.5,
        6.55,
        6.5817,
        6.6043,
        6.4006,
        6.2558,
        6.1698,
        5.3142,
        4.8117,
        4.4
      ],
      [
        4.4,
        4.4,
        4.4,
        4.4,
        4.8228,
        4.9858,
        5.0537,
        5.2031,
        5.2348,
        5.2574,
        5.0537,
        4.9088,
        4.8228,
        4.4,
        4.4,
        4.4
      ]
    ],
    "renderContract": "Tessellate the same bilinear function with maximum vertical approximation error0.05 units; stitch shared edges. Collision/Quiet use the analytic bilinear sample and clearance; no independent visual-only height field.",
    "allowedDepthRange": [
      4,
      10
    ]
  },
  "clearance": {
    "diverHorizontalRadius": 0.45,
    "diverBelowMeanSurface": 1,
    "diverAboveFloor": 1,
    "renderFloorErrorAllowance": 0.05,
    "diverBelowSolidRoof": 1,
    "cameraSphereRadius": 0.3,
    "cameraCenterAboveFloorOrSolid": 0.35,
    "cameraCenterBelowSolidRoof": 0.35,
    "cameraCenterSeaCeiling": -0.75,
    "surfaceWaveEnvelope": [
      -0.385,
      0.385
    ]
  },
  "solidFeatures": [
    {
      "id": "arch",
      "status": "Proposed canonical portal proxy, needs visual/movement review",
      "axis": "opening traversed along Z",
      "centerXZ": [
        -3,
        -4
      ],
      "clearOpeningX": [
        -5.2,
        -0.8
      ],
      "roofX": [
        -6,
        0
      ],
      "roofZ": [
        -5.6,
        -2.4
      ],
      "roofY": [
        -4.9,
        -4.1
      ],
      "leftPierX": [
        -6,
        -5.2
      ],
      "rightPierX": [
        -0.8,
        0
      ],
      "pierZ": [
        -5.6,
        -2.4
      ],
      "pierY": "From sampled floor up to roof top-4.1",
      "collisionRule": "Roof box and two pier boxes remain separate; never use one filled bounding box over the opening."
    },
    {
      "id": "cleaner-ledge",
      "status": "Observation target lies under ledge; visitor approach(9,-8) stays outside its footprint",
      "footprintX": [
        10.5,
        13
      ],
      "footprintZ": [
        -9.5,
        -6.5
      ],
      "slabY": [
        -4.4,
        -4.05
      ],
      "approach": [
        9,
        -8
      ]
    },
    {
      "id": "camouflage-ledge",
      "status": "Visible rock shelf; observation approach stays outside the solid footprint",
      "footprintX": [
        -18,
        -16.5
      ],
      "footprintZ": [
        6.5,
        9
      ],
      "topY": -4.2,
      "bottomY": "sampled floor",
      "approach": [
        -15,
        6
      ]
    }
  ],
  "solidBoxes": [
    {
      "id": "arch-roof",
      "min": [
        -6,
        -4.9,
        -5.6
      ],
      "max": [
        0,
        -4.1,
        -2.4
      ]
    },
    {
      "id": "arch-left-pier",
      "min": [
        -6,
        -10,
        -5.6
      ],
      "max": [
        -5.2,
        -4.1,
        -2.4
      ]
    },
    {
      "id": "arch-right-pier",
      "min": [
        -0.8,
        -10,
        -5.6
      ],
      "max": [
        0,
        -4.1,
        -2.4
      ]
    },
    {
      "id": "cleaner-slab",
      "min": [
        10.5,
        -4.4,
        -9.5
      ],
      "max": [
        13,
        -4.05,
        -6.5
      ]
    },
    {
      "id": "camouflage-shelf",
      "min": [
        -18,
        -10,
        6.5
      ],
      "max": [
        -16.5,
        -4.2,
        9
      ]
    },
    {
      "id": "cleaner-support",
      "min": [
        12.65,
        -10,
        -9.5
      ],
      "max": [
        13,
        -4.1,
        -6.5
      ]
    }
  ],
  "namedSamples": [
    {
      "id": "entry",
      "x": 20,
      "z": 0,
      "floorDepth": 4.5,
      "floorY": -4.5,
      "insideHardEllipse": true,
      "insideInnerSoftMarker": true,
      "legalDiverDepthIntervals": [
        [
          1,
          3.45
        ]
      ],
      "cameraCenterYIntervalsAtSameXZ": [
        [
          -4.1,
          -0.75
        ]
      ],
      "note": "Local vertical interval only; rear-offset eye must query its own floor/solid position."
    },
    {
      "id": "loop-1",
      "x": -18,
      "z": 4,
      "floorDepth": 7.5,
      "floorY": -7.5,
      "insideHardEllipse": true,
      "insideInnerSoftMarker": true,
      "legalDiverDepthIntervals": [
        [
          1,
          6.45
        ]
      ],
      "cameraCenterYIntervalsAtSameXZ": [
        [
          -7.1,
          -0.75
        ]
      ],
      "note": "Local vertical interval only; rear-offset eye must query its own floor/solid position."
    },
    {
      "id": "loop-2",
      "x": -10,
      "z": -8,
      "floorDepth": 7.5,
      "floorY": -7.5,
      "insideHardEllipse": true,
      "insideInnerSoftMarker": true,
      "legalDiverDepthIntervals": [
        [
          1,
          6.45
        ]
      ],
      "cameraCenterYIntervalsAtSameXZ": [
        [
          -7.1,
          -0.75
        ]
      ],
      "note": "Local vertical interval only; rear-offset eye must query its own floor/solid position."
    },
    {
      "id": "loop-3",
      "x": 7,
      "z": -9,
      "floorDepth": 7.5,
      "floorY": -7.5,
      "insideHardEllipse": true,
      "insideInnerSoftMarker": true,
      "legalDiverDepthIntervals": [
        [
          1,
          6.45
        ]
      ],
      "cameraCenterYIntervalsAtSameXZ": [
        [
          -7.1,
          -0.75
        ]
      ],
      "note": "Local vertical interval only; rear-offset eye must query its own floor/solid position."
    },
    {
      "id": "loop-4",
      "x": 17,
      "z": 0,
      "floorDepth": 7.5,
      "floorY": -7.5,
      "insideHardEllipse": true,
      "insideInnerSoftMarker": true,
      "legalDiverDepthIntervals": [
        [
          1,
          6.45
        ]
      ],
      "cameraCenterYIntervalsAtSameXZ": [
        [
          -7.1,
          -0.75
        ]
      ],
      "note": "Local vertical interval only; rear-offset eye must query its own floor/solid position."
    },
    {
      "id": "loop-5",
      "x": 10,
      "z": 11,
      "floorDepth": 7.5,
      "floorY": -7.5,
      "insideHardEllipse": true,
      "insideInnerSoftMarker": true,
      "legalDiverDepthIntervals": [
        [
          1,
          6.45
        ]
      ],
      "cameraCenterYIntervalsAtSameXZ": [
        [
          -7.1,
          -0.75
        ]
      ],
      "note": "Local vertical interval only; rear-offset eye must query its own floor/solid position."
    },
    {
      "id": "loop-6",
      "x": -7,
      "z": 12,
      "floorDepth": 7.5,
      "floorY": -7.5,
      "insideHardEllipse": true,
      "insideInnerSoftMarker": true,
      "legalDiverDepthIntervals": [
        [
          1,
          6.45
        ]
      ],
      "cameraCenterYIntervalsAtSameXZ": [
        [
          -7.1,
          -0.75
        ]
      ],
      "note": "Local vertical interval only; rear-offset eye must query its own floor/solid position."
    },
    {
      "id": "arch",
      "x": -3,
      "z": -4,
      "floorDepth": 8.6,
      "floorY": -8.6,
      "insideHardEllipse": true,
      "insideInnerSoftMarker": true,
      "legalDiverDepthIntervals": [
        [
          1,
          3.1
        ],
        [
          5.9,
          7.55
        ]
      ],
      "cameraCenterYIntervalsAtSameXZ": [
        [
          -8.2,
          -5.25
        ],
        [
          -3.75,
          -0.75
        ]
      ],
      "note": "Local vertical interval only; rear-offset eye must query its own floor/solid position."
    },
    {
      "id": "school",
      "x": -4,
      "z": 7,
      "floorDepth": 7.3,
      "floorY": -7.3,
      "insideHardEllipse": true,
      "insideInnerSoftMarker": true,
      "legalDiverDepthIntervals": [
        [
          1,
          6.25
        ]
      ],
      "cameraCenterYIntervalsAtSameXZ": [
        [
          -6.9,
          -0.75
        ]
      ],
      "note": "Local vertical interval only; rear-offset eye must query its own floor/solid position."
    },
    {
      "id": "current-1",
      "x": -16,
      "z": -6,
      "floorDepth": 7.2,
      "floorY": -7.2,
      "insideHardEllipse": true,
      "insideInnerSoftMarker": true,
      "legalDiverDepthIntervals": [
        [
          1,
          6.15
        ]
      ],
      "cameraCenterYIntervalsAtSameXZ": [
        [
          -6.8,
          -0.75
        ]
      ],
      "note": "Local vertical interval only; rear-offset eye must query its own floor/solid position."
    },
    {
      "id": "current-2",
      "x": -8,
      "z": -9,
      "floorDepth": 7.5,
      "floorY": -7.5,
      "insideHardEllipse": true,
      "insideInnerSoftMarker": true,
      "legalDiverDepthIntervals": [
        [
          1,
          6.45
        ]
      ],
      "cameraCenterYIntervalsAtSameXZ": [
        [
          -7.1,
          -0.75
        ]
      ],
      "note": "Local vertical interval only; rear-offset eye must query its own floor/solid position."
    },
    {
      "id": "current-3",
      "x": 2,
      "z": -8,
      "floorDepth": 7.8,
      "floorY": -7.8,
      "insideHardEllipse": true,
      "insideInnerSoftMarker": true,
      "legalDiverDepthIntervals": [
        [
          1,
          6.75
        ]
      ],
      "cameraCenterYIntervalsAtSameXZ": [
        [
          -7.4,
          -0.75
        ]
      ],
      "note": "Local vertical interval only; rear-offset eye must query its own floor/solid position."
    },
    {
      "id": "current-4",
      "x": 10,
      "z": -4,
      "floorDepth": 7.5,
      "floorY": -7.5,
      "insideHardEllipse": true,
      "insideInnerSoftMarker": true,
      "legalDiverDepthIntervals": [
        [
          1,
          6.45
        ]
      ],
      "cameraCenterYIntervalsAtSameXZ": [
        [
          -7.1,
          -0.75
        ]
      ],
      "note": "Local vertical interval only; rear-offset eye must query its own floor/solid position."
    },
    {
      "id": "camouflage-approach",
      "x": -15,
      "z": 6,
      "floorDepth": 5.2,
      "floorY": -5.2,
      "insideHardEllipse": true,
      "insideInnerSoftMarker": true,
      "legalDiverDepthIntervals": [
        [
          1,
          4.15
        ]
      ],
      "cameraCenterYIntervalsAtSameXZ": [
        [
          -4.8,
          -0.75
        ]
      ],
      "note": "Local vertical interval only; rear-offset eye must query its own floor/solid position."
    },
    {
      "id": "cleaner-approach",
      "x": 9,
      "z": -8,
      "floorDepth": 6.6,
      "floorY": -6.6,
      "insideHardEllipse": true,
      "insideInnerSoftMarker": true,
      "legalDiverDepthIntervals": [
        [
          1,
          5.55
        ]
      ],
      "cameraCenterYIntervalsAtSameXZ": [
        [
          -6.2,
          -0.75
        ]
      ],
      "note": "Local vertical interval only; rear-offset eye must query its own floor/solid position."
    }
  ],
  "requestedDepthPolicy": {
    "default": "Resolve x,z first. Begin with legal positive depth interval[1,floorDepth-1-0.05] (the extra0.05 reserves render-tessellation error), then subtract each intersecting solid box vertical range expanded by1 for diver clearance. Horizontal proxy tests include diver radius0.45. This can produce multiple open intervals: preserve them all; choose the closest valid depth to the request, never always force the under-roof branch.",
    "message": "Depth adjusted to {depth} here to keep clear of {sand|overhead rock}.",
    "blockedFootprint": "If no open depth interval remains, reject that position and retain the previous valid pose with explanation. Quiet may explicitly select a safe still above/below an arch. Full-motion travel requires a safe route around the roof or through its opening; clamping must not teleport through a wall.",
    "emptyInterval": "Reject art/layout; runtime retains last safe position/camera and offers Reframe or Reset position.",
    "camera": "Floor clearance is0.35+0.05 tessellation reserve; exact roof/proxy clearance stays0.35. Desired5 behind/2 above must query the eye location independently and satisfy sphere/solid/ceiling constraints. A local vertical band is not proof of a safe camera path."
  },
  "studyBoundary": "HTML selector can demonstrate data-driven clamping and explanation. It does not prove swept collision, camera travel or continuous swimming.",
  "cpuValidation": {
    "namedPointCount": 15,
    "allNamedPointsInsideHardEllipse": true,
    "allNamedVerticalIntervalsNonempty": true,
    "intervalMethod": "Subtracted actual expanded solid-box bands from bilinear floor/surface intervals; no rendered or swept-path claim",
    "gridDepthRange": [
      4.4,
      8.6
    ]
  },
  "implementationRefinements": [
    "Cleaner ledge adds a narrow stone support x12.65..13,z-9.5..-6.5 from seabed to-4.1. This anchors the original floating slab, preserves the approach(9,-8) and cleaner station(11.6,-5.15,-8), and participates in the same camera/diver solid queries."
  ]
} as const;

export const REEF_CENTER = { x: -65, z: -15 } as const;
export const REEF_BOUNDS = { x: 24, z: 18 } as const;
export const reefSolids = reefTerrainDefinition.solidBoxes;
export type ReefInterval = [number, number];
const clamp = (v: number, low: number, high: number) => Math.min(high, Math.max(low, v));
function cell(axis: readonly number[], v: number) {
  let i = 0;
  while (i < axis.length - 2 && v > axis[i + 1]) i++;
  return i;
}
/** Bilinear authority used by terrain, collision, camera and Quiet controls. */
export function sampleReefDepth(x: number, z: number): number {
  const { xCoordinates: xs, zCoordinates: zs, depthRows: rows } = reefTerrainDefinition.floor;
  x = clamp(x, xs[0], xs[xs.length - 1]);
  z = clamp(z, zs[0], zs[zs.length - 1]);
  const i = cell(xs, x), j = cell(zs, z);
  const u = (x-xs[i])/(xs[i+1]-xs[i]), v = (z-zs[j])/(zs[j+1]-zs[j]);
  return (rows[j][i]*(1-u)+rows[j][i+1]*u)*(1-v)
    +(rows[j+1][i]*(1-u)+rows[j+1][i+1]*u)*v;
}
export const sampleReefFloor = (x: number, z: number) => -sampleReefDepth(x,z);
export function constrainReefPoint<T extends { x: number; z: number }>(point: T): T {
  const rho = Math.hypot(point.x/REEF_BOUNDS.x, point.z/REEF_BOUNDS.z);
  return rho > 1 ? { ...point, x: point.x/rho, z: point.z/rho } : { ...point };
}
export function isInReefWarningBand(x: number, z: number): boolean {
  return Math.hypot(x/21,z/15)>1;
}
function subtract(intervals: ReefInterval[], low: number, high: number): ReefInterval[] {
  const result: ReefInterval[]=[];
  for (const [a,b] of intervals) {
    if(high<=a || low>=b) result.push([a,b]);
    else { if(low>a) result.push([a,Math.min(low,b)]); if(high<b) result.push([Math.max(high,a),b]); }
  }
  return result;
}
function containsExpanded(x: number,z: number,box: typeof reefSolids[number],radius: number) {
  return x>=box.min[0]-radius && x<=box.max[0]+radius && z>=box.min[2]-radius && z<=box.max[2]+radius;
}
export function getReefDepthIntervals(x: number,z: number): ReefInterval[] {
  const c=reefTerrainDefinition.clearance;
  const upper=sampleReefDepth(x,z)-c.diverAboveFloor-c.renderFloorErrorAllowance;
  let intervals: ReefInterval[]=upper>=c.diverBelowMeanSurface ? [[c.diverBelowMeanSurface,upper]] : [];
  for(const box of reefSolids) if(containsExpanded(x,z,box,c.diverHorizontalRadius))
    intervals=subtract(intervals,-box.max[1]-c.diverBelowSolidRoof,-box.min[1]+c.diverAboveFloor);
  return intervals;
}
/** Returns legal camera center Y bands, not depth. Query the actual eye X/Z. */
export function getReefCameraIntervals(x: number,z: number): ReefInterval[] {
  const c=reefTerrainDefinition.clearance;
  const low=sampleReefFloor(x,z)+c.cameraCenterAboveFloorOrSolid+c.renderFloorErrorAllowance;
  let intervals: ReefInterval[]=low<=c.cameraCenterSeaCeiling ? [[low,c.cameraCenterSeaCeiling]] : [];
  for(const box of reefSolids) if(containsExpanded(x,z,box,c.cameraSphereRadius))
    intervals=subtract(intervals,box.min[1]-c.cameraCenterBelowSolidRoof,box.max[1]+c.cameraCenterAboveFloorOrSolid);
  return intervals;
}
