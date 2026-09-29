import { useState, type CSSProperties } from "react";
import {
  destinations,
  islands,
  ramps,
  raceCourses,
  WORLD_RADIUS,
  type Destination,
} from "../data/world";
import type { BoatState } from "../systems/boatController";
import type { RaceState } from "../systems/raceController";

const point = (x: number, z: number) => ({
  x: 100 + (x / WORLD_RADIUS) * 88,
  y: 78 + (z / WORLD_RADIUS) * 72,
});
export default function Chart({
  boat,
  race,
  onSelect,
}: {
  boat: BoatState;
  race: RaceState;
  onSelect: (destination: Destination) => void;
}) {
  const [expanded, setExpanded] = useState(
    () => window.innerWidth > 600 && !matchMedia("(pointer: coarse)").matches,
  );
  const position = point(boat.x, boat.z);
  const active =
    race.phase !== "idle"
      ? raceCourses.find((course) => course.id === race.courseId)
      : undefined;
  const racing = race.phase === "countdown" || race.phase === "racing";
  return (
    <aside
      className={`ow-chart ${expanded ? "" : "is-collapsed"}`}
      aria-label="Chart of four fictional destinations and two courses"
    >
      <button
        className="ow-chart-heading"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls="chart-map"
      >
        <span>The archipelago</span>
        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && (
        <div id="chart-map">
          <div className="ow-map">
            <svg viewBox="0 0 200 160" aria-hidden="true">
              <defs>
                <pattern
                  id="map-grid"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M20 0H0V20"
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity=".12"
                    strokeWidth=".5"
                  />
                </pattern>
              </defs>
              <rect width="200" height="160" fill="url(#map-grid)" />
              <ellipse
                cx="100"
                cy="78"
                rx="90"
                ry="74"
                fill="none"
                stroke="currentColor"
                strokeOpacity=".17"
                strokeDasharray="2 4"
                strokeWidth=".5"
              />
              {[...islands, ...destinations].map((island) => {
                const p = point(island.x, island.z);
                return (
                  <g key={island.id}>
                    <ellipse
                      cx={p.x}
                      cy={p.y}
                      rx={(island.r / WORLD_RADIUS) * 130}
                      ry={(island.r / WORLD_RADIUS) * 100}
                      fill="currentColor"
                      opacity=".12"
                    />
                    <ellipse
                      cx={p.x}
                      cy={p.y}
                      rx={(island.r / WORLD_RADIUS) * 175}
                      ry={(island.r / WORLD_RADIUS) * 140}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth=".5"
                      opacity=".18"
                    />
                  </g>
                );
              })}
              {(active ? [active] : raceCourses).map((course) => (
                <polyline
                  key={course.id}
                  className="ow-map-course"
                  points={[course.start, ...course.gates]
                    .map((gate) => {
                      const p = point(gate.x, gate.z);
                      return `${p.x},${p.y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke={active ? "#e6a487" : "currentColor"}
                  strokeWidth={active ? 1.25 : 0.6}
                  strokeDasharray={active ? undefined : "2 3"}
                  opacity={active ? 0.9 : 0.36}
                />
              ))}
              {active?.gates.map((gate, index) => {
                const p = point(gate.x, gate.z);
                return (
                  <circle
                    key={gate.id}
                    cx={p.x}
                    cy={p.y}
                    r={index === race.checkpoint ? 3.2 : 1.7}
                    fill={
                      index < race.checkpoint
                        ? "#d6eac6"
                        : index === race.checkpoint
                          ? "#f1b397"
                          : "#768c86"
                    }
                  />
                );
              })}
              {ramps.map((ramp) => {
                const p = point(ramp.x, ramp.z);
                return (
                  <path
                    key={ramp.id}
                    d="M-2 2 2 0 2 2Z"
                    transform={`translate(${p.x},${p.y})`}
                    fill="#dab894"
                  />
                );
              })}
              <g className="ow-chart-coordinates">
                {destinations.map((destination) => {
                  const p = point(destination.x, destination.z);
                  return (
                    <g key={destination.id}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="5.5"
                        fill="#16424a"
                        stroke="#b7d0bd"
                        strokeWidth=".5"
                      />
                      <text
                        x={p.x}
                        y={p.y + 1.5}
                        textAnchor="middle"
                        fill="#eff0dc"
                        fontSize="4.5"
                      >
                        {destination.number}
                      </text>
                    </g>
                  );
                })}
              </g>
              <g
                transform={`translate(${position.x},${position.y}) rotate(${(boat.heading * 180) / Math.PI})`}
              >
                <circle r="6" fill="#183b45" opacity=".6" />
                <path d="M0 -5 3 4 0 2 -3 4Z" fill="#fff3d4" />
              </g>
              <text x="186" y="13" fill="currentColor" fontSize="6">
                N
              </text>
              <path
                d="M188 25V17m-3 3 3-4 3 4"
                fill="none"
                stroke="currentColor"
                strokeWidth=".7"
              />
            </svg>
            {destinations.map((destination, index) => {
              const p = point(destination.x, destination.z);
              return (
                <button
                  key={destination.id}
                  style={
                    {
                      left: `${p.x / 2}%`,
                      top: `${p.y / 1.6}%`,
                      "--pin-index": index,
                    } as CSSProperties
                  }
                  className={`ow-map-pin ${boat.target?.id === destination.id || boat.arrived === destination.id ? "is-active" : ""}`}
                  disabled={racing}
                  onClick={() => onSelect(destination)}
                  aria-label={`Sail to ${destination.name}: ${destination.project}`}
                  title={
                    racing
                      ? "Leave the time trial to set a course"
                      : destination.name
                  }
                >
                  {destination.number}
                </button>
              );
            })}
          </div>
          <div className="ow-chart-caption">
            <span>
              {racing
                ? "Free sail to set a course"
                : "4 destinations · 2 courses"}
            </span>
            <span>Fictional waters</span>
          </div>
        </div>
      )}
    </aside>
  );
}
