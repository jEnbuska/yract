import type { FiberGroup, SetFiberGroup } from "./types";
import { createSetGroup, queueSetGroupMember } from "./utils";
import { type Fiber } from "../../instances/types";
import { applyDomAction } from "../../ui-actions/utils";
import { unmountHookCleanup } from "../../hooks/process-hook";
import { effectResolver } from "../../hooks/effect";
import { stack } from "../../instances/utils";
import { RenderClock } from "./RenderClock";

export abstract class AbstractRenderGroup<TGroup extends FiberGroup> {
  protected readonly rendersGroup: TGroup;
  protected readonly commitsGroup: TGroup;
  protected readonly preCommitGroup: SetFiberGroup = createSetGroup();
  protected readonly postCommitGroup: SetFiberGroup = createSetGroup();
  protected renderHead = Number.MAX_SAFE_INTEGER;
  protected preCommitHead = -1;
  protected renderClock: RenderClock;
  #addFiber: (groups: TGroup, fiber: Fiber) => boolean;
  #removeFiber: (groups: TGroup, fiber: Fiber) => void;

  constructor(
    renderClock: RenderClock,
    addFiber: (groups: TGroup, fiber: Fiber) => boolean,
    removeFiber: (groups: TGroup, fiber: Fiber) => void,
    createGroup: () => TGroup,
  ) {
    this.renderClock = renderClock
    this.schedulePostCommit = this.schedulePostCommit.bind(this);
    this.#addFiber = addFiber;
    this.#removeFiber = removeFiber;
    this.commitsGroup = createGroup();
    this.rendersGroup = createGroup();
  }

  cancelCommit(fiber: Fiber) {
    this.#removeFiber(this.commitsGroup, fiber);
  }

  hasRenderQueue = () => {
    return this.renderHead !== Number.MAX_SAFE_INTEGER;
  }

  queuePreCommit(fiber: Fiber) {
    queueSetGroupMember(this.preCommitGroup, fiber);
    const { depth } = fiber;
    this.preCommitHead = Math.max(depth, this.preCommitHead);
  }

  hasPrecommitQueue() {
    return this.preCommitHead !== -1;
  }

  ensureUnmount(fiber: Fiber) {
    fiber.unmounted = true;
    const {rendersGroup, commitsGroup, preCommitGroup, postCommitGroup} = this;
    rendersGroup.members.delete(fiber)
    preCommitGroup.members.delete(fiber)
    commitsGroup.members.delete(fiber)
    postCommitGroup.members.delete(fiber)
  }


  *getPrecommitIterable(iteration: number) {
    const { queues, members } = this.preCommitGroup;
    for (let i = this.preCommitHead; i >= 0; i--) {
      const queue = queues[i]!;
      while (queue.length) {
        let fiber = queue.pop()!;
        if (!members.delete(fiber)) continue;
        if (fiber.unmounted ||= fiber.isUnmounted(iteration)) continue;
        yield fiber;
      }
      this.preCommitHead--;
    }
    this.preCommitHead = -1;
  }

  cancelRender(fiber: Fiber) {
    this.#removeFiber(this.rendersGroup, fiber);
  }

  schedulePostCommit(fiber: Fiber) {
    queueSetGroupMember(this.postCommitGroup, fiber);
  }

  cancelPostCommit(fiber: Fiber) {
    this.postCommitGroup.members.delete(fiber);
  }

  postCommit() {
    const { renderIteration } = this.renderClock;
    const { members, queues } = this.postCommitGroup;
    for (let i = queues.length - 1; i >= 0; i--) {
      const queue = queues[i]!;
      while (queue.length) {
        const fiber = queue.pop()!;
        if (!members.has(fiber)) continue;
        fiber.unmounted = fiber.isUnmounted(renderIteration);
        if (fiber.instances && fiber.unmounted) {
          fiber.hookStates.forEach(unmountHookCleanup);
          for (const child of fiber.instances.values()) {
            child.unmounted = true;
            this.schedulePostCommit(child);
          }
          continue;
        }
        fiber.hookStates.forEach(effectResolver);
        fiber.postCommitReasons?.clear();
      }
    }
    members.clear();
  }

  scheduleCommit(fiber: Fiber) {
    this.#addFiber(this.commitsGroup, fiber);
  }

  protected static applyUIActions(fiber: Fiber) {
    const { uiActions } = fiber;
    const { delegationRoot } = fiber.rctx;
    for (let i = 0; i < uiActions!.length; i++) {
      applyDomAction(uiActions![i]!, delegationRoot);
    }
    const { refsToAssign } = fiber;
    fiber.slot = fiber.pendingSlot;
    fiber.pendingSlot = undefined;
    fiber.initialMounted = true;
    if (refsToAssign) for (const [ref, element] of refsToAssign) ref.current = element;
  }

  renderFiber(fiber: Fiber, renderIteration: number) {
    try {
      fiber.confidentIteration = renderIteration;
      fiber.render();
    } catch (cause) {
      throw new Error(
        `Failed to render component ${fiber.component.name} at:${"\n"}${stack(fiber)}`,
        { cause },
      );
    }
  }
}
