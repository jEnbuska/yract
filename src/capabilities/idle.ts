import type { IdleAcquirementDescriptor } from "./types";
import { $$IDLE } from "./constants";
import type { ComponentFiber } from "../instances/component-fiber";

type WithIdleReturn = (cb: () => unknown, signal?: AbortSignal) => () => unknown;

export function* withIdle(): Generator<IdleAcquirementDescriptor, WithIdleReturn> {
  return yield {
    type: $$IDLE,
  } satisfies IdleAcquirementDescriptor;
}

export function getIdle(instance: ComponentFiber) {
  return instance.rctx.scheduler.subscribeOnIdle satisfies WithIdleReturn;
}
