import type { Fiber, FieldValueMap } from "./types";
import type { DraftBy } from "../general-types";
import type { ComponentSlotType, Slot } from "../slots/slot";
import type { ContextMap } from "../render/types";
import type { TagNamespace } from "../render/elements/namespaces";
import type { ComponentFiber } from "./component-fiber";
import type { UIAction } from "../ui-actions/types";
import { INSERT_UI_ACTION } from "../ui-actions/constants";

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
export let createFiber: CreateFiber;

export function registerCreateInstance(callback: CreateFiber): void {
  createFiber = callback;
}

/**
 * The document fragments a fiber is about to insert. A node inside one of these
 * is still being staged and may be rearranged freely; a node anywhere else is
 * either live or belongs to a commit that is not ours to fold into.
 */
export function stagingFragments(uiActions: ReadonlyArray<UIAction>): Set<Node> | undefined {
  let fragments: Set<Node> | undefined;
  for (const action of uiActions) {
    if (action.type !== INSERT_UI_ACTION) continue;
    const { node } = action;
    if (node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) continue;
    (fragments ??= new Set<Node>()).add(node);
  }
  return fragments;
}

/**
 * `reconcile` walks children in reverse and hands each new slot the NEXT
 * sibling's head marker as its boundary, so a run of consecutive new slots
 * produces consecutive inserts whose boundaries are internal to the run: the
 * one for slot 7 points at a marker sitting in the fragment of the one for
 * slot 8. Whenever that holds the later fragment absorbs the earlier one and
 * the action disappears — new slots at 3..8 collapse to a single insert.
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
  if (merged.length !== actions.length) return merged;
  return uiActions;
}

export function handleStoreStateBeforeChange(
  root: Element,
  valueMap: FieldValueMap,
  schedulerCallbacks: { blockScheduler: () => void; unBlockScheduler: () => void },
) {
  root.addEventListener(
    "focus",
    (e) => {
      if (e.target instanceof HTMLSelectElement) {
        const target = e.target;
        console.log(`set ${target.name} value to "${target.value}"`);
        valueMap.set(target, target.value ?? "");
      } else if (e.target instanceof HTMLInputElement) {
        const target = e.target;
        switch (e.target.type) {
          case "checkbox":
          case "radio": {
            valueMap.set(target, Boolean(target.checked));
            break;
          }
          case "range": {
            valueMap.set(target, target.value);
          }
        }
      }
    },
    { capture: true },
  );
  const { blockScheduler } = schedulerCallbacks;
  root.addEventListener(
    "beforeinput",
    (e) => {
      blockScheduler();
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      valueMap.set(target, target.value ?? "");
    },
    { capture: true },
  );
}
