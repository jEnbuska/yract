import type { Child, ComponentGenerator } from "yract";
import type { ComponentFiber } from "../instances/component-fiber";
import { processHook, setupSkippedHookCleanups } from "../hooks/process-hook";
import { getRerender } from "../capabilities/rerender";
import { $$CONTEXT, $$RERENDER } from "../capabilities/constants";
import type { HookDescriptor } from "../hooks/hook-descriptors";
import type { CapabilityDescriptor } from "../capabilities/types";

type Descriptor = HookDescriptor | CapabilityDescriptor;

/** Hook and capability descriptors are objects whose `type` starts with `$`; children never are. */
function isDescriptor(value: Descriptor | Child): value is Descriptor {
  if (typeof value !== "object" || value === null) return false;
  return value.type.startsWith("$");
}

export function resolveComponentGenerator(
  gen: ComponentGenerator<any>,
  instance: ComponentFiber,
): Child {
  // The component's own TNext is `never` (so `return yield child` typechecks);
  // the values sent back here go to the built-in hooks it delegates to.
  const driven = gen as Generator<Descriptor | Child, Child, unknown>;
  let step = driven.next();
  let hookIndex = 0;
  while (!step.done) {
    const yielded = step.value;
    // `return yield child`: end the render with that child.
    if (!isDescriptor(yielded)) {
      setupSkippedHookCleanups(instance, hookIndex);
      return yielded;
    }
    switch (yielded.type) {
      case $$RERENDER: {
        step = driven.next(getRerender(instance));
        break;
      }
      case $$CONTEXT: {
        const { ctx } = yielded;
        step = driven.next((instance.ctx.get(ctx.id) ?? ctx).ref.current);
        break;
      }
      default: {
        const result = processHook(yielded, hookIndex, instance);
        hookIndex++;
        step = driven.next(result);
        break;
      }
    }
  }
  setupSkippedHookCleanups(instance, hookIndex);
  return step.value;
}
