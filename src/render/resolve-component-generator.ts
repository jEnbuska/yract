import type { Child, ComponentGenerator } from "yract";
import type { ComponentFiber } from "../instances/component-fiber";
import { processHook, setupSkippedHookCleanups } from "../hooks/process-hook";
import { getRerender } from "../capabilities/rerender";
import { $$CONTEXT, $$RERENDER, $$RETURN } from "../capabilities/constants";

export function resolveComponentGenerator(
  gen: ComponentGenerator<any>,
  instance: ComponentFiber,
): Child {
  let step = gen.next();
  let hookIndex = 0;
  if (step.done) {
    setupSkippedHookCleanups(instance, hookIndex);
    return step.value;
  }
  while (!step.done) {
    const descriptor = step.value;
    switch (descriptor.type) {
      case $$RERENDER: {
        step = gen.next(getRerender(instance));
        break;
      }
      case $$CONTEXT: {
        step = gen.next(instance.ctx.get(descriptor.ctx.id));
        break;
      }
      case $$RETURN: {
        setupSkippedHookCleanups(instance, hookIndex);
        return descriptor.child;
      }
      default: {
        const result = processHook(descriptor, hookIndex, instance);
        hookIndex++;
        step = gen.next(result);
        break;
      }
    }
  }
  setupSkippedHookCleanups(instance, hookIndex);
  return step.value;
}
