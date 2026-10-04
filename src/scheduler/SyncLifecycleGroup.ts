import { applyUIActions, handlePostCommit, renderFiber } from "./utils";
import type { RenderClock } from "./RenderClock";
import type { Fiber, FieldSelectionMap, FieldValueMap } from "../instances/types";
import { SyncFiberGroup } from "./SyncFiberGroup";

/** @internal */
export class SyncLifecycleGroup {
  readonly name = "SyncGroup";

  readonly rendersGroup = new SyncFiberGroup();
  readonly prepareChunkGroup = new SyncFiberGroup();
  readonly commitsGroup = new SyncFiberGroup();
  readonly postCommitGroup = new SyncFiberGroup();
  protected renderClock: RenderClock;

  constructor(renderClock: RenderClock) {
    this.renderClock = renderClock;
  }

  hasRenderQueue = () => {
    return !this.rendersGroup.isEmpty();
  };

  /** --- Scheduling ---**/

  scheduleRender(fiber: Fiber) {
    this.rendersGroup.add(fiber);
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

  cancelCommit(fiber: Fiber) {
    this.commitsGroup.delete(fiber);
  }

  /** --- Scheduling cancellations ---**/

  cancelRender(fiber: Fiber) {
    this.rendersGroup.cancel(fiber);
  }

  /** Called on component render and it detects it's child component unmounted  **/

  ensureUnmount(fiber: Fiber) {
    fiber.unmounted = true;
    this.rendersGroup.delete(fiber);
    this.postCommitGroup.cancel(fiber);
  }

  render() {
    const { rendersGroup, renderClock } = this;
    const { queues } = rendersGroup;
    const { renderIteration } = renderClock;
    for (let i = 0; i < queues.length; i++) {
      const fibers = queues[i]!;
      for (let j = fibers.length - 1; j >= 0; j--) {
        let fiber = fibers[j]!;
        if (!rendersGroup.has(fiber)) continue;
        if ((fiber.unmounted ||= fiber?.isUnmounted(renderIteration))) continue;
        renderFiber(fiber, renderIteration);
      }
    }
    rendersGroup.clear();
  }

  private prepareChunk() {
    const { prepareChunkGroup } = this;
    const { queues } = prepareChunkGroup;
    for (let i = queues.length - 1; i >= 0; i--) {
      const fibers = queues[i]!;
      for (let j = fibers.length - 1; j >= 0; j--) {
        let fiber = fibers[j]!;
        if (!prepareChunkGroup.has(fiber)) continue;
        fiber.prepareChunk();
      }
    }
    prepareChunkGroup.clear();
  }

  commit(valueMap: FieldValueMap, selectionMap: FieldSelectionMap) {
    this.prepareChunk();
    const { commitsGroup } = this;
    const { queues } = commitsGroup;
    for (let i = 0; i < queues.length; i++) {
      const queue = queues[i]!;
      for (let j = 0; j < queue.length; j++) {
        const fiber = queue[j]!;
        if (!commitsGroup.has(fiber)) continue;
        applyUIActions(fiber, valueMap, selectionMap);
      }
      queue.length = 0;
    }
    commitsGroup.clear();
  }

  postCommit() {
    const { postCommitGroup } = this;
    handlePostCommit(postCommitGroup, this.renderClock.renderIteration);
  }
}
