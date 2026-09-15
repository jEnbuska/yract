import type { $$CONTEXT, $$HALT, $$HALTED, $$RERENDER, $$RETURN } from "./constants";
import type { Child, Context } from "yract";

export interface ReturnAcquirementDescriptor {
  type: typeof $$RETURN;
  child: Child;
}

export interface HaltAcquirementDescriptor {
  type: typeof $$HALT;
  initialFallback?: Child;
}

export interface HaltedAcquirementDescriptor {
  type: typeof $$HALTED;
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
  | HaltAcquirementDescriptor
  | HaltedAcquirementDescriptor
  | RerenderAcquirementDescriptor
  | ContextAcquirementDescriptor;
