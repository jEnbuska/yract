import type { TagNamespace } from "../render/elements/namespaces";
import { createElement } from "../render/elements/create";
import type { Intent } from "./intent";
import type { DraftBy } from "../general-types";
import { applyElementInitialProps } from "../render/element-props/set-props";
import type {
  ComponentSlotType,
  ContextSlotType,
  ElementSlotType,
  FragmentSlotType,
  Slot,
  TextSlotType,
} from "./types";
import type { Fiber } from "../instances/types";

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
export function extendIntentWithInstance(
  intent: Intent<ComponentSlotType | ContextSlotType>,
  fiber: Fiber,
): asserts intent is Slot<ComponentSlotType> {
  const { headNode, tailNode } = fiber;
  intent.headNode = headNode;
  intent.tailNode = tailNode;
  intent.instance = fiber;
}

export function extendIntentNodes(
  intent: Intent<ComponentSlotType | ContextSlotType>,
): DraftBy<Slot<ComponentSlotType>, "instance"> {
  const { name } = intent.component;
  intent.headNode = document.createComment(`<${name}>`);
  intent.tailNode = document.createComment(`</${name}>`);
  return intent as DraftBy<Slot<ComponentSlotType>, "instance">;
}

export function createSlotPath(key: string, parentPath: string) {
  return `${parentPath}/${key}`;
}
