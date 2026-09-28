import type { ComponentSlotType, ContextSlotType, ElementSlotType, FragmentSlotType } from "./slot";
import type { DraftBy } from "../general-types";
import type { Intent } from "./intent";
import type { Children, Component, FrameworkProps } from "../jsx";
import type { Context } from "../context";
import { componentSlotType, contextSlotType, elementSlotType, fragmentSlotType } from "./slot";

type DraftSlotType = ComponentSlotType | ContextSlotType | FragmentSlotType | ElementSlotType;

/** @internal */
export type Draft<T extends DraftSlotType = DraftSlotType> = T extends DraftSlotType
  ? DraftBy<Intent<T>, "index" | "path" | "instance" | "key">
  : never;
/** @internal */
export function asFragmentDraft(
  _key: string | undefined,
  children: Children[] | readonly Children[],
): Draft<FragmentSlotType> {
  return {
    _key,
    children,
    component: undefined,
    context: undefined,
    element: undefined,
    headNode: undefined,
    index: undefined,
    instance: undefined,
    key: undefined,
    stable: undefined,
    path: undefined,
    prevProps: undefined,
    prevText: undefined,
    props: undefined,
    slots: undefined,
    tailNode: undefined,
    text: undefined,
    type: fragmentSlotType,
  };
}

/** @internal */
export function asContextDraft(
  _key: string | undefined,
  context: Context,
  props: Record<string, unknown> & { value: unknown },
): Draft<ContextSlotType> {
  return {
    _key,
    children: undefined,
    component: context.Provider,
    context,
    element: undefined,
    headNode: undefined,
    index: undefined,
    instance: undefined,
    key: undefined,
    stable: undefined,
    path: undefined,
    prevProps: undefined,
    prevText: undefined,
    props,
    slots: undefined,
    tailNode: undefined,
    text: undefined,
    type: contextSlotType,
  };
}

/** @internal */
export function asElementDraft(
  _key: string | undefined,
  element: string,
  props: Record<string, unknown> & FrameworkProps,
  children: Children[] | readonly Children[],
): Draft<ElementSlotType> {
  return {
    _key,
    children,
    component: undefined,
    context: undefined,
    element,
    headNode: undefined,
    index: undefined,
    instance: undefined,
    key: undefined,
    stable: undefined,
    path: undefined,
    prevProps: undefined,
    prevText: undefined,
    props,
    slots: undefined,
    tailNode: undefined,
    text: undefined,
    type: elementSlotType,
  };
}

/** @internal */
export function asComponentDraft(
  _key: string | undefined,
  component: Component,
  props: Record<string, unknown> & FrameworkProps,
): Draft<ComponentSlotType> {
  return {
    _key,
    children: undefined,
    component,
    context: undefined,
    element: undefined,
    headNode: undefined,
    index: undefined,
    instance: undefined,
    key: undefined,
    stable: undefined,
    path: undefined,
    prevProps: undefined,
    prevText: undefined,
    props,
    slots: undefined,
    tailNode: undefined,
    text: undefined,
    type: componentSlotType,
  };
}
/** @internal */
export function ensureFreshComponentDraft(draft: Draft<ComponentSlotType>) {
  if (!draft.key) return draft;
  return asComponentDraft(draft._key, draft.component, draft.props);
}

/** @internal */
export function ensureFreshElementDraft(draft: Draft<ElementSlotType>) {
  if (!draft.key) return draft;
  return asElementDraft(draft._key, draft.element, draft.props, draft.children);
}

/** @internal */
export function ensureFreshFragmentDraft(draft: Draft<FragmentSlotType>) {
  if (!draft.key) return draft;
  return asFragmentDraft(draft._key, draft.children);
}

/** @internal */
export function ensureFreshContextDraft(draft: Draft<ContextSlotType>) {
  if (!draft.key) return draft;
  return asContextDraft(draft._key, draft.context, draft.props);
}
