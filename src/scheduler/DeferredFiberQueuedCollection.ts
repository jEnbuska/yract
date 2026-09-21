import type { Fiber } from "../instances/types";

export class DeferredFiberQueuedCollection {

  head: number;
  #members = new Set<Fiber>();
  #cancelled = new Set<Fiber>();
  #deleted = 0;

  isEmpty: () => boolean;
  protected isNewHead: (depth: number) => boolean;
  readonly queues: Fiber[][] = [];

  constructor(direction: 'ascending' | 'descending' = 'ascending') {
    if(direction === 'ascending') {
      // Drained shallowest-first, so the head tracks the smallest depth queued.
      this.head = Number.MAX_SAFE_INTEGER;
      this.isEmpty = () => this.head >= this.queues.length
      this.isNewHead = (depth) => this.head > depth
    } else {
      // Drained deepest-first, so the head tracks the largest depth queued.
      this.head = -1;
      this.isEmpty = () => this.head < 0
      this.isNewHead = (depth) => this.head < depth
    }
  }

  shouldPrune() {
    return (this.#cancelled.size + this.#deleted) >= 30_000
  }

  prune = () => {
    if(!(this.#cancelled.size + this.#deleted)) return;
    const cancelled = this.#cancelled;
    const {queues} = this;
    const members = this.#members
    for(let i = 0; i < queues.length; i++) {
      const nextQueue: Fiber[] = [];
      const queue = queues[i]!;
      for(let j = 0; j < queue.length; j++) {
        const fiber = queue[j]!;
        if(members.has(fiber)) {
          nextQueue.push(fiber);
        } else {
          members.delete(fiber);
        }
      }
      queues[i] = nextQueue;
    }
    cancelled.clear();
    this.#cancelled.clear()
  }

  add(fiber: Fiber) {
    const members =this.#members;
    const {depth} = fiber;
    if(this.isNewHead(depth)) {
      this.head = depth;
    }
    if(this.#cancelled.delete(fiber)) {
      members.add(fiber);
      return false;
    }

    if(members.has(fiber)) {
      return false;
    }
    members.add(fiber);
    const {queues} = this;
    while (queues.length <= depth) {
      queues.push([]);
    }
    queues[depth]!.push(fiber)
    return true;
  }

  cancel(fiber: Fiber) {
    if(!this.#members.delete(fiber)) return;
    this.#cancelled.add(fiber);
  }

  has(fiber: Fiber) {
    return this.#members.has(fiber)
  }

  clear() {
    const members = this.#members
    this.#deleted +=members.size;
    this.#members.clear();
  }

  delete(fiber: Fiber) {
    if(this.#members.delete(fiber)) {
      this.#deleted++;
      return true;
    }
    this.#cancelled.delete(fiber);
    return false;
  }
} 