import type { MapGroup, SetGroup } from "./types";
import type { Fiber } from "../../instances/types";

export function queueMapGroupMember(groups: MapGroup[], fiber: Fiber): boolean {
  const { depth } = fiber;
  while (groups.length <= depth) {
    groups.push({
      queue: [],
      members: new Map(),
    });
  }
  const { members, queue } = groups[depth]!;
  const booked = members.get(fiber);
  if (booked) return false; // Already on the list and part of members
  members.set(fiber, true);

  if (booked !== false) queue.push(fiber); // Not in the queue yet
  return true;
}

export function queueSetGroupMember(groups: SetGroup[], fiber: Fiber): boolean {
  const { depth } = fiber;
  while (groups.length <= depth) {
    groups.push({
      queue: [],
      members: new Set(),
    });
  }
  const { members, queue } = groups[depth]!;
  if (members.has(fiber)) return false; // Already on the list and part of members
  members.add(fiber);
  queue.push(fiber);
  return true;
}

export function shallowDeleteSetMember(groups: SetGroup[], fiber: Fiber) {
  groups[fiber.depth]?.members.delete(fiber);
}

export function shallowDeleteMapMember(groups: MapGroup[], fiber: Fiber) {
  groups[fiber.depth]?.members.set(fiber, false);
}
