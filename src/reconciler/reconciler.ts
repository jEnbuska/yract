import type { Child, Children, ComponentProps } from "../jsx";
import type { ComponentSlotType, ContextSlotType, Slot, SlotType } from "../slots/slot";
import { extendIntentNodes, extendIntentWithInstance } from "../slots/slot";
import {
  componentSlotType,
  contextSlotType,
  elementSlotType,
  fragmentSlotType,
  textSlotType,
} from "../slots/slot";
import type { TagNamespace } from "../render/elements/namespaces";
import { type AnyElement, nodeNameSpace } from "../render/elements/namespaces";
import { getMapValues, getMapValuesReversed } from "../general";
import { deriveStableIndexes } from "./derive-stable-indexes";
import type { ContextMap } from "../render/types";
import {
  childrenToIntents,
  childToIntent,
  emptyChildren,
  inheritSlot,
  type Intent,
} from "../slots/intent";
import { diffAnyElementProps } from "../render/element-props";
import { prepareUpdate } from "../ui-actions/prepare/prepare-update";
import { prepareRemove } from "../ui-actions/prepare/prepare-remove";
import { prepareText } from "../ui-actions/prepare/prepare-text";
import { prepareInsert } from "../ui-actions/prepare/prepare-insert";
import { prepareMove } from "../ui-actions/prepare/prepare-move";
import type { RequiredBy } from "../general-types";
import type { Fiber } from "../instances/types";
import type { Scheduler } from "../scheduler/Scheduler";
import { toElementSlot, toFragmentSlot, toTextSlot } from "../slots/utils";
import { createFiber } from "../instances/utils";

type ReconcileFiber = RequiredBy<Fiber, "uiActions">;
function prepareFiber(fiber: Fiber): asserts fiber is ReconcileFiber {
  const { instances } = fiber;
  // When even we hit an instance when walking the tree we remove the instance from the 'unmountedInstances' and it will be moved to nextInstances
  fiber.prevInstances = instances?.size ? new Map(instances) : undefined;
  fiber.instances = undefined;
  fiber.uiActions = [];
}

export function mountFiber(fiber: Fiber, child: Child): Slot {
  prepareFiber(fiber);
  const { parentDom, ns, ctx, uiActions } = fiber;
  const intent = childToIntent(child, 0, "");
  const stagingDom = document.createDocumentFragment();
  mountIntent(fiber, intent, ns, parentDom, stagingDom, ctx);
  uiActions.push(prepareInsert(fiber.parentDom, stagingDom, fiber.tailNode));
  return intent as Slot;
}

export function reconcilerFiber(fiber: Fiber, child: Child): Slot {
  prepareFiber(fiber);
  const { parentDom, slot, ns, tailNode, ctx, uiActions } = fiber;
  const prevSlot = slot!;
  const intent = childToIntent(child, 0, "");

  if (intent.key !== prevSlot.key) {
    uiActions.push(prepareRemove(prevSlot));
    buildIntentToSlot(fiber, intent, ns, parentDom, tailNode, ctx);
    return intent as Slot;
  } else {
    const slot = inheritSlot(intent, prevSlot);
    updateSlot(fiber, slot, ns, ctx);
    return slot;
  }
}

function mount(
  children: ReadonlyArray<Children>,
  fiber: ReconcileFiber,
  parentDom: Node,
  stagingDom: Node,
  parentPath: string,
  ns: TagNamespace,
  ctx: ContextMap,
): ReadonlyMap<string, Slot> {
  const slots = childrenToIntents(children, parentPath) as any as ReadonlyMap<string, Slot>;
  for (const draft of getMapValues(slots)) {
    mountIntent(fiber, draft, ns, parentDom, stagingDom, ctx);
  }
  return slots;
}

function reconcile(
  fiber: ReconcileFiber,
  children: ReadonlyArray<Children> = emptyChildren,
  parentDom: Node,
  path: string,
  oldSlots: ReadonlyMap<string, Slot>,
  ns: TagNamespace,
  beforeNode: Node | null,
  ctx: ContextMap,
): ReadonlyMap<string, Slot> {
  const { uiActions } = fiber;
  const drafts = childrenToIntents(children, path);
  const stableIndexes = deriveStableIndexes(drafts, oldSlots);
  for (const [key, draft] of drafts) {
    const prev = oldSlots.get(key);
    if (prev === undefined) continue;
    const slot = inheritSlot(draft, prev);
    slot.stable = stableIndexes.has(prev.index);
  }
  for (const slot of getMapValuesReversed(oldSlots)) {
    if (drafts.has(slot.key)) continue;
    uiActions.push(prepareRemove(slot));
  }
  const slots = drafts as ReadonlyMap<string, Slot>;
  for (const slot of getMapValuesReversed(slots)) {
    if (slot.headNode === undefined) {
      // ... Intent
      buildIntentToSlot(fiber, slot, ns, parentDom, beforeNode, ctx);
    } else {
      // ... Slot
      updateSlot(fiber, slot, ns, ctx);
      if (!slot.stable) uiActions.push(prepareMove(parentDom, slot, beforeNode));
    }
    beforeNode = slot.headNode;
  }
  return slots;
}

function mountIntent(
  fiber: ReconcileFiber,
  intent: Intent,
  ns: TagNamespace,
  parentDom: Node,
  stagingDom: Node,
  ctx: ContextMap,
) {
  switch (intent.type) {
    case contextSlotType:
    case componentSlotType: {
      const { headNode, tailNode } = handleMountSlot(fiber, intent, parentDom, ns, ctx);
      stagingDom.appendChild(headNode);
      stagingDom.appendChild(tailNode);
      return;
    }
    case textSlotType: {
      stagingDom.appendChild(toTextSlot(intent).headNode);
      return;
    }
    case elementSlotType: {
      const { children, path, props } = intent;
      const { headNode } = toElementSlot(intent, ns);
      stagingDom.appendChild(headNode);
      ns = nodeNameSpace(headNode);
      intent.slots = mount(children, fiber, headNode, headNode, path, ns, ctx);
      storeFormElementInitialValue(headNode, props, fiber.scheduler);
      return;
    }
    case fragmentSlotType: {
      const { headNode, tailNode } = toFragmentSlot(intent);
      const { path, children } = intent;
      stagingDom.appendChild(headNode);
      intent.slots = mount(children, fiber, parentDom, stagingDom, path, ns, ctx);
      stagingDom.appendChild(tailNode);
      return;
    }
    default:
      throw new Error(`yract: unknown SlotIntent: ${JSON.stringify(intent satisfies never)}`);
  }
}

function buildIntentToSlot(
  fiber: ReconcileFiber,
  intent: Intent,
  ns: TagNamespace,
  parentDom: Node,
  beforeNode: null | Node,
  ctx: ContextMap,
): asserts intent is Slot {
  switch (intent.type) {
    case componentSlotType:
    case contextSlotType: {
      const { headNode, tailNode } = handleMountSlot(fiber, intent, parentDom, ns, ctx);
      const stagingDom = document.createDocumentFragment();
      stagingDom.appendChild(headNode);
      stagingDom.appendChild(tailNode);
      fiber.uiActions.push(prepareInsert(parentDom, stagingDom, beforeNode));
      return;
    }
    case textSlotType: {
      fiber.uiActions.push(prepareInsert(parentDom, toTextSlot(intent).headNode, beforeNode));
      return;
    }
    case elementSlotType: {
      const { headNode } = toElementSlot(intent, ns);
      const { children, path } = intent;
      ns = nodeNameSpace(headNode);
      intent.slots = mount(children, fiber, headNode, headNode, path, ns, ctx);
      const { props } = intent;
      storeFormElementInitialValue(headNode, props, fiber.scheduler);
      fiber.uiActions.push(prepareInsert(parentDom, headNode, beforeNode));
      return;
    }
    case fragmentSlotType: {
      const { headNode, tailNode } = toFragmentSlot(intent);
      const { children, path } = intent;
      const stagingDom = document.createDocumentFragment();
      stagingDom.appendChild(headNode);
      intent.slots = mount(children, fiber, parentDom, stagingDom, path, ns, ctx);
      stagingDom.appendChild(tailNode);
      fiber.uiActions.push(prepareInsert(parentDom, stagingDom, beforeNode));
      return;
    }
    default:
      throw new Error(`invalid intent ${JSON.stringify(intent satisfies never)}`);
  }
}

function updateSlot<T extends SlotType>(
  fiber: ReconcileFiber,
  slot: Slot<T>,
  ns: TagNamespace,
  ctx: ContextMap,
) {
  switch (slot.type) {
    case contextSlotType:
    case componentSlotType:
      const { instance, path } = slot;
      fiber.prevInstances?.delete(path);
      instance.setProps(slot);
      (fiber.instances ??= new Map<string, Fiber>()).set(path, instance);
      return;
    case textSlotType: {
      const { text } = slot;
      if (text === slot.prevText) return;
      fiber.uiActions.push(prepareText(slot));
      return;
    }
    case elementSlotType: {
      const { headNode, element, children, path, slots, prevProps, props } = slot;
      const ns = nodeNameSpace(headNode);
      slot.slots = reconcile(fiber, children, headNode, path, slots, ns, null, ctx);
      const patch = diffAnyElementProps(element, prevProps, props);
      if (patch) fiber.uiActions.push(prepareUpdate(slot, patch));
      return;
    }
    case fragmentSlotType: {
      const { tailNode, children, path, slots } = slot;
      const parentDom = tailNode.parentNode;
      slot.slots = reconcile(fiber, children, parentDom!, path, slots, ns, tailNode, ctx);
      return;
    }
    default:
      throw new Error(`Unhandled update slot ${JSON.stringify(slot satisfies never)}`);
  }
}

function storeFormElementInitialValue(
  element: AnyElement,
  props: Record<string, unknown>,
  scheduler: Scheduler,
) {
  switch (element.localName) {
    case 'textarea':
    case 'select': {
      const p = props as ComponentProps<"textarea" | 'select'>;
      const value = `${p.value ?? ""}`;
      scheduler.registerPropsValue(element, value);
      break;
    }
    case 'input': {
      const p = props as ComponentProps<'input'>;
      const input = element as HTMLInputElement
      switch (input.type) {
        case 'radio':
        case 'checkbox': {
          scheduler.registerPropsValue(element, Boolean(p.checked));
          break;
        }
        default: {
          scheduler.registerPropsValue(element, `${p.value ?? ""}`);
          break;
        }
      }
    }
  }
}

function handleMountSlot(
  fiber: Fiber,
  intent: Intent<ComponentSlotType | ContextSlotType>,
  parentDom: Node,
  ns: TagNamespace,
  ctx: ContextMap,
) {
  const { path } = intent;
  let instance = fiber.prevInstances?.get(path);
  if (instance) {
    instance.ctx = ctx;
    instance.parentDom = parentDom;
    extendIntentWithInstance(intent, instance);
    fiber.prevInstances?.delete(path);
    instance.setProps(intent);
  } else {
    instance = createFiber(extendIntentNodes(intent), ctx, fiber, parentDom, ns);
    intent.instance = instance;
    instance.scheduler.scheduleRender(instance);
  }
  (fiber.instances ??= new Map<string, Fiber>()).set(path, instance);
  return intent as Slot<ComponentSlotType>;
}
