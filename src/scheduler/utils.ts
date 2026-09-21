import type { MapFiberGroup, SetFiberGroup } from "./types";
import type { Fiber } from "../instances/types";
import { stack } from "../instances/utils";
import { createResolvable } from "../create-resolvable";
import { applyDomAction } from "../ui-actions/utils";
import { effectResolver } from "../hooks/effect";
import { unmountHookCleanup } from "../hooks/process-hook";
import { UNMOUNT } from "../reasons";

export function queueMapGroupMember({ members, queues }: MapFiberGroup, fiber: Fiber): boolean {
  const booked = members.get(fiber);
  if (booked) return false; // Already on the list and part of members
  members.set(fiber, true);
  if (booked === false) return true;
  const { depth } = fiber;
  while (queues.length <= depth) queues.push([]);
  queues[depth]!.push(fiber);
  return true;
}

export function queueSetGroupMember({ members, queues }: SetFiberGroup, fiber: Fiber): boolean {
  if (members.has(fiber)) return false;
  members.add(fiber);
  const { depth } = fiber;
  while (queues.length <= depth) {
    queues.push([]);
  }
  const queue = queues[depth]!;
  queue.push(fiber);
  return true;
}

export function createWeakMapGroup() {
  return {
    members: new WeakMap<Fiber, boolean>(),
    queues: [] as Fiber[][],
    size: 0,
  };
}

export function createWeakSetGroup() {
  return {
    members: new WeakSet<Fiber>(),
    queues: [] as Fiber[][],
    size: 0,
  };
}
export function createSetGroup() {
  return {
    members: new Set(),
    queues: [] as Fiber[][],
    size: 0,
  };
}

export function shallowDeleteMapMember({ members }: MapFiberGroup, fiber: Fiber) {
  if(!members.has(fiber)) return
  members.set(fiber, false);
}

export function shallowDeleteSetMember(group: SetFiberGroup, fiber: Fiber) {
  group.members.delete(fiber);
}


export function renderFiber(fiber: Fiber, renderIteration: number) {
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

export function applyUIActions(fiber: Fiber) {
  const { uiActions } = fiber;
  const { delegationRoot } = fiber.rctx;
  for (let i = 0; i < uiActions!.length; i++) {
    applyDomAction(uiActions![i]!, delegationRoot);
  }
  fiber.slot = fiber.pendingSlot;
  fiber.pendingSlot = undefined;
  fiber.initialMounted = true;
  const { refsToAssign } = fiber;
  if (refsToAssign) for (const [ref, element] of refsToAssign) ref.current = element;
}
export async function waitForIdle() {
  const { promise, resolve } = createResolvable<unknown>();
  const { port1, port2 } = new MessageChannel();
  port1.onmessage = resolve;
  port2.postMessage(null);
  return promise;
}

export function handlePostCommit(group: { queues: Fiber[][], has(fiber: Fiber): boolean }, renderIteration: number) {
  const {queues} = group
  for (let i = queues.length - 1; i >= 0; i--) {
    const queue = queues[i]!;
    for (let j = 0; j < queue.length; j++) {
      const fiber = queue[j]!;
      if (!group.has(fiber)) continue;
      fiber.unmounted ||= fiber.isUnmounted(renderIteration);
      if(!fiber.unmounted) {
        fiber.hookStates.forEach(effectResolver);
        fiber.postCommitReasons?.clear();
        continue;
      }
      fiber.hookStates.forEach(unmountHookCleanup);
      if(!fiber.instances) continue;
      for (const child of fiber.instances.values()) {
        child.unmounted = true;
        child.schedulePostCommit(UNMOUNT)
      }
    }
  }
}