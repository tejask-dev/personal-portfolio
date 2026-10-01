import type { RegionId } from "../data/regions.ts";

export type DisposableRegion = { dispose(): void };
export type PreparedRegion<T extends DisposableRegion> = {
  regionId: RegionId;
  epoch: number;
  resource: T;
};
/** CPU preparation leaves the old region intact. commit() is called behind the
 * transition curtain, before mounting/rendering the prepared group. This owns
 * every supplied region and never permits an obsolete request to commit. */
export function createRegionLifecycle<T extends DisposableRegion>(
  loader: (regionId: RegionId, signal: AbortSignal) => Promise<T>,
) {
  let epoch = 0;
  let controller: AbortController | null = null;
  let prepared: PreparedRegion<T> | null = null;
  let active: PreparedRegion<T> | null = null;
  let disposed = false;
  const released = new WeakSet<T>();
  const release = (resource:T) => {
    if(released.has(resource))return;
    released.add(resource);
    resource.dispose();
  };
  function cancel() {
    epoch++;
    controller?.abort();
    controller=null;
    if(prepared && prepared.resource!==active?.resource)release(prepared.resource);
    prepared=null;
  }
  return {
    get current() { return active; },
    get transitionId() { return epoch; },
    async prepare(regionId:RegionId,options:{reload?:boolean}={}):Promise<PreparedRegion<T>|null> {
      if(disposed)throw new Error("Region lifecycle has been disposed");
      cancel();
      const requestedEpoch=epoch;
      if(active?.regionId===regionId&&!options.reload) {
        prepared={...active,epoch:requestedEpoch};
        return prepared;
      }
      const request=new AbortController();
      controller=request;
      let resource:T;
      try { resource=await loader(regionId,request.signal); }
      catch(error) {
        if(disposed||request.signal.aborted||epoch!==requestedEpoch)return null;
        controller=null;
        throw error;
      }
      if(disposed||request.signal.aborted||epoch!==requestedEpoch) {
        release(resource);
        return null;
      }
      controller=null;
      prepared={regionId,epoch:requestedEpoch,resource};
      return prepared;
    },
    commit(ticket:PreparedRegion<T>):T|null {
      if(disposed||prepared!==ticket||ticket.epoch!==epoch)return null;
      if(active && active.resource!==ticket.resource)release(active.resource);
      active=ticket;
      prepared=null;
      return ticket.resource;
    },
    cancel,
    /** On return to the surface, drop detailed GPU geometry immediately. */
    clear() {
      cancel();
      if(active)release(active.resource);
      active=null;
    },
    dispose() {
      if(disposed)return;
      this.clear();
      disposed=true;
    },
  };
}
