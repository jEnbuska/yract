import type { SetGroup } from "./types";
import { queueSetGroupMember, shallowDeleteMapMember, shallowDeleteSetMember } from "./utils";
import type { RenderGroup } from "./RenderGroup";
import type { RequiredBy } from "../../general-types";
import { type Fiber } from "../../instances/types";
import { AbstractRenderGroup } from "./AbstractRenderGroup";

export class SyncRenderGroup extends AbstractRenderGroup<SetGroup> implements RenderGroup {
  readonly name = "SyncGroup";

  constructor() {
    super(queueSetGroupMember, shallowDeleteSetMember);
  }

  *getUiUpdateIterable() {
    const uiUpdates = this.uiUpdates;
    for (const { queue, members } of uiUpdates) {
      for (const fiber of queue) {
        yield fiber as RequiredBy<Fiber, "uiActions">;
      }
      queue.length = 0;
      members.clear();
    }
  }

  *getRenderIterable() {
    const renders = this.renders;
    for (let i = this.getRenderHead(); i < renders.length; i++) {
      const { queue, members } = renders[i]!;
      let fiber = queue.pop();
      while (fiber) {
        yield fiber;
        fiber = queue.pop();
      }
      members.clear();
    }
    this.renderHead = Number.MAX_SAFE_INTEGER;
  }
}
