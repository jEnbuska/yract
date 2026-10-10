import type { ComponentFiber } from "../instances/component-fiber";
import { $$RERENDER } from "./constants";
import type { RerenderAcquirementDescriptor } from "./types";
import { getOrInsert } from "../general";

export function* withRerender(): Generator<RerenderAcquirementDescriptor, () => void> {
  const callback = yield { type: $$RERENDER };
  return callback as () => void;
}

const cache = new WeakMap<ComponentFiber, () => void>();
/** @internal */
export function getRerender(fiber: ComponentFiber) {
  const { scheduler } = fiber;
  return getOrInsert(cache, fiber, (deferred?: boolean) =>
    scheduler.scheduleRender(fiber, deferred),
  );
}
