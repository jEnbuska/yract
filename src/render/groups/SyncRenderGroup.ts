import type { SetGroup } from "./types";
import { queueSetGroupMember } from "./utils";
import type { RenderGroup } from "./RenderGroup";
import type { RequiredBy } from "../../general-types";
import { type Fiber } from "../../instances/types";

export class SyncRenderGroup implements RenderGroup {
  #renderHead = Number.MAX_SAFE_INTEGER;
  readonly #postRenderCallbacks: SetGroup[] = [];
  readonly #uiUpdates: SetGroup[] = [];
  readonly #renders: SetGroup[] = [];
  readonly name = "SyncGroup";

  constructor() {
    this.schedulePostRenderCallback = this.schedulePostRenderCallback.bind(this);
  }

  queueRender(fiber: Fiber) {
    if (!queueSetGroupMember(this.#renders, fiber)) return;
    const { depth } = fiber;
    this.#renderHead = Math.min(depth, this.#renderHead);
  }

  hasRenderQueue() {
    return this.#renderHead !== Number.MAX_SAFE_INTEGER;
  }

  getRenderHead() {
    return this.#renderHead ?? Number.MAX_SAFE_INTEGER;
  }

  scheduleUiUpdate(fiber: Fiber) {
    queueSetGroupMember(this.#uiUpdates, fiber);
  }

  schedulePostRenderCallback(fiber: Fiber) {
    queueSetGroupMember(this.#postRenderCallbacks, fiber);
  }

  *getPostRenderCallbackIterable(renderIteration: number) {
    const effects = this.#postRenderCallbacks;
    for (let i = effects.length - 1; i >= 0; i--) {
      const { queue, members } = effects[i]!;
      for (const fiber of queue) {
        yield fiber;
        if (fiber.isUnmounted(renderIteration) && fiber.instances) {
          for (const child of fiber.instances.values()) {
            fiber.unmounted = true;
            this.schedulePostRenderCallback(child);
          }
        }
      }
      members.clear();
    }
  }

  *getUiUpdateIterable(): Iterable<RequiredBy<Fiber, "uiActions">> {
    const uiUpdates = this.#uiUpdates;
    for (const { queue, members } of uiUpdates) {
      for (const next of queue) {
        if (!next.uiActions) continue;
        yield next as RequiredBy<Fiber, "uiActions">;
      }
      members.clear();
    }
  }

  *getRenderIterable(): Iterable<Fiber> {
    const renders = this.#renders;
    for (let i = this.getRenderHead(); i < renders.length; i++) {
      const { queue, members } = renders[i]!;
      let next = queue.pop();
      while (next) {
        yield next;
        next = queue.pop();
      }
      members.clear();
    }
    this.#renderHead = Number.MAX_SAFE_INTEGER;
  }
}
