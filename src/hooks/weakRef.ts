import type { WeakRefHookState } from "../render/types";

import { $WEAK_REF } from "./constants";
import type { WeakRefHookDescriptor } from "./types";
import type { WeakRefLike } from "../render/element-props";

export function* useWeakRef<T extends WeakKey>(
  initial?: T,
): Generator<WeakRefHookDescriptor, WeakRefLike<T>> {
  const result: WeakRefHookState<T> = yield {
    type: $WEAK_REF,
    initial,
  } satisfies WeakRefHookDescriptor<T>;
  return result.ref;
}

export const weakRefSymbol = Symbol($WEAK_REF);
/** @internal */
export function processWeakRef(prev?: WeakRefHookState): WeakRefHookState {
  if (prev !== undefined) return prev;
  let current: WeakRef<WeakKey> | undefined;
  return {
    type: $WEAK_REF,
    ref: {
      [weakRefSymbol]: true,
      get current(): undefined | WeakKey {
        return current?.deref();
      },
      set current(value: WeakKey | undefined) {
        if (value === undefined) current = undefined;
        else current = new WeakRef(value);
      },
    },
  };
}
