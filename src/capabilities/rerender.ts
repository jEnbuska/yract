import type { ComponentGenerator } from "yract";
import type { ComponentFiber } from "../instances/component-fiber";
import { $$RERENDER } from "./constants";

export function* doRerender(): ComponentGenerator<() => void> {
  const callback = yield { type: $$RERENDER };
  return callback as () => void;
}

const cache = new WeakMap<ComponentFiber, () => void>();
const symb = Symbol("RERENDER");
export function getRerender(instance: ComponentFiber) {
  return cache.getOrInsert(instance, () => instance.scheduleRender(symb));
}
