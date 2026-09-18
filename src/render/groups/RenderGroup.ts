import { type RequiredBy } from "../../general-types";
import { type Fiber } from "../../instances/types";

export interface RenderGroup {
  getRenderHead(): number;
  readonly name: string;
  queueRender(instance: Fiber): void;
  cancelRender?: (instance: Fiber) => void;
  hasRenderQueue(): boolean;
  getRenderIterable(): Iterator<Fiber, void, void>;

  scheduleDiscardChildren?: (instance: Fiber) => void;
  cancelDiscardParents?: (instance: Fiber) => void;
  getDiscardingParents?: () => Iterator<Fiber, void, void>;

  scheduleUiUpdate(instance: Fiber): void;
  cancelUiUpdate?: (instance: Fiber) => void;
  getUiUpdateIterable(): Iterator<RequiredBy<Fiber, "uiActions">>;

  schedulePostRenderCallback(instance: Fiber): void;
  getPostRenderCallbackIterable(renderIteration: number): Iterable<Fiber, void, void>;
}
