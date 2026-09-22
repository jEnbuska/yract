import { ComponentFiber } from "./component-fiber";
import type { ContextMap } from "../render/types";
import type { TagNamespace } from "../render/elements/namespaces";
import type { ComponentSlotType, ContextSlotType, Slot } from "../slots/slot";
import { contextSlotType } from "../slots/slot";
import type { DraftBy } from "../general-types";
import { ContextFiber } from "./context-fiber";
import { Defer } from "../hooks/defer";
import type { Fiber } from "./types";

export function createFiber(
  intent: DraftBy<Slot<ComponentSlotType | ContextSlotType>, "instance" | "prevProps">,
  parentCtx: ContextMap,
  parent: Fiber,
  parentDom: Node,
  ns: TagNamespace,
): ComponentFiber {
  const { component } = intent;
  if (component === Defer) {
    return new Defer.Fiber(
      intent as DraftBy<Slot<ComponentSlotType>, "instance" | "prevProps">,
      parentCtx,
      parent,
      parentDom,
      ns,
    );
  }

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
