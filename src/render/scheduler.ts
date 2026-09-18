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
import { applyDomAction, takeDomActionStats } from "../ui-actions/utils";

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

  private renderTrigger = createResolvable();

  constructor() {
    void this.renderTrigger.promise.then(this.run);
  }

  queueRender(fiber: Fiber, deferred = fiber.isDeferred()): void {
    this.getGroup(deferred).queueRender(fiber);
    this.renderTrigger.resolve();
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

  scheduleCommit(fiber: Fiber, deferred = fiber.isDeferred()): void {
    this.getGroup(deferred).scheduleCommit(fiber);
  }

  private run = async (): Promise<void> => {
    const { throttler } = this;
    throttler.onRenderStart();
    const { syncGroup, deferredGroup } = this;

    let start = Date.now();
    while (true) {
      while (syncGroup.hasRenderQueue() || deferredGroup.hasRenderQueue()) {
        start = Date.now();
        this.renderIteration++;
        //console.log('render sync');
        this.handleSyncGroupRender();
        //console.log('sync done', (Date.now() - start) / 1000);
        if (throttler.shouldThrottle()) {
          await throttler.throttle();
          //console.log('throttle');
          if (syncGroup.hasRenderQueue()) continue;
        }
        start = Date.now();
        await this.handleDeferredGroupRender();
        //console.log('deferred done', (Date.now() - start) / 1000);
      }
      //console.log('apply deferred ui');
      start = Date.now();
      const iteration = this.renderIteration;
      deferredGroup.commit(this.renderIteration);
      // console.log('Total updates', updates);
      /*console.log(
        'DOM UPDATE APPLY TOOK', (Date.now() - start) / 1000, 's  ::',
        takeDomActionStats(),
      );*/
      //console.log('...', (Date.now() - start) / 1000);
      const { resolveGroups } = this;
      this.resolveGroups = [];
      //console.log('apply deferred post callbacks');
      start = Date.now();
      this.runPostRenderCallbacks(deferredGroup);
      //console.log('...', (Date.now() - start) / 1000);

      //console.log('apply resolve set states');
      start = Date.now();
      for (const { members, queue } of resolveGroups) {
        for (const next of queue) {
          if (!members.has(next)) continue;
          if (next.isUnmounted(iteration)) continue;
          next.hookStates?.forEach(stateResolver);
          next.resolveReasons?.clear();
        }
      }
      // console.log('...', (Date.now() - start) / 1000);
      // console.log('----- DONE ----');
      if (syncGroup.hasRenderQueue() || deferredGroup.hasRenderQueue()) {
        continue;
      }
      this.renderTrigger = createResolvable();
      await this.renderTrigger.promise;
    }
  };

  private handleSyncGroupRender(): void {
    const { syncGroup } = this;
    const iteration = this.renderIteration;
    for (const fiber of syncGroup.getRenderIterable()) {
      if (fiber.isUnmounted(iteration)) {
        fiber.unmounted = true;
        syncGroup.schedulePostRenderCallback(fiber);
        continue;
      }
      this.renderFiber(fiber);
    }

    syncGroup.commit();
    this.runPostRenderCallbacks(syncGroup);
    if (syncGroup.hasRenderQueue()) {
      // State was updated by effect callbacks
      this.handleSyncGroupRender();
    }
  }

  private async handleDeferredGroupRender() {
    const { deferredGroup, syncGroup } = this;
    const iteration = this.renderIteration;
    deferredGroup.beforeRenderStart();
    if (this.throttler.shouldThrottle()) await this.throttler.throttle();
    if (syncGroup.hasRenderQueue()) {
      // console.log('exit deferred');
      return;
    }
    // console.log('render deferred');
    for (const fiber of deferredGroup.getRenderIterable()) {
      // console.log(fiber.component.name);
      if (fiber.isUnmounted(iteration)) {
        fiber.unmounted = true;
        fiber.schedulePostRenderCallback(UNMOUNT);
        continue;
      }
      fiber.cancelPostRenderCallback(UNMOUNT);
      this.renderFiber(fiber);
      if (this.throttler.shouldThrottle()) {
        await this.throttler.throttle();
        if (syncGroup.hasRenderQueue()) {
          // console.log('exit deferred');
          return;
        }
        // console.log('continue deferred');
      }
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

  private static applyUiActions(fiber: Fiber) {
    const { uiActions } = fiber;
    if (!uiActions) return;
    const { delegationRoot } = fiber.rctx;
    for (const action of uiActions) {
      applyDomAction(action, delegationRoot);
    }
  }
}
