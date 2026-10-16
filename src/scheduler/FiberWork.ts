import type { Fiber } from "../instances/types";

export class FiberWork {
  #members = new Set<Fiber>();
  readonly queues: Fiber[][] = [];

  clear() {
    this.#members.clear();
    const { queues } = this;
    for (let i = 0; i < queues.length; i++) {
      queues[i] = [];
    }
  }

  add(fiber: Fiber) {
    const members = this.#members;
    if (members.has(fiber)) return;
    members.add(fiber);
    const { depth } = fiber;
    const { queues } = this;
    while (queues.length <= depth) {
      queues.push([]);
    }
    queues[depth]!.push(fiber);
  }

  isEmpty() {
    return !this.#members.size;
  }

  has(fiber: Fiber) {
    return this.#members.has(fiber);
  }
}
