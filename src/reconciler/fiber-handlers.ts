import type { Intent } from "../slots/intent";
import type {
  ComponentSlotType,
  ContextSlotType,
  ElementSlotType,
  FragmentSlotType,
  SlotType,
  TextSlotType,
} from "../slots/slot";
import { extendIntentNodes, extendIntentWithInstance, type Slot } from "../slots/slot";
import type { AnyElement, TagNamespace } from "../render/elements/namespaces";
import type { ContextMap } from "../render/types";
import { UNMOUNT } from "../reasons";

import { prepareSlotNodes, updateWithPreparedSlot } from "../slots/utils";
import { createFiber } from "../instances/register-create";
import type { WeakRefLike } from "../render/element-props";
import type {
  CreateElementAction,
  CreateFragmentAction,
  CreateTextAction,
} from "../ui-actions/types";
import type { Fiber } from "../instances/types";

export function handleMountSlot(
  fiber: Fiber,
  intent: Intent<ComponentSlotType | ContextSlotType>,
  parentDom: Node,
  ns: TagNamespace,
  ctx: ContextMap,
) {
  const { path } = intent;
  let instance = fiber.unmountInstances?.get(path);
  if (instance) {
    instance.ctx = ctx;
    instance.parentDom = parentDom;
    extendIntentWithInstance(intent, instance);
    fiber.unmountInstances?.delete(path);
    if (instance.unmounted) instance.unmounted = false;
    instance.setProps(intent);
  } else {
    instance = createFiber(extendIntentNodes(intent), ctx, fiber, fiber.rctx, parentDom, ns);
    intent.instance = instance;
    instance.rctx.scheduler.queueRender(instance);
  }
  (fiber.instances ??= new Map<string, Fiber>()).set(path, instance);
  return intent as Slot<ComponentSlotType>;
}

export type CreateSlotResponse<T extends SlotType> = Pick<Slot<T>, "headNode" | "tailNode">;
export function handleCreateNode(
  fiber: Fiber,
  action: CreateElementAction,
): CreateSlotResponse<ElementSlotType>;
export function handleCreateNode(
  fiber: Fiber,
  action: CreateFragmentAction,
): CreateSlotResponse<FragmentSlotType>;
export function handleCreateNode(
  fiber: Fiber,
  action: CreateTextAction,
): CreateSlotResponse<TextSlotType>;
export function handleCreateNode(
  fiber: Fiber,
  action: CreateElementAction | CreateFragmentAction | CreateTextAction,
): CreateSlotResponse<any> {
  const { preparedSlots, rctx } = fiber;
  const { slot, ns } = action;
  const { path } = slot;
  const prepared = preparedSlots!.get(path);
  let resultSlot: Slot<ElementSlotType | TextSlotType | FragmentSlotType>;
  if (prepared) {
    resultSlot = updateWithPreparedSlot(slot, prepared, rctx.delegationRoot);
  } else {
    resultSlot = prepareSlotNodes(slot, rctx.delegationRoot, ns);
  }
  preparedSlots!.set(path, resultSlot);
  return resultSlot;
}

export function handleUpdateSlotProps(
  fiber: Fiber,
  slot: Slot<ComponentSlotType | ContextSlotType>,
) {
  const { instance, path } = slot;
  fiber.unmountInstances?.delete(path);
  instance.unmounted = false;

  instance.setProps(slot);
  (fiber.instances ??= new Map<string, Fiber>()).set(path, instance);
  instance.cancelPostRenderCallback(UNMOUNT);
}

export function handleUpdateRef(fiber: Fiber, slot: Intent<ElementSlotType>) {
  const { headNode, props } = slot;
  const refs = (fiber.refsToAssign ??= new Map<WeakRefLike, AnyElement>());
  refs.set(props.ref!, headNode!);
}
