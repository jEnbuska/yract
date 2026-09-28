import type { ElementProps } from "../../render/element-props/types";

/**
 * Element props straight from a test, past the JSX types — for feeding the
 * runtime values the types forbid (null, non-function handlers, `once`, …).
 */
export function untyped(props: Record<string, unknown>): ElementProps {
  return props as ElementProps;
}
