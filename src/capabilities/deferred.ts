import { $$DEFERRED } from "./constants";
import type { DeferredAcquirementDescriptor } from "./types";

export function* withDeferred(): Generator<DeferredAcquirementDescriptor, boolean> {
  return yield { type: $$DEFERRED };
}
