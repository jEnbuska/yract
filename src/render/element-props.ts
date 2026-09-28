/**
 * applyElementProps / diffElementProps / updateElementProps.
 *
 * DOM is treated as a write-only sink — we never read `.className`,
 * `getAttribute`, `.value`, etc. The slot tree is the single source of
 * truth for what the DOM currently contains.
 *
 * Update path is split in two:
 *   1. `diffElementProps(prevProps, nextProps)` runs during reconcile.
 *      It produces an `ElementPatch | null` describing exactly the DOM
 *      operations needed — or `null` when nothing relevant changed.
 *      No DOM access.
 *   2. `updateElementProps(el, patch)` runs at commit.
 *      It just consumes the patch: no diffing, no `Object.is`, no prev
 *      props needed.
 *
 * Unified rule: **`undefined` means "not passed"** for attrs, events,
 * and nested style keys. A key with `undefined` value is indistinguishable
 * from the key being absent, on either side.
 *
 * Validation: event-prop values must be `function | undefined`, `style`
 * must be `object | undefined`. Anything else throws from the diff (and
 * from the initial-mount writer) so programming mistakes surface loudly.
 */
import {
  type ElementEventHandler,
  registerElementEvent,
  unRegisterElementEvent,
} from "./elements/events";
import { clearSvgElementAttr, isSvg, writeSvgAttr } from "./elements/svg";
import type { AnyElement } from "./elements/namespaces";
import type { FieldSelectionMap, FieldValueMap } from "../instances/types";
import { resolveEventProp } from "./delegation";
import type { AnyFn } from "../general-types";

// ── Key classification ─────────────────────────────────────────────────────

/**
 * True for keys shaped like `on${UpperLetter}…` — matches the type-level
 * `on${Capitalize<EventName>}` convention produced by `EventHandlers`.
 * Rejects tokens like `once`/`online`/`onto` that happen to start with "on"
 * but aren't event handlers.
 *
 * Charcode test to avoid regex allocation on a hot reconcile path.
 */
function isEventKey(key: string): boolean {
  if (key.length < 3) return false;
  if (key.charCodeAt(0) !== 111 /* 'o' */) return false;
  if (key.charCodeAt(1) !== 110 /* 'n' */) return false;
  const c = key.charCodeAt(2);
  return c >= 65 && c <= 90; // 'A'..'Z'
}

function isReservedProp(key: string): boolean {
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

function isReservedCheckableProp(key: string): boolean {
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
 * Write a style object onto an element.
 *
 * `Object.assign(el.style, …)` silently drops CSS custom properties: they are
 * not named members of `CSSStyleDeclaration`, so the assignment lands on the
 * object as a plain expando and never reaches CSS. Custom properties have to
 * go through `setProperty`, so route them there and assign the rest.
 */
function assignStyle(el: AnyElement, style: Record<string, unknown>): void {
  for (const key in style) {
    const value = style[key];
    if (key.startsWith("--")) {
      el.style.setProperty(key, value === undefined ? "" : `${value}`);
      continue;
    }
    // Plain assignment, without Object.assign's throwaway object per key.
    Reflect.set(el.style, key, value);
  }
}

/** Local shape for the `ref` prop — the universal `VNodeProps` type doesn't
 * declare `ref` (it lives on `HTMLAttributes`/`SVGAttributes` only), so the
 * @internal
 * runtime accesses it through this lightweight cast. */
export type ElementRef<T extends AnyElement = AnyElement> = {
  get current(): undefined | T;
  identifier: string;
};

// ── Initial mount ───────────────────────────────────────────────────────────

/** @internal */
export function applyElementInitialProps(
  element: AnyElement,
  props: Record<string, unknown>,
): void {
  if (isSvg(element)) {
    for (const key in props) {
      writeSvgAttr(element, key, props[key]);
    }
    return;
  }
  for (const key in props) {
    if (isReservedProp(key)) continue;
    const value = props[key];
    switch (value) {
      case false:
      case undefined:
      case null:
        continue;
      case true:
        element.setAttribute(key, "");
    }

    if (isEventKey(key)) {
      if (typeof value === "function") {
        const { domEvent } = resolveEventProp(key);
        registerElementEvent(element, domEvent, value as AnyFn);
      }
      continue;
    }
    switch (key) {
      case "style": {
        if (value) assignStyle(element, value as Record<string, unknown>);
        break;
      }
      case "className": {
        if (value) element.setAttribute("class", `${value}`);
        break;
      }
      case "htmlFor": {
        element.setAttribute("for", `${value}`);
        break;
      }
      case "ref": {
        element.setAttribute("data-yract-element-ref-id", `${(value as ElementRef)?.identifier}`);
        break;
      }
      default: {
        element.setAttribute(key, `${value}`);
        break;
      }
    }
  }
  if ("value" in props) {
    (element as HTMLInputElement).value = props["value"] as any;
  }
}

/**
 * The second half of the initial mount, run once the element's children exist.
 *
 * `value` is deferred this far for two independent reasons. It is clamped
 * against `min`/`max`/`step`, which `applyElementProps` has to write first; and
 * a `<select>` discards a value matching no `<option>`, so its children have to
 * be mounted before the assignment means anything.
 */

// ── Update: diff (at reconcile) + commit (at DOM write) ────────────────────

/**
 * Pre-computed DOM patch for an element whose props changed.
 *
 * Every field is optional — an empty patch shouldn't exist (the diff
 * returns `null` instead). The commit-phase writer iterates buckets in
 * order: `removeAttrs` → `removeEvents` → `style` → `setAttrs` →
 * `setEvents` → `refSwap`. The remove-before-set ordering matters for
 * event swaps between two different functions.
 *
 * `style === null` means "the whole style prop went away — clear inline
 * styles via `el.style.cssText = ""`". An object form carries per-property
 * writes — either a full replace (when prev had no style) or a delta
 * (when both sides had style objects). In the delta form, `""` values
 * clear individual style keys that went away.
 * @internal
 */
export interface ElementPatch {
  removeAttrs?: string[];
  setAttrs?: Record<string, string>;
  setControlled?: string | boolean;
  removeEvents?: string[];
  setEvents?: Record<string, ElementEventHandler>;
  style?: Record<string, unknown> | null;
}

/**
 * Build the per-key style patch when both prev and next are set objects.
 * Normalizes `undefined` style values to "unset" (the unified rule), so
 * the commit-writer only ever sees concrete values or `""` clears.
 */
function diffStyle(
  prevStyle: Record<string, unknown>,
  nextStyle: Record<string, unknown>,
): Record<string, unknown> | undefined {
  let styleDiff: Record<string, unknown> | undefined;

  for (const k in nextStyle) {
    if (!Object.hasOwn(nextStyle, k)) continue;
    const nv = nextStyle[k];
    const pv = prevStyle[k];
    if (nv === undefined) {
      if (pv !== undefined) (styleDiff ??= {})[k] = "";
      continue;
    }
    if (Object.is(nv, pv)) continue;
    (styleDiff ??= {})[k] = nv;
  }

  for (const k in prevStyle) {
    if (!Object.hasOwn(prevStyle, k)) continue;
    if (prevStyle[k] === undefined) continue;
    if (Object.hasOwn(nextStyle, k)) continue;
    (styleDiff ??= {})[k] = "";
  }

  return styleDiff;
}

/**
 * Walk prev+next props once and return a minimal `ElementPatch`, or `null`
 * when nothing observable changed. No DOM access.
 * @internal
 */
export function diffElementProps(
  prevProps: Record<string, unknown>,
  nextProps: Record<string, unknown>,
  isReservedPropPredicate = isReservedProp,
): ElementPatch | undefined {
  if (prevProps === nextProps) {
    return undefined;
  }
  let patch: ElementPatch | undefined;
  const ensure = (): ElementPatch =>
    (patch ??= {
      removeAttrs: undefined,
      setAttrs: undefined,
      setControlled: undefined,
      removeEvents: undefined,
      setEvents: undefined,
      style: undefined,
    });
  // Loop 1 — keys effectively set in prev but unset in next.
  for (let key in prevProps) {
    if (isReservedPropPredicate(key)) continue;
    const prev = prevProps[key];
    switch (prev) {
      case false:
      case undefined:
      case null:
        continue;
    }
    const next = nextProps[key];

    // Next value is not set, so remove it
    if (isEventKey(key)) {
      if (typeof next !== "function") {
        const { domEvent } = resolveEventProp(key);
        (ensure().removeEvents ??= []).push(domEvent);
      }
      continue;
    }
    if (next != null) continue;
    switch (key) {
      case "style": {
        ensure().style = null;
        break;
      }
      case "className": {
        if (prev) (ensure().removeAttrs ??= []).push("class");
        break;
      }
      case "htmlFor": {
        if (prev) (ensure().removeAttrs ??= []).push("for");
        break;
      }
      case "ref": {
        (ensure().removeAttrs ??= []).push("data-yract-element-ref-id");
        break;
      }
      default: {
        (ensure().removeAttrs ??= []).push(key);
        break;
      }
    }
  }
  // Loop 2 — keys effectively set in next with a different value than prev.
  for (const key in nextProps) {
    if (isReservedPropPredicate(key)) continue;
    const next = nextProps[key];
    const prev = prevProps[key];
    if (Object.is(next, prev)) continue;
    if (isEventKey(key)) {
      if (typeof next === "function") {
        const { domEvent } = resolveEventProp(key);
        (ensure().setEvents ??= {})[domEvent] = next as ElementEventHandler;
      }
      continue;
    }
    switch (next) {
      case true:
        (ensure().setAttrs ??= {})[key] = "";
        continue;
      case undefined:
      case null:
      case false: {
        if (prev) {
          switch (key) {
            case "style":
              ensure().style = null;
              break;
            case "className":
              (ensure().removeAttrs ??= []).push("class");
              break;
            case "htmlFor":
              (ensure().removeAttrs ??= []).push("for");
              break;
            default: {
              (ensure().removeAttrs ??= []).push(key);
              break;
            }
          }
          continue;
        }
      }
    }
    switch (key) {
      case "style": {
        if (prev == null) {
          ensure().style = next as Record<string, unknown>;
          break;
        }
        const styleDiff = diffStyle(
          prev as Record<string, unknown>,
          next as Record<string, unknown>,
        );
        if (styleDiff) ensure().style = styleDiff;
        break;
      }
      case "className": {
        (ensure().setAttrs ??= {})["class"] = `${next}`;
        break;
      }
      case "htmlFor": {
        (ensure().setAttrs ??= {})["for"] = `${next}`;
        break;
      }
      case "ref": {
        (ensure().setAttrs ??= {})["data-yract-element-ref-id"] =
          `${(next as ElementRef)?.identifier}`;
        break;
      }
      default: {
        (ensure().setAttrs ??= {})[key] = `${next}`;
        break;
      }
    }
  }
  return patch;
}

/** `checked` is carried by `setControlled`, so the normal diff skips it. */
function diffCheckableProps(
  prevProps: Record<string, unknown>,
  nextProps: Record<string, unknown>,
): ElementPatch | undefined {
  let patch = diffElementProps(prevProps, nextProps, isReservedCheckableProp);
  const next = Boolean(nextProps["checked"]);
  const prev = Boolean(prevProps["checked"]);
  if (next === prev) return patch;
  patch ??= {};
  patch.setControlled = next;
  return patch;
}

/** `value` is carried by `setControlled`; `isReservedProp` already skips it. */
function diffValueProps(
  prevProps: Record<string, unknown>,
  nextProps: Record<string, unknown>,
): ElementPatch | undefined {
  let patch = diffElementProps(prevProps, nextProps);
  const next = String(nextProps["value"] ?? "");
  const prev = String(prevProps["value"] ?? "");
  if (next === prev) return patch;
  patch ??= {};
  patch.setControlled = next;
  return patch;
}

/** @internal */
export function diffAnyElementProps(
  tagName: string,
  prevProps: Record<string, unknown>,
  nextProps: Record<string, unknown>,
): ElementPatch | undefined {
  switch (tagName) {
    case "input": {
      const type = nextProps["type"];
      if (type === "checkbox" || type === "radio") return diffCheckableProps(prevProps, nextProps);
      // Every other input type is value-controlled, same as select/textarea.
      return diffValueProps(prevProps, nextProps);
    }
    case "select":
    case "textarea":
      return diffValueProps(prevProps, nextProps);
    default:
      return diffElementProps(prevProps, nextProps);
  }
}

/**
 * Apply a pre-computed `ElementPatch` to `el`. No diffing, no `Object.is`,
 * no access to the previous props — the caller has already decided what
 * needs to happen.
 * @internal
 */
export function updateElementProps(el: AnyElement, patch: ElementPatch) {
  const isSvgElement = isSvg(el);
  if (patch.removeAttrs) {
    if (isSvgElement) {
      for (const key of patch.removeAttrs) clearSvgElementAttr(el, key);
    } else {
      for (const key of patch.removeAttrs) el.removeAttribute(key);
    }
  }
  if (patch.removeEvents) {
    for (const key of patch.removeEvents) unRegisterElementEvent(el, key);
  }
  if (patch.style === null) {
    el.style.cssText = "";
  } else if (patch.style) {
    assignStyle(el, patch.style);
  }
  if (patch.setAttrs) {
    const { setAttrs } = patch;
    if (isSvgElement) {
      for (const key in setAttrs) {
        writeSvgAttr(el, key, setAttrs[key]);
      }
    } else {
      for (const key in setAttrs) {
        el.setAttribute(key, setAttrs[key]!);
      }
    }
  }
  if (patch.setEvents) {
    for (const key in patch.setEvents) {
      registerElementEvent(el, key, patch.setEvents[key]!);
    }
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
    formElement.checked = change as boolean;
    return;
  }
  formElement.value = change as string;
  const selectionStart = selectionMap.get(formElement);
  if (selectionStart != null) {
    formElement.setSelectionRange(selectionStart, selectionStart);
  }
}
