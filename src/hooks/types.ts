import type { Context } from "../context";
import type { DependencyList } from "yract";
import type {
  $CONTEXT,
  $EFFECT,
  $ID,
  $MEMO,
  $REF,
  $STABLE,
  $STATE,
  $ELEMENT_REF,
} from "./constants";
import type { AnyFn } from "../general-types";

/** @internal */
export interface StateHookDescriptor<T = unknown> {
  type: typeof $STATE;
  initialValue: (() => T) | T;
  deps: DependencyList;
}

/** @internal */
export interface RefHookDescriptor<T = unknown> {
  type: typeof $REF;
  initialValue: T;
}

/** @internal */
export interface ElementRefHookDescription {
  type: typeof $ELEMENT_REF;
}

/** @internal */
export interface IdHookDescriptor {
  type: typeof $ID;
}

/** @internal */
export interface MemoHookDescriptor<T = unknown, TArgs extends readonly any[] = DependencyList> {
  type: typeof $MEMO;
  fn(...args: TArgs): T;
  deps: TArgs;
}

/** @internal */
export interface StableHookDescriptor<T extends AnyFn = AnyFn> {
  type: typeof $STABLE;
  fn: T;
}

/** @internal */
export type EffectCallback = (signal: AbortSignal) => void | Promise<void> | (() => unknown);
/** @internal */
export interface EffectHookDescriptor {
  type: typeof $EFFECT;
  fn: EffectCallback;
  deps: DependencyList;
}

/** @internal */
export interface ContextHookDescriptor {
  type: typeof $CONTEXT;
  ctx: Context;
  depsSelector?: (ctx: unknown) => unknown[];
  transform?: (...args: unknown[]) => unknown;
}

/** @internal */
export type HookDescriptor =
  | StateHookDescriptor
  | RefHookDescriptor
  | ElementRefHookDescription
  | IdHookDescriptor
  | MemoHookDescriptor
  | StableHookDescriptor
  | EffectHookDescriptor
  | ContextHookDescriptor;
