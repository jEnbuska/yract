import type { ElementPatch, ElementProps } from "./types";
import type { TagNamespace } from "../elements/namespaces";

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
 * Props that never become attributes. `value` is written separately, as a controlled value.
 * @internal
 */
export function isReservedProp(key: string): boolean {
  switch (key) {
    case "key":
    case "deps":
    case "children":
    case "value":
      return true;
    default:
      return false;
  }
}

/**
 * `isReservedProp` for checkboxes and radios, where `checked` is the controlled value.
 * @internal
 */
export function isReservedCheckableProp(key: string): boolean {
  switch (key) {
    case "key":
    case "deps":
    case "children":
    case "checked":
      return true;
    default:
      return false;
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
