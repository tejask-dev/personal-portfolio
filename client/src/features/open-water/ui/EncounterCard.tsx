import type { EncounterId } from "../data/encounters";
export type ObservedEncounter = "dakota" | "fish" | "camouflage" | "cleaner";
export default function EncounterCard(p: {
  id: ObservedEncounter;
  paused: boolean;
  fishApart: boolean;
  camouflage: boolean;
  outline: boolean;
  cleaner: number;
  onClose: () => void;
  onEncounter: (id: EncounterId) => void;
  onFish: (value: boolean) => void;
  onCamouflage: (value: boolean) => void;
  onOutline: () => void;
  onCleaner: (value: 0 | 1 | 2) => void;
  onResume: () => void;
  onGuideHide: () => void;
  onRead: () => void;
  onDetails: () => void;
}) {
  const title = {
    dakota: "Dakota, reef guide.",
    fish: "A little room to swim.",
    camouflage: "Hiding in plain sight.",
    cleaner: "A useful arrangement.",
  }[p.id];
  const caption = {
    dakota: "I’m Dakota. Reef guide. Shark. I know the way to the good stuff.",
    fish: p.fishApart
      ? "A little space opens between the school. Watch them find each other again."
      : "Give them a little room. Watch how they find each other again.",
    camouflage: p.camouflage
      ? "There you are. Good camouflage deserves a second look."
      : "There’s someone on that ledge. Take a closer look.",
    cleaner: [
      "The client arrives. The little fish has a useful job.",
      "The cleaner gets a meal. The client gets a cleaning.",
      "All done. The cleaner stays; the client moves on.",
    ][p.cleaner],
  }[p.id];
  return (
    <aside
      className={`exp-encounter-card exp-encounter-${p.id}`}
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          p.onClose();
        }
      }}
    >
      <header>
        <span className="exp-kicker">
          {p.id === "dakota"
            ? "Dolphin / identifies as a shark"
            : "Observe the living reef"}
        </span>
        <button onClick={p.onClose} aria-label={`Close ${title}`}>
          Close ×
        </button>
      </header>
      <h3>{title}</h3>
      <p className="exp-encounter-caption" role="status">
        {caption}
      </p>
      <div className="exp-encounter-actions">
        {p.id === "dakota" ? (
          <>
            <button onClick={() => p.onEncounter("reef")}>
              Explore reef ↓
            </button>
            <button onClick={() => p.onEncounter("dakota")}>
              Follow Dakota
            </button>
            <button onClick={p.onRead}>Show me the work ↗</button>
            <button onClick={p.onGuideHide}>Hide Dakota</button>
          </>
        ) : p.id === "fish" ? (
          <>
            <button aria-pressed={!p.fishApart} onClick={() => p.onFish(false)}>
              School together
            </button>
            <button aria-pressed={p.fishApart} onClick={() => p.onFish(true)}>
              School parts
            </button>
          </>
        ) : p.id === "camouflage" ? (
          <>
            <button
              aria-pressed={!p.camouflage}
              onClick={() => p.onCamouflage(false)}
            >
              Camouflaged
            </button>
            <button
              aria-pressed={p.camouflage}
              onClick={() => p.onCamouflage(true)}
            >
              Revealed
            </button>
            <button aria-pressed={p.outline} onClick={p.onOutline}>
              Show outline
            </button>
          </>
        ) : (
          <>
            {["Client arrives", "Cleaning", "Client leaves"].map((label, i) => (
              <button
                key={label}
                aria-pressed={p.cleaner === i}
                onClick={() => p.onCleaner(i as 0 | 1 | 2)}
              >
                {label}
              </button>
            ))}
          </>
        )}
      </div>
      <footer>
        <button onClick={p.onDetails}>About this encounter ↗</button>
        {p.paused && <button onClick={p.onResume}>Resume motion</button>}
      </footer>
    </aside>
  );
}
