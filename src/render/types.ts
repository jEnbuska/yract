import type { ContextProperties } from "../context";
import type { ContextHookState } from "../hooks/context";
import type { DependencyList } from "yract";
import type { $EFFECT, $ID, $MEMO, $REF, $STABLE, $STATE, $ELEMENT_REF } from "../hooks/constants";
import type { EffectCallback } from "../hooks/types";
import type { AnyElement } from "./elements/namespaces";
import type { ElementRef } from "./element-props/types";

/** @internal */
export type ContextMap = Map<string, ContextProperties<unknown>>;

type SetState<T = unknown> = (value: ((prevValue: T) => T) | T) => Promise<void>;
/** @internal */
export interface StateHookState<T = unknown> {
  type: typeof $STATE;
  value: T;
  setState: SetState<T>;
  deps: DependencyList;
  pendingValue: unknown;
  identifier: symbol;
  pendingResolve?: () => void;
}

/** @internal */
export interface RefHookState<T = unknown> {
  type: typeof $REF;
  ref: { current: T };
}

/** @internal */
export interface ElementRefHookState<T extends AnyElement = AnyElement> {
  type: typeof $ELEMENT_REF;
  ref: ElementRef<T>;
}

/** @internal */
export interface IdHookState {
  type: typeof $ID;
  id: string;
}

/** @internal */
export interface MemoHookState<T = unknown> {
  type: typeof $MEMO;
  value: T;
  deps: DependencyList;
}

/** @internal */
export interface StableHookState<T extends (...args: any[]) => any = (...args: any[]) => any> {
  type: typeof $STABLE;
  current: T;
  callback: T;
}

/** @internal */
export interface EffectHookState {
  type: typeof $EFFECT;
  deps: DependencyList;
  identifier: symbol;
  fn: EffectCallback;
  controller?: AbortController;
  dirty?: boolean;
}

/** @internal */
export type HookState =
  | StateHookState
  | RefHookState
  | IdHookState
  | MemoHookState
  | StableHookState
  | EffectHookState
  | ContextHookState
  | ElementRefHookState;
