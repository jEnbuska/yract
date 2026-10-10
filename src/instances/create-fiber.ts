import { ComponentFiber } from "./component-fiber";
import type { ContextMap } from "../render/types";
import type { TagNamespace } from "../render/elements/namespaces";
import type { ComponentSlotType, ContextSlotType, Slot } from "../slots/slot";
import { contextSlotType } from "../slots/slot";
import type { DraftBy } from "../general-types";
import { ContextFiber } from "./context-fiber";
import type { Fiber } from "./types";

/** @internal */
export function createFiber(
  intent: DraftBy<Slot<ComponentSlotType | ContextSlotType>, "instance" | "prevProps">,
  parentCtx: ContextMap,
  parent: Fiber,
  parentDom: Node,
  ns: TagNamespace,
): ComponentFiber {
  if (intent.type === contextSlotType) {
    return new ContextFiber(
      intent as DraftBy<Slot<ContextSlotType>, "instance" | "prevProps">,
      parentCtx,
      parent,
      parentDom,
      ns,
    );
  }
  return new ComponentFiber(
    intent as DraftBy<Slot<ComponentSlotType>, "instance" | "prevProps">,
    parentCtx,
    parent,
    parent.scheduler,
    parentDom,
    ns,
  );
}
