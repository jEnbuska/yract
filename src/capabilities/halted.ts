import type { RefObject } from "../hooks/ref";
import type { HaltedAcquirementDescriptor } from "./types";
import type { ComponentFiber } from "../instances/component-fiber";
import { $$HALTED } from "./constants";

export function* withIsHalted(): Generator<
  HaltedAcquirementDescriptor,
  Readonly<RefObject<boolean>>
> {
  return yield { type: $$HALTED } satisfies HaltedAcquirementDescriptor;
}
const cache = new WeakMap<
  ComponentFiber,
  {
    get current(): boolean;
  }
>();

export function getHalted(instance: ComponentFiber) {
  return cache.getOrInsert(instance, {
    get current(): boolean {
      let parent: ComponentFiber | null = instance;
      while (parent) {
        if (parent.halted) return true;
        parent = parent.parent;
      }
      return false;
    },
  });
}
