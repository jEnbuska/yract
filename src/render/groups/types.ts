import type { Fiber } from "../../instances/types";

export type MapGroup = {
  queue: Array<Fiber>;
  members: Map<Fiber, boolean>;
};

export type SetGroup = {
  queue: Array<Fiber>;
  members: Set<Fiber>;
};

export type Group = SetGroup | MapGroup;
