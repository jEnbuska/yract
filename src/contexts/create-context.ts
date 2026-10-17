import type { Children } from "../jsx";
import { Fragment, jsx } from "yract/jsx-runtime";
import { randomId } from "../general";
import type { Context } from "./types";

function getDefaultValue<T>(defaultValue: (() => T) | T): T {
  if (typeof defaultValue === "function") {
    return (defaultValue as any)() as T;
  }
  return defaultValue as T;
}

export function createContext<T>(defaultValue: (() => T) | T): Context<T>;
export function createContext<T>(defaultValue: (() => T) | T, name: Capitalize<string>): Context<T>;
export function createContext(...args: any[]): any {
  const [defaultValue, name = ""] = args;
  const providerName = `${name}Provider`;
  const withProvider = {
    *[providerName]({ children }: { children: Children }) {
      return jsx(Fragment, { children });
    },
  };
  return {
    ref: { current: getDefaultValue(defaultValue) },
    subscribe: () => () => {},
    depth: -1,
    id: randomId(),
    name: `${name}Context`,
    Provider: withProvider[providerName],
  } as any;
}
