import { getOrInsertComputed, randomId } from "../general";
import type { Draft } from "./draft";
import type {
  ComponentSlotType,
  ContextSlotType,
  ElementSlotType,
  FragmentSlotType,
  ShallowSlotType,
} from "./slot";
import type { Component, ComponentProps } from "../jsx";

const componentIdMap = new WeakMap<Component<any>, string>();

export function getComponentSlotKey(
  draft: Draft<ComponentSlotType | ShallowSlotType>,
  index: number,
): string {
  const slotId = getOrInsertComputed(componentIdMap, draft.component, randomId);
  const componentKey = draft._key ?? index;
  return `"${slotId}""${typeof componentKey}"${componentKey}`;
}

export function getElementSlotKey(draft: Draft<ElementSlotType>, index: number) {
  const elementKey = draft._key ?? index;
  return `"${draft.element}${getElementSubKey(draft)}${typeof elementKey}${elementKey}"`;
}

export function getElementSubKey(draft: Draft<ElementSlotType>) {
  if (draft.element !== "input") return "";
  const p = draft.props as ComponentProps<"input">;
  const type = p.type ?? "text";
  switch (p.type ?? "text") {
    case "checkbox":
    case "radio": {
      return `${type}"${p.value ?? ""}"`;
    }
  }
  return "";
}

const fragmentTypeKey = randomId();

export function getFragmentSlotKey(draft: Draft<FragmentSlotType>, index: number): string {
  const fragmentKey = draft._key ?? index;
  return `"${fragmentTypeKey}${typeof fragmentKey}${fragmentKey}"`;
}

export function getArrayFragmentSlotKey(index: number): string {
  return `"${fragmentTypeKey}number${index}"`;
}

export function getContextSlotKey(draft: Draft<ContextSlotType>, index: number): string {
  const contextKey = draft._key ?? index;
  return `"${draft.context.id}${typeof contextKey}${contextKey}"`;
}

export function getTextSlotKey(index: number): string {
  return `"leaf${index}"`;
}
