import { type CallbackHookDescriptor } from "./hook-descriptors";

import { $CALLBACK } from "./constants";
import type { AnyFn, PartialBy } from "../general-types";
import type { CallbackHookState } from "./hook-states";

/**
 * Stable-identity callback hook.
 *
 * Returns a wrapper whose identity never changes, but whose target function
 * is swapped each render so it always calls the latest `fn`. Useful for
 * passing stable event handlers to child components. Unlike React's
 * `useCallback`, it takes no dependency list.
 */
export function* useCallback<T extends AnyFn>(fn: T): Generator<CallbackHookDescriptor<T>, T> {
  const state: CallbackHookState<T> = yield {
    type: $CALLBACK,
    fn,
  } satisfies CallbackHookDescriptor<T>;
  return state.callback;
}

export function processCallback(
  descriptor: CallbackHookDescriptor,
  prev?: CallbackHookState,
): CallbackHookState {
  if (prev) {
    prev.current = descriptor.fn;
    return prev;
  }
  const state = {
    type: $CALLBACK,
    current: descriptor.fn,
    callback: undefined,
  } satisfies PartialBy<CallbackHookState, "callback"> as any as CallbackHookState;
  state.callback = (...args: unknown[]) => state.current(...args);
  return state;
}
