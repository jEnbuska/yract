import { createResolvable } from "../create-resolvable";
import { effectResolver } from "../hooks/effect";
import { stateResolver } from "../hooks/state";
import { DeferredRenderGroup } from "./groups/DeferredRenderGroup";
import {
  queueSetGroupMember,
  shallowDeleteSetMember,
} from "./groups/utils";
import type { SetGroup } from "./groups/types";
import { SyncRenderGroup } from "./groups/SyncRenderGroup";
import type { RenderGroup } from "./groups/RenderGroup";
import { unmountHookCleanup } from "../hooks/process-hook";
import type { Fiber } from "../instances/types";
import { DeferredRenderThrottler } from "./groups/DeferredRenderThrottler";
import { UNMOUNT } from "../reasons";
import { applyDomAction } from "../ui-actions/utils";

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

  queueRender(instance: Fiber, deferred = instance.isDeferred()): void {
    this.getGroup(deferred).queueRender(instance);
    this.renderTrigger.resolve();
  }

  cancelRender(instance: Fiber, deferred = instance.isDeferred()): void {
    this.getGroup(deferred).cancelRender(instance);
  }

  schedulePostRenderCallback(instance: Fiber, deferred = instance.isDeferred()): void {
    this.getGroup(deferred).schedulePostRenderCallback(instance);
  }

  scheduleStateResolve(instance: Fiber): void {
    queueSetGroupMember(this.resolveGroups, instance);
  }

  cancelStateResolve(instance: Fiber): void {
    shallowDeleteSetMember(this.resolveGroups, instance);
  }

  scheduleUiUpdate(instance: Fiber, deferred = instance.isDeferred()): void {
    this.getGroup(deferred).scheduleUiUpdate(instance);
  }

  cancelUiUpdate(instance: Fiber, deferred = instance.isDeferred()): void {
    this.getGroup(deferred).cancelUiUpdate(instance);
  }

  private run = async (): Promise<void> => {
    const { throttler } = this;
    throttler.onRenderStart();
    const { syncGroup, deferredGroup } = this;

    let start = Date.now()
    while (true) {
      while (syncGroup.hasRenderQueue() || deferredGroup.hasRenderQueue()) {
        start = Date.now()
        this.renderIteration++;
        //console.log('render sync');
        this.handleSyncGroupRender();
        //console.log('sync done', (Date.now() - start) / 1000);
        if (throttler.shouldThrottle()) {
          await throttler.throttle();
          //console.log('throttle');
          if (syncGroup.hasRenderQueue()) continue;
        }
        start = Date.now()
        await this.handleDeferredGroupRender();
        //console.log('deferred done', (Date.now() - start) / 1000);
      }
      //console.log('apply deferred ui');
      start = Date.now()
      for (const fiber of deferredGroup.getUiUpdateIterable()) {
        if (fiber.isUnmounted(this.renderIteration)) continue;
        for (const action of fiber.uiActions) {
          applyDomAction(action, fiber);
        }
      }
      //console.log('...', (Date.now() - start) / 1000);
      const { resolveGroups } = this;
      this.resolveGroups = [];
      //console.log('apply deferred post callbacks');
      start = Date.now()
      this.runPostRenderCallbacks(deferredGroup);
      //console.log('...', (Date.now() - start) / 1000);
      const iteration = this.renderIteration;

      //console.log('apply resolve set states');
      start = Date.now()
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
      fiber.unmountInstances = undefined;
    }
    for (const fiber of syncGroup.getUiUpdateIterable()) {
      Scheduler.updateUI(fiber);
    }
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
      console.log(fiber.component.name);
      if (fiber.isUnmounted(iteration)) {
        console.log('unmount', fiber.component.name);
        fiber.unmounted = true;
        fiber.schedulePostRenderCallback(UNMOUNT);
        continue;
      }
      console.log('is mounted');
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
      if (next.isUnmounted(iteration)) {
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

  private static updateUI(fiber: Fiber) {
    const { uiActions, refsToAssign } = fiber;
    for (const action of uiActions!) {
      applyDomAction(action, fiber);
    }
    (fiber as Fiber).uiActions = undefined;
    fiber.slot = fiber.pendingSlot;
    fiber.pendingSlot = undefined;
    if (!refsToAssign) return;
    for (const [ref, element] of refsToAssign) ref.current = element;
    fiber.refsToAssign = undefined;
  }
}
