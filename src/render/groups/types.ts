import type { Fiber } from "../../instances/types";

export type MapGroup = {
  queue: Array<Fiber>;
  members: Map<Fiber, boolean>;
};

export type SetGroup<T extends Fiber = Fiber> = {
  queue: Array<T>;
  members: Set<T>;
};

export type CollectionGroup = SetGroup | MapGroup;
