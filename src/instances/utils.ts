import type { Fiber } from "./types";
import type { DraftBy } from "../general-types";
import type { ComponentSlotType, Slot } from "../slots/slot";
import type { ContextMap } from "../render/types";
import type { TagNamespace } from "../render/elements/namespaces";
import type { ComponentFiber } from "./component-fiber";
import type { InsertAction, UIAction } from "../ui-actions/types";
import { INSERT_UI_ACTION } from "../ui-actions/constants";

/** @internal */
export function stack(fiber: Fiber): string {
  const { parent } = fiber;
  let str = parent ? stack(parent) : "";
  str += "\t".repeat(fiber.depth);
  str += `<${fiber.component.name}>`;
  str += "\n";
  return str;
}

type CreateFiber = (
  intent: DraftBy<Slot<ComponentSlotType>, "instance" | "prevProps">,
  parentCtx: ContextMap,
  parent: Fiber,
  parentDom: Node,
  ns: TagNamespace,
) => ComponentFiber;
/** @internal */
export let createFiber: CreateFiber;

/** @internal */
export function registerCreateInstance(callback: CreateFiber): void {
  createFiber = callback;
}
/**
 * `reconcile` walks children in reverse and hands each new slot the NEXT
 * sibling's head marker as its boundary, so a run of consecutive new slots
 * produces consecutive inserts whose boundaries are internal to the run: the
 * one for slot 7 points at a marker sitting in the fragment of the one for
 * slot 8. Whenever that holds the later fragment absorbs the earlier one and
 * the action disappears — new slots at 3..8 collapse to a single insert.
 * @internal
 */
export function chunkInserts(uiActions: UIAction[] | undefined): undefined | UIAction[] {
  const actions = uiActions;
  if (!actions || actions.length < 2) return uiActions;
  const merged: UIAction[] = [];
  let chunk: Node | undefined;
  for (const action of actions) {
    if (action.type !== INSERT_UI_ACTION) {
      // An intervening action has to keep its position relative to the
      // inserts around it, so it ends a run.
      chunk = undefined;
      merged.push(action);
      continue;
    }
    const { before, node } = action;
    if (chunk && before && before.parentNode === chunk) {
      chunk.insertBefore(node, before);
      continue;
    }
    chunk = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? node : undefined;
    merged.push(action);
  }
  if (merged.length !== actions.length) {
    return merged;
  }
  return uiActions;
}

/** @internal */
export function foldSubtreeIntoStaging(fiber: Fiber): void {
  const { instances } = fiber;
  if (instances) {
    for (const child of instances.values()) foldSubtreeIntoStaging(child);
  }
  foldIntoStaging(fiber);
}
/**
 * A child mounting for the first time emits exactly one action: its staging
 * fragment inserted before its tail marker. While that marker still sits in
 * one of our uncommitted fragments, splice the content in there instead.
 */
function foldIntoStaging(fiber: Fiber): void {
  const { tailNode, uiActions } = fiber;
  if (!uiActions?.length) return; // Not rendered yet, or already folded.
  const action = uiActions[0] as InsertAction;
  tailNode.parentNode!.insertBefore(action.node, tailNode);
  // Emptied, not dropped: the child still reaches commit so `slot` catches up.
  uiActions.length = 0;
  fiber.slot = fiber.pendingSlot;
  fiber.pendingSlot = undefined;
}
