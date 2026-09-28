import type { AnyElement } from "../render/elements/namespaces";
import type { Children, Component } from "../jsx";
import type { Context } from "../context";
import type { Intent } from "./intent";
import type { ElementRef } from "../render/element-props";
import type { DependencyList, DraftBy } from "../general-types";
import type { Fiber } from "../instances/types";

/** @internal */
export const textSlotType = "yract-text" as const;
/** @internal */
export type TextSlotType = typeof textSlotType;
/** @internal */
export const elementSlotType = "yract-element" as const;
/** @internal */
export type ElementSlotType = typeof elementSlotType;
/** @internal */
export const fragmentSlotType = "yract-fragment" as const;
/** @internal */
export type FragmentSlotType = typeof fragmentSlotType;
/** @internal */
export const componentSlotType = "yract-component" as const;
/** @internal */
export type ComponentSlotType = typeof componentSlotType;
/** @internal */
export const contextSlotType = "yract-context" as const;
/** @internal */
export type ContextSlotType = typeof contextSlotType;

/** @internal */
export type SlotType =
  | TextSlotType
  | ElementSlotType
  | FragmentSlotType
  | ComponentSlotType
  | ContextSlotType;

type SlotBase<T extends SlotType> = T extends SlotType
  ? {
      /* original key from _jsx*/
      _key: string | undefined;
      children: SlotChildren<T>;
      component: SlotComponent<T>;
      context: SlotContext<T>;
      element: SlotElement<T>;
      headNode: SlotHeadNode<T>;
      index: number;
      instance: SlotInstance<T>;
      key: string;
      stable: undefined | boolean;
      path: string;
      prevProps: SlotProps<T>;
      prevText: SlotText<T>;
      props: SlotProps<T>;
      slots: SlotSlots<T>;
      tailNode: SlotTailNode<T>;
      text: SlotText<T>;
      type: T;
    }
  : never;

/** @internal */
export type SlotSlots<T extends SlotType> = T extends TextSlotType
  ? undefined
  : ReadonlyMap<string, Slot>;

/** @internal */
export type SlotHeadNode<T extends SlotType = SlotType> = T extends TextSlotType
  ? Text
  : T extends ElementSlotType
    ? AnyElement
    : Comment;

/** @internal */
export type SlotTailNode<T extends SlotType = SlotType> = T extends TextSlotType
  ? undefined
  : T extends ElementSlotType
    ? undefined
    : Comment;

/** @internal */
export type SlotInstance<T extends SlotType> = T extends ComponentSlotType | ContextSlotType
  ? Fiber
  : undefined;

/** @internal */
export type Slot<T extends SlotType = SlotType> = T extends SlotType ? SlotBase<T> : never;

/** @internal */
export type SlotElement<T extends SlotType> = T extends ElementSlotType ? string : undefined;

/** @internal */
export type SlotText<T extends SlotType> = T extends TextSlotType ? string : undefined;

/** @internal */
export type SlotProps<T extends SlotType> = T extends ComponentSlotType
  ? Record<string, unknown> & { deps?: DependencyList; key?: string }
  : T extends ContextSlotType
    ? { deps?: DependencyList; key?: string; value: unknown }
    : T extends ElementSlotType
      ? Record<string, unknown> & { ref?: ElementRef; children?: SlotChildren<T> }
      : undefined;

/** @internal */
export type SlotComponent<T extends SlotType> = T extends ComponentSlotType | ContextSlotType
  ? Component<any>
  : undefined;

/** @internal */
export type SlotContext<T extends SlotType> = T extends ContextSlotType
  ? Context
  : T extends ComponentSlotType
    ? Context | undefined
    : undefined;

/** @internal */
export type SlotChildren<T extends SlotType> = T extends ElementSlotType | FragmentSlotType
  ? ReadonlyArray<Children>
  : undefined;

/** @internal */
export function extendIntentWithInstance(
  intent: Intent<ComponentSlotType | ContextSlotType>,
  fiber: Fiber,
): asserts intent is Slot<ComponentSlotType> {
  const { headNode, tailNode } = fiber;
  intent.headNode = headNode;
  intent.tailNode = tailNode;
  intent.instance = fiber;
}

/** @internal */
export function extendIntentNodes(
  intent: Intent<ComponentSlotType | ContextSlotType>,
): DraftBy<Slot<ComponentSlotType>, "instance"> {
  const { name } = intent.component;
  intent.headNode = document.createComment(`<${name}>`);
  intent.tailNode = document.createComment(`</${name}>`);
  return intent as DraftBy<Slot<ComponentSlotType>, "instance">;
}
/** @internal */
export function createSlotPath(key: string, parentPath: string) {
  return `${parentPath}/${key}`;
}
