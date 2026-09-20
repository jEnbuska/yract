import { type Fiber } from "../../instances/types";

export interface RenderGroup {
  readonly name: string;
  queueRender(fiber: Fiber): void;
  cancelRender?: (fiber: Fiber) => void;
  hasRenderQueue(): boolean;
  getRenderIterable(): Iterator<Fiber, void, void>;
  scheduleCommit(fiber: Fiber): void;
  commit(iteration: number): void;
  schedulePostRenderCallback(instance: Fiber): void;
  getPostRenderCallbackIterable(renderIteration: number): Iterable<Fiber, void, void>;
}
