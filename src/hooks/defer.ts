import { $DEFERRED } from "./constants";
import type { DeferredHookDescriptor } from "./hook-descriptors";
import type { Fiber } from "../instances/types";
import type { DeferredHookState } from "./hook-states";
import type { DependencyList } from "../general-types";
import { depsChanged } from "../general";
import { withDeferred } from "../capabilities/deferred";
import type { DeferredAcquirementDescriptor } from "../capabilities/types";

export function* useDefer<T>(
  value: T,
  deps?: DependencyList,
): Generator<DeferredAcquirementDescriptor | DeferredHookDescriptor<T>, [T, boolean]> {
  const result: DeferredHookState<T> = yield { type: $DEFERRED, value, deps } as const;
  const deferred = yield* withDeferred();
  return [
    deferred ? result.deferredValue : result.value,
    !deferred && !Object.is(result.value, result.deferredValue),
  ];
}

export function processDeferredValue(
  descriptor: DeferredHookDescriptor,
  state: DeferredHookState | undefined,
  fiber: Fiber,
): DeferredHookState {
  if (!state) {
    return {
      type: $DEFERRED,
      deferredValue: descriptor.value,
      value: descriptor.value,
      deps: descriptor.deps,
    };
  }
  if (Object.is(state.value, descriptor.value)) return state;
  if (depsChanged(state.deps, descriptor.deps)) {
    state.deferredValue = descriptor.value;
    state.deps = descriptor.deps;
  }

  const { scheduler, deferred } = fiber;
  if (!deferred) {
    scheduler.scheduleRender(fiber, true);
    scheduler.scheduleStateResolve(fiber);
  }
  return state;
}

export function deferredResolver(state: DeferredHookState) {
  state.value = state.deferredValue;
}
