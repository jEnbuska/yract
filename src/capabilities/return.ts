import type { Child } from "../jsx";

import type { ReturnAcquirementDescriptor } from "./types";
import { $$RETURN } from "./constants";

export function* withReturn(child: Child): Generator<ReturnAcquirementDescriptor, never> {
  yield { type: $$RETURN, child } satisfies ReturnAcquirementDescriptor;
  throw new Error("withReturn was called by a non component function");
}
