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
      deps: descriptor.deps,
      setState: undefined,
    } satisfies PartialBy<StateHookState, "setState"> as any as StateHookState;
    state.setState = createStateSetter(fiber, state);
    return state;
  }

  if (depsChanged(prev.deps, descriptor.deps)) {
    prev.value = resolveValue(descriptor.initialValue);
    prev.deps = descriptor.deps;
    return prev;
  }
  return prev;
}

function resolveValue<T>(initialValue: T | (() => T)): T {
  return typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
}

const cache = new WeakMap<Omit<StateHookState, "setState">, (newValue: unknown) => void>();
function createStateSetter(fiber: Fiber, state: Omit<StateHookState, "setState">): SetState {
  const { scheduler } = fiber;
  const cached = cache.get(state);
  if (cached) return cached;
  return (newValue): void => {
    const nextValue = resolveNextValue(newValue, state.value);
    // No change: nothing to rerender.
    if (nextValue === state.value) return;
    state.value = nextValue;
    scheduler.scheduleRender(fiber);
  };
}

function resolveNextValue<T>(value: T | ((currentValue: T) => T), currentValue: T): T {
  return typeof value === "function" ? (value as (currentValue: T) => T)(currentValue) : value;
}
