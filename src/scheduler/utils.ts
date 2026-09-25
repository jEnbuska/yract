import type { Fiber, FieldSelectionMap, FieldValueMap } from "../instances/types";
import { stack } from "../instances/utils";
import { createResolvable } from "../create-resolvable";
import { applyDomAction } from "../ui-actions/utils";
import { effectResolver } from "../hooks/effect";
import { unmountHookCleanup } from "../hooks/process-hook";
import { UNMOUNT } from "../reasons";

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

export function applyUIActions(
  fiber: Fiber,
  valueMap: FieldValueMap,
  selectionMap: FieldSelectionMap,
) {
  const { uiActions } = fiber;
  for (let i = 0; i < uiActions!.length; i++) {
    applyDomAction(uiActions![i]!, valueMap, selectionMap);
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

export function handlePostCommit(
  commitGroup: { queues: Fiber[][]; has(fiber: Fiber): boolean; clear(): void },
  renderIteration: number,
) {
  const { queues } = commitGroup;
  for (let i = queues.length - 1; i >= 0; i--) {
    const queue = queues[i]!;
    for (let j = 0; j < queue.length; j++) {
      const fiber = queue[j]!;
      if (!commitGroup.has(fiber)) continue;
      fiber.unmounted ||= fiber.isUnmounted(renderIteration);
      if (!fiber.unmounted) {
        fiber.hookStates?.forEach(effectResolver);
        fiber.postCommitReasons?.clear();
        continue;
      }
      fiber.hookStates?.forEach(unmountHookCleanup);
      if (!fiber.instances) continue;
      for (const child of fiber.instances.values()) {
        child.unmounted = true;
        child.schedulePostCommit(UNMOUNT);
      }
    }
  }
  commitGroup.clear();
}
