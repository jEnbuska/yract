import type { Context } from "../context";
import type { ComponentFiber } from "../instances/component-fiber";
import type { ContextHookDescriptor } from "./types";
import { createContextReason } from "../reasons";
import { depsChanged } from "../general";
import { $CONTEXT } from "./constants";

const defaultSelector = (value: unknown): unknown[] => [value];

/**
 * Consume a context value inside a component.
 *
 * **Overload 1 — no selector:** rerender whenever the provider value ref changes
 * (the default selector returns `[value]`, so object identity drives the diff).
 *
 * **Overload 2 — selector:** rerender only when the selected deps differ.
 *
 * **Overload 3 — selector + transform:** same rerender guard; the returned
 * value is `transform(...deps)` instead of the raw value.
 */
export function useContext<T>(
  ctx: Context<T>,
  depsSelector?: (ctx: T) => unknown[],
): Generator<ContextHookDescriptor, T>;
export function useContext<T, const D extends unknown[], R>(
  ctx: Context<T>,
  depsSelector: (ctx: T) => D,
  transform: (ctx: T, ...args: D) => R,
): Generator<ContextHookDescriptor, R>;
export function* useContext<T, D extends unknown[], R>(
  ctx: Context<T>,
  depsSelector: (ctx: T) => D = defaultSelector as (ctx: T) => D,
  transform?: (...args: D) => R,
): Generator<ContextHookDescriptor, T | R> {
  const value: ContextHookState<T, D> = yield {
    type: $CONTEXT,
    ctx: ctx as Context,
    depsSelector: depsSelector as ContextHookDescriptor["depsSelector"],
    transform: transform as ContextHookDescriptor["transform"],
  } satisfies ContextHookDescriptor;
  return value as T | R;
}

export interface ContextHookState<T = unknown, D = T> {
  type: typeof $CONTEXT;
  /** Unique symbol this hook uses when scheduling/unscheduling the instance. */
  reason: symbol;
  ctx: Context<T>;
  depsSelector: (ctx: unknown) => unknown[];
  transform?: (state: T, ...args: unknown[]) => D;
  /** Selected deps at the time of the most recent successful render. */
  lastRenderedDepsSelected: unknown[];
  /** Selected deps observed by the subscribe callback since the last render. */
  currentSelected: unknown[];
  lastTransformResult?: unknown;
  unsubscribe?: () => void;
  version: number;
  callback?: () => void;
}

/**
 * Build or refresh a ContextHookState for one `context` call.
 *
 * Pure state transition — no subscription side effect. The actual
 * subscribe happens in `BaseInstance.afterRender()` once the DOM has
 * been committed.
 *
 * First run: creates the state and seeds `lastRenderedDepsSelected`
 * from the current handle value.
 *
 * Re-run: freezes `lastRenderedDepsSelected := currentSelected` and
 * refreshes the selector/transform references (they rarely change, but may).
 */
export function processContext(
  instance: ComponentFiber,
  descriptor: ContextHookDescriptor,
  prev: ContextHookState | undefined,
): ContextHookState {
  const selector = (descriptor.depsSelector ?? defaultSelector) as (ctx: unknown) => unknown[];

  if (prev) {
    // Recompute the transform BEFORE snapping the baseline forward —
    // otherwise `getContextValue`'s cache check `depsChanged(baseline,
    // currentSelected)` would always see them equal and return the stale
    // cached result.
    if (descriptor.transform && depsChanged(prev.lastRenderedDepsSelected, prev.currentSelected)) {
      prev.lastTransformResult = descriptor.transform(...prev.currentSelected);
    }
    prev.lastRenderedDepsSelected = prev.currentSelected;
    prev.depsSelector = selector;
    prev.transform = descriptor.transform;
    return prev;
  }
  const handle = instance.ctx.get(descriptor.ctx.id);
  const state: ContextHookState = {
    type: $CONTEXT,
    version: handle?.version ?? -1,
    reason: createContextReason(),
    ctx: descriptor.ctx,
    depsSelector: selector,
    transform: descriptor.transform,
    lastRenderedDepsSelected: [],
    currentSelected: [],
    callback: () => {
      const current = state.depsSelector(handle!.ref.current);
      if (!depsChanged(state.lastRenderedDepsSelected, current)) {
        instance.cancelRender(state.reason);
      } else {
        state.currentSelected = current;
        instance.scheduleRender(state.reason);
      }
    },
  };

  if (!handle) return state;

  const initialSelected = state.depsSelector(handle.ref.current);
  state.lastRenderedDepsSelected = initialSelected;
  state.currentSelected = initialSelected;
  if (state.transform) {
    state.lastTransformResult = state.transform(
      instance.ctx.get(descriptor.ctx.id),
      ...initialSelected,
    );
  } else {
    state.lastTransformResult = handle.ref.current;
  }
  state.unsubscribe = handle.subscribe(state);
  return state;
}

/**
 * Value to return to the generator for a `context` yield. The transform
 * cache (`lastTransformResult`) is maintained by `processContext` — by the
 * time we reach here it's already up to date for the current `currentSelected`.
 */
export function getContextValue(state: ContextHookState, instance: ComponentFiber): unknown {
  const { ctx } = state;
  const provided = instance.ctx.get(ctx.id);
  if (!provided) return ctx.ref.current;
  if (state.transform) return state.lastTransformResult;
  return provided.ref.current;
}
