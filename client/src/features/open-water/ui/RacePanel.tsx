import { useState } from "react";
import { raceCourses, type RaceCourse } from "../data/world";
import {
  formatRaceTime as raceTime,
  type RaceState,
} from "../systems/raceController";
export { raceTime };

export default function RacePanel({
  race,
  best,
  paused,
  onStart,
  onRestart,
  onExit,
}: {
  race: RaceState;
  best: number | undefined;
  paused: boolean;
  onStart: (course: RaceCourse) => void;
  onRestart: () => void;
  onExit: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const course = raceCourses.find((item) => item.id === race.courseId);
  if (race.phase === "idle" || !course)
    return (
      <aside
        className={`ow-playground ${expanded ? "is-expanded" : ""}`}
        aria-label="Optional time trials"
      >
        <button
          className="ow-playground-toggle"
          aria-expanded={expanded}
          aria-controls="time-trial-menu"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="ow-race-flag" aria-hidden="true">
            ⚑
          </span>
          <span>
            Time trials<small>Two courses. Your own pace.</small>
          </span>
          <span aria-hidden="true">{expanded ? "−" : "+"}</span>
        </button>
        {expanded && (
          <div id="time-trial-menu" className="ow-course-menu">
            {raceCourses.map((item, index) => (
              <button
                key={item.id}
                aria-label={`Start ${item.name}`}
                onClick={() => {
                  setExpanded(false);
                  onStart(item);
                }}
              >
                <span className="ow-course-number">0{index + 1}</span>
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {item.gates.length} gates
                    {item.rampIds.length
                      ? ` · ${item.rampIds.length} jumps`
                      : " · open water"}
                  </small>
                </span>
                <span aria-hidden="true">↗</span>
              </button>
            ))}
            <p>
              Start at the line. Sail through the marked gates in order. Leave
              whenever you like.
            </p>
          </div>
        )}
      </aside>
    );
  return (
    <aside
      className={`ow-race-panel is-${race.phase}`}
      aria-label="Race progress"
    >
      <div className="ow-race-heading">
        <span className="ow-micro">
          {race.phase === "finished"
            ? "Course complete"
            : "Open Water / Time trial"}
        </span>
        <button onClick={onExit}>
          Free sail <span aria-hidden="true">×</span>
        </button>
      </div>
      <h2>{course.name}</h2>
      {race.phase === "countdown" ? (
        <div className="ow-countdown" role="status">
          <strong>{Math.max(1, Math.ceil(race.countdown))}</strong>
          <span>
            {paused ? "Paused at the line" : "Get ready. W to accelerate."}
          </span>
        </div>
      ) : (
        <>
          <div
            className="ow-race-clock"
            role="timer"
            aria-label={`Elapsed time ${raceTime(race.finishTime ?? race.elapsed)}`}
          >
            <strong>{raceTime(race.finishTime ?? race.elapsed)}</strong>
            <span>
              {paused && race.phase !== "finished"
                ? "Paused"
                : race.phase === "finished"
                  ? "Your time"
                  : "Elapsed"}
            </span>
          </div>
          <div className="ow-race-progress">
            <span>
              {race.phase === "finished"
                ? "All gates cleared"
                : `Gate ${race.checkpoint + 1} / ${course.gates.length}`}
            </span>
            <span>
              {race.phase === "finished"
                ? "Nice sailing."
                : course.gates[race.checkpoint]?.minLift
                  ? "Jump through the high gate"
                  : "Follow the coral pennants"}
            </span>
          </div>
          <div className="ow-race-track" aria-hidden="true">
            {course.gates.map((gate, index) => (
              <i
                key={gate.id}
                className={
                  index < race.checkpoint
                    ? "is-passed"
                    : index === race.checkpoint
                      ? "is-next"
                      : ""
                }
              />
            ))}
          </div>
          {race.phase === "finished" && best !== undefined && (
            <p className="ow-race-best">
              Session best <strong>{raceTime(best)}</strong>
            </p>
          )}
        </>
      )}
      <div className="ow-race-bottom">
        <button onClick={onRestart}>
          Restart race <span aria-hidden="true">↻</span>
        </button>
        <span>
          {race.phase === "finished" ? "One more lap?" : "W A S D / steer"}
        </span>
      </div>
    </aside>
  );
}
