/**
 * SVG attribute-name rules, used by `prop-key.ts` to turn JSX prop
 * names into SVG attribute names.
 */

/**
 * SVG attributes that are intrinsically camelCase and must NOT be kebab-cased
 * when written to the DOM. Everything else in SVG that arrives as JSX
 * camelCase converts to kebab-case (`textAnchor` → `text-anchor`).
 *
 * Sourced from the SVG 2 spec; see also React's DOMProperty tables.
 */
/** @internal */
export const SVG_CASED_ATTRS: ReadonlySet<string> = new Set([
  "attributeName",
  "attributeType",
  "baseFrequency",
  "baseProfile",
  "calcMode",
  "clipPathUnits",
  "diffuseConstant",
  "edgeMode",
  "filterUnits",
  "glyphRef",
  "gradientTransform",
  "gradientUnits",
  "kernelMatrix",
  "kernelUnitLength",
  "keyPoints",
  "keySplines",
  "keyTimes",
  "lengthAdjust",
  "limitingConeAngle",
  "markerHeight",
  "markerUnits",
  "markerWidth",
  "maskContentUnits",
  "maskUnits",
  "numOctaves",
  "pathLength",
  "patternContentUnits",
  "patternTransform",
  "patternUnits",
  "pointsAtX",
  "pointsAtY",
  "pointsAtZ",
  "preserveAlpha",
  "preserveAspectRatio",
  "primitiveUnits",
  "refX",
  "refY",
  "repeatCount",
  "repeatDur",
  "requiredExtensions",
  "requiredFeatures",
  "specularConstant",
  "specularExponent",
  "spreadMethod",
  "startOffset",
  "stdDeviation",
  "stitchTiles",
  "surfaceScale",
  "systemLanguage",
  "tableValues",
  "targetX",
  "targetY",
  "textLength",
  "viewBox",
  "xChannelSelector",
  "yChannelSelector",
  "zoomAndPan",
]);

/** @internal */
export const camelToKebab = (s: string): string =>
  s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
