import type { $$CONTEXT, $$RERENDER } from "./constants";
import type { Context } from "yract";

export interface RerenderAcquirementDescriptor {
  type: typeof $$RERENDER;
}

export interface ContextAcquirementDescriptor {
  type: typeof $$CONTEXT;
  ctx: Context;
}

export type CapabilityDescriptor = RerenderAcquirementDescriptor | ContextAcquirementDescriptor;
