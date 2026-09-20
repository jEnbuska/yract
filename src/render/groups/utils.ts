import type { MapFiberGroup, SetFiberGroup } from "./types";
import type { Fiber } from "../../instances/types";

export function queueMapGroupMember({ members, queues }: MapFiberGroup, fiber: Fiber): boolean {
  const booked = members.get(fiber);
  if (booked) return false; // Already on the list and part of members
  members.set(fiber, true);
  if (booked === false) return true;
  const { depth } = fiber;
  while (queues.length <= depth) queues.push([]);
  queues[depth]!.push(fiber);
  return true;
}

export function queueSetGroupMember({ members, queues }: SetFiberGroup, fiber: Fiber): boolean {
  if (members.has(fiber)) return false;
  members.add(fiber);
  const { depth } = fiber;
  while (queues.length <= depth) {
    queues.push([]);
  }
  const queue = queues[depth]!;
  queue.push(fiber);
  return true;
}

export function createMapGroup(): MapFiberGroup {
  return {
    members: new Map(),
    queues: [],
  };
}

export function createSetGroup(): SetFiberGroup {
  return {
    members: new Set(),
    queues: [],
  };
}

export function shallowDeleteMapMember(group: MapFiberGroup, fiber: Fiber) {
  group.members.set(fiber, false);
}

export function shallowDeleteSetMember(group: SetFiberGroup, fiber: Fiber) {
  group.members.delete(fiber);
}
