import { resolveEventProp } from "../delegation";
import type { ElementPatch, ElementProps } from "./types";
import { createPatch, isEventKey, propsRecord } from "./utils";
import { propKeyTranslator } from "./translate-prop";
import type { TagNamespace } from "../elements/namespaces";

/**
 * Removals: keys set in `prevProps` that are unset (`undefined`, `null`,
 * `false`) in `nextProps`, and handlers that are no longer functions.
 * @internal
 */
export function diffUnsetProps(
  ns: TagNamespace,
  prevProps: ElementProps,
  nextProps: ElementProps,
  isReserved: (key: string) => boolean,
): undefined | ElementPatch {
  let patch: ElementPatch | undefined;
  const ensure = (): ElementPatch => (patch ??= createPatch(ns));
  const translateKey = propKeyTranslator(ns);
  const prevRecord = propsRecord(prevProps);
  const nextRecord = propsRecord(nextProps);
  for (let key in prevRecord) {
    if (isReserved(key)) continue;
    const prev = prevRecord[key];
    switch (prev) {
      case false:
      case undefined:
      case null:
        continue;
    }
    const next = nextRecord[key];
    if (next != null && next !== false) continue;
    // Next value is not set, so remove it
    if (isEventKey(key)) {
      if (typeof next !== "function") {
        const { domEvent } = resolveEventProp(key);
        (ensure().removeEvents ??= []).push(domEvent);
      }
      continue;
    }
    if (key === "style") {
      ensure().style = null;
      continue;
    }
    (ensure().removeAttrs ??= []).push(translateKey(key));
  }
  return patch;
}
