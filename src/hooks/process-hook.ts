import type { ComponentFiber } from "../instances/component-fiber";
import { HookRuleError } from "./HookRuleError";
import type { HookDescriptor } from "./hook-descriptors";
import {
  $CONTEXT,
  $EFFECT,
  $ID,
  $MEMO,
  $REF,
  $STABLE,
  $STATE,
  $ELEMENT_REF,
  $DEFERRED,
} from "./constants";
import { processState } from "./state";
import { processRef } from "./ref";
import { processElementRef } from "./elementRef";
import { processId } from "./id";
import { processMemo } from "./memo";
import { processStable } from "./stable";
import { processEffect } from "./effect";
import { getContextValue, processContext } from "./context";
import { processDeferredValue } from "./defer";
import type { HookState } from "./hook-states";

function getTypedPrev<K extends HookState["type"]>(
  hookStates: HookState[],
  hookIndex: number,
  expectedType: K,
  instance: ComponentFiber,
): Extract<HookState, { type: K }> | undefined {
  const prev = hookStates[hookIndex];
  if (prev === undefined) return undefined;
  if (prev.type !== expectedType) {
    throw new HookRuleError(
      instance,
      `Hook order mismatch at index ${hookIndex}: ` +
        `expected ${prev.type} (from previous render) but got ${expectedType}. ` +
        `Hooks must be called in the same order on every render.`,
    );
  }
  return prev as Extract<HookState, { type: K }>;
}

/**
 * Dispatch one hook descriptor, store its persistent state on the instance,
 * and return the value to feed back into `gen.next(...)`.
 * @internal
 */
export function processHook(
  descriptor: Exclude<HookDescriptor, { type: `$$${string}` }>,
  hookIndex: number,
  instance: ComponentFiber,
): unknown {
  const hookStates = (instance.hookStates ??= []);
  switch (descriptor.type) {
    case $REF: {
      const prev = getTypedPrev(hookStates, hookIndex, $REF, instance);
      const state = processRef(descriptor, prev);
      hookStates[hookIndex] = state;
      return state;
    }
    case $ELEMENT_REF: {
      const prev = getTypedPrev(hookStates, hookIndex, $ELEMENT_REF, instance);
      const state = processElementRef(prev);
      hookStates[hookIndex] = state;
      return state;
    }
    case $ID: {
      const prev = getTypedPrev(hookStates, hookIndex, $ID, instance);
      const state = processId(prev);
      hookStates[hookIndex] = state;
      return state;
    }
    case $MEMO: {
      const prev = getTypedPrev(hookStates, hookIndex, $MEMO, instance);
      const state = processMemo(descriptor, prev);
      hookStates[hookIndex] = state;
      return state;
    }
    case $STABLE: {
      const prev = getTypedPrev(hookStates, hookIndex, $STABLE, instance);
      const state = processStable(descriptor, prev);
      hookStates[hookIndex] = state;
      return state;
    }
    case $EFFECT: {
      const prev = getTypedPrev(hookStates, hookIndex, $EFFECT, instance);
      const state = processEffect(instance, descriptor, prev);
      hookStates[hookIndex] = state;
      return state;
    }
    case $CONTEXT: {
      const prev = getTypedPrev(hookStates, hookIndex, $CONTEXT, instance);
      const state = processContext(instance, descriptor, prev);
      hookStates[hookIndex] = state;
      return getContextValue(state, instance);
    }
    case $STATE: {
      const prev = getTypedPrev(hookStates, hookIndex, $STATE, instance);
      const state = processState(descriptor, prev, instance);
      hookStates[hookIndex] = state;
      return state;
    }
    case $DEFERRED: {
      const prev = getTypedPrev(hookStates, hookIndex, $DEFERRED, instance);
      const state = processDeferredValue(descriptor, prev, instance);
      hookStates[hookIndex] = state;
      return state;
    }
    default: {
      const _exhaustive: never = descriptor;
      throw new Error(
        `yract: unknown hook descriptor type ${String((_exhaustive as { type?: unknown })?.type ?? _exhaustive)}`,
      );
    }
  }
}

/** @internal */
export function setupSkippedHookCleanups(fiber: ComponentFiber, hookIndex: number) {
  const { hookStates, scheduler } = fiber;
  if (!hookStates || hookIndex >= hookStates.length) return;
  for (let i = hookIndex; i < hookStates.length; i++) {
    const hook = hookStates[i]!;
    switch (hook.type) {
      case $EFFECT:
        hook.dirty = true;
        hook.fn = () => {};
        break;
      case $CONTEXT:
        hook.unsubscribe?.();
        break;
    }
  }
  scheduler.schedulePostCommit(fiber);
  const controller = new AbortController();
  hookStates.push({
    controller,
    dirty: true,
    type: $EFFECT,
    fn: () => {},
    deps: [],
  });
  controller.signal.onabort = () => {
    hookStates.splice(hookIndex);
  };
}

/** @internal */
export function unmountHookCleanup(state: HookState) {
  switch (state.type) {
    case $CONTEXT:
      state.unsubscribe?.();
      break;
    case $EFFECT:
      state.controller?.abort();
      break;
    case $STATE: {
      state.pendingResolve = undefined;
      break;
    }
  }
}
