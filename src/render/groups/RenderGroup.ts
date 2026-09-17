import { type RequiredBy } from "../../general-types";
import { type Fiber } from "../../instances/types";

export interface RenderGroup {
  getRenderHead(): number;
  readonly name: string;

  queueRender(instance: Fiber): void;
  cancelRender?: (instance: Fiber) => void;
  hasRenderQueue(): boolean;
  getRenderIterable(renderIteration: number): Iterable<Fiber>;

  scheduleDiscardChildren?: (instance: Fiber) => void;
  cancelDiscardParents?: (instance: Fiber) => void;
  getDiscardingParents?: () => Iterable<Fiber>;

  scheduleUiUpdate(instance: Fiber): void;
  cancelUiUpdate?: (instance: Fiber) => void;
  getUiUpdateIterable(): Iterable<RequiredBy<Fiber, "uiActions">>;

  schedulePostRenderCallback(instance: Fiber): void;
  getPostRenderCallbackIterable(renderIteration: number): Iterable<Fiber>;
}
