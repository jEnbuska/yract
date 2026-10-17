import type { $$CONTEXT, $$RERENDER, $$RETURN } from "./constants";
import type { Child, Context } from "yract";

export interface ReturnAcquirementDescriptor {
  type: typeof $$RETURN;
  child: Child;
}

export interface RerenderAcquirementDescriptor {
  type: typeof $$RERENDER;
}

export interface ContextAcquirementDescriptor {
  type: typeof $$CONTEXT;
  ctx: Context;
}

export type CapabilityDescriptor =
  | ReturnAcquirementDescriptor
  | RerenderAcquirementDescriptor
  | ContextAcquirementDescriptor;
