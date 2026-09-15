import type { Child } from "../jsx";
import type { ComponentGenerator } from "yract";
import type { HaltAcquirementDescriptor } from "./types";
import { $$HALT } from "./constants";

export function* withHalt(
  initialFallback?: Child,
): ComponentGenerator<never, HaltAcquirementDescriptor> {
  yield { type: $$HALT, initialFallback } satisfies HaltAcquirementDescriptor;
  throw new Error("$$halt hook was called by a non component function");
}
