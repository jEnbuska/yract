import type { ComponentGenerator } from "yract";
import type { Child } from "../jsx";

import type { ReturnAcquirementDescriptor } from "./types";
import { $$RETURN } from "./constants";

export function* doReturn(child: Child): ComponentGenerator<never, ReturnAcquirementDescriptor> {
  yield { type: $$RETURN, child } satisfies ReturnAcquirementDescriptor;
  throw new Error("doReturn was called by a non component function");
}
