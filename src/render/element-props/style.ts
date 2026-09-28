import type { AnyElement } from "../elements/namespaces";

/**
 * Per-key style patch when both prev and next are style objects. A key that
 * became `undefined` or disappeared is emitted as `""`, which clears it.
 * @internal
 */
export function diffStyle(
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
 * Write a style object onto an element.
 *
 * CSS custom properties (`--x`) are not members of `CSSStyleDeclaration`, so
 * they have to go through `setProperty`; everything else is assigned directly.
 * @internal
 */
export function assignStyle(el: AnyElement, style: Record<string, unknown>): void {
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
