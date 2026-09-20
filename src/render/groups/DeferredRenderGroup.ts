import type { MapFiberGroup } from "./types";
import { createMapGroup, queueMapGroupMember, shallowDeleteMapMember } from "./utils";
import type { RenderGroup } from "./RenderGroup";
import { AbstractRenderGroup } from "./AbstractRenderGroup";
import { RenderClock } from "./RenderClock";
import type { Fiber } from "../../instances/types";

export class DeferredRenderGroup extends AbstractRenderGroup<MapFiberGroup> implements RenderGroup {
  readonly name = "DeferredGroup";
  shouldExit: () => boolean;
  constructor(
    renderClock: RenderClock,
    shouldExit: () => boolean,
  ) {
    super(renderClock, queueMapGroupMember, shallowDeleteMapMember, createMapGroup);
    this.shouldExit = shouldExit;
  }

  queueRender(fiber: Fiber) {
    if (!queueMapGroupMember(this.rendersGroup, fiber)) return;
    const { depth } = fiber;
    if(depth >= this.renderHead) return;
    this.renderHead = depth;
    this.renderClock.renderIteration++;
  }

  async render(): Promise<boolean> {
    const {renderClock} = this;
    const { queues, members } = this.rendersGroup;
    while(this.renderHead < queues.length) {
      while(queues[this.renderHead]!.length) {
        const queue = queues[this.renderHead]!;
        const fiber = queue.pop()!;
        const booked = members.get(fiber);
        if (booked === undefined) continue;
        members.delete(fiber);
        if (!booked) continue;
        if ((fiber.unmounted ||= fiber?.isUnmounted(renderClock.renderIteration))) continue;
        this.renderFiber(fiber, renderClock.renderIteration);
        if (!renderClock.shouldThrottle()) continue;
        await renderClock.throttle()
        if (this.shouldExit()) return true;
      }
      this.renderHead++;
    }
    members.clear();
    this.renderHead = Number.MAX_SAFE_INTEGER;
    return false;
  }

  async preCommit(): Promise<void> {
    const { queues, members } = this.preCommitGroup;
    const { renderClock } = this;
    while(this.preCommitHead >= 0) {
      const queue = queues[this.preCommitHead]!;
      while (queue.length) {
        let fiber = queue.pop()!;
        if (!members.delete(fiber)) continue;
        if (fiber.unmounted ||= fiber.isUnmounted(renderClock.renderIteration)) continue;
        fiber.preCommit();
        if (!this.renderClock.shouldThrottle()) continue;
        await this.renderClock.throttle()
        if (this.shouldExit()) return;
        if (this.hasRenderQueue()) return;
      }
      this.preCommitHead--;
    }
  }

  commit() {
    const { renderIteration } = this.renderClock;
    const { members, queues } = this.commitsGroup;
    for (let i = 0; i < queues.length; i++) {
      const queue = queues[i]!;
      for (let j = 0; j < queue.length; j++) {
        const fiber = queue[j]!;
        if ((fiber.unmounted ||= fiber.isUnmounted(renderIteration))) continue;
        const booked = members.get(fiber);
        members.delete(fiber);
        if (!booked) continue;
        AbstractRenderGroup.applyUIActions(fiber);
      }
      queue.length = 0;
    }
    members.clear();
  }
}
