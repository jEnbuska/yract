import type { DraftBy } from "../general-types";
import type { ComponentSlotType, Slot } from "../slots/slot";
import type { ContextMap, RenderContext } from "../render/types";
import type { ComponentFiber } from "./component-fiber";
import type { TagNamespace } from "../render/elements/namespaces";
import type { Fiber } from "./types";

type CreateFiber = (
  intent: DraftBy<Slot<ComponentSlotType>, "instance" | "prevProps">,
  parentCtx: ContextMap,
  parent: Fiber | null,
  rctx: RenderContext,
  parentDom: Node,
  ns: TagNamespace,
) => ComponentFiber;
export let createFiber: CreateFiber;

export function registerCreateInstance(callback: CreateFiber): void {
  createFiber = callback;
}
