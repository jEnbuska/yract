export { type Context, type ContextProps, createContext, resolveContext } from "./context";

export {
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useStable,
  useState,
  useDefer,
  useWeakRef,
  type RefObject,
} from "./hooks";
export { withRerender, withReturn } from "./capabilities";
export {
  type Child,
  type Children,
  type Component,
  type ComponentProps,
  Fragment,
  type FrameworkProps,
  type PropsWithChildren,
} from "./jsx";

export { createRoot, render } from "./render";
export { Root } from "./instances/root";

export type { ComponentGenerator } from "./general-types";
export type { DependencyList } from "./general-types";

export { shallow } from "./shallow";
export type { Shallow } from "./shallow";
