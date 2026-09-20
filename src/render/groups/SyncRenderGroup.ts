import type { SetFiberGroup } from "./types";
import { createSetGroup, queueSetGroupMember, shallowDeleteSetMember } from "./utils";
import type { RenderGroup } from "./RenderGroup";
import { AbstractRenderGroup } from "./AbstractRenderGroup";
import { unmountHookCleanup } from "../../hooks/process-hook";
import { effectResolver } from "../../hooks/effect";
import { RenderClock } from "./RenderClock";
import { Fiber } from "../../instances/types";

export class SyncRenderGroup extends AbstractRenderGroup<SetFiberGroup> implements RenderGroup {
  readonly name = "SyncGroup";


  constructor(renderClock: RenderClock) {
    super(renderClock, queueSetGroupMember, shallowDeleteSetMember, createSetGroup);
  }

  queueRender(fiber: Fiber) {
    if (!queueSetGroupMember(this.rendersGroup, fiber)) return;
    const { depth } = fiber;
    this.renderHead = Math.min(depth, this.renderHead);
  }


  render() {
    const {renderIteration} = this.renderClock
    const { members, queues } = this.rendersGroup;
    for (let i = this.renderHead; i < queues.length; i++) {
      const queue = queues[i]!;
      while (queue.length) {
        const fiber = queue.pop()!;
        if (!members.has(fiber)) continue;
        if ((fiber.unmounted ||= fiber?.isUnmounted(renderIteration))) continue;
        this.renderFiber(fiber, renderIteration);
      }
    }
    members.clear();
    this.renderHead = Number.MAX_SAFE_INTEGER;
  }

  preCommit() {
    const { queues, members } = this.preCommitGroup;
    for (let i = this.preCommitHead; i >= 0; i--) {
      const queue = queues[i]!;
      while (queue.length) {
        let fiber = queue.pop()!;
        if (!members.delete(fiber)) continue; // TODO remove this
        fiber.preCommit()
      }
    }
    members.clear()
    this.preCommitHead = -1;
  }

  commit() {
    const { members, queues } = this.commitsGroup;
    for (let i = 0; i < queues.length; i++) {
      const queue = queues[i]!;
      for (let j = 0; j < queue.length; j++) {
        const fiber = queue[j]!;
        if (!members.delete(fiber)) continue; // TODO remove this
        AbstractRenderGroup.applyUIActions(fiber);
      }
      queue.length = 0;
    }
    members.clear();
  }

  postCommit() {
    const { members, queues } = this.postCommitGroup;
    const { renderIteration } = this.renderClock
    for (let i = queues.length - 1; i >= 0; i--) {
      const queue = queues[i]!;
      for (let j = 0; j < queue.length; j++) {
        const fiber = queue[j]!;
        if (!members.has(fiber)) continue;
        fiber.unmounted ||= fiber.isUnmounted(renderIteration);
        if(!fiber.unmounted) {
          fiber.hookStates.forEach(effectResolver);
          fiber.postCommitReasons?.clear();
          continue;
        }
        fiber.hookStates.forEach(unmountHookCleanup);
        if(!fiber.instances) continue;
        for (const child of fiber.instances.values()) {
          child.unmounted = true;
          this.schedulePostCommit(child);
        }
      }
      queue.length = 0;
    }
    members.clear();
  }

}
