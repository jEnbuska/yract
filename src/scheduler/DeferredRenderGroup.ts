import { applyUIActions, handlePostCommit, renderFiber } from "./utils";
import type { RenderClock } from "./RenderClock";
import type { Fiber, FieldSelectionMap, FieldValueMap } from "../instances/types";
import { DeferredPopCollection } from "./DeferredPopCollection";

export class DeferredRenderGroup {
  readonly name = "DeferredGroup";

  readonly rendersGroup = new DeferredPopCollection(1);
  readonly prepareCommitGroup = new DeferredPopCollection(-1);
  readonly commitsGroup = new DeferredPopCollection(1);
  readonly postCommitGroup = new DeferredPopCollection(-1);
  protected renderClock: RenderClock;

  private readonly shouldExit: () => boolean;

  constructor(renderClock: RenderClock, shouldExit: () => boolean) {
    this.renderClock = renderClock;
    this.shouldExit = shouldExit;
  }

  scheduleRender(fiber: Fiber) {
    if (!this.rendersGroup.add(fiber)) return;
    this.renderClock.renderIteration++;
  }

  schedulePrepareCommit(fiber: Fiber) {
    this.prepareCommitGroup.add(fiber);
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

  cancelPrepareCommit(fiber: Fiber) {
    this.prepareCommitGroup.delete(fiber);
  }

  cancelCommit(fiber: Fiber) {
    this.commitsGroup.delete(fiber);
  }

  cancelPostCommit(fiber: Fiber) {
    this.postCommitGroup.delete(fiber);
  }

  ensureUnmount(fiber: Fiber) {
    this.rendersGroup.delete(fiber);
    this.prepareCommitGroup.delete(fiber);
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
        renderFiber(fiber, renderClock.renderIteration);
        if (!renderClock.shouldThrottle()) continue;
        await renderClock.throttle();
        if (this.shouldExit()) return;
      }
      rendersGroup.clear();
    } finally {
      void rendersGroup.schedulePrune();
    }
  }

  commit(valueMap: FieldValueMap, selectionMap: FieldSelectionMap) {
    this.prepareCommit();
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

  private prepareCommit(): void {
    const { prepareCommitGroup } = this;
    const { renderClock } = this;
    try {
      while (prepareCommitGroup.size) {
        const fiber = prepareCommitGroup.pop();
        fiber.unmounted ||= fiber.isUnmounted(renderClock.renderIteration);
        if (fiber.unmounted) continue;
        fiber.prepareCommit();
      }
      prepareCommitGroup.clear();
    } finally {
      void prepareCommitGroup.schedulePrune();
    }
  }

  postCommit() {
    const { postCommitGroup } = this;
    handlePostCommit(postCommitGroup, this.renderClock.renderIteration);
  }
}
