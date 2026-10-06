/**
 * Everything about prop *names*: how a JSX prop name becomes an attribute
 * name in each namespace, and which names are events, framework props or
 * controlled values rather than attributes.
 */
import { HTML_NS, MATHML_NS, SVG_NS, type TagNamespace } from "../elements/namespaces";
import { camelToKebab, SVG_CASED_ATTRS } from "../elements/svg";
import type { ElementReservedExtraProp } from "./types";

/**
 * The attribute an element carries while a `ref` from `useElementRef` points at it.
 * @internal
 */
export const REF_ATTR = "data-yract-element-ref-id";

/**
 * JSX prop name → attribute name, for the names that differ by more than case.
 * Everything else passes through unchanged: HTML lowercases names in
 * `setAttribute` itself.
 */
function translateJsxToHtmlPropKey(jsxName: string): string {
  switch (jsxName) {
    case "className":
      return "class";
    case "htmlFor":
      return "for";
    case "acceptCharset":
      return "accept-charset";
    case "httpEquiv":
      return "http-equiv";
    case "ref":
      return REF_ATTR;
    default:
      return jsxName;
  }
}

/**
 * JSX prop name → SVG attribute name. SVG names are case-sensitive: most
 * camelCase props become kebab-case (`strokeWidth` → `stroke-width`) and a
 * fixed set keeps its casing (`viewBox`). SVG 2 only: links use plain `href`.
 */
function translateJsxToSvgPropKey(jsxName: string): string {
  switch (jsxName) {
    case "className":
      return "class";
    case "ref":
      return REF_ATTR;
  }
  if (SVG_CASED_ATTRS.has(jsxName)) return jsxName;
  return camelToKebab(jsxName);
}

/**
 * The key translator for elements in `ns`. MathML attribute names are plain
 * lowercase, so it shares the HTML rules.
 * @internal
 */
export function propKeyTranslator(ns: TagNamespace): (jsxName: string) => string {
  switch (ns) {
    case SVG_NS:
      return translateJsxToSvgPropKey;
    case HTML_NS:
    case MATHML_NS:
      return translateJsxToHtmlPropKey;
  }
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
 * Props that are never attributes on any element.
 * @internal
 */
export function isReservedElementProp(key: string): boolean {
  switch (key) {
    case "key":
    case "deps":
    case "children":
      return true;
    default:
      return false;
  }
}

/**
 * @internal
 */
export function getReservedExtraProp(
  ns: TagNamespace,
  element: { localName: string; type?: string },
): ElementReservedExtraProp {
  if (ns !== HTML_NS) return "";
  switch (element.localName) {
    case "textarea":
    case "select": {
      return "value";
    }
    case "input": {
      switch (element.type) {
        case "radio":
        case "checkbox": {
          return "checked";
        }
        case "file":
        case "hidden":
        case "button":
        case "submit":
        case "reset":
        case "image":
          return "";
        default: {
          return "value";
        }
      }
    }
    default:
      return "";
  }
}
