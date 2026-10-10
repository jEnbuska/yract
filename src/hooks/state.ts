import { createResolvable } from "../create-resolvable";
import { type StateHookDescriptor } from "./hook-descriptors";
import { depsChanged } from "../general";
import type { DependencyList, PartialBy } from "../general-types";
import { $STATE } from "./constants";
import type { Fiber } from "../instances/types";
import type { SetState, StateHookState } from "./hook-states";

/**
 * Persistent state hook.
 *
 * @example
 * function* Counter() {
 *   const [count, setCount] = yield* useState(0);
 *   return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
 * }
 */

export function useState<T>(
  initialValue: T | (() => T),
  deps?: DependencyList,
): Generator<StateHookDescriptor<T>, [T, SetState<T>]>;
export function useState<T>(
  initialValue?: undefined,
  deps?: DependencyList,
): Generator<StateHookDescriptor<T | undefined>, [T | undefined, SetState<T>]>;
export function* useState(
  initialValue: unknown | (() => unknown),
  deps: DependencyList = [],
): Generator<StateHookDescriptor, [unknown, SetState]> {
  const { value, setState }: StateHookState = yield {
    type: $STATE,
    initialValue,
    deps,
  } satisfies StateHookDescriptor;
  return [value, setState] as const;
}

/** @internal */
export function processState(
  descriptor: StateHookDescriptor,
  prev: StateHookState | undefined,
  fiber: Fiber,
): StateHookState {
  if (!prev) {
    const value = resolveValue(descriptor.initialValue);
    const state = {
      type: $STATE,
      value,
      pendingValue: value,
      deps: descriptor.deps,
      setState: undefined,
    } satisfies PartialBy<StateHookState, "setState"> as any as StateHookState;
    state.setState = createStateSetter(fiber, state);
    return state;
  }

  if (depsChanged(prev.deps, descriptor.deps)) {
    const value = resolveValue(descriptor.initialValue);
    prev.value = value;
    prev.pendingValue = value;
    prev.pendingResolve = undefined;
    prev.deps = descriptor.deps;
    return prev;
  }
  prev.value = prev.pendingValue;
  return prev;
}

function resolveValue<T>(initialValue: T | (() => T)): T {
  return typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
}

const cache = new WeakMap<Omit<StateHookState, "setState">, (newValue: unknown) => Promise<void>>();
/** @internal */
function createStateSetter(fiber: Fiber, state: Omit<StateHookState, "setState">): SetState {
  const { scheduler } = fiber;
  const cached = cache.get(state);
  if (cached) return cached;
  return (newValue): Promise<void> => {
    const nextValue = resolveNextValue(newValue, state.pendingValue);
    // No change — cancel any pending rerender and resolve immediately.
    if (nextValue === state.value) {
      state.pendingValue = state.value;
      state.pendingResolve = undefined;
      return Promise.resolve();
    }

    // Same value already pending — don't reschedule, but return a new
    // promise that resolves when the already-scheduled rerender completes.
    if (nextValue === state.pendingValue) {
      const { promise, resolve } = createResolvable();
      state.pendingResolve = resolve;
      return promise;
    }

    // New value — abandon any previous pending promise (it will never
    // resolve), schedule a rerender, and return a new promise that
    // resolves when the rerender completes.
    state.pendingValue = nextValue;
    const { promise, resolve } = createResolvable();
    state.pendingResolve = resolve;
    scheduler.scheduleRender(fiber, false);
    scheduler.scheduleStateResolve(fiber);
    return promise;
  };
}

function resolveNextValue<T>(value: T | ((prev: T) => T), currentPendingValue: T): T {
  return typeof value === "function" ? (value as (prev: T) => T)(currentPendingValue) : value;
}

/** @internal */
export function stateResolver(state: StateHookState) {
  state.pendingResolve?.();
  state.pendingResolve = undefined;
}
