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
