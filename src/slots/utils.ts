import type {
  ElementSlotType,
  FragmentSlotType,
  ShallowSlotType,
  Slot,
  TextSlotType,
} from "./slot";
import { shallowSlotType } from "./slot";
import { elementSlotType, fragmentSlotType, textSlotType } from "./slot";
import type { TagNamespace } from "../render/elements/namespaces";
import { createElement } from "../render/elements/create";
import { applyElementProps } from "../render/element-props";
import type { Intent } from "./intent";
import type { DraftBy } from "../general-types";

export function prepareSlotNodes(
  intent: Intent<ElementSlotType | TextSlotType | FragmentSlotType | ShallowSlotType>,
  ns: TagNamespace | undefined,
): Slot<ElementSlotType | TextSlotType | FragmentSlotType | ShallowSlotType> {
  switch (intent.type) {
    case elementSlotType:
      return toElementSlot(intent, ns!);
    case textSlotType:
      return toTextSlot(intent);
    case fragmentSlotType:
      return toFragmentSlot(intent);
    case shallowSlotType:
      return toShallowSlot(intent);
    default:
      throw new Error(`Invalid CREATE kind ${JSON.stringify(intent satisfies never)}`);
  }
}

function toTextSlot(intent: Intent<TextSlotType>): Slot<TextSlotType> {
  const text = intent.text;
  intent.headNode = document.createTextNode(text);
  return intent satisfies DraftBy<
    Slot<TextSlotType>,
    "headNode" | "prevText"
  > as Slot<TextSlotType>;
}

function toElementSlot(intent: Intent<ElementSlotType>, ns: TagNamespace): Slot<ElementSlotType> {
  const { element, props } = intent;
  const node = createElement(ns, element);
  applyElementProps(node, props);
  intent.headNode = node;
  return intent as Slot<ElementSlotType>;
}

function toFragmentSlot(intent: Intent<FragmentSlotType>): Slot<FragmentSlotType> {
  intent.headNode = document.createComment("<Fragment>");
  intent.tailNode = document.createComment("</Fragment>");
  return intent satisfies DraftBy<
    Intent<FragmentSlotType>,
    "headNode" | "tailNode"
  > as Slot<FragmentSlotType>;
}

function toShallowSlot(intent: Intent<ShallowSlotType>): Slot<ShallowSlotType> {
  const { name } = intent.component;
  intent.headNode = document.createComment(`<Shallow${name}>`);
  intent.tailNode = document.createComment(`</Shallow${name}>`);
  return intent satisfies DraftBy<
    Intent<ShallowSlotType>,
    "headNode" | "tailNode"
  > as Slot<ShallowSlotType>;
}
