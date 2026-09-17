import type { MapGroup, SetGroup } from "./types";
import { queueMapGroupMember, queueSetGroupMember, shallowDeleteMapMember } from "./utils";
import type { RenderGroup } from "./RenderGroup";
import type { Fiber } from "../../instances/types";
import type { RequiredBy } from "../../general-types";

export class DeferredRenderGroup implements RenderGroup {
  #renderHead = Number.MAX_SAFE_INTEGER;

  readonly #restorable: Array<MapGroup> = [];
  readonly #renders: MapGroup[] = [];
  readonly #postRenderCallbacks: SetGroup[] = [];
  readonly #uiUpdates: MapGroup[] = [];
  readonly #discardParentGroups: Group[] = [];
  readonly name = "DeferredGroup";

  getPostRenderCallbackIterable(): Iterable<Fiber> {
    return undefined;
  }

  getRenderHead(): number {
    return 0;
  }

  *getRenderIterable(): Iterable<Fiber> {
    const renders = this.#renders;
    const restorable = this.#restorable;
    for (const { queue } of restorable) queue.forEach(this.queueRender);
    for (let i = this.getRenderHead(); i < renders.length; i++) {
      const { queue, members } = renders[i]!;
      while (queue.length) {
        let next = queue.pop()!;
        const booked = members.get(next);
        members.delete(next);
        if (!booked) continue;
        yield next;

        if (i !== this.#renderHead) return;
      }
      this.#renderHead++;
    }
  }

  getUiUpdateIterable(): Iterable<RequiredBy<Fiber, "uiActions">> {
    return undefined;
  }

  hasRenderQueue(): boolean {
    return false;
  }

  queueRender = (instance: Fiber) => {
    if (!queueMapGroupMember(this.#renders, instance)) return;
    const { depth } = instance;
    this.#renderHead = Math.min(depth, this.#renderHead ?? Number.MAX_SAFE_INTEGER);
  };

  cancelRender(instance: Fiber) {
    shallowDeleteMapMember(this.#renders, instance);
  }

  scheduleDiscardChildren(instance: Fiber) {
    queueMapGroupMember(this.#discardParentGroups, instance);
  }

  cancelDiscardParents(instance: Fiber) {
    shallowDeleteMapMember(this.#discardParentGroups, instance);
  }

  scheduleUiUpdate(instance: Fiber) {
    queueMapGroupMember(this.#uiUpdates, instance);
  }
  cancelUiUpdate(instance: Fiber) {
    shallowDeleteMapMember(this.#uiUpdates, instance);
  }

  schedulePostRenderCallback(instance: Fiber) {
    queueSetGroupMember(this.#postRenderCallbacks, instance);
  }
}
