import type { ComponentFiber } from "../instances/component-fiber";

/** @internal */
export class HookRuleError extends Error {
  constructor(fiber: ComponentFiber, message: string) {
    super(`<${fiber.component.name}>: ${message}`);
  }
}
