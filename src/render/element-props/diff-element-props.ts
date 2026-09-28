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
import { createPatch, isReservedCheckableProp, isReservedProp, propsRecord } from "./utils";
import { HTML_NS, type TagNamespace } from "../elements/namespaces";

/**
 * Removals first (`diffUnsetProps`), then writes (`diffSetProps`).
 * @internal
 */
export function diffElementProps(
  ns: TagNamespace,
  prevProps: ElementProps,
  nextProps: ElementProps,
  isReservedPropPredicate = isReservedProp,
): ElementPatch | undefined {
  if (prevProps === nextProps) {
    return undefined;
  }
  const patch = diffUnsetProps(ns, prevProps, nextProps, isReservedPropPredicate);
  return diffSetProps(ns, prevProps, nextProps, isReservedPropPredicate, patch);
}

/** `checked` is carried by `setControlled`, so the normal diff skips it. */
function diffCheckableProps(
  prevProps: ElementProps,
  nextProps: ElementProps,
): ElementPatch | undefined {
  let patch = diffElementProps(HTML_NS, prevProps, nextProps, isReservedCheckableProp);
  const next = Boolean(propsRecord(nextProps)["checked"]);
  const prev = Boolean(propsRecord(prevProps)["checked"]);
  if (next === prev) return patch;
  patch ??= createPatch(HTML_NS);
  patch.setControlled = next;
  return patch;
}

/** `value` is carried by `setControlled`; `isReservedProp` already skips it. */
function diffValueProps(
  prevProps: ElementProps,
  nextProps: ElementProps,
): ElementPatch | undefined {
  let patch = diffElementProps(HTML_NS, prevProps, nextProps);
  const next = String(propsRecord(nextProps)["value"] ?? "");
  const prev = String(propsRecord(prevProps)["value"] ?? "");
  if (next === prev) return patch;
  patch ??= createPatch(HTML_NS);
  patch.setControlled = next;
  return patch;
}

/**
 * Entry point for the reconciler: picks the controlled-value variant by tag.
 * Only HTML form fields are controlled; an `<input>` in another namespace is
 * an unknown element there, so it gets a plain attribute diff.
 * @internal
 */
export function diffAnyElementProps(
  ns: TagNamespace,
  tagName: string,
  prevProps: ElementProps,
  nextProps: ElementProps,
): ElementPatch | undefined {
  if (ns !== HTML_NS) return diffElementProps(ns, prevProps, nextProps);
  switch (tagName) {
    case "input": {
      const { type } = propsRecord(nextProps);
      if (type === "checkbox" || type === "radio") {
        return diffCheckableProps(prevProps, nextProps);
      }
      // Every other input type is value-controlled, same as select/textarea.
      else return diffValueProps(prevProps, nextProps);
    }
    case "select":
    case "textarea":
      return diffValueProps(prevProps, nextProps);
    default:
      return diffElementProps(HTML_NS, prevProps, nextProps);
  }
}
