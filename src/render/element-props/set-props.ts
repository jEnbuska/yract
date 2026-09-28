/**
 * DOM-writing half of element props: the initial mount, and applying the
 * `ElementPatch` that `diff-element-props.ts` computed. The DOM is write-only
 * here — nothing reads `.className`, `getAttribute` or `.value` back.
 */
import type { AnyElement } from "../elements/namespaces";
import { nodeNameSpace } from "../elements/namespaces";
import { isReservedProp, propsRecord } from "./utils";
import { registerElementEvent, unRegisterElementEvent } from "../elements/events";
import type { ElementPatch, ElementProps } from "./types";
import type { FieldSelectionMap, FieldValueMap } from "../../instances/types";
import { assignStyle } from "./style";
import { diffSetProps } from "./diff-set-props";

/**
 * Write every prop of a freshly created element.
 *
 * `value` goes last: it is clamped against `min`/`max`/`step`, which have to
 * be written first.
 * @internal
 */
export function applyElementInitialProps(element: AnyElement, props: ElementProps): void {
  const patch = diffSetProps(nodeNameSpace(element), {}, props, isReservedProp, undefined);
  if (patch) updateElementProps(element, patch);
  if ("value" in props) {
    (element as HTMLInputElement).value = `${propsRecord(props)["value"] ?? ""}`;
  }
}

/**
 * Apply a pre-computed `ElementPatch` to `el`. No diffing, no `Object.is`,
 * no access to the previous props — the caller has already decided what
 * needs to happen.
 * @internal
 */
export function updateElementProps(el: AnyElement, patch: ElementPatch) {
  const { removeAttrs, setAttrs } = patch;
  // Names arrive already translated for the element's namespace, so HTML,
  // SVG and MathML all take plain attribute calls.
  if (removeAttrs) {
    for (const name of removeAttrs) el.removeAttribute(name);
  }
  if (setAttrs) {
    for (const name in setAttrs) el.setAttribute(name, setAttrs[name]!);
  }
  if (patch.removeEvents) {
    for (const key of patch.removeEvents) unRegisterElementEvent(el, key);
  }
  if (patch.setEvents) {
    for (const key in patch.setEvents) {
      registerElementEvent(el, key, patch.setEvents[key]!);
    }
  }
  if (patch.style === null) {
    el.style.cssText = "";
  } else if (patch.style) {
    assignStyle(el, patch.style);
  }
}

/** @internal */
export function updateElementControlledProps(
  node: AnyElement,
  change: boolean | string,
  valueMap: FieldValueMap,
  selectionMap: FieldSelectionMap,
) {
  valueMap.set(node, change);
  const formElement = node as HTMLInputElement; // Might actually be textarea or select
  if (typeof change === "boolean") {
    formElement.checked = change;
    return;
  }
  formElement.value = change as string;
  const selectionStart = selectionMap.get(formElement);
  if (selectionStart != null) {
    formElement.setSelectionRange(selectionStart, selectionStart);
  }
}
