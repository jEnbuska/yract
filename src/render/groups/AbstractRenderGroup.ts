import type { CollectionGroup, SetGroup } from "./types";
import { queueSetGroupMember, shallowDeleteMapMember } from "./utils";
import { type Fiber } from "../../instances/types";

export abstract class AbstractRenderGroup<TGroup extends CollectionGroup> {
  protected readonly restorable: TGroup[] = [];
  protected readonly renders: TGroup[] = [];
  protected readonly uiUpdates: TGroup[] = [];
  protected readonly postRenderCallbacks: SetGroup[] = [];
  protected renderHead = Number.MAX_SAFE_INTEGER;
  #addFiber: (groups: TGroup[], fiber: Fiber) => boolean;
  #removeFiber: (groups: TGroup[], fiber: Fiber) => void;

  constructor(addFiber: (groups: TGroup[], fiber: Fiber) => boolean, removeFiber: (groups: TGroup[], fiber: Fiber) => void) {
    this.schedulePostRenderCallback = this.schedulePostRenderCallback.bind(this);
    this.#addFiber = addFiber;
    this.#removeFiber = removeFiber;
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

  cancelRender(instance: Fiber) {
    this.#removeFiber(this.renders, instance);
  }

  cancelUiUpdate(instance: Fiber) {
    this.#removeFiber(this.uiUpdates, instance);
  }

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
            child.unmounted = true;
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
