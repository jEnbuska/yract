import { createResolvable } from "../create-resolvable";
import { effectResolver } from "../hooks/effect";
import { stateResolver } from "../hooks/state";
import { DeferredRenderGroup } from "./groups/DeferredRenderGroup";
import { createSetGroup, queueSetGroupMember, shallowDeleteSetMember } from "./groups/utils";
import { SyncRenderGroup } from "./groups/SyncRenderGroup";
import type { Fiber } from "../instances/types";
import { RenderClock } from "./groups/RenderClock";
import { stack } from "../instances/utils";

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

  private resolveGroups = createSetGroup();

  queueRender(fiber: Fiber): void {
    this.getGroup(fiber.isDeferred()).queueRender(fiber);
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
    queueSetGroupMember(this.resolveGroups, fiber);
  }

  cancelStateResolve(fiber: Fiber): void {
    shallowDeleteSetMember(this.resolveGroups, fiber);
  }

  cancelCommit(fiber: Fiber): void {
    this.getGroup(fiber.isDeferred()).cancelCommit(fiber);
  }

  queuePreCommit(fiber: Fiber): void {
    this.getGroup(fiber.isDeferred()).queuePreCommit(fiber);
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
       renderClock.renderIteration++;
       syncGroup.render();
       syncGroup.preCommit();
       syncGroup.commit();
       syncGroup.postCommit();
       if (syncGroup.hasRenderQueue()) continue;
       if(!deferredGroup.hasRenderQueue()) break;
       await renderClock.throttle();
       while(!this.syncGroup.hasRenderQueue() && deferredGroup.hasRenderQueue()) {
        if(await deferredGroup.render()) {
          await deferredGroup.preCommit()
        }
       }
      }
      deferredGroup.commit();
      const { resolveGroups } = this;
      this.resolveGroups = createSetGroup();
      deferredGroup.postCommit();
      const {members, queues} = resolveGroups
      const {renderIteration} = this.renderClock
      for(let i = 0; i<queues.length;i++) {
        const queue = queues[i]!;
        for (let j = 0; j<queues.length; j++) {
          const fiber = queue[j]!
          if (!members.has(fiber)) continue;
          if (fiber.isUnmounted(renderIteration)) continue;
          fiber.hookStates?.forEach(stateResolver);
          fiber.resolveReasons?.clear();
        }
      }

      if (syncGroup.hasRenderQueue() || deferredGroup.hasRenderQueue()) {
        continue;
      }
      this.renderTrigger = createResolvable();
    }
  };


  private async handleDeferredGroupRender() {
    const { deferredGroup, syncGroup, renderClock } = this;

    while(deferredGroup.hasRenderQueue() || deferredGroup.hasPrecommitQueue()) {
      const iteration = this.renderIteration;
      //if (syncGroup.hasRenderQueue()) return;
      for (const fiber of deferredGroup.getRenderIterable()) {
        if ((fiber.unmounted ||= fiber.isUnmounted(iteration))) {
          continue;
        }
        this.renderFiber(fiber);
        if (this.renderClock.shouldThrottle()) {
          await renderClock.throttle();
          if(syncGroup.hasRenderQueue()) return
        }
      }
      let preCommits = 0;
      for (const fiber of deferredGroup.getPrecommitIterable(iteration)) {
        if ((fiber.unmounted ||= fiber.isUnmounted(iteration))) continue;
        fiber.preCommit();
        if (renderClock.shouldThrottle()) {
          await renderClock.throttle();
          if (syncGroup.hasRenderQueue()) return;
          if (deferredGroup.hasRenderQueue()) break;
        }
      }
      console.log('pre commits', preCommits);
    }
  }

  private renderFiber(fiber: Fiber) {
    try {
      fiber.confidentIteration = this.renderIteration;
      fiber.render();
    } catch (cause) {
      throw new Error(
        `Failed to render component ${fiber.component.name} at:${"\n"}${stack(fiber)}`,
        { cause },
      );
    }
  }
}
