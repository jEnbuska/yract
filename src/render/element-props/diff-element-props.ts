/**
 * Reconcile-time half of element props: compare prev and next props and
 * describe the DOM work as an `ElementPatch`, or `undefined` when nothing
 * observable changed. No DOM access; `set-props.ts` applies the patch at commit.
 *
 * `undefined` means "not passed" for attrs, events and style keys: a key set to
 * `undefined` is the same as a missing key, on either side.
 */
import type { ElementPatch, ElementProps, ElementRef } from "./types";
import { resolveEventProp } from "../delegation";
import type { ElementEventHandler } from "../elements/events";
import type { TagNamespace } from "../elements/namespaces";
import { diffStyle } from "./style";
import { isEventKey, propKeyTranslator, reservedPropsFor } from "./prop-key";
import { createPatch, propsRecord } from "./utils";

/**
 * Diff the props of one element. The single entry point for the reconciler.
 *
 * `reservedPropsFor` decides, exactly as the initial mount does, whether the
 * element controls `value` or `checked`. A controlled prop is left out of the
 * attribute diff and carried in `setControlled` instead.
 * @internal
 */
export function diffElementProps(
  ns: TagNamespace,
  tagName: string,
  prevProps: ElementProps,
  nextProps: ElementProps,
): ElementPatch | undefined {
  if (prevProps === nextProps) return undefined;
  const prevRecord = propsRecord(prevProps);
  const nextRecord = propsRecord(nextProps);
  const isReserved = reservedPropsFor(ns, tagName, nextRecord["type"]);
  // Removals first, then writes, so both land in one patch.
  let patch = diffUnsetProps(ns, prevProps, nextProps, isReserved);
  patch = diffSetProps(ns, prevProps, nextProps, isReserved, patch);
  if (isReserved("checked")) {
    const next = Boolean(nextRecord["checked"]);
    if (next !== Boolean(prevRecord["checked"])) {
      (patch ??= createPatch(ns)).setControlled = next;
    }
  } else if (isReserved("value")) {
    const next = String(nextRecord["value"] ?? "");
    if (next !== String(prevRecord["value"] ?? "")) {
      (patch ??= createPatch(ns)).setControlled = next;
    }
  }
  return patch;
}

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
    switch (next) {
      // Unset: diffUnsetProps already turned these into removals.
      case undefined:
      case null:
      case false:
        continue;
    }
    // `true` becomes "true": it turns a toggle on and is the "on" value of enumerated attributes.
    const value = key === "ref" ? (next as ElementRef).identifier : `${next}`;
    (ensure().setAttrs ??= {})[translateKey(key)] = value;
  }
  return patch;
}
