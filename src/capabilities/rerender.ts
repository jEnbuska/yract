import type { ComponentFiber } from "../instances/component-fiber";
import { $$RERENDER } from "./constants";
import type { RerenderAcquirementDescriptor } from "./types";
import { getOrInsert } from "../general";

export function* withRerender(): Generator<RerenderAcquirementDescriptor, () => void> {
  const callback = yield { type: $$RERENDER };
  return callback as () => void;
}

const cache = new WeakMap<ComponentFiber, () => void>();
const symb = Symbol("RERENDER");
/** @internal */
export function getRerender(instance: ComponentFiber) {
  return getOrInsert(cache, instance, () => instance.scheduleRender(symb));
}
