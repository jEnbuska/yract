import type { Children, Component } from "../jsx";
import type { ComponentGenerator } from "../general-types";
import type { Fiber } from "../instances/types";
import type { ContextHookState } from "../hooks/hook-states";

export interface ContextProps<T = unknown> {
  key?: string;
  value: T;
  children: Children;
}

export type Context<T = any> = ContextProperties<T> & {
  (props: ContextProps<T>): ComponentGenerator;
};

export type ContextProperties<T> = {
  ref: { current: T };
  version: number;
  name: string;
  subscribe: (state: ContextHookState) => () => void;
  depth: number;
  id: string;
  Provider: Component<ContextProps<T>>;
  fiber: Fiber;
};
