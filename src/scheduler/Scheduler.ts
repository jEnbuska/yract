import type { Fiber, FieldSelectionMap, FieldValueMap } from "../instances/types";
import type { AnyElement } from "../render/elements/namespaces";
import { FiberWork } from "./FiberWork";
import { stack } from "../instances/utils";
import { $EFFECT } from "../hooks/constants";
import { effectResolver } from "../hooks/effect";
import { unmountHookCleanup } from "../hooks/process-hook";
import { applyDomAction } from "../ui-actions/utils";

type SchedulerStage = 'IDLE' | 'RENDERING' | 'COMMITTING' | 'POST_COMMIT';
export class Scheduler {
  readonly #selectionMap: FieldSelectionMap;
  readonly #valueMap: FieldValueMap;

  readonly #renderWork = new FiberWork();
  readonly #prepareChunkWork = new FiberWork();
  readonly #commitWork = new FiberWork();
  readonly #postCommitWork = new FiberWork();
  #blocked = false;
  #stage: SchedulerStage = 'IDLE';

  public renderIteration = 0;

  constructor(selectionMap: FieldSelectionMap, valueMap: FieldValueMap) {
    this.#selectionMap = selectionMap;
    this.#valueMap = valueMap;
  }

  /** Method for reconciler to register values given to controlled form element's */
  public registerPropsValue(el: AnyElement, value: boolean | string) {
    this.#valueMap.set(el, value);
  }

  public block = () => {
    this.#blocked = true;
  };

  public unBlock = () => {
    this.#blocked = false;
    if (this.#stage !=='IDLE') return;
    queueMicrotask(this.#run);
  };

  scheduleRender(fiber: Fiber): void {
    this.#renderWork.add(fiber);
    if (!this.#blocked && this.#stage === 'IDLE') queueMicrotask(this.#run);
  }

  schedulePrepareChunk(fiber: Fiber): void {
    this.#prepareChunkWork.add(fiber);
  }

  schedulePostCommit(fiber: Fiber): void {
    this.#postCommitWork.add(fiber);
  }

  scheduleCommit(fiber: Fiber): void {
    this.#commitWork.add(fiber);
  }


  #run = async (): Promise<void> => {
    if (this.#stage) return;
    try {
      this.#postCommit();
      while (!this.#renderWork.isEmpty()) {
        this.renderIteration++;
        this.#render();
        this.#commit();
        this.#postCommit();
      }
    } finally {
      this.#stage = 'IDLE';
    }
  };

  /** Run component renders */
  #render() {
    this.#stage = 'RENDERING';
    const { queues } = this.#renderWork;
    for (let i = 0; i < queues.length; i++) {
      const fibers = queues[i]!;
      for (let j = fibers.length - 1; j >= 0; j--) {
        let fiber = fibers[j]!;
        if ((fiber.unmounted ||= fiber?.isUnmounted())) continue;
        try {
          fiber.render();
        } catch (cause) {
          throw new Error(
            `Failed to render component ${fiber.component.name} at:${"\n"}${stack(fiber)}`,
            { cause },
          );
        }
      }
    }
    this.#renderWork.clear();
  }

  /** Apply ui actions caused by component update, mount & unmount*/
  #commit() {
    this.#stage = 'COMMITTING'
    {
      // Chunks the newly inserted child insert actions to parent to fewer inserts
      const { queues } = this.#prepareChunkWork;
      for (let i = queues.length - 1; i >= 0; i--) {
        const fibers = queues[i]!;
        for (let j = fibers.length - 1; j >= 0; j--) {
          let fiber = fibers[j]!;
          fiber.prepareChunk();
        }
      }
      this.#prepareChunkWork.clear();
    }
    const valueMap = this.#valueMap;
    const selectionMap = this.#selectionMap;
    const { queues } = this.#commitWork;
    for (let i = 0; i < queues.length; i++) {
      const queue = queues[i]!;
      for (let j = 0; j < queue.length; j++) {
        const fiber = queue[j]!;
        const { uiActions } = fiber;
        if (!uiActions) throw new Error("No ui actions to apply");
        for (let i = 0; i < uiActions.length; i++) {
          applyDomAction(uiActions[i]!, valueMap, selectionMap);
        }
        fiber.slot = fiber.pendingSlot;
        fiber.pendingSlot = undefined;
        uiActions.length = 0;
      }
      queue.length = 0;
    }
    this.#commitWork.clear();
  }

  /**
   * - Effect function callbacks for newly mounted components.
   * - Effect cleanup and function callbacks for previously mounted components with deps changed.
   * - Context subscription abortions and effect cleanups for unmounted components
   * Note. During post commit new renders might be scheduled due to setState calls
   * */
  #postCommit() {
    this.#stage = 'POST_COMMIT';
    const { queues } = this.#postCommitWork;
    for (let i = queues.length - 1; i >= 0; i--) {
      const queue = queues[i]!;
      for (let j = 0; j < queue.length; j++) {
        const fiber = queue[j]!;
        fiber.unmounted ||= fiber.isUnmounted();
        if (!fiber.unmounted) {
          if (!fiber.hookStates) continue;
          for (const hookState of fiber.hookStates) {
            if (hookState.type === $EFFECT) effectResolver(hookState);
          }
          continue;
        }
        fiber.hookStates?.forEach(unmountHookCleanup);
        if (!fiber.instances) continue;
        for (const child of fiber.instances.values()) {
          child.unmounted = true;
          this.#postCommitWork.add(child);
        }
      }
    }
    this.#postCommitWork.clear();
  }
}
