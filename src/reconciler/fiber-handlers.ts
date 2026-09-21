import type { Intent } from "../slots/intent";
import type {
  ComponentSlotType,
  ContextSlotType,
  ElementSlotType,
  FragmentSlotType,
  ShallowSlotType,
  SlotType,
  TextSlotType,
} from "../slots/slot";
import { extendIntentNodes, extendIntentWithInstance, type Slot } from "../slots/slot";
import type { AnyElement, TagNamespace } from "../render/elements/namespaces";
import type { ContextMap } from "../render/types";
import { UNMOUNT } from "../reasons";

import { prepareSlotNodes } from "../slots/utils";
import type { WeakRefLike } from "../render/element-props";
import type {
  CreateElementAction,
  CreateFragmentAction,
  CreateShallowAction,
  CreateTextAction,
} from "../ui-actions/types";
import type { Fiber } from "../instances/types";
import { createFiber } from "../instances/utils";

export function handleMountSlot(
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
    if (instance.unmounted) {
      console.log('was unmonted');
      instance.unmounted = false;
    }
    instance.setProps(intent);
  } else {
    instance = createFiber(extendIntentNodes(intent), ctx, fiber, fiber.rctx, parentDom, ns);
    intent.instance = instance;
    instance.rctx.scheduler.scheduleRender(instance);
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
  action: CreateShallowAction,
): CreateSlotResponse<ShallowSlotType>;
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
  action: CreateElementAction | CreateFragmentAction | CreateTextAction | CreateShallowAction,
): CreateSlotResponse<any> {
  const { rctx } = fiber;
  const { slot, ns } = action;
  return prepareSlotNodes(slot, rctx.delegationRoot, ns);
}

export function handleUpdateSlotProps(
  fiber: Fiber,
  slot: Slot<ComponentSlotType | ContextSlotType>,
) {
  const { instance, path } = slot;
  fiber.prevInstances?.delete(path);
  instance.unmounted = false;

  instance.setProps(slot);
  (fiber.instances ??= new Map<string, Fiber>()).set(path, instance);
}

export function handleUpdateRef(fiber: Fiber, slot: Intent<ElementSlotType>) {
  const { headNode, props } = slot;
  const refs = (fiber.refsToAssign ??= new Map<WeakRefLike, AnyElement>());
  refs.set(props.ref!, headNode!);
}
