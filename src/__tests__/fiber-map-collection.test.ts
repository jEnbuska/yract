import { describe, expect, it } from "vitest";
import { DeferredFiberQueuedCollection } from "../scheduler/DeferredFiberQueuedCollection";
import type { Fiber } from "../instances/types";

/**
 * Tests for `FiberMapCollection`.
 *
 * Contract recap:
 *   - `members` is a tri-state booking: `undefined` = not booked,
 *     `true` = booked and present in `queues[depth]`, `false` = cancelled
 *     but the queue entry is still there waiting to be popped and skipped.
 *   - `queues[depth]` holds fibers bucketed by depth, so a drain can walk
 *     shallow-to-deep (renders) or deep-to-shallow (pre-commit).
 *   - `size` counts entries physically present in `queues`; `cancelled`
 *     counts how many of those carry a `false` booking. `members` is a
 *     WeakMap, so it cannot be iterated or cleared — these two counters are
 *     the only visibility into the collection's state.
 *
 * Fibers are stubbed to the one field the collection reads (`depth`), plus a
 * name to make failures readable. The cast is the narrowing kind: a full
 * `Fiber` is a large interface and none of the rest is reachable from here.
 */
function stubFiber(depth: number, name = `f${depth}`): Fiber {
  return { depth, component: { name } } as unknown as Fiber;
}

/** What a `cancel()` would do: mark the booking dead, leave the queue entry. */
function cancel(collection: DeferredFiberQueuedCollection, fiber: Fiber): void {
  collection.members.set(fiber, false);
  collection.cancelled++;
}

/** Entries physically sitting in the queues, flattened shallow-to-deep. */
function queued(collection: DeferredFiberQueuedCollection): Fiber[] {
  return collection.queues.flat();
}

describe("FiberMapCollection.queue", () => {
  it("books a fresh fiber and pushes it at its depth", () => {
    const collection = new DeferredFiberQueuedCollection();
    const fiber = stubFiber(3);

    expect(collection.add(fiber)).toBe(true);

    expect(collection.members.get(fiber)).toBe(true);
    expect(collection.queues[3]).toEqual([fiber]);
    expect(collection.size).toBe(1);
    expect(collection.cancelled).toBe(0);
  });

  it("grows `queues` so every depth up to the fiber's has a bucket", () => {
    const collection = new DeferredFiberQueuedCollection();

    collection.add(stubFiber(4));

    expect(collection.queues).toHaveLength(5);
    expect(collection.queues.slice(0, 4).every((q) => q.length === 0)).toBe(true);
  });

  it("keeps insertion order within one depth", () => {
    const collection = new DeferredFiberQueuedCollection();
    const first = stubFiber(2, "first");
    const second = stubFiber(2, "second");

    collection.add(first);
    collection.add(second);

    expect(collection.queues[2]).toEqual([first, second]);
    expect(collection.size).toBe(2);
  });

  it("buckets fibers by their own depth", () => {
    const collection = new DeferredFiberQueuedCollection();
    const shallow = stubFiber(0, "shallow");
    const deep = stubFiber(5, "deep");

    collection.add(deep);
    collection.add(shallow);

    expect(collection.queues[0]).toEqual([shallow]);
    expect(collection.queues[5]).toEqual([deep]);
    expect(collection.size).toBe(2);
  });

  it("is a no-op while the fiber is already booked", () => {
    const collection = new DeferredFiberQueuedCollection();
    const fiber = stubFiber(1);
    collection.add(fiber);

    expect(collection.add(fiber)).toBe(false);

    // No duplicate entry: a second push would make the drain render it twice.
    expect(collection.queues[1]).toEqual([fiber]);
    expect(collection.size).toBe(1);
  });

  it("revives a cancelled booking without pushing a second entry", () => {
    const collection = new DeferredFiberQueuedCollection();
    const fiber = stubFiber(2);
    collection.add(fiber);
    cancel(collection, fiber);
    expect(collection.cancelled).toBe(1);

    expect(collection.add(fiber)).toBe(true);

    // The original entry is still in the queue, so it is reused rather than
    // duplicated — only the booking flips back to live.
    expect(collection.members.get(fiber)).toBe(true);
    expect(collection.queues[2]).toEqual([fiber]);
    expect(collection.size).toBe(1);
    expect(collection.cancelled).toBe(0);
  });

  it("keeps `size` and `cancelled` consistent across a queue/cancel/queue cycle", () => {
    const collection = new DeferredFiberQueuedCollection();
    const a = stubFiber(1, "a");
    const b = stubFiber(1, "b");

    collection.add(a);
    collection.add(b);
    cancel(collection, a);
    collection.add(a);

    expect(collection.size).toBe(queued(collection).length);
    expect(collection.cancelled).toBe(0);
  });

  it("treats depth 0 as a real depth rather than a falsy edge case", () => {
    const collection = new DeferredFiberQueuedCollection();
    const root = stubFiber(0);

    expect(collection.add(root)).toBe(true);
    expect(collection.queues[0]).toEqual([root]);
    expect(collection.size).toBe(1);
  });

  /**
   * The `booked === false` fast path returns `true` without pushing, on the
   * assumption that a `false` booking always has a live queue entry behind it.
   * Nothing in this class enforces that, so it is pinned here: a `cancel` that
   * marks a fiber it never queued leaves the fiber booked but unreachable, and
   * drives `cancelled` negative. Whatever owns cancellation has to guard on
   * `members.get(fiber) === true`.
   */
  it("documents the invariant a cancel must uphold", () => {
    const collection = new DeferredFiberQueuedCollection();
    const neverQueued = stubFiber(1);

    cancel(collection, neverQueued);
    collection.cancelled--; // undo the bookkeeping a guarded cancel would skip

    expect(collection.add(neverQueued)).toBe(true);

    // Booked, but absent from every queue: the drain can never reach it.
    expect(collection.members.get(neverQueued)).toBe(true);
    expect(queued(collection)).toHaveLength(0);
    expect(collection.size).toBe(0);
    expect(collection.cancelled).toBe(-1);
  });
});
