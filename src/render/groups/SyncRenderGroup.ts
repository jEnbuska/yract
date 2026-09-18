import type { SetGroup } from "./types";
import { queueSetGroupMember, shallowDeleteSetMember } from "./utils";
import type { RenderGroup } from "./RenderGroup";
import { type Fiber } from "../../instances/types";
import { AbstractRenderGroup } from "./AbstractRenderGroup";

export class SyncRenderGroup extends AbstractRenderGroup<SetGroup> implements RenderGroup {
  readonly name = "SyncGroup";

  constructor() {
    super(queueSetGroupMember, shallowDeleteSetMember);
  }

  forEachCommit(_iteration: number, visit: (fiber: Fiber) => void) {
    const commits = this.commits;
    for (const { queue, members } of commits) {
      for (const fiber of queue) {
        visit(fiber);
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
