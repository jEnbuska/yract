import type { Child } from "./jsx";

/**
 * The call signature is type-level only — a shallow is never invoked as a
 * function. It exists so JSX has a signature to read `P` from; see `Context`,
 * which carries its `Provider` the same way.
 */
export type Shallow<P extends Record<string, any> = Record<string, never>> = {
  component: (props: P) => Child;
  Provider: undefined;
  (props: P): never;
};

export function shallow<P extends Record<string, any>>(component: (props: P) => Child): Shallow<P> {
  return {
    Provider: undefined,
    component,
  } as unknown as Shallow<P>;
}
