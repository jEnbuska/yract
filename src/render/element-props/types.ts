import type { ElementEventHandler } from "../elements/events";
import type { AnyElement } from "../elements/namespaces";
import type { IntrinsicElements } from "../../jsx-types";
import type { TagNamespace } from "../elements/namespaces";

/**
 * Props of any intrinsic element, HTML or SVG. Every field is optional.
 * @internal
 */
export type ElementProps = Partial<IntrinsicElements[keyof IntrinsicElements]>;

/**
 * Pre-computed DOM work for an element whose props changed. The diff returns
 * `undefined` instead of an empty patch.
 *
 * Applied in bucket order: `removeAttrs` → `removeEvents` → `style` →
 * `setAttrs` → `setEvents`; `setControlled` is written last, after the other
 * attributes it may be clamped against.
 *
 * - `removeEvents` / `setEvents` are keyed by DOM event name (`click`).
 * - `style: null` clears all inline styles; an object sets per-property
 *   values, where `""` clears one property.
 * @internal
 */
export interface ElementPatch {
  /** Namespace of the element the patch is for; attribute names are already translated for it. */
  ns: TagNamespace;
  removeAttrs?: string[];
  setAttrs?: Record<string, string>;
  setControlled?: string | boolean;
  removeEvents?: string[];
  setEvents?: Record<string, ElementEventHandler>;
  style?: Record<string, unknown> | null;
}

/**
 * The `ref` prop's runtime shape, as returned by `useElementRef`. The element
 * is tagged with `identifier` and looked up on each `current` read.
 * @internal
 */
export type ElementRef<T extends AnyElement = AnyElement> = {
  get current(): undefined | T;
  identifier: string;
};

export type ElementReservedExtraProp = "value" | "checked" | "";
