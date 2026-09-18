import type { SetGroup } from "./types";
import { queueSetGroupMember } from "./utils";
import type { RenderGroup } from "./RenderGroup";
import type { RequiredBy } from "../../general-types";
import { type Fiber } from "../../instances/types";
import { AbstractRenderGroup } from "./AbstractRenderGroup";

export class SyncRenderGroup extends AbstractRenderGroup<SetGroup> implements RenderGroup {
  readonly name = "SyncGroup";

  constructor() {
    super(queueSetGroupMember);
  }

  cancelRender() {
    throw new Error(`"cancelRender" should never be called of ${this.name}`);
  }
  cancelUiUpdate() {
    throw new Error(`"cancelUiUpdate" should never be called of ${this.name}`);
  }

  *getUiUpdateIterable() {
    const uiUpdates = this.uiUpdates;
    for (const { queue, members } of uiUpdates) {
      for (const next of queue) {
        if (!next.uiActions) continue;
        yield next as RequiredBy<Fiber, "uiActions">;
      }
      members.clear();
    }
  }

  *getRenderIterable() {
    const renders = this.renders;
    for (let i = this.getRenderHead(); i < renders.length; i++) {
      const { queue, members } = renders[i]!;
      let next = queue.pop();
      while (next) {
        yield next;
        next = queue.pop();
      }
      members.clear();
    }
    this.renderHead = Number.MAX_SAFE_INTEGER;
  }
}
