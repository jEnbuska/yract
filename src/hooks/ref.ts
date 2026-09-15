import type { RefHookState } from "../render/types";
import { type RefHookDescriptor } from "./types";
import { $REF } from "./constants";

/**
 * A mutable ref object whose `.current` persists across re-renders.
 */
export interface RefObject<T> {
  current: T;
}

export function* useRef<T>(initialValue: T): Generator<RefHookDescriptor<T>, RefObject<T>> {
  const result: RefHookState<T> = yield { type: $REF, initialValue } satisfies RefHookDescriptor<T>;
  return result.ref;
}

/** @internal */
export function processRef(descriptor: RefHookDescriptor, prev?: RefHookState): RefHookState {
  if (prev !== undefined) return prev;
  return { type: $REF, ref: { current: descriptor.initialValue } };
}
