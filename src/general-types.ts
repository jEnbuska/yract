import type { Child } from "./jsx";
import type { HookDescriptor } from "./hooks/types";
import type { CapabilityDescriptor } from "./capabilities/types";

export type DraftBy<T extends Record<PropertyKey, any>, K extends keyof T> = Omit<T, K> & {
  [key in K]: undefined | T[key];
};
/**
 * Hook dependency list type, aligned with React 19's `DependencyList`.
 *
 * A read-only array of values compared via shallow `Object.is` by the
 * renderer. Hooks re-run only when at least one element changes.
 */
export type DependencyList = readonly unknown[];
/**
 * Generator type returned by hook functions and component bodies.
 *
 * `TReturn` (first param) is what the generator returns — typically `Child`
 * for components or a hook-specific result type.
 *
 * `TYield` (second param) is the set of values the generator may yield.
 * Defaults to `HookDescriptor | Child` — the full union a component body
 * can produce via `yield*` delegation.
 */
export type ComponentGenerator<
  TReturn = Child,
  TYield = HookDescriptor | CapabilityDescriptor,
> = Generator<TYield, TReturn, unknown>;

export type RenderGenerator<T> = Generator<HookDescriptor | CapabilityDescriptor, T>;

export type PartialBy<T extends Record<PropertyKey, any>, K extends keyof T> = Omit<T, K> & {
  [key in K]?: NonNullable<T[K]>;
};
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
export type AnyFn = (...args: any[]) => any;

export type PublicOf<T> = { [P in keyof T]: T[P] };
