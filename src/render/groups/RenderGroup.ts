import { type Fiber } from "../../instances/types";

export interface RenderGroup {
  getRenderHead(): number;
  readonly name: string;
  queueRender(fiber: Fiber): void;
  cancelRender?: (fiber: Fiber) => void;
  hasRenderQueue(): boolean;
  getRenderIterable(): Iterator<Fiber, void, void>;
  commitFiber(fiber: Fiber): void;
  scheduleCommit(fiber: Fiber): void;
  forEachCommit(iteration: number, visit: (fiber: Fiber) => void): void;
  schedulePostRenderCallback(instance: Fiber): void;
  getPostRenderCallbackIterable(renderIteration: number): Iterable<Fiber, void, void>;
}
