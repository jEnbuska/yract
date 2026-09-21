
import { applyUIActions, handlePostCommit, renderFiber } from "./utils";
import { unmountHookCleanup } from "../hooks/process-hook";
import { effectResolver } from "../hooks/effect";
import { RenderClock } from "./RenderClock";
import { Fiber } from "../instances/types";
import { SyncFiberQueuedCollection } from "./SyncFiberQueuedCollection";
import { UNMOUNT } from "../reasons";

export class SyncRenderGroup  {
  readonly name = "SyncGroup";

  readonly rendersGroup = new SyncFiberQueuedCollection();
  readonly prepareCommitGroup = new SyncFiberQueuedCollection();
  readonly commitsGroup = new SyncFiberQueuedCollection();
  readonly postCommitGroup = new SyncFiberQueuedCollection();
  protected renderClock: RenderClock;

  constructor(renderClock: RenderClock) {
    this.renderClock = renderClock;
  }

  hasRenderQueue = () => {
    return !this.rendersGroup.isEmpty()
  }

  scheduleRender(fiber: Fiber) {
    this.rendersGroup.add(fiber)
  }
  schedulePrepareCommit(fiber: Fiber) {
    this.prepareCommitGroup.add(fiber)
  }
  scheduleCommit(fiber: Fiber) {
    this.commitsGroup.add(fiber)
  }
  schedulePostCommit(fiber: Fiber) {
    this.postCommitGroup.add(fiber)
  }


  cancelRender(fiber: Fiber) {
    this.rendersGroup.cancel(fiber)
  }
  cancelPrepareCommit(fiber: Fiber) {
    this.prepareCommitGroup.cancel(fiber)
  }
  cancelCommit(fiber: Fiber) {
    this.commitsGroup.cancel(fiber)
  }
  cancelPostCommit(fiber: Fiber) {
    this.postCommitGroup.cancel(fiber)
  }

  ensureUnmount(fiber: Fiber) {
    fiber.unmounted = true;
    this.rendersGroup.delete(fiber);
    this.postCommitGroup.cancel(fiber);
  }



  render() {
    const {rendersGroup, renderClock} = this
    const { queues } = rendersGroup;
    const {renderIteration} = renderClock
    for (let i = 0; i < queues.length; i++) {
      const fibers = queues[i]!;
      for(let j = fibers.length - 1; j >= 0; j--) {
        let fiber = fibers[j]!;
        if (!rendersGroup.has(fiber)) continue;
        if ((fiber.unmounted ||= fiber?.isUnmounted(renderIteration))) continue;
        renderFiber(fiber, renderIteration);
      }
    }
    rendersGroup.prune();
  }

  private prepareCommit() {
    const {prepareCommitGroup} = this
    const { queues } = prepareCommitGroup;
    for (let i = queues.length - 1; i >= 0; i--) {
      const fibers = queues[i]!;
      for(let j = fibers.length - 1; j >= 0; j--) {
        let fiber = fibers[j]!;
        if (!prepareCommitGroup.has(fiber)) continue;
        fiber.prepareCommit()
      }
    }
    prepareCommitGroup.prune();
  }

  commit() {
    this.prepareCommit();
    const {commitsGroup} = this
    const { queues } = commitsGroup;
    for (let i = 0; i < queues.length; i++) {
      const queue = queues[i]!;
      for (let j = 0; j < queue.length; j++) {
        const fiber = queue[j]!;
        if (!commitsGroup.has(fiber)) continue;
        applyUIActions(fiber);
      }
      queue.length = 0;
    }
    commitsGroup.prune();
  }

  postCommit() {
    const {postCommitGroup} = this;
    handlePostCommit(postCommitGroup, this.renderClock.renderIteration)
    postCommitGroup.prune();
  }

}
