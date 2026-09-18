import type { MapGroup } from "./types";
import { queueMapGroupMember, shallowDeleteMapMember } from "./utils";
import type { RenderGroup } from "./RenderGroup";
import type { Fiber } from "../../instances/types";
import type { RequiredBy } from "../../general-types";
import { AbstractRenderGroup } from "./AbstractRenderGroup";

export class DeferredRenderGroup extends AbstractRenderGroup<MapGroup> implements RenderGroup {
  readonly name = "DeferredGroup";

  constructor() {
    super(queueMapGroupMember);
  }

  cancelRender(instance: Fiber) {
    shallowDeleteMapMember(this.renders, instance);
  }

  cancelUiUpdate(instance: Fiber) {
    shallowDeleteMapMember(this.uiUpdates, instance);
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
        let next = queue.pop()!;
        const booked = members.get(next);
        members.delete(next);
        if (!booked) continue;
        yield next;
        if (i !== this.renderHead) return;
      }
      this.renderHead++;
    }
    this.renderHead = Number.MAX_SAFE_INTEGER;
  }

  *getUiUpdateIterable() {
    const uiUpdates = this.uiUpdates;
    for (const { queue, members } of uiUpdates) {
      for (const next of queue) {
        if (!next.uiActions) continue;
        if (!members.has(next)) continue;
        yield next as RequiredBy<Fiber, "uiActions">;
      }
      members.clear();
    }
  }
}
