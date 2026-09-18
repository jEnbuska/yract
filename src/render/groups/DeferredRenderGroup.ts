import type { MapGroup } from "./types";
import { queueMapGroupMember, shallowDeleteMapMember } from "./utils";
import type { RenderGroup } from "./RenderGroup";
import { type Fiber } from "../../instances/types";
import { AbstractRenderGroup } from "./AbstractRenderGroup";

export class DeferredRenderGroup extends AbstractRenderGroup<MapGroup> implements RenderGroup {
  readonly name = "DeferredGroup";

  constructor() {
    super(queueMapGroupMember, shallowDeleteMapMember);
  }

  beforeRenderStart() {
    const restorable = this.restorable;
    for (const { queue, members } of restorable) {
      while (queue.length) this.queueRender(queue.pop()!);
      members.clear();
    }
  }

  *getRenderIterable() {
    const renders = this.renders;
    for (let i = this.renderHead; i < renders.length; i++) {
      const { queue, members } = renders[i]!;
      while (queue.length) {
        let fiber = queue.pop()!;
        const booked = members.get(fiber);
        if (booked === undefined) continue;
        members.delete(fiber);
        if (!booked) continue;
        yield fiber;
        if (i !== this.renderHead) return;
      }
      this.renderHead++;
    }
    this.renderHead = Number.MAX_SAFE_INTEGER;
  }

  commit(iteration: number) {
    const commits = this.commits;
    for (const { queue, members } of commits) {
      for (const fiber of queue) {
        if (fiber.isUnmounted(iteration)) {
          fiber.unmounted = true;
          continue;
        }
        if (!members.get(fiber)) continue;
        AbstractRenderGroup.applyUIActions(fiber);
      }
      queue.length = 0;
      members.clear();
    }
  }
}
