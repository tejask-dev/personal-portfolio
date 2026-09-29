import { useState } from "react";
import { destinations, type Destination } from "../data/world";
import type { BoatState } from "../systems/boatController";

export default function Chart({
  boat,
  onSelect,
}: {
  boat: BoatState;
  onSelect: (destination: Destination) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const point = (x: number, z: number) => ({
    x: ((x + 105) / 210) * 200,
    y: ((z + 108) / 172) * 140,
  });
  const position = point(boat.x, boat.z);
  return (
    <aside
      className={`ow-chart ${expanded ? "" : "is-collapsed"}`}
      aria-label="Chart of four fictional destinations"
    >
      <button
        className="ow-chart-heading"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls="chart-map"
      >
        <span>The chart</span>
        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && (
        <div id="chart-map">
          <div className="ow-map">
            <svg viewBox="0 0 200 140" aria-hidden="true">
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
                    strokeOpacity=".13"
                    strokeWidth=".5"
                  />
                </pattern>
              </defs>
              <rect width="200" height="140" fill="url(#map-grid)" />
              <g
                fill="none"
                stroke="currentColor"
                opacity=".22"
                strokeWidth=".7"
              >
                <path d="M6 72Q37 13 74 43T160 64Q195 62 187 109" />
                <path d="M10 76Q33 33 75 58T158 81Q182 88 183 124" />
                <path d="M16 112Q43 88 63 116T145 134" />
              </g>
              <g
                transform={`translate(${position.x},${position.y}) rotate(${(boat.heading * 180) / Math.PI})`}
              >
                <path d="M0 -5 3 4 0 2 -3 4Z" fill="#e2ecd3" />
              </g>
              <text x="185" y="14" fill="currentColor" fontSize="6">
                N
              </text>
              <path
                d="M188 27V18m-3 3 3-4 3 4"
                fill="none"
                stroke="currentColor"
                strokeWidth=".7"
              />
            </svg>
            {destinations.map((destination) => {
              const p = point(destination.x, destination.z);
              return (
                <button
                  key={destination.id}
                  style={{ left: `${p.x / 2}%`, top: `${p.y / 1.4}%` }}
                  className={`ow-map-pin ${boat.target?.id === destination.id || boat.arrived === destination.id ? "is-active" : ""}`}
                  onClick={() => onSelect(destination)}
                  aria-label={`Sail to ${destination.name}: ${destination.project}`}
                  title={destination.name}
                >
                  {destination.number}
                </button>
              );
            })}
          </div>
          <div className="ow-chart-caption">
            <span>4 places to discover</span>
            <span>Fictional waters</span>
          </div>
        </div>
      )}
    </aside>
  );
}
