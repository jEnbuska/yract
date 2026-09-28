/**
 * Form elements are always controlled: `value` / `checked`, never the
 * uncontrolled `defaultValue` / `defaultChecked`.
 */

// @ts-expect-error defaultValue is not supported; use value.
export const withDefaultValue = <input defaultValue="a" />;

// @ts-expect-error defaultChecked is not supported; use checked.
export const withDefaultChecked = <input type="checkbox" defaultChecked />;

export const controlled = <input value="a" onInput={() => {}} />;

/*
 * Attribute types: toggles are `boolean`, text is `string`, numbers are
 * `string | number`. Nothing accepts both `boolean` and `string`.
 */

// Toggles take booleans.
export const toggles = <input disabled readOnly={false} required />;

// @ts-expect-error a toggle does not take a string ("false" would still turn it on).
export const toggleAsString = <input disabled="false" />;

// Enumerated attributes take their string values.
export const enumerated = (
  <div aria-expanded="false" aria-checked="mixed" draggable="true" spellCheck="false" />
);

// @ts-expect-error aria states take "true" / "false", not booleans.
export const ariaAsBoolean = <div aria-expanded={false} />;

// @ts-expect-error draggable takes "true" / "false", not a boolean.
export const draggableAsBoolean = <div draggable />;

// data-* is typed `string | number`, but TypeScript does not check hyphenated
// JSX attribute names against an index signature, so `data-open={true}` still
// compiles (and is written as "true").

// Numeric attributes take numbers or numeric strings.
export const numeric = <td colSpan={2} rowSpan="3" tabIndex={0} aria-level={1} />;

// Presence-or-value attributes use "" for presence.
export const presence = <a download="" href="/r.pdf" />;
export const named = <a download="report.pdf" href="/r.pdf" />;
// capture: `true` lets the device pick the camera; or name one.
export const anyCamera = <input type="file" capture />;
export const frontCamera = <input type="file" capture="user" />;

// @ts-expect-error capture has no `false`; leave the prop out instead.
export const noCapture = <input type="file" capture={false} />;

// @ts-expect-error download is text; use download="" for "just download".
export const downloadAsBoolean = <a download href="/r.pdf" />;

// SVG numbers stay numbers; percentages are strings.
export const svg = (
  <svg>
    <rect x={0} y="10%" width={10} height="50%" pathLength={100} tabIndex={0} />
  </svg>
);
