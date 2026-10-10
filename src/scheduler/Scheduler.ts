import { stateResolver } from "../hooks/state";
import { DeferredLifecycleGroup } from "./DeferredLifecycleGroup";
import { SyncLifecycleGroup } from "./SyncLifecycleGroup";
import type { Fiber, FieldSelectionMap, FieldValueMap } from "../instances/types";
import { RenderClock } from "./RenderClock";
import { SyncFiberGroup } from "./SyncFiberGroup";
import type { AnyElement } from "../render/elements/namespaces";
import { $DEFERRED, $STATE } from "../hooks/constants";
import { deferredResolver } from "../hooks/defer";

/** @internal */
export class Scheduler {
  renderIteration = 0;
  private readonly syncGroup: SyncLifecycleGroup;
  private readonly deferredGroup: DeferredLifecycleGroup;
  private readonly renderClock: RenderClock;

  private blocked = false;
  private selectionMap: FieldSelectionMap;
  private valueMap: FieldValueMap;

  constructor(selectionMap: FieldSelectionMap, valueMap: FieldValueMap) {
    this.selectionMap = selectionMap;
    this.valueMap = valueMap;
    this.renderClock = new RenderClock(20);
    this.syncGroup = new SyncLifecycleGroup(this.renderClock);
    this.deferredGroup = new DeferredLifecycleGroup(this.renderClock);
  }

  private getGroup(deferred: boolean) {
    if (deferred) return this.deferredGroup;
    return this.syncGroup;
  }

  private stateResolveGroups = new SyncFiberGroup();

  block = () => {
    this.blocked = true;
  };

  unBlock = () => {
    this.blocked = false;
    this.runSync();
  };

  scheduleRender(fiber: Fiber, deferred = fiber.deferred): void {
    this.getGroup(deferred).scheduleRender(fiber);
    if (this.blocked) return;
    this.runSync();
  }

  cancelRender(fiber: Fiber, deferred: boolean): void {
    this.getGroup(deferred).cancelRender(fiber);
  }

  schedulePostCommit(fiber: Fiber, deferred = fiber.deferred): void {
    this.getGroup(deferred).schedulePostCommit(fiber);
  }

  scheduleStateResolve(fiber: Fiber): void {
    this.stateResolveGroups.add(fiber);
  }

  schedulePrepareChunk(fiber: Fiber, deferred: boolean): void {
    this.getGroup(deferred).schedulePrepareChunk(fiber);
  }

  ensureUnmount(fiber: Fiber, deferred: boolean): void {
    this.getGroup(deferred).ensureUnmount(fiber);
  }

  scheduleCommit(fiber: Fiber, deferred: boolean): void {
    this.getGroup(deferred).scheduleCommit(fiber);
  }

  cancelCommit(fiber: Fiber, deferred: boolean): void {
    this.getGroup(deferred).cancelCommit(fiber);
  }

  private syncRunning = false;
  private runSync = (): void => {
    if (this.syncRunning) return;
    this.renderClock.reset();
    this.syncRunning = true;
    const { syncGroup, renderClock, valueMap, selectionMap } = this;
    while (syncGroup.hasRenderQueue()) {
      renderClock.renderIteration++;
      syncGroup.render();
      syncGroup.commit(valueMap, selectionMap);
      syncGroup.postCommit();
    }
    this.syncRunning = false;
    void this.runDeferred();
  };

  private deferredRunning = false;
  private runDeferred = async (): Promise<void> => {
    if (this.deferredRunning) return;
    this.deferredRunning = true;
    const { deferredGroup, valueMap, selectionMap } = this;
    while (deferredGroup.hasRenderQueue()) {
      await deferredGroup.render();
    }
    deferredGroup.commit(valueMap, selectionMap);
    const { stateResolveGroups } = this;
    this.stateResolveGroups = new SyncFiberGroup();
    deferredGroup.postCommit();
    this.resolveStates(stateResolveGroups);
    this.deferredRunning = false;
  };

  private resolveStates(resolveGroups: SyncFiberGroup) {
    const { renderIteration } = this.renderClock;
    for (const fiber of resolveGroups) {
      if (fiber.isUnmounted(renderIteration)) continue;
      const { hookStates } = fiber;
      if (!hookStates) continue;
      for (let i = 0; i < hookStates.length; i++) {
        const hookState = hookStates[i]!;
        switch (hookState.type) {
          case $STATE:
            stateResolver(hookState);
            break;
          case $DEFERRED:
            deferredResolver(hookState);
            break;
        }
      }
    }
  }

  /** Method for reconciler to register values given to controlled form element's */
  public registerPropsValue(el: AnyElement, value: boolean | string) {
    this.valueMap.set(el, value);
  }
}
