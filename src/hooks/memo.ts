import type { MemoHookState } from "../render/types";
import type { MemoHookDescriptor } from "./types";
import { depsChanged } from "../general";
import { $MEMO } from "./constants";
import type { DependencyList } from "../general-types";

/**
 * Memoized value hook. Re-computes only when deps change.
 * Dependency values are forwarded as arguments to the factory.
 */

export function useMemo<T, const Deps extends any[]>(
  fn: (...args: Deps) => T,
  deps: [...Deps, ...any[]],
): Generator<MemoHookDescriptor<T, Deps>, T>;
export function useMemo<T>(
  fn: (...args: DependencyList) => T,
  deps: DependencyList,
): Generator<MemoHookDescriptor<T>, T>;
export function* useMemo(
  fn: (...args: DependencyList) => any,
  deps: DependencyList,
): Generator<MemoHookDescriptor<any>> {
  const result: MemoHookState<any> = yield { type: $MEMO, fn, deps } satisfies MemoHookDescriptor;
  return result.value;
}

/** @internal */
export function processMemo(descriptor: MemoHookDescriptor, prev?: MemoHookState): MemoHookState {
  if (prev !== undefined && !depsChanged(prev.deps, descriptor.deps)) return prev;
  return {
    type: $MEMO,
    value: descriptor.fn(...descriptor.deps),
    deps: descriptor.deps,
  };
}
