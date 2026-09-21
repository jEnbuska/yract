import type { ContextProperties } from "../context";
import type { ContextHookState } from "../hooks/context";
import type { DelegationRoot } from "./delegation";
import type { Scheduler } from "../scheduler/Scheduler";
import type { DependencyList } from "yract";
import type { $EFFECT, $ID, $MEMO, $REF, $STABLE, $STATE, $WEAK_REF } from "../hooks/constants";
import type { WeakRefLike } from "./element-props";
import type { EffectCallback } from "../hooks/types";

export type ContextMap = Map<string, ContextProperties<unknown>>;

export interface RenderContext {
  container: Element;
  scheduler: Scheduler;
  delegationRoot: DelegationRoot;
}

export type SetState<T = unknown> = (value: ((prevValue: T) => T) | T) => Promise<void>;
export interface StateHookState<T = unknown> {
  type: typeof $STATE;
  value: T;
  setState: SetState<T>;
  deps: DependencyList;
  pendingValue: unknown;
  identifier: symbol;
  pendingResolve?: () => void;
}

export interface RefHookState<T = unknown> {
  type: typeof $REF;
  ref: { current: T };
}

export interface WeakRefHookState<T extends WeakKey = WeakKey> {
  type: typeof $WEAK_REF;
  ref: WeakRefLike<T>;
}

export interface IdHookState {
  type: typeof $ID;
  id: string;
}

export interface MemoHookState<T = unknown> {
  type: typeof $MEMO;
  value: T;
  deps: DependencyList;
}

export interface StableHookState<T extends (...args: any[]) => any = (...args: any[]) => any> {
  type: typeof $STABLE;
  current: T;
  callback: T;
}

export interface EffectHookState {
  type: typeof $EFFECT;
  deps: DependencyList;
  identifier: symbol;
  fn: EffectCallback;
  controller?: AbortController;
  dirty?: boolean;
}

export type HookState =
  | StateHookState
  | RefHookState
  | IdHookState
  | MemoHookState
  | StableHookState
  | EffectHookState
  | ContextHookState
  | WeakRefHookState;
