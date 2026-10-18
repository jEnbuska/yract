import type { Context } from "../contexts/types";
import type { DependencyList } from "yract";
import type {
  $CONTEXT,
  $EFFECT,
  $ELEMENT_REF,
  $ID,
  $MEMO,
  $REF,
  $CALLBACK,
  $STATE,
} from "./constants";
import type { AnyFn } from "../general-types";

export interface StateHookDescriptor<T = unknown> {
  type: typeof $STATE;
  initialValue: (() => T) | T;
  deps: DependencyList;
}

export interface RefHookDescriptor<T = unknown> {
  type: typeof $REF;
  initialValue: T;
}

export interface ElementRefHookDescription {
  type: typeof $ELEMENT_REF;
}

export interface IdHookDescriptor {
  type: typeof $ID;
}

export interface MemoHookDescriptor<T = unknown, TArgs extends readonly any[] = DependencyList> {
  type: typeof $MEMO;
  fn(...args: TArgs): T;
  deps: TArgs;
}

export interface CallbackHookDescriptor<T extends AnyFn = AnyFn> {
  type: typeof $CALLBACK;
  fn: T;
}

export type EffectCallback = (signal: AbortSignal) => void | Promise<void> | (() => unknown);
export interface EffectHookDescriptor {
  type: typeof $EFFECT;
  fn: EffectCallback;
  deps?: DependencyList;
}

export interface ContextHookDescriptor {
  type: typeof $CONTEXT;
  ctx: Context;
  depsSelector?: (ctx: unknown) => unknown[];
  transform?: (...args: unknown[]) => unknown;
}

export type HookDescriptor =
  | StateHookDescriptor
  | RefHookDescriptor
  | ElementRefHookDescription
  | IdHookDescriptor
  | MemoHookDescriptor
  | CallbackHookDescriptor
  | EffectHookDescriptor
  | ContextHookDescriptor;
