import type { ComponentGenerator, Context } from "yract";
import type { ContextAcquirementDescriptor } from "./types";
import { $$CONTEXT } from "./constants";

export function* doContext<T>(ctx: Context<T>): ComponentGenerator<T> {
  const desc: ContextAcquirementDescriptor = {
    type: $$CONTEXT,
    ctx: ctx as Context,
  };
  const value = yield desc;
  return value as T;
}
