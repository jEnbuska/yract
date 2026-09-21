import {
  applyUIActions, handlePostCommit,
  renderFiber,
} from "./utils";
import { RenderClock } from "./RenderClock";
import type { Fiber } from "../instances/types";
import { DeferredPopCollection } from "./DeferredPopCollection";

export class DeferredRenderGroup {

  readonly name = "DeferredGroup";

  readonly rendersGroup = new DeferredPopCollection(1);
  readonly prepareCommitGroup = new DeferredPopCollection(-1);
  readonly commitsGroup = new DeferredPopCollection(1);
  readonly postCommitGroup = new DeferredPopCollection(-1);
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
    this.rendersGroup.delete(fiber)
  }

  cancelPrepareCommit(fiber: Fiber) {
    this.prepareCommitGroup.delete(fiber)
  }

  cancelCommit(fiber: Fiber) {
    this.commitsGroup.delete(fiber)
  }

  cancelPostCommit(fiber: Fiber) {
    this.postCommitGroup.delete(fiber)
  }

  ensureUnmount(fiber: Fiber) {
    fiber.unmounted = true;
    this.rendersGroup.delete(fiber)
    this.prepareCommitGroup.delete(fiber)
    this.commitsGroup.delete(fiber)
    this.postCommitGroup.delete(fiber)
  }

  hasRenderQueue = () => {
    return !this.rendersGroup.isEmpty() || !this.prepareCommitGroup.isEmpty()
  }



  async render(): Promise<void> {
    const {renderClock, rendersGroup} = this;
    try {
      while(!rendersGroup.isEmpty()) {
        const fiber = rendersGroup.pop();
        fiber.unmounted ||= fiber?.isUnmounted(renderClock.renderIteration)
        if (fiber.unmounted) continue;
        renderFiber(fiber, renderClock.renderIteration);
        if (!renderClock.shouldThrottle()) continue;
        await renderClock.throttle()
        if (this.shouldExit()) return;
      }
      rendersGroup.clear();
    } finally {
      void rendersGroup.schedulePrune();
    }
    await this.prepareCommit()
  }

  private async prepareCommit(): Promise<void> {
    const {prepareCommitGroup} = this;
    const { renderClock } = this;
    const start = Date.now();
    try {
      while(!prepareCommitGroup.isEmpty()) {
        const fiber = prepareCommitGroup.pop()
        fiber.unmounted ||= fiber.isUnmounted(renderClock.renderIteration)
        if (fiber.unmounted) continue;
        fiber.prepareCommit();
        /* <<<--- Main prepare commit logic
        -- Handle throttle (and maybe exit) --->>> */
        if (!renderClock.shouldThrottle()) continue;
        await renderClock.throttle()
        // Bail on sync work, or on deferred renders queued while we yielded —
        // those have to render before their fibers can be prepared. Not on
        // `hasRenderQueue()`, which counts this queue and so is always true
        // while we are draining it.
        if (this.shouldExit() || !this.rendersGroup.isEmpty()) return;
      }
      prepareCommitGroup.clear();
    } finally {
      void prepareCommitGroup.schedulePrune();
    }
    const dur = Date.now() - start
    if(dur > 2)console.log('PREPARE COMMIT TOOK', Date.now() - start);
  }

  commit() {
    const start = Date.now();
    const { renderClock, commitsGroup } = this;
    const { renderIteration } = renderClock;
    const { queues } = commitsGroup;
    for (let i = 0; i < queues.length; i++) {
      const queue = queues[i]!;
      for (let j = 0; j < queue.length; j++) {
        const fiber = queue[j]!;
        fiber.unmounted ||= fiber.isUnmounted(renderIteration)
        if(fiber.unmounted ||!commitsGroup.has(fiber)) continue;
        applyUIActions(fiber);
      }
    }
    commitsGroup.clear();
    const dur = Date.now() - start
    if(dur > 2) console.log('COMMIT TOOK', Date.now() - start);
  }

  postCommit() {
    const {postCommitGroup} = this;
    handlePostCommit(postCommitGroup, this.renderClock.renderIteration);
  }

}
