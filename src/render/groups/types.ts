import type { Fiber } from "../../instances/types";

export type MapFiberGroup = {
  queues: Fiber[][];
  members: Map<Fiber, boolean>;
};

export type SetFiberGroup = {
  queues: Fiber[][];
  members: Set<Fiber>;
};

export type FiberGroup = SetFiberGroup | MapFiberGroup;
