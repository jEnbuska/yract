import { resolveEventProp } from "../delegation";
import type { ElementEventHandler } from "../elements/events";
import { diffStyle } from "./style";
import type { ElementPatch, ElementProps } from "./types";
import { createPatch, isEventKey, propsRecord } from "./utils";
import { propKeyTranslator, translateJsxToHtmlPropValue } from "./translate-prop";
import type { TagNamespace } from "../elements/namespaces";

/**
 * Writes: keys set in `nextProps` with a value that differs from `prevProps`.
 * Adds to `patch` (from `diffUnsetProps`) or starts a new one.
 * @internal
 */
export function diffSetProps(
  ns: TagNamespace,
  prevProps: ElementProps,
  nextProps: ElementProps,
  isReserved: (key: string) => boolean,
  patch: ElementPatch | undefined,
): ElementPatch | undefined {
  const ensure = (): ElementPatch => (patch ??= createPatch(ns));
  const translateKey = propKeyTranslator(ns);
  const prevRecord = propsRecord(prevProps);
  const nextRecord = propsRecord(nextProps);
  for (const key in nextRecord) {
    if (isReserved(key)) continue;
    const next = nextRecord[key];
    const prev = prevRecord[key];
    if (Object.is(next, prev)) continue;
    if (isEventKey(key)) {
      if (typeof next === "function") {
        const { domEvent } = resolveEventProp(key);
        (ensure().setEvents ??= {})[domEvent] = next as ElementEventHandler;
      }
      continue;
    }
    if (key === "style") {
      if (next == null) continue;
      const diff = diffStyle(
        (prev as Record<string, unknown>) || {},
        next as Record<string, unknown>,
      );
      if (diff) ensure().style = diff;
      continue;
    }
    // Unset values were already turned into removals by diffUnsetProps.
    const value = translateJsxToHtmlPropValue(key, next);
    if (value === undefined) continue;
    (ensure().setAttrs ??= {})[translateKey(key)] = value;
  }
  return patch;
}
