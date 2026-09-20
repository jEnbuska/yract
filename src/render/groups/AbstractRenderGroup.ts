import type { CollectionGroup, SetGroup } from "./types";
import { queueSetGroupMember } from "./utils";
import { type Fiber } from "../../instances/types";
import { applyDomAction } from "../../ui-actions/utils";

export abstract class AbstractRenderGroup<TGroup extends CollectionGroup> {
  protected readonly restorable: TGroup[] = [];
  protected readonly renders: TGroup[] = [];
  protected readonly commits: TGroup[] = [];
  protected readonly postRenderCallbacks: SetGroup[] = [];
  protected readonly preCommit: SetGroup[] = [];
  protected renderHead = Number.MAX_SAFE_INTEGER;
  protected preCommitHead = -1;
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

  hasRenderQueue() {
    return this.renderHead !== Number.MAX_SAFE_INTEGER;
  }

  queueRender(fiber: Fiber) {
    if (!this.#addFiber(this.renders, fiber)) return;
    const { depth } = fiber;
    this.renderHead = Math.min(depth, this.renderHead);
  }

  queuePreCommit(fiber: Fiber) {
    queueSetGroupMember(this.preCommit, fiber)
    const { depth } = fiber;
    this.preCommitHead = Math.max(depth, this.preCommitHead);
  }

  hasPrecommitQueue() {
    return this.preCommitHead !== -1;
  }

  *getPrecommitIterable() {
    const preCommit = this.preCommit;
    for (let i = this.preCommitHead; i >= 0; i--) {
      const { queue, members } = preCommit[i]!;
      while (queue.length) {
        let fiber = queue.pop()!;
        if (!members.delete(fiber)) continue;
        yield fiber;
      }
      this.preCommitHead--;
    }
    this.preCommitHead = -1;
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
        fiber.unmounted = fiber.isUnmounted(renderIteration);
        if (fiber.instances && fiber.unmounted) {
          for (const child of fiber.instances.values()) {
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

  protected static applyUIActions(fiber: Fiber) {
    const { uiActions } = fiber;
    const { delegationRoot } = fiber.rctx;
    for (let i = 0; i < uiActions!.length; i++) {
      applyDomAction(uiActions![i]!, delegationRoot);
    }
    const { refsToAssign } = fiber;
    // The prepared-node cache belongs to the render that filled it: once those
    // nodes are in the document, reusing them would hand a live node back.

    fiber.slot = fiber.pendingSlot;
    fiber.preparedSlots = undefined;
    fiber.pendingSlot = undefined;
    fiber.initialMounted = true;
    if (refsToAssign) for (const [ref, element] of refsToAssign) ref.current = element;

  }
}
