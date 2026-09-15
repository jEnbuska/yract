import type { Context } from "yract";
import type { ContextAcquirementDescriptor } from "./types";
import { $$CONTEXT } from "./constants";

export function* withContext<T>(ctx: Context<T>): Generator<ContextAcquirementDescriptor, T> {
  return yield {
    type: $$CONTEXT,
    ctx: ctx as Context,
  } satisfies ContextAcquirementDescriptor;
}
