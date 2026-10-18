import type { Child } from "./jsx";
import type { HookDescriptor } from "./hooks/hook-descriptors";
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
 * Generator type returned by component bodies and custom hooks.
 *
 * `TReturn` is what the generator returns: `Child` for components, or the
 * hook's result type for a custom hook.
 *
 * It may yield hook and capability descriptors (through `yield*`) or a
 * `Child`: `return yield child` ends the render early with that child.
 * `TNext` is `never` so that `return yield child` typechecks against
 * `TReturn`; values the driver sends back go to the built-in hooks, which
 * declare their own generator types.
 */
export type ComponentGenerator<
  TReturn = Child,
  TYield = HookDescriptor | CapabilityDescriptor,
> = Generator<TYield | Child, TReturn, never>;

export type PartialBy<T extends Record<PropertyKey, any>, K extends keyof T> = Omit<T, K> & {
  [key in K]?: NonNullable<T[K]>;
};
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
export type AnyFn = (...args: any[]) => any;

export type PublicOf<T> = { [P in keyof T]: T[P] };
