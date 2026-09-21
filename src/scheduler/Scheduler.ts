import { createResolvable } from "../create-resolvable";
import { effectResolver } from "../hooks/effect";
import { stateResolver } from "../hooks/state";
import { DeferredRenderGroup } from "./DeferredRenderGroup";
import { SyncRenderGroup } from "./SyncRenderGroup";
import type { Fiber } from "../instances/types";
import { RenderClock } from "./RenderClock";
import { SyncFiberQueuedCollection } from "./SyncFiberQueuedCollection";

export class Scheduler {

  renderIteration = 0;
  private readonly syncGroup: SyncRenderGroup;
  private readonly deferredGroup: DeferredRenderGroup;
  private renderClock = new RenderClock(20);
  private renderTrigger = createResolvable<boolean>();

  constructor() {
    this.syncGroup = new SyncRenderGroup(this.renderClock)
    this.deferredGroup = new DeferredRenderGroup(this.renderClock, this.syncGroup.hasRenderQueue)
    void this.renderTrigger.promise.then(this.run);
  }

  private getGroup(deferred: boolean) {
    if (deferred) return this.deferredGroup;
    return this.syncGroup;
  }

  private resolveGroups = new SyncFiberQueuedCollection();

  scheduleRender(fiber: Fiber): void {
    this.getGroup(fiber.isDeferred()).scheduleRender(fiber);
    this.renderTrigger.resolve(true);
  }

  cancelRender(fiber: Fiber): void {
    this.getGroup(fiber.isDeferred()).cancelRender(fiber);
  }

  schedulePostCommit(fiber: Fiber): void {
    this.getGroup(fiber.isDeferred()).schedulePostCommit(fiber);
  }

  cancelPostCommit(fiber: Fiber): void {
    this.getGroup(fiber.isDeferred()).cancelPostCommit(fiber);
  }

  scheduleStateResolve(fiber: Fiber): void {
    this.resolveGroups.add(fiber)

  }

  cancelStateResolve(fiber: Fiber): void {
    this.resolveGroups.cancel(fiber)
  }

  schedulePrepareCommit(fiber: Fiber): void {
    this.getGroup(fiber.isDeferred()).schedulePrepareCommit(fiber);
  }

  ensureUnmount(fiber: Fiber): void {
    this.getGroup(fiber.isDeferred()).ensureUnmount(fiber);
  }


  scheduleCommit(fiber: Fiber): void {
    this.getGroup(fiber.isDeferred()).scheduleCommit(fiber);
  }

  private run = async (): Promise<void> => {
    const { syncGroup, deferredGroup, renderClock } = this;
    while (await this.renderTrigger.promise) {
      while (syncGroup.hasRenderQueue() || deferredGroup.hasRenderQueue()) {
       while(syncGroup.hasRenderQueue()) {
         renderClock.renderIteration++;
         syncGroup.render();
         syncGroup.commit();
         syncGroup.postCommit();
       }
       if(!deferredGroup.hasRenderQueue()) break;
       await renderClock.throttle();
       while(!syncGroup.hasRenderQueue() && deferredGroup.hasRenderQueue()) {
         await deferredGroup.render()
       }
      }
      deferredGroup.commit();
      const { resolveGroups } = this;
      this.resolveGroups = new SyncFiberQueuedCollection();
      deferredGroup.postCommit();
      const {renderIteration} = this.renderClock
      resolveGroups.forEach(fiber => {
        if (fiber.isUnmounted(renderIteration)) return;
        fiber.hookStates?.forEach(stateResolver);
        fiber.resolveReasons?.clear();
      })
      if (syncGroup.hasRenderQueue() || deferredGroup.hasRenderQueue())  {
        continue;
      }
      this.renderTrigger = createResolvable();
    }
  };


}
