import type { Child, ComponentGenerator } from "yract";
import type { ComponentFiber } from "../instances/component-fiber";
import { processHook, setupSkippedHookCleanups } from "../hooks/process-hook";
import { getRerender } from "../capabilities/rerender";
import { $$CONTEXT, $$DEFERRED, $$RERENDER, $$RETURN } from "../capabilities/constants";

/** @internal */
export function resolveComponentGenerator(
  gen: ComponentGenerator<any>,
  instance: ComponentFiber,
): Child {
  let step = gen.next();
  let hookIndex = 0;
  while (!step.done) {
    const descriptor = step.value;
    switch (descriptor.type) {
      case $$RERENDER: {
        step = gen.next(getRerender(instance));
        break;
      }
      case $$CONTEXT: {
        const { ctx } = descriptor;
        step = gen.next((instance.ctx.get(ctx.id) ?? ctx).ref.current);
        break;
      }
      case $$RETURN: {
        setupSkippedHookCleanups(instance, hookIndex);
        return descriptor.child;
      }
      case $$DEFERRED: {
        step = gen.next(instance.deferred);
        break;
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
