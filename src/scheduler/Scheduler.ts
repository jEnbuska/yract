import type { Fiber, FieldSelectionMap, FieldValueMap } from "../instances/types";
import type { AnyElement } from "../render/elements/namespaces";
import { SyncWork } from "./SyncWork";

type SchedulerStage = "IDLE" | "RENDER" | "COMMIT" | "POST_COMMIT";
export class Scheduler {
  readonly #valueMap: FieldValueMap;
  readonly #syncWork: SyncWork;
  #blocked = false;
  #stage: SchedulerStage = "IDLE";

  public renderIteration = 0;

  constructor(selectionMap: FieldSelectionMap, valueMap: FieldValueMap) {
    this.#syncWork = new SyncWork(selectionMap, valueMap);
    this.#valueMap = valueMap;
  }

  /** Method for reconciler to register values given to controlled form element's */
  public registerPropsValue(el: AnyElement, value: boolean | string) {
    this.#valueMap.set(el, value);
  }

  public blockRun() {
    this.#blocked = true;
  }

  public unBlockRun() {
    this.#blocked = false;
    this.#requestRun();
  }

  getStage() {
    return this.#stage;
  }

  scheduleRender(fiber: Fiber): void {
    this.#syncWork.renderWork.add(fiber);
    if (this.#blocked) return;
    this.#requestRun();
  }

  schedulePrepareCommit(parent: Fiber): void {
    this.#syncWork.prepareCommitWork.add(parent);
  }

  schedulePostCommit(fiber: Fiber): void {
    this.#syncWork.postCommitWork.add(fiber);
  }

  scheduleCommit(fiber: Fiber): void {
    this.#syncWork.commitWork.add(fiber);
  }

  #requestRun() {
    if (this.#stage !== "IDLE") return;
    queueMicrotask(this.#run);
  }

  #run = (): void => {
    if (this.#stage !== "IDLE") return;
    try {
      const work = this.#syncWork;
      work.postCommit();
      while (!work.renderWork.isEmpty()) {
        this.renderIteration++;
        this.#stage = "RENDER";
        work.render();
        this.#stage = "COMMIT";
        work.commit();
        this.#stage = "POST_COMMIT";
        work.postCommit();
      }
    } finally {
      this.#stage = "IDLE";
    }
  };
}
