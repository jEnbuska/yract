import type { Child, ComponentGenerator } from "yract";
import type { ComponentFiber } from "../instances/component-fiber";
import { processHook, setupSkippedHookCleanups } from "../hooks/process-hook";
import { getRerender } from "../capabilities/rerender";
import { getHalted } from "../capabilities/halted";
import { $$CONTEXT, $$HALT, $$HALTED, $$RERENDER, $$RETURN } from "../capabilities/constants";

export function resolveComponentGenerator(
  gen: ComponentGenerator<any>,
  instance: ComponentFiber,
): Child {
  let step = gen.next();
  if (step.done) return step.value;
  instance.hookStates ??= [];
  instance.halted = false;
  instance.hookIndex = 0;
  if (!step.done) instance.hookStates ??= [];
  while (!step.done) {
    const descriptor = step.value;
    switch (descriptor.type) {
      case $$RERENDER: {
        step = gen.next(getRerender(instance));
        break;
      }
      case $$HALTED: {
        step = gen.next(getHalted(instance));
        break;
      }
      case $$HALT: {
        instance.halted = true;
        if (!instance.renders) return descriptor.initialFallback;
        return instance.prevChild;
      }
      case $$RETURN: {
        setupSkippedHookCleanups(instance, instance.hookIndex);
        instance.hookIndex = 0;
        return descriptor.child;
      }
      case $$CONTEXT: {
        gen.next(instance.ctx.get(descriptor.ctx.id));
        break;
      }
      default: {
        const result = processHook(descriptor, instance.hookIndex, instance);
        instance.hookIndex++;
        step = gen.next(result);
        break;
      }
    }
  }
  setupSkippedHookCleanups(instance, instance.hookIndex);
  instance.hookIndex = 0;
  return step.value;
}
