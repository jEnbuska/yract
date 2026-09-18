import type { CollectionGroup, SetGroup } from "./types";
import { queueSetGroupMember } from "./utils";
import { type Fiber } from "../../instances/types";

export abstract class AbstractRenderGroup<TGroup extends CollectionGroup> {
  protected readonly restorable: TGroup[] = [];
  protected readonly renders: TGroup[] = [];
  protected readonly uiUpdates: TGroup[] = [];
  protected readonly postRenderCallbacks: SetGroup[] = [];
  protected renderHead = Number.MAX_SAFE_INTEGER;
  #addFiber: (groups: TGroup[], fiber: Fiber) => boolean;

  constructor(addFiber: (groups: TGroup[], fiber: Fiber) => boolean) {
    this.schedulePostRenderCallback = this.schedulePostRenderCallback.bind(this);
    this.#addFiber = addFiber;
  }

  hasRenderQueue() {
    return this.renderHead !== Number.MAX_SAFE_INTEGER;
  }

  getRenderHead(): number {
    return this.renderHead;
  }

  queueRender(fiber: Fiber) {
    if (!this.#addFiber(this.renders, fiber)) return;
    const { depth } = fiber;
    this.renderHead = Math.min(depth, this.renderHead);
  }

  abstract cancelRender(fiber: Fiber): void;

  abstract cancelUiUpdate(fiber: Fiber): void;

  schedulePostRenderCallback(fiber: Fiber) {
    queueSetGroupMember(this.postRenderCallbacks, fiber);
  }

  *getPostRenderCallbackIterable(renderIteration: number) {
    const effects = this.postRenderCallbacks;
    for (let i = effects.length - 1; i >= 0; i--) {
      const { queue, members } = effects[i]!;
      while (queue.length) {
        const fiber = queue.pop()!;
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

  scheduleUiUpdate(fiber: Fiber) {
    this.#addFiber(this.uiUpdates, fiber);
  }
}
