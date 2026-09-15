import type { StableHookState } from "../render/types";
import { type StableHookDescriptor } from "./types";

import { $STABLE } from "./constants";
import type { AnyFn, PartialBy } from "../general-types";

/**
 * Stable-identity function hook.
 *
 * Returns a wrapper whose identity never changes, but whose target function
 * is swapped each render so it always calls the latest `fn`. Useful for
 * passing stable event handlers to child components.
 */
export function* useStable<T extends AnyFn>(fn: T): Generator<StableHookDescriptor<T>, T> {
  const stable: StableHookState<T> = yield { type: $STABLE, fn } satisfies StableHookDescriptor<T>;
  return stable.callback;
}

/** @internal */
export function processStable(
  descriptor: StableHookDescriptor,
  prev?: StableHookState,
): StableHookState {
  if (prev) {
    prev.current = descriptor.fn;
    return prev;
  }
  const state = {
    type: $STABLE,
    current: descriptor.fn,
    callback: undefined,
  } satisfies PartialBy<StableHookState, "callback"> as any as StableHookState;
  state.callback = (...args: unknown[]) => state.current(...args);
  return state;
}
