import type {
  componentSlotType,
  contextSlotType,
  elementSlotType,
  fragmentSlotType,
  textSlotType,
} from "./constants";
import type { Fiber } from "../instances/types";
import type { Children, Component, Context, DependencyList } from "yract";
import type { ElementProps } from "../render/element-props/types";
import type { AnyElement } from "../render/elements/namespaces";
import type { DraftBy } from "../general-types";
import type { Intent } from "./intent";

export type TextSlotType = typeof textSlotType;
export type ElementSlotType = typeof elementSlotType;
export type FragmentSlotType = typeof fragmentSlotType;
export type ComponentSlotType = typeof componentSlotType;
export type ContextSlotType = typeof contextSlotType;
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
export type SlotSlots<T extends SlotType> = T extends TextSlotType
  ? undefined
  : ReadonlyMap<string, Slot>;
export type SlotHeadNode<T extends SlotType = SlotType> = T extends TextSlotType
  ? Text
  : T extends ElementSlotType
    ? AnyElement
    : Comment;
export type SlotTailNode<T extends SlotType = SlotType> = T extends TextSlotType
  ? undefined
  : T extends ElementSlotType
    ? undefined
    : Comment;
export type SlotInstance<T extends SlotType> = T extends ComponentSlotType | ContextSlotType
  ? Fiber
  : undefined;
export type Slot<T extends SlotType = SlotType> = T extends SlotType ? SlotBase<T> : never;
export type SlotElement<T extends SlotType> = T extends ElementSlotType ? string : undefined;
export type SlotText<T extends SlotType> = T extends TextSlotType ? string : undefined;
export type SlotProps<T extends SlotType> = T extends ComponentSlotType
  ? Record<string, unknown> & { deps?: DependencyList; key?: string }
  : T extends ContextSlotType
    ? { deps?: DependencyList; key?: string; value: unknown }
    : T extends ElementSlotType
      ? ElementProps
      : undefined;
export type SlotComponent<T extends SlotType> = T extends ComponentSlotType | ContextSlotType
  ? Component<any>
  : undefined;
export type SlotContext<T extends SlotType> = T extends ContextSlotType
  ? Context
  : T extends ComponentSlotType
    ? Context | undefined
    : undefined;
export type SlotChildren<T extends SlotType> = T extends ElementSlotType | FragmentSlotType
  ? ReadonlyArray<Children>
  : undefined;

type DraftSlotType = ComponentSlotType | ContextSlotType | FragmentSlotType | ElementSlotType;

export type Draft<T extends DraftSlotType = DraftSlotType> = T extends DraftSlotType
  ? DraftBy<Intent<T>, "index" | "path" | "instance" | "key">
  : never;
