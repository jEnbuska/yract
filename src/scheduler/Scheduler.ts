import { FiberLifecycleGroup } from "./FiberLifecycleGroup";
import type { Fiber, FieldSelectionMap, FieldValueMap } from "../instances/types";
import type { AnyElement } from "../render/elements/namespaces";

/** @internal */
export class Scheduler {
  readonly #lifecycleGroup: FiberLifecycleGroup;
  readonly #selectionMap: FieldSelectionMap;
  readonly #valueMap: FieldValueMap;
  renderIteration = 0;

  #blocked = false;

  constructor(selectionMap: FieldSelectionMap, valueMap: FieldValueMap) {
    this.#selectionMap = selectionMap;
    this.#valueMap = valueMap;
    this.#lifecycleGroup = new FiberLifecycleGroup();
  }

  block = () => {
    this.#blocked = true;
  };

  unBlock = () => {
    this.#blocked = false;
    if (this.#running) return;
    queueMicrotask(this.#run);
  };

  scheduleRender(fiber: Fiber): void {
    this.#lifecycleGroup.scheduleRender(fiber);
    if (!this.#blocked && !this.#running) queueMicrotask(this.#run);
  }

  schedulePostCommit(fiber: Fiber): void {
    this.#lifecycleGroup.schedulePostCommit(fiber);
  }

  schedulePrepareChunk(fiber: Fiber): void {
    this.#lifecycleGroup.schedulePrepareChunk(fiber);
  }

  ensureUnmount(fiber: Fiber): void {
    this.#lifecycleGroup.ensureUnmount(fiber);
  }

  scheduleCommit(fiber: Fiber): void {
    this.#lifecycleGroup.scheduleCommit(fiber);
  }

  cancelCommit(fiber: Fiber): void {
    this.#lifecycleGroup.cancelCommit(fiber);
  }

  #running = false;
  #run = async (): Promise<void> => {
    if (this.#running) return;
    this.#running = true;
    const work = this.#lifecycleGroup;
    try {
      work.postCommit(this.renderIteration);
      this.renderIteration++;
      work.render(this.renderIteration);
      work.commit(this.#valueMap, this.#selectionMap);
      work.postCommit(this.renderIteration);
    } finally {
      this.#running = false;
    }
  };

  /** Method for reconciler to register values given to controlled form element's */
  public registerPropsValue(el: AnyElement, value: boolean | string) {
    this.#valueMap.set(el, value);
  }
}
