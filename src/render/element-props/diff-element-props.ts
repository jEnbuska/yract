/**
 * Reconcile-time half of element props: compare prev and next props and
 * describe the DOM work as an `ElementPatch`, or `undefined` when nothing
 * observable changed. No DOM access; `set-props.ts` applies the patch at commit.
 *
 * `undefined` means "not passed" for attrs, events and style keys: a key set to
 * `undefined` is the same as a missing key, on either side.
 */
import type { ElementPatch, ElementProps } from "./types";
import { diffSetProps } from "./diff-set-props";
import { diffUnsetProps } from "./diff-unset-props";
import { createPatch, propsRecord, reservedPropsFor } from "./utils";
import type { TagNamespace } from "../elements/namespaces";

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
