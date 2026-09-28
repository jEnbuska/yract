import type { ElementRef } from "./types";
import { HTML_NS, MATHML_NS, SVG_NS, type TagNamespace } from "../elements/namespaces";
import { camelToKebab, SVG_CASED_ATTRS } from "../elements/svg";

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
 * JSX prop value → attribute value, or `undefined` when the attribute should
 * be absent (`undefined`, `null`, `false`). `true` is written as `"true"`:
 * that turns a toggle on and is the valid "on" value of enumerated attributes.
 * @internal
 */
export function translateJsxToHtmlPropValue(jsxName: string, value: unknown): string | undefined {
  switch (value) {
    case undefined:
    case null:
    case false:
      return undefined;
  }
  if (jsxName === "ref") return (value as ElementRef).identifier;
  return `${value}`;
}
