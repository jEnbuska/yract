import type {
  ElementSlotType,
  FragmentSlotType,
  ShallowSlotType,
  Slot,
  TextSlotType,
} from "./slot";
import { shallowSlotType } from "./slot";
import { elementSlotType, fragmentSlotType, textSlotType } from "./slot";
import type { DelegationRoot } from "../render/delegation";
import type { TagNamespace } from "../render/elements/namespaces";
import { createElement } from "../render/elements/create";
import { applyElementProps, diffElementProps, updateElementProps } from "../render/element-props";
import type { Intent } from "./intent";
import type { DraftBy } from "../general-types";

export function updateWithPreparedSlot(
  intent: Intent<ElementSlotType | TextSlotType | FragmentSlotType | ShallowSlotType>,
  prev: Slot,
  delegationRoot: DelegationRoot,
): Slot<ElementSlotType | TextSlotType | FragmentSlotType | ShallowSlotType> {
  switch (intent.type) {
    case elementSlotType:
      return inheritElementSlot(intent, prev as Slot<ElementSlotType>, delegationRoot);
    case textSlotType:
      return inheritTextSlot(intent, prev as Slot<TextSlotType>);
    case fragmentSlotType:
      return inheritFragmentSlot(intent, prev as Slot<FragmentSlotType>);
    case shallowSlotType:
      return inheritShallowSlot(intent, prev as Slot<ShallowSlotType>);
    default:
      throw new Error(`Invalid slot ${JSON.stringify(intent satisfies never)}`);
  }
}

function inheritElementSlot(
  intent: Intent<ElementSlotType>,
  prev: Slot<ElementSlotType>,
  delegationRoot: DelegationRoot,
): Slot<ElementSlotType> {
  const { headNode } = prev;
  intent.headNode = headNode;
  const patch = diffElementProps(prev, intent.props);
  if (patch) {
    updateElementProps(headNode, patch, delegationRoot);
  }
  return intent satisfies DraftBy<
    Slot<ElementSlotType>,
    "headNode" | "tailNode" | "slots" | "prevProps"
  > as Slot<ElementSlotType>;
}

function inheritFragmentSlot(
  intent: Intent<FragmentSlotType>,
  prev: Slot<FragmentSlotType>,
): Slot<FragmentSlotType> {
  intent.headNode = prev.headNode;
  intent.tailNode = prev.tailNode;
  return intent as Slot<FragmentSlotType>;
}
function inheritShallowSlot(
  intent: Intent<ShallowSlotType>,
  prev: Slot<ShallowSlotType>,
): Slot<ShallowSlotType> {
  intent.headNode = prev.headNode;
  intent.tailNode = prev.tailNode;
  return intent as Slot<ShallowSlotType>;
}

function inheritTextSlot(
  intent: Intent<TextSlotType>,
  prev: Slot<TextSlotType>,
): Slot<TextSlotType> {
  const { headNode } = prev;
  intent.headNode = prev.headNode;
  const { text } = intent;
  if (prev.text !== text) {
    headNode.nodeValue = text;
  }
  return intent satisfies DraftBy<
    Slot<TextSlotType>,
    "headNode" | "prevText"
  > as Slot<TextSlotType>;
}

export function prepareSlotNodes(
  intent: Intent<ElementSlotType | TextSlotType | FragmentSlotType | ShallowSlotType>,
  delegationRoot: DelegationRoot,
  ns: TagNamespace | undefined,
): Slot<ElementSlotType | TextSlotType | FragmentSlotType | ShallowSlotType> {
  switch (intent.type) {
    case elementSlotType:
      return toElementSlot(intent, delegationRoot, ns!);
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

function toElementSlot(
  intent: Intent<ElementSlotType>,
  delegationRoot: DelegationRoot,
  ns: TagNamespace,
): Slot<ElementSlotType> {
  const { element, props } = intent;
  const node = createElement(ns, element);
  applyElementProps(node, props, delegationRoot);
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
