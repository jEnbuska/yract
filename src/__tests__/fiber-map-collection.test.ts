import { describe, expect, it } from "vitest";
import { DeferredPopCollection } from "../scheduler/DeferredPopCollection";
import type { Fiber } from "../instances/types";

/**
 * Tests for `DeferredPopCollection`.
 *
 * Contract recap:
 *   - `_members` holds the live bookings; `_cancelled` holds fibers whose
 *     booking was dropped but whose queue entry is still physically there,
 *     waiting for `pop()` to reach it and skip it, or for a prune to sweep it.
 *   - `queues[depth]` buckets fibers by depth. `head` is the depth `pop()` is
 *     currently draining, and `#direction` decides which way it walks:
 *     ascending (`1`) drains shallowest-first, descending (`-1`) deepest-first.
 *   - `size` counts live bookings only, so it can read 0 while cancelled
 *     queue entries are still physically there.
 *   - `pop()` assumes a live booking exists. Callers gate on `size`; walk
 *     off the end of `queues` and it throws.
 *
 * Fibers are stubbed to the one field the collection reads (`depth`), plus a
 * name to make failures readable. The cast is the narrowing kind: a full
 * `Fiber` is a large interface and none of the rest is reachable from here.
 */

/** Drained shallowest-first — renders and commits. */
const ASCENDING = 1;
/** Drained deepest-first — prepare-commit and post-commit. */
const DESCENDING = -1;

function stubFiber(depth: number, name = `f${depth}`): Fiber {
  return { depth, component: { name } } as unknown as Fiber;
}

function name(fiber: Fiber): string {
  return fiber.component.name;
}

/** Entries physically sitting in the queues, flattened shallow-to-deep. */
function queued(collection: DeferredPopCollection): Fiber[] {
  return collection.queues.flat();
}

/** Pop until no live booking remains, which is the contract `pop()` expects. */
function drain(collection: DeferredPopCollection): string[] {
  const out: string[] = [];
  while (collection.size) out.push(name(collection.pop()));
  return out;
}

describe("DeferredPopCollection.add", () => {
  it("books a fresh fiber and pushes it at its depth", () => {
    const collection = new DeferredPopCollection(ASCENDING);
    const fiber = stubFiber(3);

    expect(collection.add(fiber)).toBe(true);

    expect(collection.has(fiber)).toBe(true);
    expect(collection.queues[3]).toEqual([fiber]);
    expect(collection.size).toBe(1);
    expect(collection._cancelled.size).toBe(0);
  });

  it("grows `queues` so every depth up to the fiber's has a bucket", () => {
    const collection = new DeferredPopCollection(ASCENDING);

    collection.add(stubFiber(4));

    expect(collection.queues).toHaveLength(5);
    expect(collection.queues.slice(0, 4).every((q) => q.length === 0)).toBe(true);
  });

  it("keeps insertion order within one depth's bucket", () => {
    const collection = new DeferredPopCollection(ASCENDING);
    const first = stubFiber(2, "first");
    const second = stubFiber(2, "second");

    collection.add(first);
    collection.add(second);

    expect(collection.queues[2]).toEqual([first, second]);
  });

  it("buckets fibers by their own depth", () => {
    const collection = new DeferredPopCollection(ASCENDING);
    const shallow = stubFiber(0, "shallow");
    const deep = stubFiber(5, "deep");

    collection.add(deep);
    collection.add(shallow);

    expect(collection.queues[0]).toEqual([shallow]);
    expect(collection.queues[5]).toEqual([deep]);
  });

  it("returns false and pushes nothing while the fiber is already booked", () => {
    const collection = new DeferredPopCollection(ASCENDING);
    const fiber = stubFiber(1);
    collection.add(fiber);

    expect(collection.add(fiber)).toBe(false);

    // A duplicate entry would make the drain hand the same fiber out twice.
    expect(collection.queues[1]).toEqual([fiber]);
  });

  it("treats depth 0 as a real depth rather than a falsy edge case", () => {
    const collection = new DeferredPopCollection(ASCENDING);
    const root = stubFiber(0);

    expect(collection.add(root)).toBe(true);
    expect(collection.queues[0]).toEqual([root]);
  });
});

describe("DeferredPopCollection.size", () => {
  it("counts live bookings, not queue entries", () => {
    const collection = new DeferredPopCollection(ASCENDING);
    const a = stubFiber(0, "a");
    const b = stubFiber(1, "b");

    expect(collection.size).toBe(0);
    collection.add(a);
    collection.add(b);
    expect(collection.size).toBe(2);

    // The entry stays queued, but the booking is gone — so does the count.
    collection.delete(a);
    expect(collection.size).toBe(1);
    expect(queued(collection)).toHaveLength(2);
  });

  it("is what callers gate `pop()` on", () => {
    const collection = new DeferredPopCollection(ASCENDING);
    collection.add(stubFiber(1));

    let popped = 0;
    while (collection.size) {
      collection.pop();
      popped++;
    }

    expect(popped).toBe(1);
    expect(collection.size).toBe(0);
  });
});

describe("DeferredPopCollection head tracking", () => {
  it("ascending: head follows the shallowest depth booked", () => {
    const collection = new DeferredPopCollection(ASCENDING);

    collection.add(stubFiber(4));
    expect(collection.head).toBe(4);

    collection.add(stubFiber(1));
    expect(collection.head).toBe(1);

    // Deeper than the head leaves it alone — the drain will walk down to it.
    collection.add(stubFiber(6));
    expect(collection.head).toBe(1);
  });

  it("descending: head follows the deepest depth booked", () => {
    const collection = new DeferredPopCollection(DESCENDING);

    collection.add(stubFiber(1));
    expect(collection.head).toBe(1);

    collection.add(stubFiber(4));
    expect(collection.head).toBe(4);

    collection.add(stubFiber(0));
    expect(collection.head).toBe(4);
  });
});

describe("DeferredPopCollection.delete", () => {
  it("drops the booking but leaves the queue entry behind", () => {
    const collection = new DeferredPopCollection(ASCENDING);
    const fiber = stubFiber(2);
    collection.add(fiber);

    expect(collection.delete(fiber)).toBe(true);

    expect(collection.has(fiber)).toBe(false);
    expect(collection._cancelled.has(fiber)).toBe(true);
    // Still physically queued — `pop()` skips it when it gets there.
    expect(collection.queues[2]).toEqual([fiber]);
  });

  it("returns false for a fiber it never held", () => {
    const collection = new DeferredPopCollection(ASCENDING);

    expect(collection.delete(stubFiber(1))).toBe(false);
  });

  it("makes the collection empty even though an entry remains queued", () => {
    const collection = new DeferredPopCollection(ASCENDING);
    const fiber = stubFiber(1);
    collection.add(fiber);
    collection.delete(fiber);

    expect(collection.size).toBe(0);
    expect(queued(collection)).toEqual([fiber]);
  });

  it("revives a cancelled booking without pushing a second entry", () => {
    const collection = new DeferredPopCollection(ASCENDING);
    const fiber = stubFiber(2);
    collection.add(fiber);
    collection.delete(fiber);

    // `false` means "no new entry pushed", not "rejected" — the caller uses it
    // to decide whether this booking is new work.
    expect(collection.add(fiber)).toBe(false);

    expect(collection.has(fiber)).toBe(true);
    expect(collection._cancelled.size).toBe(0);
    expect(collection.queues[2]).toEqual([fiber]);
  });
});

describe("DeferredPopCollection.pop", () => {
  it("ascending: drains shallowest depth first", () => {
    const collection = new DeferredPopCollection(ASCENDING);
    collection.add(stubFiber(2, "deep"));
    collection.add(stubFiber(0, "shallow"));
    collection.add(stubFiber(1, "mid"));

    expect(drain(collection)).toEqual(["shallow", "mid", "deep"]);
  });

  it("descending: drains deepest depth first", () => {
    const collection = new DeferredPopCollection(DESCENDING);
    collection.add(stubFiber(2, "deep"));
    collection.add(stubFiber(0, "shallow"));
    collection.add(stubFiber(1, "mid"));

    expect(drain(collection)).toEqual(["deep", "mid", "shallow"]);
  });

  it("takes the most recently added first within one depth", () => {
    const collection = new DeferredPopCollection(ASCENDING);
    collection.add(stubFiber(1, "first"));
    collection.add(stubFiber(1, "second"));

    // `pop()` takes from the end of the bucket, so a depth drains LIFO even
    // though `add` appends in order.
    expect(drain(collection)).toEqual(["second", "first"]);
  });

  it("skips cancelled entries and hands back only live ones", () => {
    const collection = new DeferredPopCollection(ASCENDING);
    const dead = stubFiber(1, "dead");
    collection.add(stubFiber(1, "live"));
    collection.add(dead);
    collection.delete(dead);

    expect(drain(collection)).toEqual(["live"]);
    expect(collection._cancelled.size).toBe(0);
  });

  it("empties the collection after exactly as many pops as live bookings", () => {
    const collection = new DeferredPopCollection(ASCENDING);
    collection.add(stubFiber(0, "a"));
    collection.add(stubFiber(3, "b"));

    expect(drain(collection)).toHaveLength(2);
    expect(collection.size).toBe(0);
    expect(queued(collection)).toHaveLength(0);
  });
});

describe("DeferredPopCollection.clear", () => {
  it("drops bookings, cancellations and every queue entry", () => {
    const collection = new DeferredPopCollection(ASCENDING);
    const cancelled = stubFiber(1, "cancelled");
    collection.add(stubFiber(0, "live"));
    collection.add(cancelled);
    collection.delete(cancelled);

    collection.clear();

    expect(collection.size).toBe(0);
    expect(collection._cancelled.size).toBe(0);
    expect(queued(collection)).toHaveLength(0);
  });

  it("is a no-op on an untouched collection", () => {
    const collection = new DeferredPopCollection(ASCENDING);

    collection.clear();

    expect(collection.size).toBe(0);
    expect(queued(collection)).toHaveLength(0);
  });
});

describe("DeferredPopCollection.schedulePrune", () => {
  it("sweeps cancelled entries out of the queues and keeps the live ones", async () => {
    const collection = new DeferredPopCollection(ASCENDING);
    const live = stubFiber(1, "live");
    const dead = stubFiber(1, "dead");
    collection.add(live);
    collection.add(dead);
    collection.delete(dead);

    await collection.schedulePrune();

    expect(queued(collection)).toEqual([live]);
    expect(collection._cancelled.size).toBe(0);
    expect(collection.has(live)).toBe(true);
  });

  it("does nothing when there is nothing cancelled", async () => {
    const collection = new DeferredPopCollection(ASCENDING);
    const fiber = stubFiber(2);
    collection.add(fiber);

    await collection.schedulePrune();

    expect(queued(collection)).toEqual([fiber]);
  });

  it("lets a pruned fiber be booked again as fresh work", async () => {
    const collection = new DeferredPopCollection(ASCENDING);
    const fiber = stubFiber(1);
    collection.add(fiber);
    collection.delete(fiber);
    await collection.schedulePrune();

    // The entry is gone, so this is a genuine push rather than a revival.
    expect(collection.add(fiber)).toBe(true);
    expect(queued(collection)).toEqual([fiber]);
  });
});
