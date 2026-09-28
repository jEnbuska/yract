import type { ElementSlotType, FragmentSlotType, Slot, TextSlotType } from "./slot";
import type { TagNamespace } from "../render/elements/namespaces";
import { createElement } from "../render/elements/create";
import { applyElementInitialProps } from "../render/element-props";
import type { Intent } from "./intent";
import type { DraftBy } from "../general-types";

/** @internal */
export function toTextSlot(intent: Intent<TextSlotType>): Slot<TextSlotType> {
  const text = intent.text;
  intent.headNode = document.createTextNode(text);
  return intent satisfies DraftBy<
    Slot<TextSlotType>,
    "headNode" | "prevText"
  > as Slot<TextSlotType>;
}

/** @internal */
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

/** @internal */
export function toFragmentSlot(intent: Intent<FragmentSlotType>): Slot<FragmentSlotType> {
  intent.headNode = document.createComment("<Fragment>");
  intent.tailNode = document.createComment("</Fragment>");
  return intent satisfies DraftBy<
    Intent<FragmentSlotType>,
    "headNode" | "tailNode"
  > as Slot<FragmentSlotType>;
}
