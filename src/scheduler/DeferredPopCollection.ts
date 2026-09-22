import type { Fiber } from "../instances/types";
import { waitForIdle } from "./utils";

export class DeferredPopCollection {
  head: number;
  _members = new Set<Fiber>();
  _cancelled = new Set<Fiber>();

  protected isNewHead: (depth: number) => boolean;
  readonly queues: Fiber[][] = [];
  #direction: 1 | -1;
  #pruneScheduled = false;

  constructor(direction: -1 | 1) {
    this.#direction = direction;
    if (direction === 1) {
      // Drained shallowest-first, so the head tracks the smallest depth queued.
      this.head = Number.MAX_SAFE_INTEGER;
      this.isNewHead = (depth) => this.head > depth;
    } else {
      // Drained deepest-first, so the head tracks the largest depth queued.
      this.head = -1;
      this.isNewHead = (depth) => this.head < depth;
    }
  }

  get size() {
    return this._members.size;
  }

  #prune() {
    let pruned = 0;
    const noThingToCancel = !this._cancelled.size;
    if (noThingToCancel) return;
    this._cancelled.clear();
    const { queues } = this;
    const members = this._members;
    for (let i = 0; i < queues.length; i++) {
      const nextQueue: Fiber[] = [];
      const queue = queues[i]!;
      for (let j = 0; j < queue.length; j++) {
        const fiber = queue[j]!;
        if (members.has(fiber)) {
          nextQueue.push(fiber);
        } else {
          pruned++;
          members.delete(fiber);
        }
      }
      queues[i] = nextQueue;
    }
  }

  async schedulePrune() {
    if (this.#pruneScheduled || !this._cancelled.size) return;
    this.#pruneScheduled = true;
    await waitForIdle();
    this.#pruneScheduled = false;
    if (!this._cancelled.size) return;
    this.#prune();
  }

  add(fiber: Fiber) {
    const members = this._members;
    const { depth } = fiber;
    if (this.isNewHead(depth)) {
      this.head = depth;
    }
    if (this._cancelled.delete(fiber)) {
      members.add(fiber);
      return false;
    }

    if (members.has(fiber)) return false;
    members.add(fiber);
    const { queues } = this;
    while (queues.length <= depth) {
      queues.push([]);
    }
    queues[depth]!.push(fiber);
    return true;
  }

  has(fiber: Fiber) {
    return this._members.has(fiber);
  }

  clear() {
    if (!this._members.size && !this._cancelled.size) return;
    this._members.clear();
    this._cancelled.clear();
    const { queues } = this;
    for (let i = 0; i < queues.length; i++) {
      this.queues[i] = [];
    }
  }

  delete(fiber: Fiber) {
    if (this._members.delete(fiber)) {
      this._cancelled.add(fiber);
      return true;
    }
    return false;
  }

  pop(): Fiber {
    const { queues } = this;
    while (true) {
      let { head } = this;
      const queue = queues[head]!;
      if (!queue.length) {
        this.head += this.#direction;
        continue;
      }
      const fiber = queue.pop()!;
      if (this._members.delete(fiber)) {
        return fiber;
      }
      this._cancelled.delete(fiber);
    }
  }
}
