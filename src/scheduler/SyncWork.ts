import { FiberWork } from "./FiberWork";
import type { FieldSelectionMap, FieldValueMap } from "../instances/types";
import { applyDomAction } from "../ui-actions/utils";
import { $CONTEXT, $EFFECT } from "../hooks/constants";
import { effectResolver } from "../hooks/effect";
import { stack } from "../instances/utils";

export class SyncWork {
  readonly #selectionMap: FieldSelectionMap;
  readonly #valueMap: FieldValueMap;
  readonly renderWork = new FiberWork();
  readonly prepareChunkWork = new FiberWork();
  readonly commitWork = new FiberWork();
  readonly postCommitWork = new FiberWork();

  constructor(selectionMap: FieldSelectionMap, valueMap: FieldValueMap) {
    this.#valueMap = valueMap;
    this.#selectionMap = selectionMap;
  }

  /** Run component renders */
  render() {
    const { queues } = this.renderWork;
    for (let i = 0; i < queues.length; i++) {
      const fibers = queues[i]!;
      for (let j = fibers.length - 1; j >= 0; j--) {
        let fiber = fibers[j]!;
        if ((fiber.unmounted ||= fiber.isUnmounted())) continue;
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
    this.renderWork.clear();
  }

  /** Apply ui actions caused by component update, mount & unmount*/
  commit() {
    {
      // Chunks the newly inserted child insert actions to parent to fewer inserts
      const { queues } = this.prepareChunkWork;
      for (let i = queues.length - 1; i >= 0; i--) {
        const fibers = queues[i]!;
        for (let j = fibers.length - 1; j >= 0; j--) {
          let fiber = fibers[j]!;
          fiber.prepareChunk();
        }
      }
      this.prepareChunkWork.clear();
    }
    const valueMap = this.#valueMap;
    const selectionMap = this.#selectionMap;
    const { queues } = this.commitWork;
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
    this.commitWork.clear();
  }

  /**
   * - Effect function callbacks for newly mounted components.
   * - Effect cleanup and function callbacks for previously mounted components with deps changed.
   * - Context subscription abortions and effect cleanups for unmounted components
   * Note. During post commit new renders might be scheduled due to setState calls
   * */
  postCommit() {
    const { queues } = this.postCommitWork;
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
        if (fiber.hookStates) {
          for (const hookState of fiber.hookStates) {
            switch (hookState.type) {
              case $CONTEXT:
                hookState.unsubscribe?.();
                break;
              case $EFFECT:
                hookState.controller?.abort();
                break;
            }
          }
        }
        if (!fiber.instances) continue;
        for (const child of fiber.instances.values()) {
          child.unmounted = true;
          this.postCommitWork.add(child);
        }
      }
    }
    this.postCommitWork.clear();
  }
}
