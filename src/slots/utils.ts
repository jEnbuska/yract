import type { ElementSlotType, FragmentSlotType, Slot, TextSlotType } from "./slot";
import { elementSlotType, fragmentSlotType, textSlotType } from "./slot";
import type { TagNamespace } from "../render/elements/namespaces";
import { createElement } from "../render/elements/create";
import { applyElementInitialProps } from "../render/element-props";
import type { Intent } from "./intent";
import type { DraftBy } from "../general-types";

export function prepareSlotNodes(
  intent: Intent<ElementSlotType | TextSlotType | FragmentSlotType>,
  ns: TagNamespace | undefined,
): Slot<ElementSlotType | TextSlotType | FragmentSlotType> {
  switch (intent.type) {
    case elementSlotType:
      return toElementSlot(intent, ns!);
    case textSlotType:
      return toTextSlot(intent);
    case fragmentSlotType:
      return toFragmentSlot(intent);
    default:
      throw new Error(`Invalid CREATE kind ${JSON.stringify(intent satisfies never)}`);
  }
}

export function toTextSlot(intent: Intent<TextSlotType>): Slot<TextSlotType> {
  const text = intent.text;
  intent.headNode = document.createTextNode(text);
  return intent satisfies DraftBy<
    Slot<TextSlotType>,
    "headNode" | "prevText"
  > as Slot<TextSlotType>;
}

export function toElementSlot(
  intent: Intent<ElementSlotType>,
  ns: TagNamespace,
): Slot<ElementSlotType> {
  const { element, props } = intent;
  const node = createElement(ns, element);
  applyElementInitialProps(node, props);
  intent.headNode = node;
  return intent as Slot<ElementSlotType>;
}

export function toFragmentSlot(intent: Intent<FragmentSlotType>): Slot<FragmentSlotType> {
  intent.headNode = document.createComment("<Fragment>");
  intent.tailNode = document.createComment("</Fragment>");
  return intent satisfies DraftBy<
    Intent<FragmentSlotType>,
    "headNode" | "tailNode"
  > as Slot<FragmentSlotType>;
}
