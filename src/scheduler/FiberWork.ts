import type { Fiber } from "../instances/types";

export class FiberWork {
  #members = new Set<Fiber>();
  #cancelled = new Set<Fiber>();
  readonly queues: Fiber[][] = [];
  #isEmpty = true;

  clear() {
    if (!this.#members.size && !this.#cancelled.size) return;
    this.#members.clear();
    this.#cancelled.clear();
    const { queues } = this;
    for (let i = 0; i < queues.length; i++) {
      queues[i] = [];
    }
    this.#isEmpty = true;
  }

  isEmpty() {
    return this.#isEmpty;
  }

  add(fiber: Fiber) {
    const members = this.#members;
    if (this.#cancelled.delete(fiber)) {
      this.#isEmpty = false;
      members.add(fiber);
      return;
    }
    if (members.has(fiber)) return;
    this.#isEmpty = false;
    members.add(fiber);
    const { depth } = fiber;
    const { queues } = this;
    while (queues.length <= depth) {
      queues.push([]);
    }
    queues[depth]!.push(fiber);
  }

  cancel(fiber: Fiber) {
    if (!this.#members.delete(fiber)) return;
    this.#cancelled.add(fiber);
  }

  has(fiber: Fiber) {
    return this.#members.has(fiber);
  }

  delete(fiber: Fiber) {
    if (this.#members.delete(fiber)) {
      return true;
    }
    this.#cancelled.delete(fiber);
    return false;
  }
}
