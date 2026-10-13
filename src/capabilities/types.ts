import type { $$CONTEXT, $$RERENDER, $$RETURN } from "./constants";
import type { Child, Context } from "yract";

/** @internal */
export interface ReturnAcquirementDescriptor {
  type: typeof $$RETURN;
  child: Child;
}

/** @internal */
export interface RerenderAcquirementDescriptor {
  type: typeof $$RERENDER;
}

/** @internal */
export interface ContextAcquirementDescriptor {
  type: typeof $$CONTEXT;
  ctx: Context;
}

/** @internal */
export type CapabilityDescriptor =
  | ReturnAcquirementDescriptor
  | RerenderAcquirementDescriptor
  | ContextAcquirementDescriptor;
