import type { Fiber, FieldSelectionMap, FieldValueMap } from "../instances/types";
import type { AnyElement } from "../render/elements/namespaces";
import { SyncWork } from "./SyncWork";

export class Scheduler {
  readonly #valueMap: FieldValueMap;
  readonly #syncWork: SyncWork;
  #blocked = false;

  public renderIteration = 0;

  constructor(selectionMap: FieldSelectionMap, valueMap: FieldValueMap) {
    this.#syncWork = new SyncWork(selectionMap, valueMap);
    this.#valueMap = valueMap;
  }

  /** Method for reconciler to register values given to controlled form element's */
  public registerPropsValue(el: AnyElement, value: boolean | string) {
    this.#valueMap.set(el, value);
  }

  public blockRun () {
    this.#blocked = true;
  };

  public unBlockRun () {
    this.#blocked = false;
    this.#syncWork.requestRun();
  };

  scheduleRender(fiber: Fiber): void {
    this.#syncWork.renderWork.add(fiber);
    if (this.#blocked) return;
    this.#syncWork.requestRun();
  }

  schedulePrepareChunk(fiber: Fiber): void {
    this.#syncWork.prepareChunkWork.add(fiber);
  }

  schedulePostCommit(fiber: Fiber): void {
    this.#syncWork.postCommitWork.add(fiber);
  }

  scheduleCommit(fiber: Fiber): void {
    this.#syncWork.commitWork.add(fiber);
  }
}
