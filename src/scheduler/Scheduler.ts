import { createResolvable } from "../create-resolvable";
import { stateResolver } from "../hooks/state";
import { DeferredRenderGroup } from "./DeferredRenderGroup";
import { SyncRenderGroup } from "./SyncRenderGroup";
import type { Fiber, FieldSelectionMap, FieldValueMap } from "../instances/types";
import { RenderClock } from "./RenderClock";
import { SyncFiberQueuedCollection } from "./SyncFiberQueuedCollection";
import type { AnyElement } from "../render/elements/namespaces";

export class Scheduler {
  renderIteration = 0;
  private readonly syncGroup: SyncRenderGroup;
  private readonly deferredGroup: DeferredRenderGroup;
  private renderClock = new RenderClock(20);
  private renderTrigger = createResolvable<boolean>();
  private blocked = false;
  private resolved = false;
  private selectionMap: FieldSelectionMap;
  private valueMap: FieldValueMap;

  constructor(selectionMap: FieldSelectionMap, valueMap: FieldValueMap) {
    this.selectionMap = selectionMap;
    this.valueMap = valueMap;
    this.syncGroup = new SyncRenderGroup(this.renderClock);
    this.deferredGroup = new DeferredRenderGroup(this.renderClock, this.syncGroup.hasRenderQueue);
    void this.renderTrigger.promise.then(this.run);
  }

  private getGroup(deferred: boolean) {
    if (deferred) return this.deferredGroup;
    return this.syncGroup;
  }

  private resolveGroups = new SyncFiberQueuedCollection();

  block = () => {
    this.blocked = true;
  };

  unBlock = () => {
    this.blocked = false;
    if (this.resolved) {
      this.renderTrigger.resolve(true);
    }
  };

  scheduleRender(fiber: Fiber): void {
    this.getGroup(fiber.isDeferred()).scheduleRender(fiber);
    if (!this.blocked) {
      return this.renderTrigger.resolve(true);
    }
    this.resolved = true;
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
    this.resolveGroups.add(fiber);
  }

  cancelStateResolve(fiber: Fiber): void {
    this.resolveGroups.cancel(fiber);
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
    const { syncGroup, deferredGroup, renderClock, valueMap, selectionMap } = this;
    while (await this.renderTrigger.promise) {
      while (syncGroup.hasRenderQueue() || deferredGroup.hasRenderQueue()) {
        while (syncGroup.hasRenderQueue()) {
          renderClock.renderIteration++;
          syncGroup.render();
          syncGroup.commit(valueMap, selectionMap);
          syncGroup.postCommit();
        }
        if (!deferredGroup.hasRenderQueue()) break;
        await renderClock.throttle();
        while (!syncGroup.hasRenderQueue() && deferredGroup.hasRenderQueue()) {
          await deferredGroup.render();
        }
      }
      deferredGroup.commit(valueMap, selectionMap);
      const { resolveGroups } = this;
      this.resolveGroups = new SyncFiberQueuedCollection();
      deferredGroup.postCommit();
      const { renderIteration } = this.renderClock;
      resolveGroups.forEach((fiber) => {
        if (fiber.isUnmounted(renderIteration)) return;
        fiber.hookStates?.forEach(stateResolver);
        fiber.resolveReasons?.clear();
      });
      if (syncGroup.hasRenderQueue() || deferredGroup.hasRenderQueue()) {
        continue;
      }
      this.renderTrigger = createResolvable();
    }
  };

  /** Method for reconciler to register values given to controlled form element's */
  public registerPropsValue(el: AnyElement, value: boolean | string) {
    this.valueMap.set(el, value);
  }
}
