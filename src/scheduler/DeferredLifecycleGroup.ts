import { applyUIActions, handlePostCommit, renderFiber } from "./utils";
import type { RenderClock } from "./RenderClock";
import type { Fiber, FieldSelectionMap, FieldValueMap } from "../instances/types";
import { DeferredFiberGroup } from "./DeferredFiberGroup";

/** @internal */
export class DeferredLifecycleGroup {
  readonly name = "DeferredGroup";

  readonly rendersGroup = new DeferredFiberGroup(1);
  readonly prepareChunkGroup = new DeferredFiberGroup(-1);
  readonly commitsGroup = new DeferredFiberGroup(1);
  readonly postCommitGroup = new DeferredFiberGroup(-1);
  protected renderClock: RenderClock;

  constructor(renderClock: RenderClock) {
    this.renderClock = renderClock;
  }

  scheduleRender(fiber: Fiber) {
    if (!this.rendersGroup.add(fiber)) return;
    this.renderClock.renderIteration++;
  }

  schedulePrepareChunk(fiber: Fiber) {
    this.prepareChunkGroup.add(fiber);
  }

  scheduleCommit(fiber: Fiber) {
    this.commitsGroup.add(fiber);
  }

  schedulePostCommit(fiber: Fiber) {
    this.postCommitGroup.add(fiber);
  }

  cancelRender(fiber: Fiber) {
    this.rendersGroup.delete(fiber);
  }

  cancelCommit(fiber: Fiber) {
    this.commitsGroup.delete(fiber);
  }

  ensureUnmount(fiber: Fiber) {
    this.rendersGroup.delete(fiber);
    this.prepareChunkGroup.delete(fiber);
    this.commitsGroup.delete(fiber);
    this.postCommitGroup.add(fiber);
  }

  hasRenderQueue = () => {
    return Boolean(this.rendersGroup.size);
  };

  async render(): Promise<void> {
    const { renderClock, rendersGroup } = this;
    try {
      while (rendersGroup.size) {
        const fiber = rendersGroup.pop();
        fiber.unmounted ||= fiber?.isUnmounted(renderClock.renderIteration);
        if (fiber.unmounted) continue;
        renderFiber(fiber, renderClock.renderIteration, true);
        await renderClock.throttle();
      }
      rendersGroup.clear();
    } finally {
      void rendersGroup.schedulePrune();
    }
  }

  commit(valueMap: FieldValueMap, selectionMap: FieldSelectionMap) {
    this.prepareChunk();
    const { renderClock, commitsGroup } = this;
    const { renderIteration } = renderClock;
    const { queues } = commitsGroup;
    for (let i = 0; i < queues.length; i++) {
      const queue = queues[i]!;
      for (let j = 0; j < queue.length; j++) {
        const fiber = queue[j]!;
        fiber.unmounted ||= fiber.isUnmounted(renderIteration);
        if (fiber.unmounted || !commitsGroup.has(fiber)) continue;
        applyUIActions(fiber, valueMap, selectionMap);
      }
    }
    commitsGroup.clear();
  }

  private prepareChunk(): void {
    const { prepareChunkGroup } = this;
    const { renderClock } = this;
    try {
      while (prepareChunkGroup.size) {
        const fiber = prepareChunkGroup.pop();
        fiber.unmounted ||= fiber.isUnmounted(renderClock.renderIteration);
        if (fiber.unmounted) continue;
        fiber.prepareChunk();
      }
      prepareChunkGroup.clear();
    } finally {
      void prepareChunkGroup.schedulePrune();
    }
  }

  postCommit() {
    const { postCommitGroup } = this;
    handlePostCommit(postCommitGroup, this.renderClock.renderIteration);
  }
}
