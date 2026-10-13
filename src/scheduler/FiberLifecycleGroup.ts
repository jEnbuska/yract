import type { Fiber, FieldSelectionMap, FieldValueMap } from "../instances/types";
import { FiberWork } from "./FiberWork";
import { $EFFECT } from "../hooks/constants";
import { effectResolver } from "../hooks/effect";
import { unmountHookCleanup } from "../hooks/process-hook";
import { stack } from "../instances/utils";
import { applyDomAction } from "../ui-actions/utils";

export class FiberLifecycleGroup {
  readonly renderWork = new FiberWork();
  readonly prepareChunkWork = new FiberWork();
  readonly commitWork = new FiberWork();
  readonly postCommitWork = new FiberWork();

  /** --- Scheduling ---**/
  scheduleRender(fiber: Fiber) {
    this.renderWork.add(fiber);
  }
  schedulePrepareChunk(fiber: Fiber) {
    this.prepareChunkWork.add(fiber);
  }
  scheduleCommit(fiber: Fiber) {
    this.commitWork.add(fiber);
  }
  schedulePostCommit(fiber: Fiber) {
    this.postCommitWork.add(fiber);
  }

  /** Run component renders */
  render() {
    const { renderWork } = this;
    const { queues } = renderWork;
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
    renderWork.clear();
  }

  /** Reduce the number of ui actions to be committed by collection the changes to the top most unmounted leafs */
  private prepareChunk() {
    const { prepareChunkWork } = this;
    const { queues } = prepareChunkWork;
    for (let i = queues.length - 1; i >= 0; i--) {
      const fibers = queues[i]!;
      for (let j = fibers.length - 1; j >= 0; j--) {
        let fiber = fibers[j]!;
        fiber.prepareChunk();
      }
    }
    prepareChunkWork.clear();
  }

  /** Apply ui actions caused by component update, mount & unmount*/
  commit(valueMap: FieldValueMap, selectionMap: FieldSelectionMap) {
    this.prepareChunk();
    const { commitWork } = this;
    const { queues } = commitWork;
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
    commitWork.clear();
  }

  /**
   * - Effect function callbacks for newly mounted components.
   * - Effect cleanup and function callbacks for previously mounted components with deps changed.
   * - Context subscription abortions and effect cleanups for unmounted components */
  postCommit() {
    const { postCommitWork } = this;
    const { queues } = postCommitWork;
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
          postCommitWork.add(child);
        }
      }
    }
    postCommitWork.clear();
  }
}
