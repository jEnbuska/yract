import type { CollectionGroup, SetGroup } from "./types";
import { queueSetGroupMember } from "./utils";
import { type Fiber } from "../../instances/types";

export abstract class AbstractRenderGroup<TGroup extends CollectionGroup> {
  protected readonly restorable: TGroup[] = [];
  protected readonly renders: TGroup[] = [];
  protected readonly commits: TGroup[] = [];
  protected readonly postRenderCallbacks: SetGroup[] = [];
  protected renderHead = Number.MAX_SAFE_INTEGER;
  #addFiber: (groups: TGroup[], fiber: Fiber) => boolean;
  #removeFiber: (groups: TGroup[], fiber: Fiber) => void;

  constructor(
    addFiber: (groups: TGroup[], fiber: Fiber) => boolean,
    removeFiber: (groups: TGroup[], fiber: Fiber) => void,
  ) {
    this.schedulePostRenderCallback = this.schedulePostRenderCallback.bind(this);
    this.#addFiber = addFiber;
    this.#removeFiber = removeFiber;
  }

  /** The tail of every commit: hand the pending slot over and drain the refs. */
  commitFiber(fiber: Fiber) {
    const { refsToAssign } = fiber;
    // The prepared-node cache belongs to the render that filled it: once those
    // nodes are in the document, reusing them would hand a live node back.

    fiber.slot = fiber.pendingSlot;
    fiber.preparedSlots = undefined;
    fiber.pendingSlot = undefined;
    if (!refsToAssign) return;
    for (const [ref, element] of refsToAssign) ref.current = element;
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

  cancelRender(fiber: Fiber) {
    this.#removeFiber(this.renders, fiber);
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
        if (fiber.isUnmounted(renderIteration) && fiber.instances) {
          for (const child of fiber.instances.values()) {
            child.unmounted = true;
            this.schedulePostRenderCallback(child);
          }
        }
        yield fiber;
      }
      members.clear();
    }
  }

  scheduleCommit(fiber: Fiber) {
    this.#addFiber(this.commits, fiber);
  }
}
