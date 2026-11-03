export type VesselDetail = "low" | "high";

/** Which vessel assets to load, in order. The light model (about a fifth of the
 * detailed superyacht) always arrives first so the helm is ready quickly; the
 * detailed model follows only on high quality without a data-saving request. */
export function vesselDetailPlan(quality: VesselDetail, saveData = false): VesselDetail[] {
  return quality === "high" && !saveData ? ["low", "high"] : ["low"];
}

const canceled = () => new DOMException("Vessel detail upgrade was cancelled", "AbortError");

/** Resolves after a short settle and the next idle period (or a bounded timeout
 * where idle callbacks are unavailable), so the detailed download and parse do
 * not compete with the first frames at the helm. Rejects when signal aborts. */
export function afterInteractive(signal: AbortSignal, settle = 1200, idleTimeout = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(canceled()); return; }
    let idle = 0;
    const host = globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const finish = () => { signal.removeEventListener("abort", abort); resolve(); };
    const timer = setTimeout(() => {
      if (host.requestIdleCallback) idle = host.requestIdleCallback(finish, { timeout: idleTimeout });
      else finish();
    }, settle);
    function abort() {
      clearTimeout(timer);
      if (idle) host.cancelIdleCallback?.(idle);
      reject(canceled());
    }
    signal.addEventListener("abort", abort, { once: true });
  });
}
