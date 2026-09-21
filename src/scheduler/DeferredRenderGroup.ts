import {
  applyUIActions, handlePostCommit,
  renderFiber,
  waitForIdle,
} from "./utils";
import { RenderClock } from "./RenderClock";
import type { Fiber } from "../instances/types";
import { DeferredFiberQueuedCollection } from "./DeferredFiberQueuedCollection";
import { effectResolver } from "../hooks/effect";
import { unmountHookCleanup } from "../hooks/process-hook";

export class DeferredRenderGroup {

  readonly name = "DeferredGroup";

  readonly rendersGroup = new DeferredFiberQueuedCollection('ascending');
  readonly prepareCommitGroup = new DeferredFiberQueuedCollection('descending');
  readonly commitsGroup = new DeferredFiberQueuedCollection('ascending');
  readonly postCommitGroup = new DeferredFiberQueuedCollection('descending');
  protected renderClock: RenderClock;

  private readonly shouldExit: () => boolean;

  constructor(
    renderClock: RenderClock,
    shouldExit: () => boolean,
  ) {
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
    this.rendersGroup.delete(fiber)
    this.prepareCommitGroup.delete(fiber)
    this.commitsGroup.delete(fiber)
    this.postCommitGroup.cancel(fiber)
  }

  hasRenderQueue = () => {
    return !this.rendersGroup.isEmpty() || !this.prepareCommitGroup.isEmpty()
  }



  async render(): Promise<void> {
    const {renderClock, rendersGroup} = this;
    const { queues } = rendersGroup;
    try {
      while(rendersGroup.head < queues.length) {
        while(queues[rendersGroup.head]!.length) {
          const queue = queues[rendersGroup.head]!;
          const fiber = queue.pop()!;
          if (!rendersGroup.delete(fiber)) continue;
          if ((fiber.unmounted ||= fiber?.isUnmounted(renderClock.renderIteration))) continue;
          renderFiber(fiber, renderClock.renderIteration);

          if (!renderClock.shouldThrottle()) continue;
          await renderClock.throttle()
          if (this.shouldExit()) return;
        }
        rendersGroup.head++;
      }
    } finally {
      if(rendersGroup.shouldPrune()) {
        waitForIdle().then(rendersGroup.prune);
      }
    }
    await this.prepareCommit()
  }

  private async prepareCommit(): Promise<void> {
    const {prepareCommitGroup} = this;
    const { renderClock } = this;
    const {queues} = prepareCommitGroup;
    const start = Date.now();
    try {
      while(prepareCommitGroup.head >= 0) {
        const queue = queues[prepareCommitGroup.head]!;
        while (queue.length) {
          let fiber = queue.pop()!;
          fiber.unmounted ||= fiber.isUnmounted(renderClock.renderIteration)
          if (!prepareCommitGroup.delete(fiber)) continue;
          if (fiber.unmounted) continue;
          fiber.prepareCommit();
          if (!renderClock.shouldThrottle()) continue;
          await renderClock.throttle()
          // Bail on sync work, or on deferred renders queued while we yielded —
          // those have to render before their fibers can be prepared. Not on
          // `hasRenderQueue()`, which counts this queue and so is always true
          // while we are draining it.
          if (this.shouldExit() || !this.rendersGroup.isEmpty()) return;
        }
        prepareCommitGroup.head--;
      }
      prepareCommitGroup.clear();
    } finally {
      if(prepareCommitGroup.shouldPrune()) {
        void waitForIdle().then(prepareCommitGroup.prune);
      }
    }
    const dur = Date.now() - start
    if(dur > 2)console.log('PREPARE COMMIT TOOK', Date.now() - start);
  }

  commit() {
    const start = Date.now();
    const { renderClock, commitsGroup } = this;
    const { renderIteration } = renderClock;
    const { queues } = commitsGroup;
    try {
      for (let i = 0; i < queues.length; i++) {
        const queue = queues[i]!;
        for (let j = 0; j < queue.length; j++) {
          const fiber = queue[j]!;
          fiber.unmounted ||= fiber.isUnmounted(renderIteration)
          if(fiber.unmounted ||!commitsGroup.has(fiber)) continue;
          applyUIActions(fiber);
        }
        queue.length = 0;
      }
      commitsGroup.clear();
    }finally {
      if(commitsGroup.shouldPrune()) {
        void waitForIdle().then(commitsGroup.prune);
      }
    }
    const dur = Date.now() - start
    if(dur > 2)console.log('COMMIT TOOK', Date.now() - start);
  }

  postCommit() {
    const {postCommitGroup} = this;
    try {
      handlePostCommit(postCommitGroup, this.renderClock.renderIteration);
      postCommitGroup.clear();
    }finally {
      void waitForIdle().then(postCommitGroup.prune)
    }
  }

}
