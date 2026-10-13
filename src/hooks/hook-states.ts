import type {
  $CONTEXT,
  $EFFECT,
  $ELEMENT_REF,
  $ID,
  $MEMO,
  $REF,
  $STABLE,
  $STATE,
} from "./constants";
import type { Context, DependencyList } from "yract";
import type { AnyElement } from "../render/elements/namespaces";
import type { ElementRef } from "../render/element-props/types";
import type { EffectCallback } from "./hook-descriptors";

export type SetState<T = unknown> = (value: ((prevValue: T) => T) | T) => void;

export interface StateHookState<T = unknown> {
  type: typeof $STATE;
  value: T;
  setState: SetState<T>;
  deps: DependencyList;
}

export interface RefHookState<T = unknown> {
  type: typeof $REF;
  ref: { current: T };
}

export interface ElementRefHookState<T extends AnyElement = AnyElement> {
  type: typeof $ELEMENT_REF;
  ref: ElementRef<T>;
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
  deps?: DependencyList;
  fn: EffectCallback;
  controller?: AbortController;
  dirty?: boolean;
}

export interface ContextHookState<T = unknown, D = T> {
  type: typeof $CONTEXT;
  /** Unique symbol this hook uses when scheduling/unscheduling the instance. */
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

export type HookState =
  | StateHookState
  | RefHookState
  | IdHookState
  | MemoHookState
  | StableHookState
  | EffectHookState
  | ContextHookState
  | ElementRefHookState;
