import { createResolvable } from "../create-resolvable";
import { effectResolver } from "../hooks/effect";
import { stateResolver } from "../hooks/state";
import { insertBefore, moveSlot, removeSlotNodes } from "../reconciler/dom-updates";
import { updateElementProps } from "./element-props";
import { DeferredRenderGroup } from "./groups/DeferredRenderGroup";
import {
  queueSetGroupMember,
  shallowDeleteMapMember,
  shallowDeleteSetMember,
} from "./groups/utils";
import type { MapGroup, SetGroup } from "./groups/types";
import { SyncRenderGroup } from "./groups/SyncRenderGroup";
import type { RenderGroup } from "./groups/RenderGroup";
import type { UIAction } from "../reconciler/actions";
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

  private readonly syncGroup: RenderGroup = new SyncRenderGroup();
  private readonly deferredGroup: RenderGroup = new DeferredRenderGroup();
  private throttler = new DeferredRenderThrottler(20);
  private getGroup(deferred: boolean) {
    if (deferred) return this.deferredGroup;
    return this.syncGroup;
  }
  private readonly restorableDeferredQueues: Array<MapGroup> = [];

  private resolveGroups: Array<SetGroup> = [];

  private renderTrigger = createResolvable();

  constructor() {
    void this.renderTrigger.promise.then(this.run);
  }

  queueRender(instance: Fiber, deferred = instance.isDeferred()): void {
    this.getGroup(deferred).queueRender(instance);
    if (deferred) shallowDeleteMapMember(this.restorableDeferredQueues, instance);
    this.renderTrigger.resolve();
  }

  cancelRender(instance: Fiber, deferred = instance.isDeferred()): void {
    this.getGroup(deferred).cancelRender?.(instance);
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
    this.getGroup(deferred).cancelUiUpdate?.(instance);
  }

  private run = async (): Promise<void> => {
    const { throttler } = this;
    throttler.onRenderStart();
    const { syncGroup, deferredGroup } = this;
    while (true) {
      while (syncGroup.hasRenderQueue() || deferredGroup.hasRenderQueue()) {
        this.renderIteration++;
        this.handleSyncGroupRender();
        if (throttler.shouldThrottle()) {
          await throttler.throttle();
          if (syncGroup.hasRenderQueue()) continue;
        }
        await this.handleDeferredGroupRender();
      }
      for (const fiber of deferredGroup.getUiUpdateIterable()) {
        if (fiber.isUnmounted(this.renderIteration)) continue;
        for (const action of fiber.uiActions) {
          Scheduler.applyUIAction(action, fiber);
        }
      }
      const { resolveGroups } = this;
      this.resolveGroups = [];
      this.runPostRenderCallbacks(deferredGroup);
      this.processStates(resolveGroups);
      if (syncGroup.hasRenderQueue() || deferredGroup.hasRenderQueue()) {
        return this.renderTrigger.promise.then(this.run);
      }
      this.renderTrigger = createResolvable();
      await this.renderTrigger.promise;
    }
  };

  private handleSyncGroupRender(): void {
    const { syncGroup } = this;
    const iteration = this.renderIteration;
    for (const fiber of syncGroup.getRenderIterable(iteration)) {
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
    for (const fiber of deferredGroup.getRenderIterable(iteration)) {
      if (fiber.isUnmounted(iteration)) {
        fiber.unmounted = true;
        fiber.schedulePostRenderCallback(UNMOUNT);
        continue;
      }
      fiber.cancelPostRenderCallback(UNMOUNT);
      this.renderFiber(fiber);

      if (!this.throttler.shouldThrottle()) continue;
      await this.throttler.throttle();
      if (syncGroup.hasRenderQueue()) break;
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

  private static applyUIAction(action: UIAction, fiber: Fiber) {
    switch (action.type) {
      case "MOVE": {
        moveSlot(action.slot, action.parentDom, action.before);
        break;
      }
      case "REMOVE":
        removeSlotNodes(action.slot);
        break;
      case "INSERT":
        insertBefore(action.parentDom, action.node, action.before);
        break;
      case "TEXT": {
        const { slot } = action;
        slot.headNode.textContent = slot.text;
        break;
      }
      case "UPDATE": {
        const { slot, patch } = action;
        updateElementProps(slot.headNode, patch, fiber.rctx.delegationRoot);
        break;
      }
    }
  }

  private static updateUI(fiber: Fiber) {
    const { uiActions, refsToAssign } = fiber;
    for (const action of uiActions!) {
      Scheduler.applyUIAction(action, fiber);
    }
    (fiber as Fiber).uiActions = undefined;
    fiber.slot = fiber.pendingSlot;
    fiber.pendingSlot = undefined;
    if (!refsToAssign) return;
    for (const [ref, element] of refsToAssign) ref.current = element;
    fiber.refsToAssign = undefined;
  }

  private processStates(groups: SetGroup[]) {
    const iteration = this.renderIteration;
    for (const { members, queue } of groups) {
      for (const next of queue) {
        if (!members.has(next)) continue;
        if (next.isUnmounted(iteration)) continue;
        next.hookStates?.forEach(stateResolver);
        next.resolveReasons?.clear();
      }
    }
  }
}
