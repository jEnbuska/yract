import type { ElementPatch, ElementProps } from "./types";
import { HTML_NS, type TagNamespace } from "../elements/namespaces";

/**
 * Key-by-key view of element props for the diff loops. Element prop types are
 * interfaces, which have no index signature, so this is the one place that widens them.
 * @internal
 */
export function propsRecord(props: ElementProps): Readonly<Record<string, unknown>> {
  return props as Readonly<Record<string, unknown>>;
}

/**
 * True for keys shaped like `on${UpperLetter}…` — matches the type-level
 * `on${Capitalize<EventName>}` convention produced by `EventHandlers`.
 * Rejects tokens like `once`/`online`/`onto` that happen to start with "on"
 * but aren't event handlers.
 *
 * Charcode test to avoid regex allocation on a hot reconcile path.
 * @internal
 */
export function isEventKey(key: string): boolean {
  if (key.length < 3) return false;
  if (key.charCodeAt(0) !== 111 /* 'o' */) return false;
  if (key.charCodeAt(1) !== 110 /* 'n' */) return false;
  const c = key.charCodeAt(2);
  return c >= 65 && c <= 90; // 'A'..'Z'
}

/**
 * Props that are never attributes on any element.
 * @internal
 */
export function isFrameworkProp(key: string): boolean {
  switch (key) {
    case "key":
    case "deps":
    case "children":
      return true;
    default:
      return false;
  }
}

/**
 * Framework props plus `value`, for fields whose value is controlled.
 * @internal
 */
export function isReservedValueProp(key: string): boolean {
  return key === "value" || isFrameworkProp(key);
}

/**
 * Framework props plus `checked`, for checkboxes and radios.
 * @internal
 */
export function isReservedCheckedProp(key: string): boolean {
  return key === "checked" || isFrameworkProp(key);
}

/**
 * The props that `el` does not write as attributes. Only HTML form fields
 * control a value (written as a DOM property instead); on every other element
 * `value` and `checked` are ordinary attributes.
 * @internal
 */
export function reservedPropsFor(
  ns: TagNamespace,
  tagName: string,
  type: unknown,
): (key: string) => boolean {
  if (ns !== HTML_NS) return isFrameworkProp;
  switch (tagName) {
    case "input":
      return type === "checkbox" || type === "radio" ? isReservedCheckedProp : isReservedValueProp;
    case "select":
    case "textarea":
      return isReservedValueProp;
    default:
      return isFrameworkProp;
  }
}

/**
 * An empty patch with every bucket present, so all patches share one shape.
 * @internal
 */
export function createPatch(ns: TagNamespace): ElementPatch {
  return {
    ns,
    removeAttrs: undefined,
    setAttrs: undefined,
    setControlled: undefined,
    removeEvents: undefined,
    setEvents: undefined,
    style: undefined,
  };
}
