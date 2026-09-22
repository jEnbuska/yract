import type { Fiber } from "./types";
import type { DraftBy } from "../general-types";
import type { ComponentSlotType, Slot } from "../slots/slot";
import type { ContextMap } from "../render/types";
import type { TagNamespace } from "../render/elements/namespaces";
import type { ComponentFiber } from "./component-fiber";

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
