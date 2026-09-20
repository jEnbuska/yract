import { type Fiber } from "../../instances/types";

export interface RenderGroup {
  readonly name: string;
  queueRender(fiber: Fiber): void;
  cancelRender?: (fiber: Fiber) => void;
  hasRenderQueue(): boolean;
  scheduleCommit(fiber: Fiber): void;
  commit(iteration: number): void;
  schedulePostCommit(instance: Fiber): void;
  postCommit(renderIteration: number): void;
}
