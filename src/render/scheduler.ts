import { createResolvable } from "../create-resolvable";
import { effectResolver } from "../hooks/effect";
import { stateResolver } from "../hooks/state";
import { DeferredRenderGroup } from "./groups/DeferredRenderGroup";
import { queueSetGroupMember, shallowDeleteSetMember } from "./groups/utils";
import type { SetGroup } from "./groups/types";
import { SyncRenderGroup } from "./groups/SyncRenderGroup";
import type { RenderGroup } from "./groups/RenderGroup";
import { unmountHookCleanup } from "../hooks/process-hook";
import type { Fiber } from "../instances/types";
import { DeferredRenderThrottler } from "./groups/DeferredRenderThrottler";
import { UNMOUNT } from "../reasons";

export class Scheduler {
  private _rendering = "";
  renderIteration = 0;
  get rendering() {
    return this._rendering;
  }

  private readonly syncGroup = new SyncRenderGroup();
  private readonly deferredGroup = new DeferredRenderGroup();
  private throttler = new DeferredRenderThrottler(20);
  private getGroup(deferred: boolean) {
    if (deferred) return this.deferredGroup;
    return this.syncGroup;
  }

  private resolveGroups: Array<SetGroup> = [];

  private renderTrigger = createResolvable<boolean>();

  constructor() {
    void this.renderTrigger.promise.then(this.run);
  }

  queueRender(fiber: Fiber, deferred = fiber.isDeferred()): void {
    this.getGroup(deferred).queueRender(fiber);
    this.renderTrigger.resolve(true);
  }

  cancelRender(fiber: Fiber, deferred = fiber.isDeferred()): void {
    this.getGroup(deferred).cancelRender(fiber);
  }

  schedulePostRenderCallback(fiber: Fiber, deferred = fiber.isDeferred()): void {
    this.getGroup(deferred).schedulePostRenderCallback(fiber);
  }

  scheduleStateResolve(fiber: Fiber): void {
    queueSetGroupMember(this.resolveGroups, fiber);
  }

  cancelStateResolve(fiber: Fiber): void {
    shallowDeleteSetMember(this.resolveGroups, fiber);
  }

  queuePreCommit(fiber: Fiber, deferred = fiber.isDeferred()): void {
    this.getGroup(deferred).queuePreCommit(fiber);
  }

  scheduleCommit(fiber: Fiber, deferred = fiber.isDeferred()): void {
    this.getGroup(deferred).scheduleCommit(fiber);
  }

  private run = async (): Promise<void> => {
    const { throttler } = this;
    throttler.onRenderStart();
    const { syncGroup, deferredGroup } = this;
    while (await this.renderTrigger.promise) {
      while (syncGroup.hasRenderQueue() || deferredGroup.hasRenderQueue()) {
        this.renderIteration++;
        this.handleSyncGroupRender();
        this.runPostRenderCallbacks(syncGroup);
        if(this.syncGroup.hasRenderQueue()) continue;
        if (throttler.shouldThrottle()) {
          await throttler.throttle()
          if(this.syncGroup.hasRenderQueue()) continue;
        }
        await this.handleDeferredGroupRender();
      }
      const iteration = this.renderIteration;

      deferredGroup.commit(this.renderIteration);
      const { resolveGroups } = this;
      this.resolveGroups = [];


      this.runPostRenderCallbacks(deferredGroup);
      for (const { members, queue } of resolveGroups) {
        for (const next of queue) {
          if (!members.has(next)) continue;
          if (next.unmounted || next.isUnmounted(iteration)) continue;
          next.hookStates?.forEach(stateResolver);
          next.resolveReasons?.clear();
        }
      }

      if (syncGroup.hasRenderQueue() || deferredGroup.hasRenderQueue()) {
        continue
      }
      this.renderTrigger = createResolvable();
    }
  };

  private handleSyncGroupRender(): void {
    const { syncGroup } = this;
    const iteration = this.renderIteration;
    for (const fiber of syncGroup.getRenderIterable()) {
      if (fiber.unmounted ||=fiber?.isUnmounted(iteration)) continue;
      this.renderFiber(fiber);
    }
    for(const fiber of syncGroup.getPrecommitIterable()) {
      fiber.preCommit()
    }
    syncGroup.commit();
  }

  private async handleDeferredGroupRender() {
    const { deferredGroup, syncGroup, throttler } = this;
    const iteration = this.renderIteration;
    deferredGroup.beforeRenderStart();
    if (syncGroup.hasRenderQueue()) return;
    for (const fiber of deferredGroup.getRenderIterable()) {
      if (fiber.unmounted ||=fiber?.isUnmounted(iteration)) continue;
      fiber.cancelPostRenderCallback(UNMOUNT);
      this.renderFiber(fiber);
      if (this.throttler.shouldThrottle()) {
        await throttler.throttle()
        if(syncGroup.hasRenderQueue()) return;
      }
    }
    for (const fiber of deferredGroup.getPrecommitIterable()) {
      if (throttler.shouldThrottle()) {
        await throttler.throttle()
        if(syncGroup.hasRenderQueue()) return;
        if(deferredGroup.hasRenderQueue()) return;
      }
      if (fiber.unmounted ||= fiber.isUnmounted(iteration)) continue;
      fiber.preCommit()
    }
  }


  private runPostRenderCallbacks(group: RenderGroup) {
    const iteration = this.renderIteration;
    for (const next of group.getPostRenderCallbackIterable(iteration)) {
      if (next.unmounted) {
        next.hookStates.forEach(unmountHookCleanup);
      } else {
        next.hookStates.forEach(effectResolver);
        next.postRenderCallbackReasons?.clear();
      }
    }
  }

  private renderFiber(fiber: Fiber) {
    try {
      fiber.confidentIteration = this.renderIteration;
      fiber.render();
    } catch (cause) {
      throw new Error(
        `Failed to render component ${fiber.component.name} at:${"\n"}${fiber.stack()}`,
        { cause },
      );
    }
  }
}
